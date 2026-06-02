AgentIQ Project Documentation

AgentIQ – Project Documentation

1. Project Overview

AgentIQ is an AI-powered website and pitch deck generation platform that allows users to describe a business idea and automatically generate:

- Production-ready React websites
- Investor pitch decks
- AI-generated design direction
- Real-time generation workflow
- User project history and persistence

---

2. Tech Stack

Frontend

- React.js
- JavaScript
- Vite
- CSS
- Firebase Authentication

Backend

- Node.js
- Express.js
- LangChain
- LangGraph
- Server-Sent Events (SSE)

Database

- Firebase Firestore

Authentication

- Firebase Auth
- Google OAuth
- JWT Verification

AI Layer

- OpenAI LLMs
- LangChain
- LangGraph

Deployment (Upcoming)

- GitHub API
- Vercel API
- Stripe

---

3. Architecture Understanding

LangChain

Used to:

- Call LLMs
- Prompt Templates
- Output Parsing
- LCEL Chains
- Runnable Sequences
- Streaming Responses

LangGraph

Used to:

- Multi-agent orchestration
- Agent collaboration
- Workflow management
- State transitions

LangSmith

Used for:

- Agent tracing
- Debugging
- Workflow monitoring

SSE (Server Sent Events)

Used for:

- Streaming generation progress
- Real-time frontend updates
- Narration updates

---

4. Development Timeline

Phase 1 – AI Architecture Research

Date: 12 June 2026

Completed:

- Backend server verification
- API route testing
- LLM fundamentals
- Agentic AI workflows
- RAG concepts
- LangChain
- Prompt Templates
- LCEL
- Output Parsers
- Runnable Sequences
- Batch Processing
- LangGraph
- LangSmith
- SSE with Express.js

Outcome:

- Understood complete AgentIQ architecture
- Understood AI workflow design
- Planned implementation order

Status: Complete

---

Phase 2 – Authentication & Persistence

Date: 29 June 2026

Completed

Authentication

- Firebase Authentication
- Google OAuth
- Production login flow

Backend Security

- JWT protection
- Token verification

Database

- Firestore integration
- Users collection
- Chats collection

Chat System

- Save prompts
- Save generated outputs
- Store userId
- Chat history
- Sidebar history
- Previous project retrieval

User System

- Generated websites linked to users
- Generated pitch decks linked to users

UI

- History sidebar
- Chat selection
- Project persistence

Firestore Structure

users

userId

- email
- createdAt

chats

chatId

- userId
- prompt
- response
- createdAt

Status: In Progress

---

Remaining Phase 2 Tasks

Image Upload

- Add upload button
- Upload multiple images
- Backend image handling

Stock Image Workflow

- AI asks image preference
- Use Unsplash API
- Auto-fetch stock images
- Inject images into generated website

User Image Workflow

- Accept uploaded images
- Use images in website generation
- Use images in pitch deck generation

History Persistence

- Save image URLs
- Save uploaded image references
- Restore images when opening old chats

Estimated Completion:

1–2 development days

---

Phase 3 – Productization

Planned

GitHub Integration

- Create repositories automatically
- Push generated files

Vercel Integration

- One-click deployment
- Deployment status tracking

Stripe Integration

- Subscription plans
- Usage limits
- Premium deployment features

Status: Not Started


