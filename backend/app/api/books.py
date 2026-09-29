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
from app.services.ingestion_jobs import (
    jobs,
    run_book_ingestion,
)
from app.services.pdf_processor import BOOKS_DIR


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
