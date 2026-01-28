import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import multer from "multer";
import { uploadDocument } from "./services/vector.service.js";
import { askQuestion } from "./controller/ask.controller.js";


// const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

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
  fileFilter: (file, cb) => {
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

// console.log("OPENAI_API_KEY =", !!process.env.OPENAI_API_KEY);
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
