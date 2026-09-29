import json
import os
import time
from pathlib import Path

import torch
from dotenv import load_dotenv
from qdrant_client import QdrantClient
from qdrant_client import models
from sentence_transformers import (
    CrossEncoder,
    SentenceTransformer,
)


load_dotenv()


BASE_DIR = Path(__file__).resolve().parents[2]

QDRANT_PATH = BASE_DIR / "data" / "qdrant"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

COLLECTION_NAME = "edurag_chunks"


EMBED_BATCH_SIZE = int(
    os.getenv("EMBED_BATCH_SIZE", "128")
)

UPLOAD_BATCH_SIZE = int(
    os.getenv("QDRANT_UPLOAD_BATCH_SIZE", "256")
)

VECTOR_TOP_K = int(
    os.getenv("RAG_VECTOR_TOP_K", "12")
)

RERANK_TOP_K = int(
    os.getenv("RAG_RERANK_TOP_K", "8")
)

RERANK_ENABLED = (
    os.getenv(
        "RAG_RERANK_ENABLED",
        "true",
    ).lower()
    == "true"
)

EMBEDDING_DEVICE = os.getenv(
    "EMBEDDING_DEVICE",
    "cuda" if torch.cuda.is_available() else "cpu",
)


QDRANT_URL = os.getenv("QDRANT_URL", "").strip()
QDRANT_API_KEY = os.getenv(
    "QDRANT_API_KEY",
    "",
).strip()


if QDRANT_URL:
    client = QdrantClient(
        url=QDRANT_URL,
        api_key=QDRANT_API_KEY or None,
        prefer_grpc=True,
    )
    REMOTE_QDRANT = True
else:
    client = QdrantClient(
        path=str(QDRANT_PATH)
    )
    REMOTE_QDRANT = False


embedding_model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2",
    device=EMBEDDING_DEVICE,
)

reranker = None


def get_reranker():
    global reranker

    if reranker is None:
        reranker = CrossEncoder(
            "cross-encoder/ms-marco-MiniLM-L-6-v2",
            max_length=384,
        )

    return reranker


def ensure_collection():
    if client.collection_exists(
        COLLECTION_NAME
    ):
        return

    dimension = (
        embedding_model
        .get_embedding_dimension()
    )

    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=models.VectorParams(
            size=dimension,
            distance=models.Distance.COSINE,
        ),
    )

    # These are the fields used by session-scoped
    # retrieval. Qdrant recommends payload indexes
    # for filtered searches.
    for field_name, field_type in [
        (
            "book_id",
            models.PayloadSchemaType.INTEGER,
        ),
        (
            "chapter_number",
            models.PayloadSchemaType.INTEGER,
        ),
        (
            "scope_key",
            models.PayloadSchemaType.KEYWORD,
        ),
    ]:
        try:
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field_name,
                field_schema=field_type,
            )
        except Exception:
            pass


def ensure_payload_indexes():
    for field_name, field_type in [
        (
            "book_id",
            models.PayloadSchemaType.INTEGER,
        ),
        (
            "chapter_number",
            models.PayloadSchemaType.INTEGER,
        ),
        (
            "scope_key",
            models.PayloadSchemaType.KEYWORD,
        ),
    ]:
        try:
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field_name,
                field_schema=field_type,
            )
        except Exception:
            pass


def delete_book_vectors(book_id: int):
    ensure_collection()

    client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="book_id",
                        match=models.MatchValue(
                            value=book_id
                        ),
                    )
                ]
            )
        ),
    )


