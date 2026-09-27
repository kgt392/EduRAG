import json
from pathlib import Path

from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue,
    FilterSelector,
)
from sentence_transformers import SentenceTransformer, CrossEncoder


BASE_DIR = Path(__file__).resolve().parents[2]

QDRANT_PATH = BASE_DIR / "data" / "qdrant"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

COLLECTION_NAME = "edurag_chunks"

client = QdrantClient(path=str(QDRANT_PATH))

embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2"
)

reranker = None


def get_reranker():
    global reranker

    if reranker is None:
        reranker = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L-6-v2"
        )

    return reranker


def ensure_collection():
    collections = client.get_collections().collections

    if not any(
        collection.name == COLLECTION_NAME
        for collection in collections
    ):
        vector_size = (
            embedding_model.get_embedding_dimension()
        )

        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(
                size=vector_size,
                distance=Distance.COSINE,
            ),
        )


def delete_book_vectors(book_id: int):
    ensure_collection()

    selector = FilterSelector(
        filter=Filter(
            must=[
                FieldCondition(
                    key="book_id",
                    match=MatchValue(
                        value=book_id
                    ),
                )
            ]
        )
    )

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=selector,
    )


def index_book(book_id: int):
    ensure_collection()

    processed_file = (
        PROCESSED_DIR / f"book_{book_id}.json"
    )

    if not processed_file.exists():
        raise FileNotFoundError(
            f"Processed file not found: {processed_file}"
        )

    with open(
        processed_file,
        "r",
        encoding="utf-8",
    ) as file:
        data = json.load(file)

    chunks = data["chunks"]

    if not chunks:
        raise ValueError(
            "No text chunks were extracted."
        )

    # Important when reprocessing.
    delete_book_vectors(book_id)

    texts = [
        chunk["text"]
        for chunk in chunks
    ]

    embeddings = embedding_model.encode(
        texts,
        show_progress_bar=True,
        normalize_embeddings=True,
    )

    points = []

    for index, (
        chunk,
        embedding,
    ) in enumerate(
        zip(chunks, embeddings)
    ):
        points.append(
            PointStruct(
                id=(book_id * 1_000_000) + index,
                vector=embedding.tolist(),
                payload={
                    "book_id": book_id,
                    "chunk_index": index,
                    "text": chunk["text"],
                    "page": chunk["page"],
                    "chapter_number": chunk[
                        "chapter_number"
                    ],
                    "chapter_title": chunk[
                        "chapter_title"
                    ],
                },
            )
        )

    client.upsert(
        collection_name=COLLECTION_NAME,
        points=points,
    )

    return {
        "book_id": book_id,
        "chunks_indexed": len(points),
        "collection": COLLECTION_NAME,
        "vector_dimension": len(
            embeddings[0]
        ),
    }


def search_chunks(
    query: str,
    book_id: int | None = None,
    chapter_number: int | None = None,
    allowed_pairs: list[tuple[int, int]]
    | None = None,
    limit: int = 1,
):
    ensure_collection()

    query_embedding = embedding_model.encode(
        query,
        normalize_embeddings=True,
    )

    query_filter = None

    if book_id is not None:
        conditions = [
            FieldCondition(
                key="book_id",
                match=MatchValue(
                    value=book_id
                ),
            )
        ]

        if chapter_number is not None:
            conditions.append(
                FieldCondition(
                    key="chapter_number",
                    match=MatchValue(
                        value=chapter_number
                    ),
                )
            )

        query_filter = Filter(
            must=conditions
        )

    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding.tolist(),
        query_filter=query_filter,
        with_payload=True,
        limit=max(limit * 10, 40),
    )

    candidates = []

    allowed = (
        set(allowed_pairs)
        if allowed_pairs is not None
        else None
    )

    for point in result.points:
        payload = point.payload or {}

        pair = (
            payload.get("book_id"),
            payload.get("chapter_number"),
        )

        if (
            allowed is not None
            and pair not in allowed
        ):
            continue

        candidates.append(
            {
                "semantic_score": float(
                    point.score
                ),
                "text": payload.get(
                    "text",
                    "",
                ),
                "page": payload.get("page"),
                "book_id": payload.get(
                    "book_id"
                ),
                "chapter_number": payload.get(
                    "chapter_number"
                ),
                "chapter_title": payload.get(
                    "chapter_title"
                ),
            }
        )

    if not candidates:
        return []

    model = get_reranker()

    pairs = [
        [query, candidate["text"]]
        for candidate in candidates
    ]

    scores = model.predict(pairs)

    for candidate, score in zip(
        candidates,
        scores,
    ):
        candidate["score"] = float(score)

    candidates.sort(
        key=lambda item: item["score"],
        reverse=True,
    )

    return candidates[:limit]


def build_grounded_answer(
    query: str,
    result: dict,
) -> str:
    text = result["text"]

    cleaned = " ".join(
        line.strip()
        for line in text.splitlines()
        if line.strip()
    )

    return (
        "According to the approved material: "
        + cleaned
    )
