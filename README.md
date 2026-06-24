# My AI Brain — Serena, AI Companion

> Multi-agent AI system that self-learns, self-evolves, and self-secures.
> **VPS/PM2 Production | Ponytail Optimized**
> **197 tests PASS | 20 Agents | 7-tier RAG | Plugin System | Career Agent**

---

## Architecture

```
Discord Bot (dumb client)
    ↓ HTTP/WebSocket
API Server (gateway.js:3005)
    ↓
Orchestrator (RouterAgent + Persona Routing)
    ↓
20 Agents (Rag, Coder, Socratic, Manim, Vision, Debate, ...)
    ↓
7-tier RAG Pipeline
    ↓
SQLite Vector Store (domain-filtered) + BM25 + Knowledge Graph
```

### Tier System
- **Tier 1**: Persona Routing (Therapist vs Technical) — skip RAG for casual chat
- **Tier 2**: Decoupled Orchestrator — REST API independent of Discord
- **Tier 3**: T-Shaped Learning — deep (spaced repetition) + broad (RSS news)
- **Tier 4**: Career Agent — interview prep, job scraper, outreach drafting

---

## Discord Commands

### Q&A & Search
```
!ask <question>              → RAG-powered Q&A (7-tier pipeline)
!ask <question> --deep       → Deep search (8 results, 5 web sources)
!learn <url>                 → Learn from URL/PDF
!path <topic>                → Generate learning path (Easy → Hard, from KG)
!path <topic> --short        → Only 5 next steps
!path <topic> --gaps         → Only topics to learn
!recap <topic>               → Generate learning recap
!history <topic>             → View recent facts from KG
!whenwas <topic> [date]      → Query KG at specific point in time
!memory <content>            → Save personal memory
```

### Code & Algorithms
```
!run <code>                  → Run code in Sandbox
!code <problem>              → Write + run code
!debate <problem>            → Multi-agent debate
!cli <tool>                  → Find CLI command (0% hallucination)
!done                        → Mark algo problem as solved
```

### Learning & Review
```
!quiz                        → Spaced repetition flashcards (FSRS)
!quiz stats                  → View statistics
!answer <id> <answer>        → Answer flashcard
!learn <url>                 → Learn from URL/PDF
!path <topic>                → Generate learning path
!cs <subject>                → CS curriculum by topic
!cs list                     → List CS subjects
!gaps                        → View knowledge gaps
!resources <keyword>         → Find free DevOps resources
```

### Analysis & Audit
```
!analyze <code>              → Code quality analysis
!audit <code>                → Security scan
!perf <code>                 → Performance profiling
!logs <text>                 → Log analysis
```

### Creative
```
!animate <description>       → Generate animation video
```

### Multimodal
```
!vision + image              → Analyze image
!voice + audio               → Transcribe speech
```

### Advanced
```
!review                      → Shadow Review
!incident                    → Chaos Engineering
!memory <content>            → Save memory
!f1stats                     → F1 Score Dashboard
```

### Voice
```
!join                        → Join voice channel
!leave                       → Leave voice channel
!vc on                       → Enable voice conversation
!vc off                      → Disable voice conversation
!voice study                 → Study mode (silent)
```

### System
```
!plugins                     → List plugins
!plugin unload <name>        → Unload plugin
!agentstats                  → Agent usage statistics
```

### Career & Interview
```
!draft <JD text>             → Draft outreach (3 versions)
!interview start             → Mock interview
!interview end               → End mock interview
```

---

## Agents (20 Total)

| Agent | Status | Description |
|-------|--------|-------------|
| `RagAgent` | ✅ Active | RAG-powered Q&A, web search, knowledge retrieval |
| `CoderAgent` | ✅ Active | Write + run code with debug loop |
| `SocraticAgent` | ✅ Active | Socratic learning method |
| `DebateAgent` | ✅ Active | Multi-agent debate |
| `VisionAgent` | ✅ Active | Image analysis via Gemini Vision |
| `VoiceAgent` | ✅ Active | Speech transcription |
| `ManimAgent` | ✅ Active | Animation video generation |
| `MentorAgent` | ✅ Active | Shadow Review |
| `IncidentAgent` | ✅ Active | Chaos Engineering simulator |
| `AnalysisAgent` | ✅ Active | Code quality analysis |
| `SecurityAuditor` | ✅ Active | Security scanning |
| `SuggestionAgent` | ✅ Active | Proactive learning suggestions |
| `PersonaAgent` | ✅ Active | Persona routing (Therapist vs Technical) |
| `EvoAgent` | ✅ Active | Self-evolution background agent |
| `GraphAgent` | ✅ Active | Knowledge graph agent |
| `PlannerAgent` | ✅ Active | OODA task planner |
| `OutreachDraftAgent` | ✅ Active | Career outreach drafting |
| `RecapAgent` | ✅ Active | Learning recap generation |
| `ActionableAgent` | ✅ Active | Actionable insights |
| `PdfAgent` | ✅ Active | PDF processing |

---

## Cron Jobs (GitHub Actions)

| Job | Schedule | Description |
|-----|----------|-------------|
| `algo-daily` | 8AM PDT daily | Daily LeetCode problem → Discord |
| `tech-news` | 5x/day PDT | HN + Reddit + GitHub trending → Discord |
| `job-scraper` | 3x/day PDT | Remote jobs → Discord |
| `nightly-scraper` | 2AM PDT | Scrape + embed sources into vector DB |
| `cron-scraper` | 5x/day PDT | Full pipeline (GitHub, YouTube, arXiv, Reddit, SO, Tavily) |

---

## Tech Stack

- **Runtime**: Node.js 22+ (ESM)
- **Database**: SQLite (node:sqlite) with WAL mode
- **Vector Store**: SQLite brute-force + HNSW in-memory index
- **LLM**: Groq (llama-3.3-70b) → OpenRouter → Gemini → Local fallback
- **Search**: BM25 + Vector RRF fusion + HyDE
- **TTS**: edge-tts (female voice)
- **STT**: Groq Whisper API
- **Discord**: discord.js v14
- **Process Manager**: PM2
- **CI/CD**: GitHub Actions

---

## License

MIT License — Serena, AI Companion
