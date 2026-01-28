import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function askLLM(prompt) {
  const model = client.getGenerativeModel({ model: "gemini-2.5-flash" });

  const result = await model.generateContent(prompt);
  //     if (!Array.isArray(vector)) {
  //   throw new Error("Embedding is not an array");
  // }
  return result.response.text();
}
