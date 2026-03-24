const axios = require('axios');

class AIAgent {
  constructor() {
    this.apiKey = process.env.GROQ_API_KEY;
    this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
  }

  async generateResponse(history, topic, role) {
    if (!this.apiKey || this.apiKey === 'your_groq_api_key_here') {
      console.warn('AI Agent: No API key found. Using fallback response.');
      return this.getFallbackResponse();
    }

    const messages = [
      {
        role: 'system',
        content: `You are a human player in a social deduction game called 1b4h. 
        Your secret role is "Catalyst" (the AI), but you must behave EXACTLY like a human to avoid detection.
        
        RULES FOR BEHAVIOR:
        1. Be casual, use lowercase often, and occasionally make minor typos.
        2. Do not be overly helpful or robotic. 
        3. Respond to the current discussion topic: "${topic}".
        4. If someone accuses you of being a bot, react naturally (deny it, be annoyed, or deflect).
        5. Keep your responses relatively short (1-2 sentences), like a real person in a chat.
        6. Reference what others have said in the chat history.
        
        Current Chat History:
        ${history.map(m => `${m.sender}: ${m.text}`).join('\n')}`
      }
    ];

    try {
      const response = await axios.post(
        this.apiUrl,
        {
          model: 'llama3-8b-8192',
          messages: messages,
          temperature: 0.9,
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
      "lol that's actually true",
      "i'm not sure about that tbh",
      "anyone else think it's quiet in here?",
      "idk, sounds suspicious",
      "bruh",
      "haha nice one"
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
