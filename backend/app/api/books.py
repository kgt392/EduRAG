import shutil
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import Book, Chapter
<<<<<<< HEAD
from app.services.ingestion_jobs import (
    jobs,
    run_book_ingestion,
)
from app.services.pdf_processor import BOOKS_DIR

=======
from app.services.pdf_processor import BOOKS_DIR, process_pdf
from app.services.vector_store import index_book
from app.services.pdf_processor import BOOKS_DIR, PROCESSED_DIR, process_pdf
from app.services.vector_store import index_book, delete_book_vectors
>>>>>>> origin/main

router = APIRouter(
    prefix="/books",
    tags=["Books"],
)


@router.post("/upload", status_code=202)
async def upload_book(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    subject: str = Form("DBMS"),
    db: AsyncSession = Depends(get_db),
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="No file selected.",
        )

    if not file.filename.lower().endswith(
        ".pdf"
    ):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported.",
        )

    safe_name = Path(
        file.filename
    ).name

    book = Book(
        title=Path(
            safe_name
        ).stem,
        subject=subject,
        filename=safe_name,
    )

    db.add(book)

    await db.commit()
    await db.refresh(book)

    pdf_path = (
        BOOKS_DIR
        / f"{book.id}_{safe_name}"
    )

    with open(
        pdf_path,
        "wb",
    ) as output:
        shutil.copyfileobj(
            file.file,
            output,
        )

    jobs[book.id] = {
        "status": "QUEUED",
        "progress": 0,
        "book_id": book.id,
    }

    background_tasks.add_task(
        run_book_ingestion,
        book.id,
        str(pdf_path),
    )

    return {
        "message": (
            "Book upload accepted. "
            "Processing started."
        ),
        "book": {
            "id": book.id,
            "title": book.title,
            "subject": book.subject,
            "filename": book.filename,
        },
        "status": "QUEUED",
    }


@router.get("/")
async def get_books(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Book)
    )

    books = result.scalars().all()

    return [
        {
            "id": book.id,
            "title": book.title,
            "subject": book.subject,
            "filename": book.filename,
            "processing": jobs.get(
                book.id,
                {},
            ).get(
                "status",
                "READY",
            ),
        }
        for book in books
    ]


@router.get("/{book_id}/status")
async def book_status(
    book_id: int,
):
    return jobs.get(
        book_id,
        {
            "status": "UNKNOWN",
            "book_id": book_id,
        },
    )


@router.get("/{book_id}/chapters")
async def get_chapters(
    book_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chapter)
        .where(
            Chapter.book_id == book_id
        )
        .order_by(
            Chapter.chapter_number
        )
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
