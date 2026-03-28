# AI Persona & Context Mechanics

The "Catalyst" AI is the core mechanic of the game. It is designed to act exactly like an authentic human player.

## 1. Prompt Constraints & Personality
The bot uses a grounded persona to prevent generic LLM hallucinations:
- **Identity**: A 22-year-old engineering student from Mumbai.
- **Names**: Draws from a pool of authentic Indian names (Rahul, Aditi, Sneha, etc.).
- **Voice**: Strictly forbidden from using polite or formal Hindi. It is forced to use casual Indian gamer slang ("Hinglish") and drop all punctuation to simulate texting.

## 2. API Payload Mechanics
Traditional LLM integrations cram chat histories into a single "system" prompt. This destroys conversational awareness because the model treats every prompt as a zero-shot independent task.

In \`1b4h\`, we parse the last 50 room messages into an exact OpenAI/Groq array of natively mapped objects:
- Messages sent by the bot = \`{ role: 'assistant', content: msg.text }\`
- Messages sent by humans = \`{ role: 'user', content: '[Name]: msg.text' }\`

*(Note: We embed the user's name directly into the content string because certain Llama-3.1 API endpoints ignore the invisible \`name\` field in user role objects).*

## 3. Humanized Scheduling
The AI evaluates every incoming message on a probability matrix rather than instantly responding:
- Base chance to reply: **55%**
- If a question mark \`?\` is detected: **75%**
- If the bot's name is explicitly mentioned: **95%**

If triggered, the bot calculates a fake "Reading Time" (1-3 seconds) and a "Typing Time" (50-100ms per character) before emitting its message, heavily masking its programmatic nature.
