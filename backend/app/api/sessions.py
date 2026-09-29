import secrets
import string

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.models import (
    Session,
    SessionChapter,
    SessionStudent,
    Chapter,
    Activity,
)
from app.services.llm_service import (generate_grounded_answer, build_citation)

from app.services.vector_store import (
    search_chunks,
    build_grounded_answer,
)


router = APIRouter(
    prefix="/sessions",
    tags=["Sessions"],
)


def generate_code(length=6):
    chars = string.ascii_uppercase + string.digits

    return "".join(
        secrets.choice(chars)
        for _ in range(length)
    )


async def is_ended(
    session_id: int,
    db: AsyncSession,
):
    result = await db.execute(
        select(Activity.id)
        .where(
            Activity.session_id == session_id,
            Activity.event_type == "SESSION_ENDED",
        )
        .limit(1)
    )

    return result.scalar_one_or_none() is not None


class CreateSessionRequest(BaseModel):
    name: str
    subject: str
    teacher_name: str
    chapter_ids: list[int]


class JoinSessionRequest(BaseModel):
    join_code: str
    student_name: str


class ActivityRequest(BaseModel):
    student_name: str
    event_type: str
    details: str | None = None


class SearchRequest(BaseModel):
    student_name: str
    query: str


@router.get("/")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).order_by(
            Session.created_at.desc()
        )
    )

    sessions = result.scalars().all()

    output = []

    for session in sessions:
        student_result = await db.execute(
            select(SessionStudent.student_name)
            .where(
                SessionStudent.session_id
                == session.id
            )
        )

        students = student_result.scalars().all()

        output.append(
            {
                "id": session.id,
                "name": session.name,
                "subject": session.subject,
                "join_code": session.join_code,
                "locked": session.locked,
                "ended": False,
                "student_count": len(
                    set(students)
                ),
                "created_at": session.created_at,
            }
        )

    return output


