import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import { uploadDocument } from "./services/vector.service.js";
import { askQuestion } from "./controller/ask.controller.js";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const app = express();

app.use(cors());
app.use(express.json());

const uploadFolder = "./uploads/";

// Ensure uploads folder exists
if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder);
}

const upload = multer({
  dest: "uploads/",
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("only PDFs allowed"), false);
    }
  }
});

app.use("/ask", askQuestion);
app.post("/upload", upload.single("file"), async (req, res) => {
  try{
    if(!req.file){
      return res.status(400).json({error:"No file uploaded"});
    }

    fs.readdirSync(uploadFolder).forEach((file) => {
      if (file !== req.file.filename) {
        fs.unlinkSync(path.join(uploadFolder, file));
      }
    });
  
  await uploadDocument(req.file.path);
  res.json({ message: "File uploaded and processed!" });

  }catch(err){
    res.status(500).json({error:err.message});
  }
});
// async function run() {
//   try {
//     // text-embedding-004 is generally available as of mid-2025
//     const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

//     const text = "The quick brown fox jumps over the lazy dog.";
//     const result = await model.embedContent(text);
    
//     console.log("Embedding vector:", result.embedding.values);
//   } catch (error) {
//     console.error("Error fetching embedding:", error.message);
//     // If text-embedding-004 still 404s, your region may not support it yet.
//     // Try fallback to 'embedding-001'
//   }
// }

// run();
// console.log("OPENAI_API_KEY =", !!process.env.OPENAI_API_KEY);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
