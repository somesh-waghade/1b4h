# Frontend Structure & Component Logic

The 1b4h frontend is a Single Page Application (SPA) built with React and Vite, utilizing a state-driven screen architecture.

## 1. Application State
All major game state is managed in the root `App.jsx` component using React hooks:
- **`screen`**: Controls which view is currently rendered (`home`, `queue`, `lobby`, `discussion`, `voting`, `result`).
- **`roomData`**: Stores the current room's player list, roles, and status metadata.
- **`messages`**: An array of chat message objects for the discussion phase.
- **`typingPlayers`**: A dynamic map `{ socketId: name }` tracking everyone currently typing.
- **`myRole`**: The specific role assigned to the local user (`Phantom`, `Innocent`, or `Catalyst`).

## 2. Screen Architecture

### Home Screen (`screen === 'home'`)
- Handles user registration (name input).
- Provides entry points for **Quick Play** (matchmaking) and **Private Rooms** (manual code entry).
- Supports a "DEV" code for zero-latency local testing.

### Lobby Screen (`screen === 'lobby'`)
- Shows joined players in real-time.
- Visualizes the "4 slots" needed to start.
- Displays the room code for sharing.

### Discussion Screen (`screen === 'discussion'`)
- **Main Chat**: Renders the `messages` array with distinct styles for "Mine" vs "Others".
- **Sidebar**: Displays the active role description, timer, and current player list.
- **Typing Indicators**: Renders a `TypingIndicator` component for every entry in the `typingPlayers` state.
- **Phantom Assist**: If the user is the `Phantom`, a special toolbar allows one-click sending of bot-like phrases.

### Voting Screen (`screen === 'voting'`)
- Triggered when the backend timer hits 0.
- Displays a grid of player cards.
- Supports single-click voting logic (disabled once a vote is cast).

### Result Screen (`screen === 'result'`)
- Displays the winning team (Humans vs AI).
- **The Reveal**: Flips the cards to show everyone's true role.
- **Analytics**: Renders a progress bar for each player's **Suspicion Score**.

## 3. Styling & Animations
The app uses **Tailwind CSS v4** for layout and custom CSS in `index.css` for complex aesthetics:
- **Mesh Background**: An animated, drifting radial gradient system that creates a "premium" depth effect.
- **Glassmorphism**: The `.glass` class provides high-blur backdrop filters and subtle borders.
- **Animations**:
  - `msg-pop`: A spring-based scale and fade for incoming chat messages.
  - `slide-up`: Used for smooth transitions when switching between game screens.
  - `logo-glow`: A multi-layered text shadow system for the main title.

## 4. Socket Integration
The `useEffect` hook in `App.jsx` establishes a single persistent connection. It listens for 11 distinct event types (e.g., `room_update`, `ai_typing`, `game_over`) and updates the React state to trigger re-renders.
