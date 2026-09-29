import asyncio
import time
from pathlib import Path

from starlette.concurrency import run_in_threadpool

from app.core.database import AsyncSessionLocal
from app.models.models import Chapter
from app.services.pdf_processor import process_pdf
from app.services.vector_store import index_book
from sqlalchemy import delete


jobs = {}

INGESTION_SEMAPHORE = asyncio.Semaphore(1)


async def run_book_ingestion(
    book_id: int,
    pdf_path: str,
):
    started = time.perf_counter()

    jobs[book_id] = {
        "status": "PROCESSING",
        "progress": 5,
        "book_id": book_id,
    }

    try:
        async with INGESTION_SEMAPHORE:

            jobs[book_id]["progress"] = 20

            processed_data, processed_path = (
                await run_in_threadpool(
                    process_pdf,
                    Path(pdf_path),
                    book_id,
                )
            )

            jobs[book_id]["progress"] = 55

            async with AsyncSessionLocal() as db:
                await db.execute(
                    delete(Chapter).where(
                        Chapter.book_id == book_id
                    )
                )

                for chapter in processed_data[
                    "chapters"
                ]:
                    db.add(
                        Chapter(
                            book_id=book_id,
                            chapter_number=chapter[
                                "chapter_number"
                            ],
                            title=chapter[
                                "title"
                            ],
                        )
                    )

                await db.commit()

            jobs[book_id]["progress"] = 65

            vector_data = await run_in_threadpool(
                index_book,
                book_id,
            )

            jobs[book_id] = {
                "status": "COMPLETED",
                "progress": 100,
                "book_id": book_id,
                "pages": processed_data[
                    "pages_with_text"
                ],
                "total_pages": processed_data[
                    "total_pdf_pages"
                ],
                "chunks": len(
                    processed_data["chunks"]
                ),
                "chapters": len(
                    processed_data["chapters"]
                ),
                "vectors": vector_data[
                    "chunks_indexed"
                ],
                "processing_seconds": round(
                    time.perf_counter()
                    - started,
                    3,
                ),
                "embedding_seconds": vector_data[
                    "embedding_seconds"
                ],
                "upload_seconds": vector_data[
                    "upload_seconds"
                ],
                "chunks_per_second": vector_data[
                    "chunks_per_second"
                ],
                "processed_file": str(
                    processed_path
                ),
            }

    except Exception as exc:
        jobs[book_id] = {
            "status": "FAILED",
            "progress": 100,
            "book_id": book_id,
            "error": str(exc),
        }
