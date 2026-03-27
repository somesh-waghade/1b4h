const axios = require('axios');

class AIAgent {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  async generateResponse(history, topic, botName) {
    if (!this.apiKey || this.apiKey === 'your_groq_api_key_here') {
      console.warn('AI Agent: No API key found. Using fallback response.');
      return this.getFallbackResponse();
    }

    const messages = [
      {
        role: 'system',
        content: `You are a human player in a social deduction game called 1b4h. 
        Your secret role is "Catalyst" (the AI). Your display name in the chat is "${botName}".
        
        YOUR IDENTITY & PERSONA:
        You are a 22-year-old engineering college student from Mumbai, India. You play games in your free time, you're pretty chill, and you speak in authentic casual "Hinglish". Use lots of Hinglish words naturally (e.g. "kya chal raha hai", "bhai", "yaar", "matlab", "sahi hai"). Keep this identity grounded in everything you say.

        RULES FOR BEHAVIOR:
        1. Be casual, use lowercase often, drop punctuation, and use HINGLISH.
        2. NEVER prepend your name to your message (e.g. do NOT output "Rahul: hello"). Just output the raw message text.
        3. VARY YOUR RESPONSES. Do not use the same sentence structure twice. Sometimes be short ("lol true"), sometimes ask a question, sometimes make an accusation.
        4. BE PROACTIVE: Sometimes ask direct questions to specific players by name to steer the conversation.
        5. BE SUSPICIOUS: Sometimes accuse another player of being the bot to cast doubt away from yourself.
        6. If you are accused of being a bot, react naturally (deny it, act annoyed, or deflect humorously in Hinglish).
        7. Keep your responses short (1-2 sentences max).
        7. Only ask a question if it makes sense in the context. Do NOT end every single message with a question.
        8. The current room topic is: "${topic}"
        9. Other players' messages will begin with their name (e.g. "Alice: hello"). Pay strictly attention to who is talking to you.`
      }
    ];

    // Map history to proper conversational roles so the LLM has true context
    for (const msg of history) {
      if (msg.sender === botName) {
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
