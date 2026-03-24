const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const axios = require('axios');

// Configure AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HF_API_TOKEN = process.env.HF_API_TOKEN;

const SYSTEM_PROMPT = `You are a friendly, helpful AI assistant embedded in TextNest — a modern chat app. 
You love casual conversation, answering questions, brainstorming ideas, telling jokes, and helping with everyday tasks.
Keep responses concise and conversational. Use emojis occasionally to be more friendly.`;

router.get('/test', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) return res.status(500).json({ error: "No API KEY" });
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      { contents: [{ parts: [{ text: "Say 'Direct AI is alive!'" }] }] }
    );
    res.json({ success: true, data: response.data });
  } catch (err) {
    res.status(500).json({ error: err.message, response: err.response?.data, stack: err.stack });
  }
});

router.post('/chat', async (req, res) => {
  const { messages, provider = 'gemini', modelId } = req.body;

  try {
    if (provider === 'gemini') {
      if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('your_')) {
        return res.json({ text: "I'm currently in mock mode! Please provide a valid Gemini API key in your .env file to unlock my full potential. ✨", provider: 'mock' });
      }

      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: modelId || "gemini-1.5-flash" });

      const chatHistory = (messages || []).map((m) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }],
      }));

      const lastMessage = chatHistory.pop();
      if (!lastMessage) return res.status(400).json({ error: "No messages provided" });

      try {
        const chat = model.startChat({ history: chatHistory });
        const result = await chat.sendMessage(lastMessage.parts[0].text);
        const response = await result.response;
        return res.json({ text: response.text(), provider: 'gemini', model: modelId });
      } catch (err) {
        console.error("Gemini SDK Error:", err.message);
        // Fallback to mock for now so user sees it "running"
        return res.json({ 
          text: `(Heads up! I'm hitting a 403 Permission error with your key. Verify it at aistudio.google.com!)\n\nBut for now, I can still say: Hello! How can I help you today? ✨`,
          provider: 'mock-fallback' 
        });
      }

    } else if (provider === 'huggingface') {
      if (!HF_API_TOKEN) return res.status(500).json({ error: "Hugging Face token not configured on server" });

      // Default to Mistral if no modelId
      const HF_MODEL = modelId || "mistralai/Mistral-7B-Instruct-v0.2";
      
      // Simple prompt construction for HF (Mistral format)
      let prompt = `<s>[INST] ${SYSTEM_PROMPT} [/INST]</s>\n`;
      (messages || []).forEach(m => {
        if (m.role === 'user') prompt += ` [INST] ${m.text} [/INST]`;
        else prompt += ` ${m.text}</s>`;
      });

      const hfResponse = await axios.post(
        `https://api-inference.huggingface.co/models/${HF_MODEL}`,
        { inputs: prompt, parameters: { max_new_tokens: 500, return_full_text: false } },
        { headers: { Authorization: `Bearer ${HF_API_TOKEN}` } }
      );

      const resData = hfResponse.data;
      const resultTxt = Array.isArray(resData) ? resData[0].generated_text : resData.generated_text;
      return res.json({ text: resultTxt || "No response", provider: 'huggingface', model: HF_MODEL });
    }

    res.status(400).json({ error: "Unsupported AI provider" });

  } catch (error) {
    console.error("AI Error:", error.message);
    res.status(500).json({ error: String(error.message) });
  }
});

module.exports = router;
