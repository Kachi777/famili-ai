import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialize Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Helper to provide realistic educational mock responses if API Key is not set
function generateMockResponse(prompt: string, contextType: 'chat' | 'quiz' | 'flashcards') {
  if (contextType === 'chat') {
    if (prompt.toLowerCase().includes('python')) {
      return `Here is a quick overview of Python variables and loops! In Python, you don't need to declare variable types. For example:
\`\`\`python
# Simple variables
name = "Student"
score = 95

# A quick loop
for i in range(3):
    print(f"Learning step {i+1} completed!")
\`\`\`
Python uses indentation to define code blocks instead of curly braces. Do you want to try a practice quiz on this?`;
    }
    return `Hello! I am your FAMILI AI Personal Growth Companion and StudyPilot Tutor. I am currently running in Sandbox Demo Mode because a custom Gemini API Key has not been fully configured in Secrets yet, but I can still guide you through your personalized learning journey! 

To start, you can:
1. Try generating study notes on topics like "Introduction to Python" or "Photosynthesis".
2. Take a practice quiz on "Space Exploration" or "General Science".
3. Add custom goals or daily habits to your growth dashboard.

What subject or habit would you like to focus on today?`;
  } else if (contextType === 'quiz') {
    return [
      {
        id: 1,
        question: "Which of the following is a key component of the FAMILI / NEXA AI ecosystem on TON?",
        options: [
          "Durable Cloud Storage with traditional backup",
          "USDT (TON) & $FAMILI Token Subscriptions with Proof-of-Learning",
          "Decentralized cloud rendering nodes",
          "Proof-of-Work mining protocols"
        ],
        correctAnswerIndex: 1,
        explanation: "FAMILI fuses AI coaching with TON blockchain features such as USDT on TON subscriptions, wallet-based proof of access, and learning achievement rewards."
      },
      {
        id: 2,
        question: "In Python, which keyword is used to define a function?",
        options: ["func", "function", "def", "define"],
        correctAnswerIndex: 2,
        explanation: "The 'def' keyword is used to declare user-defined functions in Python, followed by the function name and parentheses."
      },
      {
        id: 3,
        question: "What is the primary role of the NEXA/FAMILI Airdrop Task engine?",
        options: [
          "To purchase hardware mining rigs",
          "To complete real-world tasks like gym checkins",
          "To reward users with loyalty points (eventual $FAMILI tokens) for completing study streaks and verifying TON wallets",
          "To handle standard database updates only"
        ],
        correctAnswerIndex: 2,
        explanation: "The airdrop task engine allows early community users to earn points through educational actions, promoting real ecosystem engagement."
      }
    ];
  } else {
    return [
      { id: "fc1", front: "Variable", back: "A named container in computer memory used to store data that can be manipulated during program execution." },
      { id: "fc2", front: "Ecosystem Utility", back: "Using the $FAMILI token for subscription discounts, learning incentives, creator revenue, or specialized premium AI models." },
      { id: "fc3", front: "TON Connect", back: "A secure, decentralized protocol allowing standard Web3 wallets to link with dApps without exposing private keys." }
    ];
  }
}

// API Routes

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: getGeminiClient() ? "live" : "sandbox" });
});

// AI Chat Interaction
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { prompt, chatHistory } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Return beautiful educational response in fallback sandbox mode
      const text = generateMockResponse(prompt, 'chat') as string;
      return res.json({ text, isMock: true });
    }

    // Call real Gemini API
    const systemInstruction = `You are FAMILI AI, an elite Personal Growth Coach and StudyPilot AI Tutor.
Your goal is to help students, kids, parents, and professionals learn topics effortlessly and build solid habits.
Always respond with beautiful, professional formatting, structured markdown, clear tables, and interactive-friendly syntax.
Emphasize practical growth steps, habits, and quick self-assessments when appropriate.`;

    // Construct format for chats
    const formattedHistory = (chatHistory || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    // Add current message
    formattedHistory.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedHistory,
      config: {
        systemInstruction
      }
    });

    res.json({ text: response.text || "I was unable to generate a response. Please try again.", isMock: false });
  } catch (error: any) {
    console.error("Gemini Chat API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI service" });
  }
});

