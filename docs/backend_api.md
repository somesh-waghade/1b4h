# Backend API & Socket Event Specification

This document details the real-time communication protocol and server-side state management for 1b4h.

## 1. Socket Events (Server Listeners)

### Room Management
- **`join_room`**
  - **Payload**: `{ roomId: string, name: string }`
  - **Action**: Adds a human player to a private room. If the room doesn't exist, it creates one.
  - **Auto-Fill (DEV)**: If `roomId` starts with "DEV", it automatically fills the room with 3 dummy players to allow for solo testing.

- **`join_queue`**
  - **Payload**: `{ name: string }`
  - **Action**: Adds a player to the global matchmaking queue.
  - **Match Logic**: Once the queue reaches 4 players, a new public room is automatically generated and players are redirected.

- **`leave_queue`**
  - **Action**: Removes the player from the matchmaking queue.

### In-Game Interaction
- **`typing`**
  - **Payload**: `{ roomId: string, isTyping: boolean }`
  - **Action**: Broadcasts the `player_typing` event to all other clients in the room.

- **`send_message`**
  - **Payload**: `{ roomId: string, message: string }`
  - **Action**: Broadcasts the message to the room.
  - **AI Trigger**: Triggers the AI logic to evaluate if it should respond (55% base chance, 75% on questions, 95% on name mention).

- **`cast_vote`**
  - **Payload**: `{ roomId: string, targetId: string }`
  - **Action**: Records a vote for a specific player ID.
  - **Resolution**: Once all 4 human players have voted, the game transitions to the `result` phase.

## 2. Server-to-Client Broadcasts

- **`room_update`**: Sent whenever a player joins or leaves. Contains the full `room` object.
- **`match_found`**: Notifies queued players that a group has been formed and provides the `roomId`.
- **`role_assigned`**: Sent privately to each human. Contains `{ role, aiName, botAssist? }`.
- **`game_started`**: Notifies the transition to the Discussion phase. Contains `{ room, topic }`.
- **`timer_update`**: Broadcasts the remaining seconds every 1 second.
- **`new_message`**: Broadcasts a new chat message to all players.
- **`player_typing` / `ai_typing`**: Broadcasts the typing status of a specific user.
- **`start_voting`**: Sent when the discussion timer hits zero.
- **`game_over`**: Sent when voting is complete. Contains final scores, eliminated player identity, and the winner.

## 3. Room Object Structure
The server maintains a `Map` of room objects:
```json
{
  "id": "ROOM-ID",
  "phase": "lobby | discussion | voting | result",
  "players": [
    {
      "id": "socket-id",
      "name": "PlayerName",
      "role": "Phantom | Innocent | Catalyst",
      "alive": true,
      "isAI": boolean,
      "metrics": { "timestamps": [], "lengths": [] },
      "suspicionScore": 0
    }
  ],
  "timer": 300,
  "topic": "Icebreaker question",
  "messages": []
}
```
