EduRAG MVP status: Core pipeline is working — PDF upload/processing, chunking, embeddings, Qdrant retrieval, teacher chapter selection, session creation/locking, student joining, and activity logging are implemented and pushed to GitHub.

Remaining work:

Fix/improve chapter detection for large textbooks; add OCR fallback for image/scanned pages.
Make teacher dashboard fully functional — show teacher name, subject, active sessions, students, and live activity/notifications.
Improve session management — multiple sessions, proper End Session flow, automatic cleanup of ended sessions, and better student join/leave handling.
Connect and polish the full Teacher ↔ Student frontend flow.
Improve RAG answer quality — better chunking/reranking and professional source-grounded answers with page citations.
Final UI/UX polish, testing, bug fixing, and end-to-end demo.

After MVP: LLM-based RAG answers, question generation/assessment features, analytics, etc.
