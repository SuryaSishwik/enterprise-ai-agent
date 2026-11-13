# Enterprise AI Knowledge & Automation Agent

[![Python](https://img.shields.io/badge/Python-3.11%20%7C%203.14-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18+-61dafb.svg)](https://react.dev/)
[![LangChain](https://img.shields.io/badge/LangChain-1.5+-coral.svg)](https://www.langchain.com/)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.2+-blueviolet.svg)](https://www.langchain.com/langgraph)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-VectorStore-orange.svg)](https://www.trychroma.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16+-blue.svg)](https://www.postgresql.org/)

An intelligent, enterprise-grade digital assistant combining **Generative AI**, **Retrieval-Augmented Generation (RAG)**, **LangGraph Agentic Workflows**, **Predefined REST Tools**, and **PostgreSQL Database Integration**.

Built for AidenAI technical demonstrations and production enterprise deployment.

---

## 1. Problem Statement & Value Proposition

In organizations with hundreds or thousands of employees, vital operational knowledge is scattered across fragmented documents:
- HR leave and attendance policies
- Remote work agreements and home office expense guidelines
- IT security protocols and access procedures

When an employee asks *"How many paid leaves can I take in a year?"*, finding the answer traditionally requires browsing portals or emailing HR. Furthermore, when they need action—such as *"Create a support ticket because I cannot access my company account"*—a standard chatbot cannot help.

This system solves both challenges by unifying:
1. **Semantic RAG Pipeline:** Extracts, chunks, embeds, and retrieves grounded answers strictly citing document sources.
2. **AI Agent Tool Calling:** Evaluates intents, checks parameters, and executes authorized business tasks (e.g. creating support tickets in PostgreSQL with priority levels, submitting WFH requests) through controlled APIs.

---

## 2. Complete Architecture

```
Employee / Admin
      │
      ▼
React Frontend (Vite / React.js)
      │
      ▼ (REST / OAuth2 JWT)
FastAPI Backend
      │
      ▼
Authentication & Authorization (RBAC: Admin vs Employee)
      │
      ▼
Request Router / LangGraph (StateGraph)
      │
      ├─── [Question Intent] ──► RAG Pipeline ──► ChromaDB ──► Retrieved Chunks ──► LLM (OpenAI)
      │                                                                               │
      ├─── [Business Action]  ──► AI Agent Tools ──► PostgreSQL / REST APIs ──────────┤
      │                                                                               │
      └─── [Hybrid Query]    ──► (Executes RAG Retrieval + Agent Tools) ──────────────┘
                                                              │
                                                              ▼
                                                   Response Synthesizer
                                                              │
                                                              ▼
                                                     FastAPI ──► React UI
```

### Layer-by-Layer Breakdown
| Layer | Technology | Responsibility |
|---|---|---|
| **Presentation** | React.js / Vite | Responsive user interface with Chat, Knowledge Base, Uploads & Tickets |
| **API** | FastAPI / Pydantic | High-performance asynchronous REST endpoints |
| **Security** | OAuth 2.0 / JWT / Bcrypt | Secure authentication & Role-Based Access Control |
| **Intelligence** | LangGraph & LangChain | Stateful agent routing, tool selection, graph orchestration |
| **Retrieval** | ChromaDB & Embeddings | Cosine similarity vector search over indexed document chunks |
| **AI Synthesis** | OpenAI GPT-4o / Grounded LLM | Synthesizes grounded answers strictly using retrieved context |
| **Integration** | LangChain `@tool` & REST APIs | Controlled execution of business tasks |
| **Data Layer** | PostgreSQL & SQLite | Relational records (Users, Support Tickets, Leave Requests) |

---

## 3. Two Core Workflows

### A. Document Ingestion Workflow
1. **Upload:** Admin uploads PDF, DOCX, or TXT document through the UI.
2. **Extraction:** **PyMuPDF (`fitz`)** extracts text preserving page layout and metadata.
3. **Chunking:** `RecursiveCharacterTextSplitter` divides text into 700-character chunks with 120-character overlap.
4. **Embeddings:** Generates 1536-dimensional embeddings.
5. **Storage:** Upserts vector embeddings and metadata (`source`, `page`, `chunk_id`) into **ChromaDB**.

### B. Question Answering & Automation Workflow
1. **User Query:** Employee enters prompt in the React UI (e.g. *"Summarize the company's work-from-home policy and create a request for working remotely next Monday"*).
2. **Router Node:** LangGraph classifies intent into `KNOWLEDGE_QUERY`, `BUSINESS_ACTION`, or `HYBRID`.
3. **RAG Retrieval:** ChromaDB semantic search retrieves relevant policy chunks with cosine similarity.
4. **Agent Action:** LangGraph calls predefined tools (e.g. `submit_remote_work_request` or `create_support_ticket`), validating arguments and writing to PostgreSQL.
5. **Synthesis:** Grounds the answer in retrieved chunks, attaches source citations, confirms the generated Ticket/Request ID, and returns the response.

---

## 4. Project Folder Structure

```
enterprise-ai-agent/
│
├── frontend/                     # React.js web application
│   ├── src/
│   │   ├── App.jsx               # Dashboard, Chat, KB, Uploads, Tickets UI
│   │   ├── App.css               # Modern enterprise styles
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # FastAPI Python application
│   ├── main.py                   # App entrypoint, lifespan & CORS
│   │
│   ├── api/                      # REST API endpoints
│   │   ├── auth.py               # JWT login & RBAC dependencies
│   │   ├── chat.py               # AI Chat & LangGraph execution
│   │   ├── documents.py          # Document upload & ChromaDB indexing
│   │   └── tickets.py            # Support ticket & WFH request management
│   │
│   ├── ai/                       # AI and RAG components
│   │   ├── llm.py                # LLM initialization (OpenAI / Grounded local)
│   │   ├── embeddings.py         # Embedding model (OpenAI / Vectorizer)
│   │   ├── rag.py                # Retrieval pipeline & citation builder
│   │   └── prompts.py            # Grounded system prompts
│   │
│   ├── agents/                   # Agent orchestration
│   │   ├── workflow.py           # LangGraph StateGraph & compiled router
│   │   └── tools.py              # LangChain @tool definitions
│   │
│   ├── services/
│   │   └── document_processor.py # PyMuPDF extraction & ChromaDB indexer
│   │
│   ├── database/
│   │   └── connection.py         # PostgreSQL / SQLite connection & seeder
│   │
│   └── models/                   # SQLAlchemy ORM models
│       ├── user.py               # User table
│       ├── ticket.py             # SupportTicket table
│       ├── leave_request.py      # LeaveAndRemoteRequest table
│       └── document.py           # DocumentRecord table
│
├── documents/                    # Official company policy documents (.pdf, .txt)
│   ├── HR_Leave_and_Attendance_Policy_2026.pdf
│   ├── Remote_Work_and_Reimbursement_Policy_2026.pdf
│   └── IT_Support_and_Security_Policy_2026.pdf
│
├── tests/
│   └── test_system.py            # Automated end-to-end test suite
│
├── Dockerfile                    # Containerization for backend
├── docker-compose.yml            # Multi-container orchestration (PostgreSQL + App)
├── requirements.txt              # Python dependencies
└── README.md
```

---

## 5. Getting Started & Running the Project

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm
- (Optional) PostgreSQL & Docker

### Option 1: Quick Local Setup

1. **Install Backend Dependencies:**
   ```bash
   cd enterprise-ai-agent
   python -m pip install -r requirements.txt
   ```

2. **Configure Environment Variables (Optional):**
   Create a `.env` file in `enterprise-ai-agent/`:
   ```env
   OPENAI_API_KEY=your-openai-api-key
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/enterprise_ai_db
   JWT_SECRET_KEY=your-secret-jwt-key
   ```
   *(Note: If no PostgreSQL credentials or OpenAI key are set, the system automatically uses SQLite and the local grounded AI engine for friction-free offline execution).*

3. **Run Automated Test Suite:**
   ```bash
   python tests/test_system.py
   ```

4. **Start FastAPI Backend:**
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```

5. **Start React Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

### Option 2: Docker Compose Setup

Run both PostgreSQL and the Enterprise AI Backend with a single command:
```bash
docker-compose up --build
```

---

## 6. Interview Talking Points (AidenAI Preparation)

| Interview Question | Key Answer to Deliver |
|---|---|
| **Why use RAG instead of fine-tuning?** | Company policies change frequently. Fine-tuning is static, expensive, and prone to hallucinations. RAG allows real-time document updates, deterministic citations, and eliminates training overhead. |
| **What is LangGraph's role over basic LangChain?** | While LangChain chains are linear DAGs, LangGraph models cyclical, stateful agent graphs with conditional branching, error handling, and multi-step tool loops. |
| **Why separate PostgreSQL and ChromaDB?** | PostgreSQL handles ACID relational operations (users, tickets, audit logs, permissions). ChromaDB is optimized for high-dimensional vector similarity search. |
| **How are hallucinations minimized?** | We enforce a strict system prompt constraint, require direct chunk citations, set LLM temperature to 0.1, and instruct the model to state when information is absent. |