@router.post("/")
async def create_session(
    request: CreateSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    if not request.name.strip():
        raise HTTPException(
            status_code=400,
            detail="Session name is required",
        )

    if not request.chapter_ids:
        raise HTTPException(
            status_code=400,
            detail="Select at least one chapter",
        )

    result = await db.execute(
        select(Chapter).where(
            Chapter.id.in_(
                request.chapter_ids
            )
        )
    )

    chapters = result.scalars().all()

    if len(chapters) != len(
        set(request.chapter_ids)
    ):
        raise HTTPException(
            status_code=400,
            detail="Invalid chapter selection",
        )

    session = Session(
        name=request.name,
        subject=request.subject,
        join_code=generate_code(),
        locked=False,
    )

    db.add(session)

    await db.commit()
    await db.refresh(session)

    for chapter_id in set(
        request.chapter_ids
    ):
        db.add(
            SessionChapter(
                session_id=session.id,
                chapter_id=chapter_id,
            )
        )

    await db.commit()

    return {
        "message": "Session created",
        "session_id": session.id,
        "name": session.name,
        "subject": session.subject,
        "teacher_name": request.teacher_name,
        "join_code": session.join_code,
        "locked": False,
        "ended": False,
        "chapter_ids": list(
            set(request.chapter_ids)
        ),
    }


@router.get("/{session_id}")
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(
        Session,
        session_id,
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    result = await db.execute(
        select(Chapter)
        .join(
            SessionChapter,
            SessionChapter.chapter_id
            == Chapter.id,
        )
        .where(
            SessionChapter.session_id
            == session.id
        )
    )

    chapters = result.scalars().all()

    return {
        "id": session.id,
        "name": session.name,
        "subject": session.subject,
        "join_code": session.join_code,
        "locked": session.locked,
        "ended": False,
        "chapters": [
            {
                "id": chapter.id,
                "book_id": chapter.book_id,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
            }
            for chapter in chapters
        ],
    }


@router.post("/{session_id}/lock")
async def lock_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(
        Session,
        session_id,
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    session.locked = True

    await db.commit()

    return {
        "message": "Session locked",
        "session_id": session.id,
        "join_code": session.join_code,
        "locked": True,
    }


@router.post("/{session_id}/end")
async def end_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(
        Session,
        session_id,
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    # Delete everything belonging to this session.
    await db.execute(
        delete(Activity).where(
            Activity.session_id == session_id
        )
    )

    await db.execute(
        delete(SessionStudent).where(
            SessionStudent.session_id
            == session_id
        )
    )

    await db.execute(
        delete(SessionChapter).where(
            SessionChapter.session_id
            == session_id
        )
    )

    await db.delete(session)

    await db.commit()

    return {
        "message": "Session ended and deleted",
        "session_id": session_id,
        "ended": True,
        "deleted": True,
    }


@router.post("/join")
async def join_session(
    request: JoinSessionRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(
            Session.join_code
            == request.join_code.upper()
        )
    )

    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Invalid session code",
        )

    if not session.locked:
        raise HTTPException(
            status_code=403,
            detail="Session is not locked yet",
        )

    existing = await db.execute(
        select(SessionStudent).where(
            SessionStudent.session_id
            == session.id,
            SessionStudent.student_name
            == request.student_name,
        )
    )

    if not existing.scalar_one_or_none():
        db.add(
            SessionStudent(
                session_id=session.id,
                student_name=request.student_name,
            )
        )

    db.add(
        Activity(
            session_id=session.id,
            student_name=request.student_name,
            event_type="SESSION_JOIN",
            details="Student joined the session.",
        )
    )

    await db.commit()

    result = await db.execute(
        select(Chapter)
        .join(
            SessionChapter,
            SessionChapter.chapter_id
            == Chapter.id,
        )
        .where(
            SessionChapter.session_id
            == session.id
        )
    )

    chapters = result.scalars().all()

    return {
        "message": "Joined session successfully",
        "session_id": session.id,
        "session_name": session.name,
        "subject": session.subject,
        "student_name": request.student_name,
        "chapters": [
            {
                "id": chapter.id,
                "book_id": chapter.book_id,
                "chapter_number": chapter.chapter_number,
                "title": chapter.title,
            }
            for chapter in chapters
        ],
    }


@router.post("/{session_id}/leave")
async def leave_session(
    session_id: int,
    request: ActivityRequest,
    db: AsyncSession = Depends(get_db),
):
    if not await db.get(
        Session,
        session_id,
    ):
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    db.add(
        Activity(
            session_id=session_id,
            student_name=request.student_name,
            event_type="SESSION_EXIT",
            details=request.details
            or "Student left the session.",
        )
    )

    await db.commit()

    return {
        "message": "Student exit recorded",
    }


@router.post("/{session_id}/activity")
async def log_activity(
    session_id: int,
    request: ActivityRequest,
    db: AsyncSession = Depends(get_db),
):
    if not await db.get(
        Session,
        session_id,
    ):
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    db.add(
        Activity(
            session_id=session_id,
            student_name=request.student_name,
            event_type=request.event_type,
            details=request.details,
        )
    )

    await db.commit()

    return {
        "message": "Activity logged",
        "logged": True,
    }


@router.get("/{session_id}/activities")
async def get_activities(
    session_id: int,
    db: AsyncSession = Depends(get_db),
):
    if not await db.get(
        Session,
        session_id,
    ):
        raise HTTPException(
            status_code=404,
            detail="Session not found",
        )

    result = await db.execute(
        select(Activity)
        .where(
            Activity.session_id
            == session_id
        )
        .order_by(
            Activity.created_at.desc()
        )
    )

    activities = result.scalars().all()

    return [
        {
            "id": activity.id,
            "student_name": activity.student_name,
            "event_type": activity.event_type,
            "details": activity.details,
            "created_at": activity.created_at,
        }
        for activity in activities
    ]


@router.post("/{session_id}/search")
async def session_search(
    session_id: int,
    request: SearchRequest,
    db: AsyncSession = Depends(get_db),
):
    session = await db.get(
        Session,
        session_id,
    )

    if not session:
        raise HTTPException(
            status_code=404,
            detail="Session has ended or does not exist.",
        )

    student_result = await db.execute(
        select(SessionStudent).where(
            SessionStudent.session_id
            == session_id,
            SessionStudent.student_name
            == request.student_name,
        )
    )

    if not student_result.scalar_one_or_none():
        raise HTTPException(
            status_code=403,
            detail="Student is not a member of this session",
        )

    result = await db.execute(
        select(Chapter)
        .join(
            SessionChapter,
            SessionChapter.chapter_id
            == Chapter.id,
        )
        .where(
            SessionChapter.session_id
            == session_id
        )
    )

    chapters = result.scalars().all()

    allowed_pairs = [
        (
            chapter.book_id,
            chapter.chapter_number,
        )
        for chapter in chapters
    ]

    results = search_chunks(
        query=request.query,
        allowed_pairs=allowed_pairs,
        limit=1,
    )

    if not results:
        return {
            "query": request.query,
            "answer": "No relevant information was found in the approved material.",
            "result": None,
        }

    best = results[0]

    answer = generate_grounded_answer(
        question=request.query,
        source_text=best["text"],
        page=best["page"],
        chapter_title=best["chapter_title"],
    )

    citation = build_citation(
        page=best["page"],
        chapter_title=best["chapter_title"],
    )

    return {
        "query": request.query,
        "answer": answer,
        "citation": citation,
        "result": {
            "score": best["score"],
            "semantic_score": best["semantic_score"],
            "page": best["page"],
            "book_id": best["book_id"],
            "chapter_number": best["chapter_number"],
            "chapter_title": best["chapter_title"],
            "source_text": best["text"],
        },
    }
