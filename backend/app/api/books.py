from pathlib import Path

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    UploadFile,
    HTTPException,
)
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Book, Chapter
from app.services.pdf_processor import BOOKS_DIR, process_pdf
from app.services.vector_store import index_book
from app.services.pdf_processor import BOOKS_DIR, PROCESSED_DIR, process_pdf
from app.services.vector_store import index_book, delete_book_vectors

router = APIRouter(prefix="/books", tags=["Books"])


@router.post("/upload")
async def upload_book(
    file: UploadFile = File(...),
    subject: str = Form("DBMS"),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected",
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported",
        )

    contents = await file.read()

    if not contents:
        raise HTTPException(
            status_code=400,
            detail="Empty PDF",
        )

    book = Book(
        title=Path(file.filename).stem,
        subject=subject,
        filename=file.filename,
    )

    db.add(book)
    await db.commit()
    await db.refresh(book)

    pdf_path = BOOKS_DIR / f"{book.id}_{file.filename}"

    try:
        with open(pdf_path, "wb") as output_file:
            output_file.write(contents)

        processed_data, processed_path = process_pdf(
            pdf_path,
            book.id,
        )

        for chapter in processed_data["chapters"]:
            db.add(
                Chapter(
                    book_id=book.id,
                    chapter_number=chapter["chapter_number"],
                    title=chapter["title"],
                )
            )

        await db.commit()

        vector_data = index_book(book.id)

    except Exception as exc:
        await db.rollback()

        if pdf_path.exists():
            pdf_path.unlink()

        raise HTTPException(
            status_code=500,
            detail=f"Book processing failed: {exc}",
        )

    return {
        "message": "Book processed and indexed successfully",
        "book": {
            "id": book.id,
            "title": book.title,
            "subject": book.subject,
            "filename": book.filename,
        },
        "pages_processed": len(processed_data["pages"]),
        "chunks_created": len(processed_data["chunks"]),
        "chapters_detected": len(processed_data["chapters"]),
        "vectors_indexed": vector_data["chunks_indexed"],
        "processed_file": str(processed_path),
    }


@router.post("/{book_id}/reprocess")
async def reprocess_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
):
    book = await db.get(Book, book_id)

    if not book:
        raise HTTPException(
            status_code=404,
            detail="Book not found",
        )

    pdf_path = BOOKS_DIR / f"{book.id}_{book.filename}"

    if not pdf_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Original PDF not found",
        )

    try:
        processed_data, processed_path = process_pdf(
            pdf_path,
            book.id,
        )

        await db.execute(
            delete(Chapter).where(
                Chapter.book_id == book.id
            )
        )

        for chapter in processed_data["chapters"]:
            db.add(
                Chapter(
                    book_id=book.id,
                    chapter_number=chapter["chapter_number"],
                    title=chapter["title"],
                )
            )

        await db.commit()

        vector_data = index_book(book.id)

    except Exception as exc:
        await db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Reprocessing failed: {exc}",
        )

    return {
        "message": "Book reprocessed successfully",
        "book_id": book.id,
        "pages_processed": len(processed_data["pages"]),
        "chunks_created": len(processed_data["chunks"]),
        "chapters_detected": len(processed_data["chapters"]),
        "vectors_indexed": vector_data["chunks_indexed"],
        "processed_file": str(processed_path),
    }


@router.get("/")
async def get_books(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Book))
    books = result.scalars().all()

    return [
        {
            "id": book.id,
            "title": book.title,
            "subject": book.subject,
            "filename": book.filename,
        }
        for book in books
    ]


@router.get("/{book_id}/chapters")
async def get_chapters(
    book_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chapter)
        .where(Chapter.book_id == book_id)
        .order_by(Chapter.chapter_number)
    )

    chapters = result.scalars().all()

    return [
        {
            "id": chapter.id,
            "chapter_number": chapter.chapter_number,
            "title": chapter.title,
        }
        for chapter in chapters
    ]

from app.services.vector_store import index_book, delete_book_vectors
from app.services.pdf_processor import BOOKS_DIR, PROCESSED_DIR, process_pdf


@router.delete("/{book_id}")
async def delete_book(
    book_id: int,
    db: AsyncSession = Depends(get_db),
):
    book = await db.get(Book, book_id)

    if not book:
        raise HTTPException(
            status_code=404,
            detail="Book not found",
        )

    deleted_files = []
    errors = []

    # 1. Delete vectors from Qdrant
    try:
        delete_book_vectors(book_id)
    except Exception as exc:
        errors.append(f"Vector deletion failed: {exc}")

    # 2. Delete chapters from DB
    await db.execute(delete(Chapter).where(Chapter.book_id == book_id))

    # 3. Delete processed JSON
    processed_path = PROCESSED_DIR / f"book_{book_id}.json"
    if processed_path.exists():
        processed_path.unlink()
        deleted_files.append(str(processed_path))

    # 4. Delete original PDF
    pdf_path = BOOKS_DIR / f"{book.id}_{book.filename}"
    if pdf_path.exists():
        pdf_path.unlink()
        deleted_files.append(str(pdf_path))

    # 5. Delete book row
    await db.delete(book)
    await db.commit()

    return {
        "message": f"Book '{book.title}' deleted successfully",
        "book_id": book_id,
        "deleted_files": deleted_files,
        "errors": errors,
    }
