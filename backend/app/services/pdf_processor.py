import json
import re
import statistics
from pathlib import Path

import fitz


BASE_DIR = Path(__file__).resolve().parents[2]
BOOKS_DIR = BASE_DIR / "data" / "books"
PROCESSED_DIR = BASE_DIR / "data" / "processed"

BOOKS_DIR.mkdir(parents=True, exist_ok=True)
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)


EXPLICIT_CHAPTER = re.compile(
    r"^\s*(chapter|unit|module)\s+([0-9]+|[IVXLC]+)\s*[:.\-–—]?\s*(.*)$",
    re.IGNORECASE,
)

NUMERIC_CHAPTER = re.compile(
    r"^\s*(\d{1,2})\s*[.)\-:]?\s+([A-Za-z][A-Za-z0-9 &/,()'’\-–—]{2,100})\s*$"
)


def clean_title(title: str) -> str:
    title = re.sub(r"\s+", " ", title).strip()
    title = re.sub(r"\s+\d+$", "", title).strip()
    return title


def parse_chapter_title(text: str):
    text = clean_title(text)

    match = EXPLICIT_CHAPTER.match(text)

    if match:
        number = match.group(2)
        title = match.group(3).strip()

        return {
            "raw_number": number,
            "title": (
                f"Chapter {number}"
                + (f": {title}" if title else "")
            ),
        }

    match = NUMERIC_CHAPTER.match(text)

    if match:
        number = int(match.group(1))
        title = match.group(2).strip()

        # Avoid treating decimal sections like 1.1 as chapters.
        if 1 <= number <= 50 and len(title) >= 3:
            return {
                "raw_number": str(number),
                "title": f"Chapter {number}: {title}",
            }

    return None


def line_is_prominent(page, target_text: str) -> bool:
    """
    Numeric headings can resemble normal numbered text.
    Only accept them when the PDF visually formats them
    like a heading.
    """
    try:
        data = page.get_text("dict")

        all_sizes = []
        target_sizes = []

        target = target_text.strip()

        for block in data.get("blocks", []):
            for line in block.get("lines", []):
                spans = line.get("spans", [])

                line_text = "".join(
                    span.get("text", "")
                    for span in spans
                ).strip()

                for span in spans:
                    size = span.get("size")
                    if size:
                        all_sizes.append(float(size))

                if line_text == target:
                    for span in spans:
                        size = span.get("size")
                        if size:
                            target_sizes.append(float(size))

        if not all_sizes or not target_sizes:
            return False

        median_size = statistics.median(all_sizes)
        target_size = max(target_sizes)

        return (
            target_size >= median_size + 1.0
            or target_size >= max(all_sizes) - 0.5
        )

    except Exception:
        return False


def detect_outline_chapters(document):
    """
    First preference: PDF bookmarks / document outline.
    Many textbooks contain chapter structure here.
    """
    markers = []

    try:
        toc = document.get_toc(simple=True)
    except Exception:
        toc = []

    for item in toc:
        if len(item) < 3:
            continue

        level, title, page_number = item[:3]

        parsed = parse_chapter_title(title)

        if not parsed:
            continue

        # Prefer top-level / near-top-level outline items.
        if level > 2:
            continue

        if page_number < 1:
            continue

        markers.append(
            {
                "page": page_number,
                "title": parsed["title"],
            }
        )

    # Remove duplicates.
    unique = []

    for marker in sorted(markers, key=lambda x: x["page"]):
        if not unique:
            unique.append(marker)
            continue

        previous = unique[-1]

        if (
            previous["page"] == marker["page"]
            and previous["title"] == marker["title"]
        ):
            continue

        unique.append(marker)

    return unique


def detect_page_chapters(document):
    """
    Fallback chapter detection when the PDF has no useful outline.
    """
    markers = []

    for page_index, page in enumerate(document):
        page_number = page_index + 1

        text = page.get_text("text").strip()

        if not text:
            continue

        lines = [
            line.strip()
            for line in text.splitlines()
            if line.strip()
        ]

        # Chapter titles usually appear near the beginning of a page.
        for line in lines[:40]:
            parsed = parse_chapter_title(line)

            if not parsed:
                continue

            # Explicit Chapter / Unit / Module headings are accepted.
            if EXPLICIT_CHAPTER.match(line):
                markers.append(
                    {
                        "page": page_number,
                        "title": parsed["title"],
                    }
                )
                break

            # Numeric headings need visual confirmation.
            if line_is_prominent(page, line):
                markers.append(
                    {
                        "page": page_number,
                        "title": parsed["title"],
                    }
                )
                break

    return markers


def build_chapter_ranges(
    document,
    markers,
):
    """
    Convert chapter start pages into chapter metadata
    that can be attached to every extracted page/chunk.
    """
    if not markers:
        return []

    # Deduplicate same page/title.
    cleaned = []

    for marker in sorted(
        markers,
        key=lambda x: (x["page"], x["title"]),
    ):
        if any(
            item["page"] == marker["page"]
            and item["title"] == marker["title"]
            for item in cleaned
        ):
            continue

        cleaned.append(marker)

    chapters = []

    for index, marker in enumerate(cleaned):
        start_page = marker["page"]

        if index + 1 < len(cleaned):
            end_page = cleaned[index + 1]["page"] - 1
        else:
            end_page = len(document)

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


def process_pdf(pdf_path: Path, book_id: int):
    document = fitz.open(pdf_path)

    total_pdf_pages = len(document)
    empty_pages = 0

    outline_markers = detect_outline_chapters(document)

    if outline_markers:
        chapter_markers = outline_markers
        detection_method = "pdf_outline"
    else:
        chapter_markers = detect_page_chapters(document)
        detection_method = "heading_detection"

    chapters = build_chapter_ranges(
        document,
        chapter_markers,
    )

    if not chapters:
        chapters = [
            {
                "chapter_number": 1,
                "title": "General",
                "page": 1,
                "start_page": 1,
                "end_page": total_pdf_pages,
            }
        ]

    pages = []
    chunks = []

    for page_index, page in enumerate(document):
        page_number = page_index + 1

        text = page.get_text("text").strip()

        if not text:
            empty_pages += 1
            continue

        current_chapter = chapters[0]

        for chapter in chapters:
            if page_number >= chapter["start_page"]:
                current_chapter = chapter
            else:
                break

        pages.append(
            {
                "page": page_number,
                "text": text,
                "chapter_number": current_chapter["chapter_number"],
                "chapter_title": current_chapter["title"],
            }
        )

        # Smaller chunks improve semantic retrieval.
        chunk_size = 600
        overlap = 100

        start = 0

        while start < len(text):
            end = min(
                start + chunk_size,
                len(text),
            )

            chunk_text = text[start:end].strip()

            if chunk_text:
                chunks.append(
                    {
                        "text": chunk_text,
                        "page": page_number,
                        "chapter_number": current_chapter[
                            "chapter_number"
                        ],
                        "chapter_title": current_chapter[
                            "title"
                        ],
                    }
                )

            if end == len(text):
                break

            start = end - overlap

    document.close()

    output = {
        "book_id": book_id,
        "total_pdf_pages": total_pdf_pages,
        "pages_with_text": len(pages),
        "pages_without_text": empty_pages,
        "chapter_detection_method": detection_method,
        "pages": pages,
        "chunks": chunks,
        "chapters": chapters,
    }

    output_path = (
        PROCESSED_DIR / f"book_{book_id}.json"
    )

    with open(
        output_path,
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            output,
            file,
            ensure_ascii=False,
            indent=2,
        )

    return output, output_path
