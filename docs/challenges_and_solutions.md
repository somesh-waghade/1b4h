# Development Challenges & Solutions

Building a Turing-test social deduction game required solving several unique AI behavioral edge cases.

### Problem 1: Repetitive "LLM-Speak"
**Issue**: The AI sounded incredibly robotic because the system prompt had rigid rules like "ALWAYS try to push the conversation forward" and "End your thoughts with a question". The LLM found one specific grammatical formula and repeated it endlessly.
**Solution**: Relaxed the prompt to say "VARY YOUR RESPONSES" and injected \`frequency_penalty: 0.7\` and \`presence_penalty: 0.7\` into the Groq API configuration. This mathematically forces the LLM to search for alternative vocabulary and sentence structures, making the bot wildly unpredictable.

### Problem 2: Context Amnesia
**Issue**: The bot couldn't remember what was said 3 lines ago because the backend restricted the stored chat history to 10 messages to save RAM, which in a 5-player chat window passes in seconds. Furthermore, the history was appended directly into the `system` prompt block.
**Solution**: Increased the history buffer to 50 messages. Refactored the API call to build an array of explicit \`user\` and \`assistant\` message objects, granting the LLM native multi-turn conversation memory.

### Problem 3: The "Anonymous User" Name Glitch
**Issue**: Once the API payload was properly decoupled into user/assistant roles, the bot forgot everyone's name. It turned out Groq's Llama-3 implementation silently strips/ignores the hidden \`name\` attribute attached to \`user\` roles.
**Solution**: Wrote a mapping loop that explicitly prepends the name directly into the visible text content (e.g. \`{role: 'user', content: 'Alice: who is the bot?'}\`). The model now flawlessly addresses players.

### Problem 4: Hindi Pronoun Mismatches
**Issue**: Depending on the randomized AI name (e.g. Rahul vs Sneha), the bot would accidentally mix up male and female verb endings in Hindi ("main kar rahi hoon").
**Solution**: Assigned strict gender properties to the AI identity dictionary. The generation function now injects the assigned gender dynamically into the prompt alongside a "CRITICAL GRAMMAR RULE" demanding correct Hindi pronoun agreement.

### Problem 5: Concurrency Spam (Message Barrage)
**Issue**: When humans spammed the chat, the bot would try to answer all 5 messages at once, resulting in massive, confusing, multi-topic responses.
**Solution**: Implemented a \`catalyst.isBotRunning\` lock. If messages arrive while the bot is generating its response, they are temporarily ignored for trigger evaluation. Further, gave the prompt a specific rule: *"If multiple messages arrive, pick ONE person or topic to reply to."*
