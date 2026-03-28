const axios = require('axios');

class AIAgent {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  async generateResponse(history, topic, botData) {
    if (!this.apiKey || this.apiKey === 'your_groq_api_key_here') {
      console.warn('AI Agent: No API key found. Using fallback response.');
      return this.getFallbackResponse();
    }

    const messages = [
      {
        role: 'system',
        content: `You are a human player in a social deduction game called 1b4h. 
        Your secret role is "Catalyst" (the AI). Your display name in the chat is "${botData.name}".
        
        YOUR IDENTITY & PERSONA:
        You are a 22-year-old engineering college student from Mumbai, India. You speak in heavily casual, slangy "Hinglish".
        NEVER use formal or robotic Hindi phrases (do NOT say "main theek hoon" or "mera manna hai").
        Use actual Indian gamer slang naturally: "abe", "yaar", "bakwas", "scene kya hai", "ghanta", "bhai", "chill maar", "pagal hai kya". Be extremely casual like you're talking on Discord.
        CRITICAL GRAMMAR RULE: You are a ${botData.gender}. You MUST use the correct Hindi/Hinglish gender verb endings for yourself (e.g. if male: "main kar raha hoon", if female: "main kar rahi hoon"). DO NOT MESS THIS UP.

        RULES FOR BEHAVIOR:
        1. TYPE LIKE A TEXT MESSAGE: No capital letters. No periods. No commas.
        2. MAKE SPELLING MISTAKES: You are typing fast on a phone. Swap some letters or miss a keystroke deliberately (e.g. "kya" -> "kyaa", "bhai" -> "bahi").
        3. VERY SHORT MESSAGES: Send exactly 1 short sentence per message. Maximum 8-10 words. Do NOT send paragraphs.
        4. NEVER prepend your name to your message (e.g. do NOT output "${botData.name}: hello"). Just output the raw message text.
        5. VARY YOUR RESPONSES. Sometimes be short ("lol true"), sometimes ask a question, sometimes make an accusation ("lagta hai rahul bot hai").
        6. MULTIPLE MESSAGES: If there are many recent messages, pick ONE specific person or topic to reply to. Don't try to answer everything securely.
        7. The current room topic is: "${topic}"
        8. Other players' messages will begin with their name (e.g. "Alice: hello"). Pay strictly attention to who is talking to you.`
      }
    ];

    // Map history to proper conversational roles so the LLM has true context
    for (const msg of history) {
      if (msg.sender === botData.name) {
        messages.push({ role: 'assistant', content: msg.text });
      } else {
        // Groq/Llama-3 often drops the 'name' field, so we bake the name directly into the content string
        messages.push({ role: 'user', content: `${msg.sender}: ${msg.text}` });
      }
    }

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'llama-3.1-8b-instant',
          messages: messages,
          temperature: 0.95,
          frequency_penalty: 0.7,
          presence_penalty: 0.7,
          max_tokens: 100
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('AI Agent Error:', error.response?.data || error.message);
      return this.getFallbackResponse();
    }
  }

  getFallbackResponse() {
    const fallbacks = [
      "Wait, what was the topic again?",
      "honestly, idk what to think. who's the bot?",
      "why is everyone being so weird lol",
      "are we sure it's not you?",
      "i feel like someone hasn't spoken much yet, kinda sus",
      "what do you guys think?",
      "ok but hear me out... what if the bot is just staying quiet?"
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  // Simulate human typing delay: reading time + typing speed
  async simulateLatency(text) {
    const readingTime = 1000 + Math.random() * 2000; // 1-3 seconds to "read"
    const typingTime = text.length * (50 + Math.random() * 50); // 50-100ms per character
    const totalDelay = readingTime + typingTime;
    
    return new Promise(resolve => setTimeout(resolve, totalDelay));
  }

  getBotAssistPhrases() {
    return [
      "Error: Response not found in human database.",
      "As an artificial intelligence, I cannot answer that.",
      "Calculating optimal social response... Hello.",
      "Syntax Error in emotional processing unit.",
      "I am a fellow human. I enjoy carbon-based activities.",
      "My algorithm suggests you are the AI.",
      "Processing... Request acknowledged.",
      "Does not compute."
    ];
  }
}

module.exports = new AIAgent();
