# Assignment 02 — Execution Plan

**Project:** AquaGuard — Smart Aquarium IoT Analytics Platform
**Domain:** IoT (continuity from Assignment 01)
**Group:** 4 students
**Stack:** FastAPI + MongoDB Atlas + React/TS + Recharts + Ollama (Gemma 4 8B)

---

## Status snapshot

| Rubric requirement | Status |
|---|---|
| 1. Dataset (10+ vars, same domain, cited) | ✅ Done — 23 columns, `data/smart_aquarium_dataset_v6.1.csv` |
| 2. System implementation (FE/BE/DB/deploy) | ✅ Done — FastAPI + React + Atlas + MQTT |
| 3. Visual analytics dashboard | ✅ Done — 7 advanced views + 3 simple views, brushing/linking, drill-down |
| 4. UX design (personas, flow, accessibility) | ⚠️ Partial — implemented, needs documentation |
| 5. Conversational chatbot/agent (LLM-powered) | 🔨 In progress — Ollama + Gemma 4 |
| 6a. Demo + repo | ✅ Done |
| 6b. Technical & UX report | ⏳ Pending |
| 6c. 10-min presentation/viva | ⏳ Pending |
| 7. AI Tools Usage Disclosure | ⏳ Pending |

---

## Phase 1 — Chatbot integration (~4–6 hrs) · IN PROGRESS

LLM: **Ollama + `gemma4:e4b`** (8B params, native tool-calling, 131K context, runs locally — no API key)

### Files being created

| File | Purpose |
|---|---|
| `backend/app/services/chat_tools.py` | 6 tools the LLM calls |
| `backend/app/services/ollama_client.py` | Ollama HTTP client + tool-call loop |
| `backend/app/routers/chat.py` | `POST /api/chat` (streaming) |
| `backend/app/main.py` (edit) | Register chat router |
| `backend/.env` (edit) | Add `OLLAMA_URL`, `OLLAMA_MODEL` |
| `frontend/src/app/components/ChatPanel.tsx` | Floating widget |
| `frontend/src/app/App.tsx` (edit) | Mount ChatPanel globally |

### Tools the chatbot can call
1. `get_latest_reading()` — current sensor values + WQI
2. `get_history(days, parameter)` — historical data + trend stats
3. `get_forecast()` — 24h pH + temp SARIMA forecast summary
4. `get_anomalies(limit)` — recent anomaly events
5. `get_status()` — system mode, days since install, maintenance
6. `explain_wqi()` — WQI formula breakdown with current values

### Demo questions to validate
- "What's the current water quality?"
- "Why is my WQI low?"
- "Show TDS trend over the past week"
- "Are there any anomalies recently?"
- "Will my temperature spike in the next 24h?"
- "Should I do a water change?"

---

## Phase 2 — UX documentation (~3 hrs)

Deliverables (for the report, not code):

- [ ] **Persona definitions** — Alex (Hobbyist) + Dr. Perera (Aquatic biologist)
- [ ] **User flow diagram** — entry → mode select → discovery → chatbot → action (Figma/draw.io)
- [ ] **User journey map** — pain points before vs. after AquaGuard
- [ ] **Accessibility audit** — color contrast, keyboard nav, ARIA labels
- [ ] **Heuristic evaluation** — Nielsen 10 heuristics walkthrough

---

## Phase 3 — Polish & visual storytelling (~2 hrs)

- [ ] First-visit onboarding tooltip tour
- [ ] Insight cards driven by chatbot (e.g. "Healthier than 80% of last week")
- [ ] Cross-page deep-linking from chatbot answers
- [ ] Loading skeletons (replace mock-data fallbacks)

---

## Phase 4 — Technical & UX Evaluation Report (~6 hrs)

Required structure:

1. Problem definition & context
2. Dataset description & preprocessing
3. System architecture (mermaid diagram + chatbot block)
4. UX design rationale (personas, flow, heuristics)
5. Visual analytics design decisions (color theory, gestalt, interactivity)
6. Chatbot/agent architecture (Ollama + Gemma + tool-loop)
7. Decision-support capabilities (with screenshots)
8. Limitations & future improvements
9. **AI Tools Usage Disclosure** ⚠️ MANDATORY

---

## Phase 5 — Demo prep (~2 hrs)

- [ ] 10-min demo script (Alex story arc → Advanced → chatbot → action)
- [ ] Backup screen recordings per dashboard page
- [ ] Q&A prep sheet (anticipated viva questions)

---

## Total estimate: 17–19 hrs

| Day | Phase |
|---|---|
| Day 1 | Phase 1 (chatbot) |
| Day 2 | Phase 2 + 3 (UX docs + polish) |
| Day 3 | Phase 4 + 5 (report + demo) |

---

## Run commands

```bash
# Activate env
conda activate aquarium

# Backend
cd backend
python -m uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm run dev

# Or one shot
start-dev.bat

# Ollama (must be running for chatbot)
ollama serve   # if not already a service
ollama list    # confirms gemma4:e4b is available
```

URLs:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs
- Ollama: http://localhost:11434
