const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. INITIALIZE AI SAFELY ---
// We check if the key exists to prevent crashing if .env is empty
const apiKey = process.env.GEMINI_API_KEY;
let model = null;

if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-pro" });
} else {
    console.error("❌ GEMINI_API_KEY is missing in .env file!");
}

// --- 2. BOT PERSONALITY (CONTEXT) ---
const CHAT_CONTEXT = `
You are 'SmartNet Bot', a helpful assistant for a Kenyan internet provider.
Keep answers short (under 40 words). Be professional but friendly.
Use Kenyan slang (Sheng) sparingly if appropriate.

YOUR KNOWLEDGE:
- **Price List:**
  - 5GB (Weekly) = KES 63
  - 10GB (Monthly) = KES 99
  - Unlimited (Monthly) = KES 1000
- **Speed:** Powered by Starlink technology (High Speed, Low Latency).
- **Payment:** We accept M-Pesa.
- **Support:** If asked to talk to a human, tell them to reply with "3".

GOAL:
- If they ask for prices, give the list.
- If they ask to buy, tell them to reply with "1".
`;

const MARKETING_CONTEXT = `
You are a Social Media Manager for 'SmartNet', a high-speed internet brand in Kenya.
Your goal is to write engaging, exciting WhatsApp posts to keep a group active.
- Use emojis.
- Be hyped but professional.
- Mention "Starlink technology".
- End with a Call to Action (e.g., "Reply with 1 to buy!").
`;

// --- 3. CHAT LOGIC (For Auto-Replies) ---
const askAI = async (userText) => {
    // If AI is broken or key is missing, return NULL (Stay Silent)
    if (!model) return null; 

    try {
        const prompt = `${CHAT_CONTEXT}\n\nUser Query: "${userText}"\n\nAnswer:`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Error (Silent Fail):", error.message);
        // Return NULL so the bot stays silent instead of annoying the user
        return null; 
    }
};

// --- 4. CONTENT GENERATOR (For Admin Dashboard) ---
const generatePost = async (topic) => {
    if (!model) return "⚠️ Error: AI API Key is missing in .env file.";

    try {
        const prompt = `${MARKETING_CONTEXT}\n\nTask: Write a fun WhatsApp post about: "${topic}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Generation Failed:", error.message);
        return "🔥 Get the fastest internet in Kenya today! Prices start at KES 63. Reply '1' to join the movement!";
    }
};

module.exports = { askAI, generatePost };