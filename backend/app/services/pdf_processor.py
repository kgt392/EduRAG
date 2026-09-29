import json
import re
import time
from pathlib import Path

import pymupdf


BASE_DIR = Path(__file__).resolve().parents[2]

BOOKS_DIR = BASE_DIR / "data" / "books"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

BOOKS_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


EXPLICIT_CHAPTER = re.compile(
    r"^\s*(chapter|unit|module)\s+"
    r"([0-9]+|[IVXLC]+)"
    r"\s*[:.\-–—]?\s*(.*)$",
    re.IGNORECASE,
)

NUMERIC_CHAPTER = re.compile(
    r"^\s*(\d{1,2})"
    r"(?:[.)\-:]|\s+)"
    r"\s*([A-Za-z][A-Za-z0-9 &/,()'’\-–—]{2,120})"
    r"\s*$"
)


CHUNK_SIZE = 800
CHUNK_OVERLAP = 100


def clean_title(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()

    # Remove trailing TOC page number.
    text = re.sub(r"\s+\d{1,4}$", "", text)

    return text


def parse_chapter_title(text: str):
    text = clean_title(text)

    match = EXPLICIT_CHAPTER.match(text)

    if match:
        return {
            "number": str(match.group(2)),
            "title": (
                f"Chapter {match.group(2)}"
                + (
                    f": {match.group(3).strip()}"
                    if match.group(3).strip()
                    else ""
                )
            ),
        }

    match = NUMERIC_CHAPTER.match(text)

    if match:
        number = int(match.group(1))

        if 1 <= number <= 50:
            return {
                "number": str(number),
                "title": f"Chapter {number}: {match.group(2).strip()}",
            }

    return None


def detect_outline_chapters(document):
    markers = []

    try:
        toc = document.get_toc(simple=True)
    except Exception:
        toc = []

    for item in toc:
        if len(item) < 3:
            continue

        level, title, page_number = item[:3]

        if level > 2:
            continue

        parsed = parse_chapter_title(title)

        if not parsed:
            continue

        if page_number < 1:
            continue

        markers.append(
            {
                "page": page_number,
                "title": parsed["title"],
            }
        )

    unique = []

    for marker in sorted(markers, key=lambda x: x["page"]):
        if (
            unique
            and unique[-1]["page"] == marker["page"]
            and unique[-1]["title"] == marker["title"]
        ):
            continue

        unique.append(marker)

    return unique


def detect_page_chapters(page_records):
    markers = []

    expected_number = 1

    for record in page_records:
        page_number = record["page"]
        text = record["text"]

        lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip()
        ]

        for line in lines[:25]:
            parsed = parse_chapter_title(line)

            if not parsed:
                continue

            is_explicit = bool(EXPLICIT_CHAPTER.match(line))

            if is_explicit:
                markers.append(
                    {
                        "page": page_number,
                        "title": parsed["title"],
                    }
                )

                try:
                    expected_number = (
                        int(parsed["number"]) + 1
                    )
                except ValueError:
                    expected_number += 1

                break

            number = int(parsed["number"])

            # Sequential numbering dramatically reduces
            # false positives from section lists.
            if number == expected_number:
                markers.append(
                    {
                        "page": page_number,
                        "title": parsed["title"],
                    }
                )

                expected_number += 1
                break

    return markers


def build_chapters(total_pages, markers):
    if not markers:
        return [
            {
                "chapter_number": 1,
                "title": "General",
                "page": 1,
                "start_page": 1,
                "end_page": total_pages,
            }
        ]

    chapters = []

    for index, marker in enumerate(
        sorted(markers, key=lambda x: x["page"])
    ):
        start_page = marker["page"]

        if index + 1 < len(markers):
            end_page = markers[index + 1]["page"] - 1
        else:
            end_page = total_pages

        chapters.append(
            {
                "chapter_number": index + 1,
                "title": marker["title"],
                "page": start_page,
                "start_page": start_page,
                "end_page": end_page,
            }
        )

    return chapters


def make_chunks(text: str):
    chunks = []

    start = 0
    length = len(text)

    while start < length:
        target_end = min(
            start + CHUNK_SIZE,
            length,
        )

        end = target_end

        if end < length:
            space = text.rfind(
                " ",
                start,
                target_end,
            )

            if space > start + int(CHUNK_SIZE * 0.75):
                end = space

        chunk_text = text[start:end].strip()

        if chunk_text:
            chunks.append(chunk_text)

        if end >= length:
            break

        start = max(
            end - CHUNK_OVERLAP,
            start + 1,
        )

    return chunks


def process_pdf(pdf_path: Path, book_id: int):
    total_start = time.perf_counter()

    document = pymupdf.open(pdf_path)

    total_pdf_pages = len(document)

    extraction_start = time.perf_counter()

    page_records = []

    for page_index, page in enumerate(document):
        text = page.get_text("text").strip()

        page_records.append(
            {
                "page": page_index + 1,
                "text": text,
            }
        )

    extraction_time = (
        time.perf_counter() - extraction_start
    )

    chapter_start = time.perf_counter()

    outline_markers = detect_outline_chapters(
        document
    )

    if outline_markers:
        markers = outline_markers
        detection_method = "pdf_outline"
    else:
        markers = detect_page_chapters(
            page_records
        )
        detection_method = "heading_detection"

    chapters = build_chapters(
        total_pdf_pages,
        markers,
    )

    chapter_time = (
        time.perf_counter() - chapter_start
    )

    chapter_index = 0

    chunks = []
    pages = []

    chunk_start = time.perf_counter()

    for record in page_records:
        page_number = record["page"]
        text = record["text"]

        if not text:
            continue

        while (
            chapter_index + 1 < len(chapters)
            and page_number
            >= chapters[chapter_index + 1][
                "start_page"
            ]
        ):
            chapter_index += 1

        chapter = chapters[chapter_index]

        pages.append(
            {
                "page": page_number,
                "text": text,
                "chapter_number": chapter[
                    "chapter_number"
                ],
                "chapter_title": chapter[
                    "title"
                ],
            }
        )

        for chunk_text in make_chunks(text):
            chunks.append(
                {
                    "text": chunk_text,
                    "page": page_number,
                    "chapter_number": chapter[
                        "chapter_number"
                    ],
                    "chapter_title": chapter[
                        "title"
                    ],
                }
            )

    chunk_time = (
        time.perf_counter() - chunk_start
    )

    document.close()

    pages_with_text = len(pages)
    pages_without_text = (
        total_pdf_pages - pages_with_text
    )

    output = {
        "book_id": book_id,
        "total_pdf_pages": total_pdf_pages,
        "pages_with_text": pages_with_text,
        "pages_without_text": pages_without_text,
        "chapter_detection_method": detection_method,
        "extraction_seconds": round(
            extraction_time,
            3,
        ),
        "chapter_detection_seconds": round(
            chapter_time,
            3,
        ),
        "chunking_seconds": round(
            chunk_time,
            3,
        ),
        "total_processing_seconds": round(
            time.perf_counter() - total_start,
            3,
        ),
        "pages": pages,
        "chunks": chunks,
        "chapters": chapters,
    }

    output_path = (
        PROCESSED_DIR
        / f"book_{book_id}.json"
    )

    # Compact JSON is substantially smaller than
    # pretty-printing large books.
    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            output,
            file,
            ensure_ascii=False,
            separators=(",", ":"),
        )

    return output, output_path
