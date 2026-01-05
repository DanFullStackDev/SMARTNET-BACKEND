const { GoogleGenerativeAI } = require("@google/generative-ai");

// --- 1. INITIALIZE AI ---
const apiKey = process.env.GEMINI_API_KEY;
let model = null;

if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
} else {
    console.error("❌ GEMINI_API_KEY is missing in .env file!");
}

// --- 2. CHAT CONTEXT (The Knowledge Base) ---
const CHAT_CONTEXT = `
You are 'SmartNet Bot' (FastDataBundles), a helpful assistant for a Kenyan ISP.
Tone: Professional, knowledgeable, friendly. Use Kenyan slang (Sheng) sparingly.

YOUR KNOWLEDGE BASE (From Official 2025 Guide):

1. **THE TECHNOLOGY (Hybrid Cloud Bridging):**
   - We are an MVNO using "Starlink Satellite Technology" routed to local SIMs.
   - **How it works:** Satellites -> Ground Station -> Cloud Compression -> Injection into Safaricom/Airtel Towers.
   - **Device:** No satellite dish needed. Works on ANY smartphone (Android/iOS) or MiFi.

2. **COVERAGE:**
   - **Nationwide:** Works in Urban (Nairobi, Mombasa) AND Deep Rural areas (Turkana, Wajir, Mandera, Marsabit).
   - Works in valleys/mountains where fiber fails.

3. **2026 PACKAGES (Bundle Price):**
   - **Starlink Lite:** 5GB (7 Days) @ KES 63.
   - **Starlink Standard:** 10GB (14 Days) @ KES 99.
   - **Starlink Pro:** 25GB (30 Days) @ KES 273.
   - **Starlink Ultra:** 60GB (30 Days) @ KES 699.
   - **Starlink Infinity:** UNLIMITED (30 Days) @ KES 1,000.

4. **PURCHASE PROCESS (Automated):**
   - Step 1: Go to https://fastdatabundles.co.ke
   - Step 2: Pay Bundle Price via M-Pesa (STK Push).
   - Step 3: Pay Activation Fee (Local Roaming Tax) to bridge the connection.
   - Step 4: Internet activates INSTANTLY.

5. **FAQ ANSWERS:**
   - **"Is it legit?"** Yes, we are a registered provider using secure gateways.
   - **"Does it work on Airtel?"** Yes, Safaricom and Airtel (Prepaid/Postpaid).
   - **"Speed?"** 50-150 Mbps (Low Latency for Gaming).

GOAL:
- Sell the low prices and high speeds.
- If asked "How does it work?", explain the "Hybrid Satellite-GSM model".
- If asked about fees, explain the "Local Roaming Tax" necessary for satellite bridging.
`;

// --- 3. MARKETING CONTEXT (Post Generator) ---
const MARKETING_CONTEXT = `
You are a Social Media Manager for 'FastDataBundles'.
Write an engaging, viral WhatsApp post.

KEY SELLING POINTS:
- **Price:*
**2026 PACKAGES (Bundle Price):**
   - **Starlink Lite:** 5GB (7 Days) @ KES 63.
   - **Starlink Standard:** 10GB (14 Days) @ KES 99.
   - **Starlink Pro:** 25GB (30 Days) @ KES 273.
   - **Starlink Ultra:** 60GB (30 Days) @ KES 699.
   - **Starlink Infinity:** UNLIMITED (30 Days) @ KES 1,000.

- **Tech:** Starlink Speed on your normal SIM card (No Dish Needed).
- **Coverage:** Works EVERYWHERE (Turkana to Nairobi).
- **Link:** https://fastdatabundles.co.ke

STYLE:
- Use emojis (🚀, 🌍, 📶, 🔥).
- Call to Action: "Click the link to Activate Now!"
- Keep it hyped.
`;

// --- 4. FUNCTIONS ---
const askAI = async (userText) => {
    if (!model) return null; 

    try {
        const prompt = `${CHAT_CONTEXT}\n\nUser Query: "${userText}"\n\nAnswer:`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Chat Error:", error.message);
        return null; 
    }
};

const generatePost = async (topic) => {
    if (!model) return "⚠️ Error: API Key missing.";

    try {
        const prompt = `${MARKETING_CONTEXT}\n\nTask: Write a post about: "${topic}"`;
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error("AI Gen Error:", error.message);
        return "🔥 5GB for KES 63! Works on Safaricom/Airtel. Starlink Speed. Activate Now: https://fastdatabundles.co.ke";
    }
};

module.exports = { askAI, generatePost };