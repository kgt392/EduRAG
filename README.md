EduRAG MVP status: Core pipeline is working — PDF upload/processing, chunking, embeddings, Qdrant retrieval, teacher chapter selection, session creation/locking, student joining, and activity logging are implemented and pushed to GitHub.

Remaining work:

Fix/improve chapter detection for large textbooks; add OCR fallback for image/scanned pages.
Make teacher dashboard fully functional — show teacher name, subject, active sessions, students, and live activity/notifications.
Improve session management — multiple sessions, proper End Session flow, automatic cleanup of ended sessions, and better student join/leave handling.
Connect and polish the full Teacher ↔ Student frontend flow.
Improve RAG answer quality — better chunking/reranking and professional source-grounded answers with page citations.
Final UI/UX polish, testing, bug fixing, and end-to-end demo.

After MVP: LLM-based RAG answers, question generation/assessment features, analytics, etc.

What is Already Built
1. Backend
FastAPI API
FastAPI backend
Swagger/OpenAPI documentation
CORS configuration for frontend communication
Health endpoint
Book ingestion
PDF upload
PDF storage
Text extraction using PyMuPDF
Page-number preservation
Page-aware chunk generation
Processed JSON output
Chapter processing
Chapter metadata generation
Chapter ranges and page mapping
PDF outline/bookmark-based detection
Heading-based fallback detection
Detection statistics for text and non-text pages
Embedding pipeline
Sentence Transformers
all-MiniLM-L6-v2
384-dimensional embeddings
Normalized embeddings
Vector database
Qdrant
Local persistent Qdrant storage for the MVP
Chunk metadata stored with vectors
Book/chapter/page metadata attached to vectors
Retrieval
Semantic vector search
Qdrant filtering
Retrieval restricted to approved session material
Cross-encoder reranking
Best relevant result returned
Page/source metadata returned with the answer
2. Teacher System
Teacher dashboard
Teacher portal
Session management interface
Book management interface
Chapter selection interface
Session activity interface
Book management
Upload educational PDF
Select subject
Process and index book
Display processing statistics
Chapter management
View chapters of an uploaded book
Select chapters for a session
Use different books/materials for sessions
Session management
Create multiple sessions
Session name
Subject
Teacher name
Book/chapter selection
Generate unique join code
Lock session
End session
View session activity
3. Student System
Student dashboard
Student portal
Join session using session code
Controlled session
Student identity
Session information
Approved chapters displayed
Fullscreen mode
Session status monitoring
Student monitoring

The current browser-level monitoring records events such as:

Tab switching
Browser/window blur
Fullscreen exit
Session exit
Session join

These events are sent to the backend and stored for teacher review.

Browser monitoring can detect supported browser events, but it cannot guarantee prevention of activity on another device.

4. RAG / Knowledge Retrieval

The current system supports a complete retrieval pipeline:

User question
     ↓
Embedding
     ↓
Qdrant similarity search
     ↓
Candidate chunks
     ↓
Cross-encoder reranking
     ↓
Best matching source
     ↓
Page + chapter citation

Example:

Question:
"What is an ad hoc wireless network?"

Retrieved source:
Page 54
Chapter 1

The student search is restricted to material assigned to the session.

Current Architecture
                    ┌─────────────────────┐
                    │     Next.js UI      │
                    │  React + TypeScript  │
                    │      Tailwind CSS    │
                    └──────────┬──────────┘
                               │ HTTP
                               ▼
                    ┌─────────────────────┐
                    │      FastAPI        │
                    │      Backend        │
                    └──────┬───────┬──────┘
                           │       │
             ┌─────────────┘       └──────────────┐
             ▼                                    ▼
      ┌─────────────┐                      ┌─────────────┐
      │  SQLite /   │                      │   Qdrant    │
      │ SQLAlchemy  │                      │ Vector DB   │
      └─────────────┘                      └──────┬──────┘
                                                 │
                                                 ▼
                                      ┌────────────────────┐
                                      │ Sentence Transformer│
                                      │ Embedding Model     │
                                      └────────────────────┘

PDF
 │
 ▼
PyMuPDF
 │
 ▼
Pages + Chapters
 │
 ▼
Chunks
 │
 ▼
Embeddings
 │
 ▼
