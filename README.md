# 1b4h — 1 Bot, 4 Humans

A real-time multiplayer social deduction game. One player is secretly an AI (Catalyst). Can you tell who's human?

## Roles

| Role | Who | Goal |
|------|-----|------|
| **Catalyst** | AI (LLM) | Blend in. Survive the vote. |
| **Phantom** | Human | Act like a bot. Draw votes away from the AI. |
| **Innocent** | Human (×3) | Find the AI and vote it out. |

## How It Works

1. 5 players join a room with a shared **Room Code**
2. A random **Icebreaker Topic** kicks off the chat
3. Players chat freely for **60 seconds**
4. Everyone **votes** to eliminate who they think is the bot
5. The **reveal** shows true roles + a **Suspicion Score** for each player

## Stack

- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React (Vite), TailwindCSS
- **AI Agent**: Groq API (Llama-3 8B) with humanized latency simulation

## Getting Started

### Prerequisites
- Node.js v18+
- A free [Groq API key](https://console.groq.com/)

### Backend

```bash
cd backend
cp .env.example .env   # Add your GROQ_API_KEY
npm install
npm run dev            # Starts on http://localhost:3001
```

### Frontend

```bash
cd frontend
npm install
npm run dev            # Starts on http://localhost:5173
```

Open **5 browser tabs** (or use multiple devices), use the same Room Code, and the game starts automatically.

## Behavioral Analytics

After each game, a **Suspicion Score** is calculated for every player:

```
S = (0.6 × σ_t) + (0.4 × Δ_c)
```

- `σ_t` — Standard deviation of response latency (low = suspiciously consistent)
- `Δ_c` — Variance in message length (low = suspiciously uniform)

High score → likely bot-like behavior. Low score → convincingly human.

## Environment Variables

```env
GROQ_API_KEY=your_key_here
PORT=3001
```
