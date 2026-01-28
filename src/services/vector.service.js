// import fs from "fs";
// import pdf from "pdf-parse/lib/pdf-parse.js";
// import faiss from "faiss-node";
// import { GoogleGenerativeAI } from "@google/generative-ai";

// let DOCUMENT_TEXT = "";
// // Insert your API Key between the quotes below if not using .env
// const client = new GoogleGenerativeAI(
//   "AIzaSyCklDDggch8U1CX07CCUIX8TxHNK4NWCuM",
// );

// let vectorStore = null;
// let allChunks = [];

// // Get embeddings from Gemini

// // Upload PDF and store vectors
// export async function uploadDocument(filePath) {
//   const dimension = 768;
//   const dataBuffer = fs.readFileSync(filePath);
//   const pdfData = await pdf(dataBuffer);
//   const text = pdfData.text;

//   DOCUMENT_TEXT += text;

//   const chunkSize = 500;
//   const chunks = [];
//   for (let i = 0; i < text.length; i += chunkSize) {
//     chunks.push(text.slice(i, i + chunkSize));
//   }

//   const validEmbeddings = [];
//   const validChunks = [];

//   for (const chunk of chunks) {
//     try {
//       const emb = await getEmbedding(chunk);
//       if (Array.isArray(emb) && emb.length === dimension) {
//         validEmbeddings.push(emb);
//         validChunks.push(chunk);
//       }
//     } catch (err) {
//       console.error("Embedding failed for chunk:", err.message);
//     }
//   }

//   if (validEmbeddings.length === 0) {
//     console.error(
//       " Error: No valid 768-dimension embeddings were returned from Gemini.",
//     );
//     return;
//   }

//   if (vectorStore === null) {
//     console.log("Initializing new FAISS index...");
//     vectorStore = new faiss.IndexFlatL2(dimension);
//   }

//   const numVectors = validEmbeddings.length;
//   const totalElements = numVectors * dimension;

//   const flatEmbeddings = new Float32Array(totalElements);

//   for (let i = 0; i < numVectors; i++) {
//     flatEmbeddings.set(validEmbeddings[i], i * dimension);
//   }

//   const finalArray = Array.from(flatEmbeddings);
//   vectorStore.add(finalArray);

//   allChunks = [...allChunks, ...validChunks];
//   console.log(`Success! Stored ${numVectors} chunks in the vector store.`);
//   // console.log("First 5 values:", validEmbeddings[0].slice(0, 5));
// }

// async function getEmbedding(text) {
//   const model = client.getGenerativeModel({ model: "text-embedding-004" });
//   const result = await model.embedContent(text);
//   return result.embedding.values; // This should be an array of 768 numbers
// }

// // Search the vector store
// export async function searchVectorStore(query, topK = 3) {
//   if (!vectorStore || allChunks.length === 0) {
//     console.warn("Search skipped: Vector store or chunks are empty.");
//     return [];
//   }

//   // 1. Get the current total count of vectors in the store
//   const ntotal = vectorStore.ntotal();

//   // 2. Cap topK so it never exceeds the total number of vectors
//   const safeTopK = Math.min(topK, ntotal);

//   // 3. If the store is empty, return early
//   if (safeTopK <= 0) return [];

//   const queryEmbedding = await getEmbedding(query);

//   // 4. Use safeTopK in the search
//   const { labels } = vectorStore.search(queryEmbedding, safeTopK);

//   const results = labels
//     .filter((index) => index !== -1 && index < allChunks.length)
//     .map((index) => allChunks[index]);

//   console.log(`Search found ${results.length} relevant chunks.`); // DEBUG LOG

//   return results;
// }
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";
import { Pinecone } from "@pinecone-database/pinecone";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { v4 as uuidv4 } from "uuid"
import dotenv from "dotenv";
dotenv.config();

const client = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index(process.env.PINECONE_INDEX_NAME);

export async function getEmbedding(text) {
  const model = client.getGenerativeModel({ model:"gemini-embedding-001" });
  const result = await model.embedContent({
  content: { 
    parts: [{ text: text }] 
  },
  outputDimensionality: 768, 
});
  
  return result.embedding.values; // This should be an array of 768 number

}

export async function uploadDocument(filePath) {
  try {
    console.log("Clearing old data...");
    await index.deleteAll();
    console.log("STEP 1: Reading PDF...");
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    
    const chunks = data.text.match(/(.|\n){1,500}/g) || [];
    console.log(`STEP 2: Found ${chunks.length} chunks. Generating embeddings...`);

    const vectors = [];
    for (let i = 0; i < chunks.length; i++) {
      const embedding = await getEmbedding(chunks[i]);
      vectors.push({
        id: uuidv4(), 
        values: embedding,
        metadata: { text: chunks[i] },
      });
    }

    console.log("STEP 3: Starting upsert to Pinecone...");
    // Use batching to prevent timeouts
    const BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
        const batch = vectors.slice(i, i + BATCH_SIZE);
        await index.upsert(batch);
        console.log(`Upserted batch starting at index ${i}`);
    }
    const stats = await index.describeIndexStats();
    console.log("Total vectors:", stats.totalVectorCount);
    console.log(`SUCCESS: Successfully sent ${vectors.length} vectors to Pinecone.`);

    
  } catch (error) {
    console.error("CRITICAL ERROR IN UPLOAD:", error.message);
  }
}


export async function searchVectorStore(query, topK = 3) {
  const embedding = await getEmbedding(query);
  
  const result = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true,
    includeValues: false,
  });
  // console.log(JSON.stringify(result.matches, null, 2));
  return result.matches.map((match) => ({
    id: match.id,
    score: match.score,
    text: match.metadata.text,
  }));
}

export async function getPdfOnlyAnswer(question, topK = 2) {
  const matches = await searchVectorStore(question, topK);
  if (!matches.length) {
    return "No relevant answer found in the document.";
  }  
  return matches.map((m) => m.text).join("\n\n");
}
