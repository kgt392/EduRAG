from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    COOKIE_NAME,
    COOKIE_SECURE,
    SESSION_MAX_HOURS,
    hash_session_token,
    new_session_token,
    verify_password,
)
from app.core.database import get_db
from app.models.models import Teacher, TeacherLoginSession

router = APIRouter(prefix="/auth", tags=["Teacher Authentication"])


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)


def _set_session_cookie(response: Response, token: str) -> None:
    # No Max-Age or Expires: this is a browser-session cookie.
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
        path="/",
    )


def _clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        httponly=True,
        secure=COOKIE_SECURE,
        samesite="lax",
    )


async def get_current_teacher(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Teacher:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teacher login required.",
        )

    result = await db.execute(
        select(TeacherLoginSession).where(
            TeacherLoginSession.token_hash == hash_session_token(token)
        )
    )
    login_session = result.scalar_one_or_none()
    now = datetime.utcnow()

    if login_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teacher login required.",
        )

    if login_session.expires_at <= now:
        await db.delete(login_session)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teacher session expired. Please log in again.",
        )

    teacher = await db.get(Teacher, login_session.teacher_id)
    if teacher is None or not teacher.is_active:
        await db.delete(login_session)
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Teacher login required.",
        )

    return teacher


@router.post("/login")
async def teacher_login(
    payload: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    email = payload.email.strip().lower()
    result = await db.execute(select(Teacher).where(Teacher.email == email))
    teacher = result.scalar_one_or_none()

    # Use the same error for unknown, disabled, and incorrect-password accounts.
    if (
        teacher is None
        or not teacher.is_active
        or not verify_password(payload.password, teacher.password_hash)
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = new_session_token()
    login_session = TeacherLoginSession(
        teacher_id=teacher.id,
        token_hash=hash_session_token(token),
        expires_at=datetime.utcnow() + timedelta(hours=SESSION_MAX_HOURS),
    )
    db.add(login_session)
    await db.commit()

    _set_session_cookie(response, token)
    return {
        "message": "Login successful.",
        "teacher": {
            "id": teacher.id,
            "full_name": teacher.full_name,
            "email": teacher.email,
        },
    }


@router.get("/me")
async def current_teacher(
    teacher: Teacher = Depends(get_current_teacher),
):
    return {
        "id": teacher.id,
        "full_name": teacher.full_name,
        "email": teacher.email,
    }


@router.post("/logout")
async def teacher_logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    token = request.cookies.get(COOKIE_NAME)
    if token:
        result = await db.execute(
            select(TeacherLoginSession).where(
                TeacherLoginSession.token_hash == hash_session_token(token)
            )
        )
        login_session = result.scalar_one_or_none()
        if login_session is not None:
            await db.delete(login_session)
            await db.commit()

    _clear_session_cookie(response)
    return {"message": "Logged out."}
