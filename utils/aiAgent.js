const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. INITIALIZE AI ---
const apiKey = process.env.GEMINI_API_KEY;
let model = null;

if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    // UPDATED: Using 'gemini-2.0-flash' as confirmed by your API list
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
} else {
    console.error("❌ GEMINI_API_KEY is missing in .env file!");
}

// --- 2. BOT CONTEXT ---
const CHAT_CONTEXT = `
You are 'SmartNet Bot', a helpful assistant for a Kenyan internet provider.
Keep answers short (under 40 words). Be professional but friendly.
Use Kenyan slang (Sheng) sparingly if appropriate.

YOUR KNOWLEDGE:
- **Price List:**
  - 5GB (Weekly) = KES 63
  - 10GB (Monthly) = KES 99
  - Unlimited (Monthly) = KES 1000
- **Speed:** Powered by Starlink technology.
- **Support:** If asked to talk to a human, tell them to reply with "3".

GOAL:
- If they ask for prices, give the list.
- If they ask to buy, tell them to reply with "1".
`;

const MARKETING_CONTEXT = `
You are a Social Media Manager for 'SmartNet'.
Write an engaging WhatsApp post using emojis and mentioning "Starlink technology".
`;

// --- 3. CHAT FUNCTION ---
const askAI = async (userText) => {
    if (!model) return null; 

    try {
        const prompt = `${CHAT_CONTEXT}\n\nUser Query: "${userText}"\n\nAnswer:`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Error:", error.message);
        return null; // Silent fail
    }
};

// --- 4. GENERATE POST FUNCTION ---
const generatePost = async (topic) => {
    if (!model) return "⚠️ Error: API Key missing.";

    try {
        const prompt = `${MARKETING_CONTEXT}\n\nTask: Write a post about: "${topic}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Error:", error.message);
        return "🔥 Get the fastest internet in Kenya! Reply '1' to join.";
    }
};

module.exports = { askAI, generatePost };