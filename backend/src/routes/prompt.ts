import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import z from "zod"
import("dotenv/config")

const promptSchema = z.object({
    prompt : z.string().min(2).max(50)
})

const ai = new GoogleGenAI({
    apiKey : process.env.API_KEY
})

const promptRouter = Router()

promptRouter.post("/ask", async (req, res)=> {
    const parsedPrompt = promptSchema.safeParse(req.body)
    if(!parsedPrompt.success){
        res.status(400).json({
            message : "Please provide right Inputs."
        })
        return
    }
    const prompt = parsedPrompt.data.prompt
    const response = await ai.models.generateContent({
        model : "gemini-3-flash-preview",
        contents : prompt
    })

    res.json({
        response : response.text
    })
})