def index_book(book_id: int):
    ensure_collection()
    ensure_payload_indexes()

    processed_file = (
        PROCESSED_DIR
        / f"book_{book_id}.json"
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

    chunks = data.get("chunks", [])

    if not chunks:
        raise ValueError(
            "No chunks found."
        )

    embedding_start = time.perf_counter()

    texts = [
        chunk["text"]
        for chunk in chunks
    ]

    embeddings = embedding_model.encode(
        texts,
        batch_size=EMBED_BATCH_SIZE,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    embedding_seconds = (
        time.perf_counter()
        - embedding_start
    )

    # Delete only after successful embedding.
    delete_book_vectors(book_id)

    def point_generator():
        for index, (
            chunk,
            embedding,
        ) in enumerate(
            zip(chunks, embeddings)
        ):
            scope_key = (
                f"{book_id}:"
                f"{chunk['chapter_number']}"
            )

            yield models.PointStruct(
                id=(
                    book_id * 1_000_000
                    + index
                ),
                vector=embedding.tolist(),
                payload={
                    "book_id": book_id,
                    "chunk_index": index,
                    "scope_key": scope_key,
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

    upload_start = time.perf_counter()

    client.upload_points(
        collection_name=COLLECTION_NAME,
        points=point_generator(),
        batch_size=UPLOAD_BATCH_SIZE,
        parallel=2 if REMOTE_QDRANT else 1,
        max_retries=3,
        wait=True,
    )

    upload_seconds = (
        time.perf_counter()
        - upload_start
    )

    return {
        "book_id": book_id,
        "chunks_indexed": len(chunks),
        "collection": COLLECTION_NAME,
        "vector_dimension": int(
            embeddings.shape[1]
        ),
        "embedding_seconds": round(
            embedding_seconds,
            3,
        ),
        "upload_seconds": round(
            upload_seconds,
            3,
        ),
        "chunks_per_second": round(
            len(chunks)
            / max(embedding_seconds, 0.001),
            2,
        ),
    }


def build_filter(
    book_id=None,
    chapter_number=None,
    allowed_pairs=None,
):
    if allowed_pairs:
        scope_keys = [
            f"{book}:{chapter}"
            for book, chapter
            in allowed_pairs
        ]

        return models.Filter(
            must=[
                models.FieldCondition(
                    key="scope_key",
                    match=models.MatchAny(
                        any=scope_keys
                    ),
                )
            ]
        )

    conditions = []

    if book_id is not None:
        conditions.append(
            models.FieldCondition(
                key="book_id",
                match=models.MatchValue(
                    value=book_id
                ),
            )
        )

    if chapter_number is not None:
        conditions.append(
            models.FieldCondition(
                key="chapter_number",
                match=models.MatchValue(
                    value=chapter_number
                ),
            )
        )

    return (
        models.Filter(must=conditions)
        if conditions
        else None
    )


def search_chunks(
    query: str,
    book_id=None,
    chapter_number=None,
    allowed_pairs=None,
    limit=1,
):
    ensure_collection()

    query_embedding = embedding_model.encode(
        [query],
        batch_size=1,
        show_progress_bar=False,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )[0]

    query_filter = build_filter(
        book_id=book_id,
        chapter_number=chapter_number,
        allowed_pairs=allowed_pairs,
    )

    result = client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_embedding.tolist(),
        query_filter=query_filter,
        with_payload=True,
        limit=max(
            RERANK_TOP_K
            if RERANK_ENABLED
            else limit,
            VECTOR_TOP_K,
        ),
    )

    candidates = []

    for point in result.points:
        payload = point.payload or {}

        candidates.append(
            {
                "semantic_score": float(
                    point.score
                ),
                "text": payload.get(
                    "text",
                    "",
                ),
                "page": payload.get(
                    "page"
                ),
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

    if RERANK_ENABLED:
        candidates = candidates[
            :RERANK_TOP_K
        ]

        model = get_reranker()

        pairs = [
            [
                query,
                candidate["text"],
            ]
            for candidate in candidates
        ]

        scores = model.predict(
            pairs,
            batch_size=32,
            show_progress_bar=False,
        )

        for candidate, score in zip(
            candidates,
            scores,
        ):
            candidate["score"] = float(
                score
            )

        candidates.sort(
            key=lambda item: item["score"],
            reverse=True,
        )
    else:
        for candidate in candidates:
            candidate["score"] = candidate[
                "semantic_score"
            ]

    return candidates[:limit]


def build_grounded_answer(
    query: str,
    result: dict,
):
    return (
        "According to the approved "
        "material: "
        + " ".join(
            line.strip()
            for line in result["text"].splitlines()
            if line.strip()
        )
    )
