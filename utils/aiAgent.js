const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const CHAT_CONTEXT = `
You are 'SmartNet Bot', a helpful assistant for a Kenyan internet provider.
Keep answers short (under 50 words). Use Kenyan slang (Sheng) sparingly.
Price List: 5GB (Weekly) = KES 63, 10GB (Monthly) = KES 99, Unlimited = KES 1000.
`;

const MARKETING_CONTEXT = `
You are a Social Media Manager for 'SmartNet', a high-speed internet brand in Kenya.
Your goal is to write engaging, exciting WhatsApp posts to keep a group active.
- Use emojis.
- Be hyped but professional.
- Mention "Starlink technology".
- End with a Call to Action (e.g., "Reply with 1 to buy!").
`;

// 1. Chat Bot Logic (Short)
const askAI = async (userText) => {
    try {
        const prompt = `${CHAT_CONTEXT}\n\nUser: "${userText}"\n\nAnswer:`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return "Hey, I'm busy right now. Reply with '1' for the menu!";
    }
};

// 2. Content Generator (Longer/Creative)
const generatePost = async (topic) => {
    try {
        const prompt = `${MARKETING_CONTEXT}\n\nTask: Write a fun WhatsApp post about: "${topic}"`;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        return "🔥 Get the fastest internet in Kenya today! Prices start at KES 63. Reply '1' to join the movement!";
    }
};

module.exports = { askAI, generatePost };