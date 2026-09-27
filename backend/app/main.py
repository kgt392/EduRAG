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
)

from app.api.books import router as books_router
from app.api.rag import router as rag_router
from app.api.sessions import router as sessions_router


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(books_router)
app.include_router(rag_router)
app.include_router(sessions_router)


@app.get("/")
def root():
    return {
        "message": "EduRAG API is running",
        "version": "0.2.0",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
