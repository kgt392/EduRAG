from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.services.vector_store import index_book, search_chunks


router = APIRouter(prefix="/rag", tags=["RAG"])


class SearchRequest(BaseModel):
    query: str
    book_id: int | None = None
    chapter_number: int | None = None
    limit: int = 5


@router.post("/index/{book_id}")
def index_book_endpoint(book_id: int):
    try:
        return index_book(book_id)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Indexing failed: {str(exc)}",
        )


@router.post("/search")
def search(request: SearchRequest):
    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty",
        )

    try:
        results = search_chunks(
            query=request.query,
            book_id=request.book_id,
            chapter_number=request.chapter_number,
            limit=request.limit,
        )

        return {
            "query": request.query,
            "results": results,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Search failed: {str(exc)}",
        )
