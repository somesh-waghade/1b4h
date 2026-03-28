# 1b4h — 1 Bot, 4 Humans

A real-time multiplayer social deduction game. One player is secretly an AI (Catalyst). Can you tell who's human?

## 🎭 Roles

| Role | Who | Goal |
|------|-----|------|
| **Catalyst** | AI (LLM) | Blend in. Survive the vote. |
| **Phantom** | Human | Act like a bot. Draw votes away from the AI. |
| **Innocent** | Human (×3) | Find the AI and vote it out. |

## 🕹️ How It Works

1. **Quick Play**: Join the public queue or host a private room.
2. **Icebreaker**: A random topic (e.g., "Is a hotdog a sandwich?") kicks off the chat.
3. **Discussion**: Chat freely for **5 minutes**. 
4. **Interrogation**: The AI (Catalyst) has an Indian college student persona, speaks Hinglish, makes typos, and uses gamer slang to blend in.
5. **Voting**: Everyone votes to eliminate who they think is the bot.
6. **The Reveal**: Discover true roles and see the **Suspicion Score** analytics.

## 🛠️ Tech Stack

- **Frontend**: React (Vite), Tailwind CSS v4, Socket.io
- **Backend**: Node.js, Express, Socket.io
- **AI Brain**: Groq API (Llama-3.1 8B) with native context mapping & humanized typing latency.

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- [Groq API key](https://console.groq.com/)

### 1. Backend Setup
```bash
cd backend
npm install
# Create .env and add GROQ_API_KEY
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open multiple browser tabs or invite friends to join your room code!

## 📊 Behavioral Analytics

Each player receives a **Suspicion Score** calculated using:
`S = (0.6 × σ_t) + (0.4 × Δ_c)`

- `σ_t` — Latency deviation (Is your typing speed too consistent?)
- `Δ_c` — Message variance (Is your sentence structure too uniform?)

## 📄 Documentation
Check the `docs/` folder for technical deep-dives into [Architecture](./docs/architecture.md), [AI Mechanics](./docs/ai_mechanics.md), and [Deployment](./docs/deployment.md).
