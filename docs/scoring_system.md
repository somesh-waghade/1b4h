# Scoring & Behavioral Analytics

The 1b4h platform uses a proprietary **Suspicion Score** algorithm to help players identify the AI based on its digital behavior.

## 1. Data Collection
Every player (human and AI) is monitored for two key metrics:
- **`timestamps`**: An array of unix timestamps for every message sent.
- **`lengths`**: An array of character counts for every message sent.

## 2. The Algorithm
The score is calculated at the end of the game in `gameState.js` using the following weighted formula:

`S = (0.6 × LatencyScore) + (0.4 × LengthScore)`

### Latency Score
- **Logic**: Humans have high variance in their response times (distracted, thinking, or typing errors). AI often has a more uniform, programmatic response rhythm.
- **Math**: We calculate the **Standard Deviation (σ)** of the intervals between a player's messages.
- **Scoring**: `Score = max(0, 100 - (σ / 50))`. A low standard deviation results in a high suspicion score.

### Length Score
- **Logic**: Humans alternate between short "lol" messages and long explanations. AI, unless specifically prompted, often generates messages within a similar word-count range.
- **Math**: We calculate the **Variance** of the message lengths.
- **Scoring**: `Score = max(0, 100 - (sqrt(Variance) * 2))`. Low variance in message length increases suspicion.

## 3. Heuristic Thresholds
In the **Result Screen**, the scores are color-coded to guide human intuition:
- **0 - 40% (Green)**: Convincingly Human. High variance in typing and message length.
- **40 - 70% (Orange)**: Slightly Mechanical. Consistent typing rhythm.
- **70 - 100% (Red)**: Highly Bot-Like. Extremely programmatic behavior detected.

## 4. Anti-Gaming Strategies
The core logic for the **Phantom** role relies on these metrics. The Phantom's goal is to intentionally "flatten" their own metrics (typing with high consistency) to trick the algorithm and other players into voting for them instead of the real AI Catalyst.