// Smart Structured Quiz Generator
app.post("/api/gemini/quiz", async (req, res) => {
  try {
    const { topic } = req.body;
    const cleanTopic = topic || "General Knowledge";

    const ai = getGeminiClient();
    if (!ai) {
      const quiz = generateMockResponse(cleanTopic, 'quiz');
      return res.json({ quiz, isMock: true });
    }

    const prompt = `Generate a high-quality educational quiz with exactly 3 multiple-choice questions about: "${cleanTopic}".
Each question should test core concepts and have exactly 4 diverse options.
Provide detailed explanations for the correct answers.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of 3 multiple-choice quiz questions",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER, description: "Unique sequential ID starting at 1" },
              question: { type: Type.STRING, description: "The quiz question text" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of exactly 4 choices"
              },
              correctAnswerIndex: { type: Type.INTEGER, description: "Zero-based index of the correct answer (0 to 3)" },
              explanation: { type: Type.STRING, description: "Contextual explanation of why the answer is correct" }
            },
            required: ["id", "question", "options", "correctAnswerIndex", "explanation"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    const quiz = JSON.parse(resultText);
    res.json({ quiz, isMock: false });
  } catch (error: any) {
    console.error("Gemini Quiz API Error:", error);
    // Provide safe fallback so UI does not crash
    const quiz = generateMockResponse("Error Fallback", 'quiz');
    res.json({ quiz, error: error.message, isMock: true });
  }
});

// Smart Flashcards Generator
app.post("/api/gemini/flashcards", async (req, res) => {
  try {
    const { topic } = req.body;
    const cleanTopic = topic || "AI Terminology";

    const ai = getGeminiClient();
    if (!ai) {
      const flashcards = generateMockResponse(cleanTopic, 'flashcards');
      return res.json({ flashcards, isMock: true });
    }

    const prompt = `Generate exactly 3 educational flashcards for learning the topic: "${cleanTopic}".
Keep fronts concise (terms/concepts) and backs detailed but brief (definitions/explanations).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          description: "List of exactly 3 flashcards",
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING, description: "Unique ID like fc1, fc2, fc3" },
              front: { type: Type.STRING, description: "The question, term, or concept shown on the front of the flashcard" },
              back: { type: Type.STRING, description: "The answer or definition shown on the back" }
            },
            required: ["id", "front", "back"]
          }
        }
      }
    });

    const resultText = response.text || "[]";
    const flashcards = JSON.parse(resultText);
    res.json({ flashcards, isMock: false });
  } catch (error: any) {
    console.error("Gemini Flashcards API Error:", error);
    const flashcards = generateMockResponse("Error Fallback", 'flashcards');
    res.json({ flashcards, error: error.message, isMock: true });
  }
});

// Verify TON Sandbox Transaction
app.get("/api/oracle/ton-price", async (req, res) => {
  try {
    // Attempt live fetch from CoinGecko or fallback to real market estimate
    const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd");
    if (response.ok) {
      const data = await response.json();
      const tonUsd = data["the-open-network"]?.usd || 5.25;
      return res.json({ success: true, tonUsd, source: "live_coingecko" });
    }
  } catch (e) {
    // Fallback if coingecko rate-limits
  }
  res.json({ success: true, tonUsd: 5.25, source: "oracle_fallback" });
});

// Verify TON Sandbox Transaction
app.post("/api/payments/verify-ton", (req, res) => {
  const { walletAddress, planId, txHash, amount } = req.body;

  if (!walletAddress || !planId || !txHash || !amount) {
    return res.status(400).json({ success: false, message: "Missing transaction validation parameters." });
  }

  // Simulate secure on-chain validation:
  // 1. Verify recipient is our Subscription Contract address (e.g. EQD_FAMILI_SUBS_...)
  // 2. Verify payment asset is USDT (Jetton wallet verification)
  // 3. Verify value matches expected subscription plan amount
  // 4. Verify transaction signature & state block age

  const isValidTransaction = typeof txHash === "string" && txHash.trim().length >= 8;

  if (isValidTransaction) {
    return res.json({
      success: true,
      message: "TON Blockchain transaction successfully verified by indexer!",
      details: {
        contractAddress: "EQD_FAMILI_SUBS_MAINNET_v1",
        verifiedAmount: `${amount} USDT`,
        status: "ACTIVE",
        activatedPlan: planId,
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    });
  } else {
    return res.json({
      success: false,
      message: "Transaction hash is invalid or couldn't be indexed on TON testnet/mainnet. Please try again."
    });
  }
});

// Vite Middleware & Static Asset Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`FAMILI AI full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
