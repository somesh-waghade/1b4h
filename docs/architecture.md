# 1b4h Architecture Overview

## Tech Stack
- **Frontend**: React (Vite), Tailwind CSS v4, Socket.io-client
- **Backend**: Node.js, Express, Socket.io
- **AI Brain**: Groq API (Llama-3.1-8b-instant endpoint)

## Sub-Systems

### 1. Multiplayer State Engine (\`backend/src/gameState.js\`)
The server holds truth. Instead of storing game state in a database, the server uses an in-memory \`Map\` to track active rooms.
- **Lobby System**: A FIFO queue connects random players into rooms of 4 humans.
- **State Properties**: Each room tracks \`players\` (id, name, role, metrics), \`messages\` (chat history), \`timer\`, and \`topic\`.
- **Matchmaking Trigger**: When 4 players queue up, the server automatically injects the hidden 5th AI player (Catalyst), assigns a random topic, and broadcasts the \`game_started\` event.

### 2. Real-Time Communication
WebSockets (\`socket.io\`) drive the entire application to ensure low latency.
- Event \`send_message\`: Broadcasts messages across the room and triggers the AI evaluation logic.
- Event \`typing\`: Tracks realtime boolean typing states across all humans and the AI to render animated UI bubbles.

### 3. Suspicion Analytics
The state engine logs telemetry on humans (typing speed, message length variance). At the end of the game, a mathematical heuristic is applied to rank who acted the most "bot-like".

### 4. UI/UX Paradigm
The frontend uses a modern "glassmorphism" aesthetic built specifically for mobile views. Dynamic Viewport Heights (\`100dvh\`) are used so the chat window doesn't break when a mobile device's address bar collapses.
