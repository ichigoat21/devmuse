import express from "express"
import promptRouter, { askLimiter } from "./routes/prompt"
import cors from "cors"

const app = express()


app.use(express.json())
app.use(cors())
app.set("trust proxy", 1)
app.use("/api", askLimiter, promptRouter)


app.listen(3000, ()=> {console.log("Server Is Listening")})