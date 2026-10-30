"""
Run from the backend directory:
    python -m app.scripts.create_teacher --name "Teacher Name" --email teacher@example.com
"""

import argparse
import asyncio

from sqlalchemy import select

from app.core.auth import hash_password
from app.core.database import AsyncSessionLocal, Base, engine
from app.models.models import Teacher


async def create_teacher(full_name: str, email: str, password: str) -> None:
    # Ensure the tables exist even when the FastAPI server has not been started yet.
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        existing = await db.execute(
            select(Teacher).where(Teacher.email == email.lower())
        )
        if existing.scalar_one_or_none() is not None:
            raise SystemExit(f"A teacher account already exists for {email}.")

        teacher = Teacher(
            full_name=full_name.strip(),
            email=email.strip().lower(),
            password_hash=hash_password(password),
            is_active=True,
        )
        db.add(teacher)
        await db.commit()
        await db.refresh(teacher)
        print(
            f"Teacher account created: {teacher.full_name} <{teacher.email}> (ID {teacher.id})"
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Create an EduRAG teacher account")
    parser.add_argument("--name", required=True, help="Teacher's display name")
    parser.add_argument("--email", required=True, help="Teacher's login email")
    args = parser.parse_args()

    full_name = args.name.strip()
    email = args.email.strip().lower()
    if not full_name:
        parser.error("--name cannot be empty")
    if "@" not in email or email.startswith("@") or email.endswith("@"):
        parser.error("--email must be a valid email address")

    password = input("Set teacher password (minimum 12 characters): ")
    confirm = input("Confirm password: ")
    if password != confirm:
        parser.error("Passwords do not match")
    if len(password) < 12:
        parser.error("Password must contain at least 12 characters")
    if len(password.encode("utf-8")) > 72:
        parser.error("Password must be no longer than 72 UTF-8 bytes (bcrypt limit)")

    asyncio.run(create_teacher(full_name, email, password))


if __name__ == "__main__":
    main()