Qdrant
Technology Stack
Frontend
Next.js
React
TypeScript
Tailwind CSS
Backend
Python
FastAPI
SQLAlchemy
Pydantic
Document Processing
PyMuPDF
Machine Learning / NLP
Sentence Transformers
Cross-Encoder reranking
PyTorch / Transformers dependencies
Vector Database
Qdrant
Current Database
SQLite for the local MVP
Future Production Database
PostgreSQL
Development
Git
GitHub
Uvicorn
npm
Python virtual environment
Project Structure
EduRAG/
│
├── backend/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   ├── books.py
│   │   │   ├── rag.py
│   │   │   └── sessions.py
│   │   │
│   │   ├── core/
│   │   │   ├── database.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── models/
│   │   │   ├── models.py
│   │   │   └── __init__.py
│   │   │
│   │   ├── services/
│   │   │   ├── pdf_processor.py
│   │   │   └── vector_store.py
│   │   │
│   │   ├── main.py
│   │   └── __init__.py
│   │
│   ├── requirements.txt
│   ├── data/
│   │   ├── books/
│   │   ├── processed/
│   │   └── qdrant/
│   │
│   └── edurag.db
│
├── frontend/
│   │
│   ├── app/
│   │   ├── teacher/
│   │   │   ├── page.tsx
│   │   │   ├── upload/
│   │   │   ├── chapters/
│   │   │   └── session/
│   │   │
│   │   ├── student/
│   │   │   ├── page.tsx
│   │   │   ├── join/
│   │   │   └── session/
│   │   │
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── package.json
│   └── next.config.ts
│
├── .gitignore
└── README.md
API Overview
Books
POST /books/upload
GET  /books/
GET  /books/{book_id}/chapters
POST /books/{book_id}/reprocess
RAG
POST /rag/index/{book_id}
POST /rag/search
Sessions
GET  /sessions/
POST /sessions/
GET  /sessions/{session_id}
POST /sessions/{session_id}/lock
POST /sessions/{session_id}/end
POST /sessions/join
POST /sessions/{session_id}/leave
POST /sessions/{session_id}/activity
GET  /sessions/{session_id}/activities
POST /sessions/{session_id}/search
How to Run
Backend
cd backend
source venv/Scripts/activate
uvicorn app.main:app --reload

Backend:

http://127.0.0.1:8000

API documentation:

http://127.0.0.1:8000/docs
Frontend

Open another terminal:

cd frontend
npm run dev

Frontend:

http://localhost:3000
Current End-to-End Demo

The current MVP can demonstrate:

Teacher
   ↓
Upload textbook
   ↓
Process PDF
   ↓
Create chunks + embeddings
   ↓
Store vectors
   ↓
Select book/chapter
   ↓
Create session
   ↓
Lock session
   ↓
Generate join code
        │
        ▼
Student
   ↓
Enter join code
   ↓
Join session
   ↓
Receive approved material
   ↓
Ask a question
   ↓
Retrieve relevant source
   ↓
See page/source information
   ↓
Activity events sent to backend
        │
        ▼
Teacher
   ↓
View student activity
Remaining MVP Work

The core vertical slice is working, but the following work remains before calling the MVP fully polished:

1. Chapter detection reliability
Test the new chapter detection against multiple textbook formats
Improve handling of unusual table-of-contents structures
Detect scanned/image-only pages
Add OCR fallback where required
2. Teacher monitoring
Better live student list
Clear join/leave notifications
Improved activity timeline
Better active-session management
3. Student session controls
Better session lifecycle handling
More robust exit handling
Improved session status UI
4. RAG answer quality
Further chunk-quality improvements
Better reranking evaluation
Better grounded answer formatting
Stronger page citation presentation
5. UI / UX
Consistent design system
Better navigation
Better loading/error states
Empty states
Responsive layouts
More polished teacher and student dashboards
6. Testing
End-to-end testing
Multiple-book testing
Multiple-session testing
Permission testing
Retrieval quality evaluation
What We Are Building Next

After the MVP, EduRAG will expand from a controlled document retrieval system into a broader educational platform.

Phase 2 — Full RAG
Teacher-approved documents
          ↓
Question
          ↓
Retrieval
          ↓
LLM
          ↓
Grounded answer
          ↓
Book + page citations
Phase 3 — Assessment Engine

Planned features:

Question bank
AI-assisted question generation
Assessment creation
Open-book / closed-book modes
Student submissions
Answer evaluation
Teacher review
Phase 4 — Practical / Coding Assessment

Planned features:

Coding questions
Code execution sandbox
Automated test cases
Result evaluation
Practical assessments
Phase 5 — Analytics

Planned features:

Student performance
Topic-level performance
Weak-area analysis
Assessment history
Repetition analytics
Teacher dashboards
Phase 6 — Production

Planned improvements:

PostgreSQL
Authentication and role-based access
Docker
Cloud deployment
Better security
Scalable vector infrastructure
Production-grade monitoring
Product Vision

EduRAG is intended to evolve into:

                    EduRAG
                       │
       ┌───────────────┼────────────────┐
       │               │                │
 Knowledge        Assessment        Analytics
 Library           Engine            Engine
       │               │                │
       ▼               ▼                ▼
 Books/PDFs       Tests/Questions    Performance
 RAG              Evaluation          Insights
       │               │                │
       └───────────────┼────────────────┘
                       ▼
              Teacher + Student
                   Platform
MVP Goal

The immediate goal is to prove one complete, reliable workflow for a single subject:

Teacher uploads a textbook → chooses the exact chapters → creates and locks a session → student joins → student can access/search only the approved material → student activity is recorded → teacher can monitor the session.

Once this workflow is stable, additional AI and assessment features will be added on top of the same architecture.

License

Project license to be decided.

Authors

EduRAG — Final Year Project

Built as an academic project with a focus on:

Retrieval-Augmented Generation
Educational technology
NLP
Vector search
Controlled digital assessment
Full-stack AI systems
