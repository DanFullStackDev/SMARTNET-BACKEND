const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// The Bot's "Brain" - Custom Instructions
const CONTEXT = `
You are 'SmartNet Bot', a helpful sales assistant for a Kenyan internet provider called SmartNet.
Your goal is to sell Starlink-powered data bundles. Be polite, concise, and use Kenyan slang (Sheng) occasionally if appropriate.

YOUR KNOWLEDGE BASE:
- **Pricing:** - 5GB (Weekly) = KES 63
  - 10GB (Monthly) = KES 99
  - Unlimited (Monthly) = KES 1000
- **How to Buy:** Tell them to reply with "1" or visit fastdatabundles.co.ke.
- **Speed:** We use Starlink technology, so it is faster and more stable than Safaricom/Airtel in remote areas.
- **Payment:** We accept M-Pesa via our website.
- **Support:** If you cannot answer, tell them to reply with "3" to talk to a human agent.

RULES:
- Keep answers short (under 50 words).
- Do not make up prices. Only use the ones listed above.
- If the user greets you, just welcome them briefly.
`;

const askAI = async (userText) => {
    try {
        const prompt = `${CONTEXT}\n\nUser Query: "${userText}"\n\nAnswer:`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Error:", error.message);
        // Fallback if AI fails (e.g. quota limit)
        return "Hey, I'm having trouble thinking right now. Please reply with '1' to see our menu!";
    }
};

module.exports = { askAI };