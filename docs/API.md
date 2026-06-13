# 📚 REST API Documentation — my-ai-brain

> **Base URL:** `http://localhost:3005`
> **Auth:** Bearer token via `Authorization: Bearer <REST_API_KEY>`

---

## Authentication

All endpoints (except health check) require API key:

```
Authorization: Bearer <REST_API_KEY>
```

---

## Endpoints

### Health Check
```
GET /api/health
Response: { "status": "ok", "uptime": 1234, "timestamp": "2024-01-01T00:00:00Z" }
```

### Ask AI
```
POST /api/ask
Body: { "query": "Explain RAG", "options: { "isDeep": false } }
Response: { "ok": true, "answer": "...", "sources": [...], "provider": "openrouter" }
```

### Quick Note (iOS Shortcuts)
```
POST /api/notes
Body: { "content": "Remember this", "tags": ["ios"] }
Response: { "ok": true, "id": "..." }
```

### Flashcards
```
GET  /api/flashcards                    → List flashcards
GET  /api/flashcards/due                → Get due flashcards
GET  /api/flashcards/stats              → Get statistics
POST /api/flashcards                    → Create flashcard { question, answer, category }
POST /api/flashcards/:id/review         → Review flashcard { correct: true/false }
DELETE /api/flashcards/:id              → Delete flashcard
```

### Sandbox
```
POST /api/sandbox/run                   → Execute code { code, language }
GET  /api/sandbox/languages             → List supported languages
```

### Debate
```
POST /api/debate                        → Start debate { problem, quick: false }
Response: { "ok": true, "result: { "winner": "Coder A", "summary": "..." } }
```

### Knowledge Graph
```
GET  /api/kg/history/:topic             → Get recent facts about topic
GET  /api/kg/whenwas/:topic?date=...    → Query KG at specific time
```

### System
```
GET  /api/system/metrics                → Prometheus metrics
GET  /api/system/health                 → Detailed health check
```

---

## Error Responses

```json
{ "error": "Unauthorized", "status": 401 }
{ "error": "Rate limit exceeded", "status": 429 }
{ "error": "Internal server error", "status": 500 }
```
