import { Router } from "express"
import { GoogleGenAI } from "@google/genai"
import rateLimit from "express-rate-limit"
import "dotenv/config"

export type Message = {
  role: "user" | "assistant"
  content: string
}

// ── Rate limit ─────────────────────────────────────────────
export const askLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Try again later." },
})

// ── Gemini ─────────────────────────────────────────────────
const ai = new GoogleGenAI({
  apiKey: process.env.API_KEY!,
})

const SYSTEM_INSTRUCTION =
  "You are DevMuse, an expert software architect who generates practical, non-generic project ideas based on a given tech stack."

const promptRouter = Router()

promptRouter.post("/ask", askLimiter, async (req, res) => {
  const messages: Message[] = req.body.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ message: "Invalid input" })
    return
  }

  // Convert app messages → Gemini format
  const geminiMessages = messages.map((m) => ({
    role: m.role,
    parts: [{ text: m.content }],
  }))

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      config: { systemInstruction: SYSTEM_INSTRUCTION },
      contents: geminiMessages,
    })

    const text = response.text
    if (!text?.trim()) {
      res.status(500).json({ message: "AI service returned an empty response" })
      return
    }

    res.json({ response: text })
  } catch (err) {
    console.error("[DevMuse] Gemini error:", err)
    res.status(500).json({ message: "AI service failed" })
  }
})

export default promptRouter