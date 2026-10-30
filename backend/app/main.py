from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.database import engine, Base
from app.models.models import (
    Book,
    Chapter,
    Session,
    SessionChapter,
    SessionStudent,
    Activity,
    Teacher,
    TeacherLoginSession,
)

from app.api.books import router as books_router
from app.api.rag import router as rag_router
from app.api.sessions import router as sessions_router
from app.api.auth import router as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield


app = FastAPI(
    title="EduRAG API",
    description="Controlled AI-assisted learning platform",
    version="0.2.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    # Allow the UI when opened using a private LAN IPv4 address.
    allow_origin_regex=(
        r"^http://(?:localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}):3000$"
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Existing Books, RAG, and Sessions routers are intentionally unchanged.
# Auth endpoints are independent; API authorization can be added separately later.
app.include_router(books_router)
app.include_router(rag_router)
app.include_router(sessions_router)
app.include_router(auth_router)


@app.get("/")
def root():
    return {
        "message": "EduRAG API is running",
        "version": "0.2.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
