import os
import re

from dotenv import load_dotenv
from openai import OpenAI


load_dotenv()

API_KEY = os.getenv("OPENAI_API_KEY")
MODEL = os.getenv(
    "OPENAI_MODEL",
    "gpt-5.6-luna",
)

client = OpenAI(api_key=API_KEY) if API_KEY else None


def normalize_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def verify_answer(answer: str, source_text: str) -> bool:
    """
    Basic grounding check:
    every factual sentence should have meaningful
    overlap with the supplied source.
    """
    answer_sentences = re.split(
        r"(?<=[.!?])\s+",
        normalize_text(answer),
    )

    source_words = set(
        re.findall(
            r"\b[a-zA-Z0-9]{4,}\b",
            source_text.lower(),
        )
    )

    checked = 0

    for sentence in answer_sentences:
        words = set(
            re.findall(
                r"\b[a-zA-Z0-9]{4,}\b",
                sentence.lower(),
            )
        )

        if not words:
            continue

        overlap = len(words & source_words) / len(words)

        # Conservative threshold.
        if overlap < 0.20:
            return False

        checked += 1

    return checked > 0


def generate_grounded_answer(
    question: str,
    source_text: str,
    page: int,
    chapter_title: str,
) -> str:
    if not API_KEY or client is None:
        raise RuntimeError(
            "OPENAI_API_KEY is not configured."
        )

    prompt = f"""
You are EduRAG, an educational assistant.

Answer the student's question using ONLY the supplied
approved textbook excerpt.

Rules:
1. Do not use outside knowledge.
2. Do not invent facts.
3. Do not mention information not supported by the excerpt.
4. Give a concise but professional academic answer.
5. Explain the concept clearly instead of copying the whole excerpt.
6. Do not include a citation yourself.
7. If the excerpt does not contain enough information,
   say exactly:
   "The approved material does not contain enough information
   to answer this question."

Student question:
{question}

Approved textbook excerpt:
{source_text}
"""

    response = client.responses.create(
        model=MODEL,
        instructions=(
            "You are a strict document-grounded academic assistant. "
            "The supplied excerpt is the only source of truth."
        ),
        input=prompt,
    )

    answer = response.output_text.strip()

    if not answer:
        raise RuntimeError(
            "LLM returned an empty answer."
        )

    if not verify_answer(
        answer,
        source_text,
    ):
        return (
            "The retrieved approved material does not provide "
            "enough support for a reliable answer."
        )

    return answer


def build_citation(
    page: int,
    chapter_title: str,
):
    return {
        "page": page,
        "chapter": chapter_title,
        "label": (
            f"{chapter_title}, page {page}"
        ),
    }
