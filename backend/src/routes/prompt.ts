import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import z from "zod"
import rateLimit from "express-rate-limit";
import("dotenv/config")

const promptSchema = z.object({
    prompt : z.string().min(2).max(50)
})

export const askLimiter = rateLimit({
    windowMs : 60 * 1000,
    max : 2,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests. Try again later."
    }
})

const ai = new GoogleGenAI({
    apiKey : process.env.API_KEY
})

const promptRouter = Router()

promptRouter.post("/ask", async (req, res)=> {
    const parsedPrompt = promptSchema.safeParse(req.body)
    console.log(parsedPrompt)
    console.log(parsedPrompt.data?.prompt)
    if(!parsedPrompt.success){
        res.status(400).json({
            message : "Please provide right Inputs."
        })
        return
    }
    const prompt = parsedPrompt.data.prompt

    try {
        const response = await ai.models.generateContent({
            model : "gemini-3-flash-preview",
            contents : `What are the best projects I can build with this tech stack: ${prompt}? Generate at least 10 unique and interesting project ideas.`
        })

        res.json({
            response : response.text
        })
    } catch (err) {
        console.error("[DevMuse] Gemini error:", err)
        res.status(500).json({
            message : "AI service failed. Please try again."
        })
    }
})

export default promptRouter