import { searchVectorStore } from "../services/vector.service.js";
import { askLLM } from "../services/llm.service.js";
import { getPdfOnlyAnswer } from "../services/vector.service.js";

export async function askQuestion(req, res) {
  // Search vector store for relevant chunks
  try{ 
    const { question } = req.body;

  const matches = await searchVectorStore(question, 3);
  const contextText = matches.map((m) => m.text).join("\n\n");

  console.log('Top Chunks:', matches);
  // const context = matches.map((c) => c.text).join("\n\n"); // you can store actual text chunks with FAISS if needed
  
    const prompt = `
You are a document-based assistant.
Use ONLY the information provided in the context below.
Do NOT use your prior knowledge.
If the answer is not in the context, say:
"I cannot find this information in the provided document."


${contextText}

Question: ${question}
      `;
      const llmAnswer = await askLLM(prompt);

    // 5. Send final response
    return res.json({
      answer: llmAnswer,
    });

  } catch (error) {
    // LLM failed? Use your PDF-only function as the fallback
    const pdfMatches = await getPdfOnlyAnswer(question);
    res.json({ 
      answer: pdfMatches, 
      status: "fallback_mode" 
    });
  }
  }


    
//     return res.json({
//       answer: llmAnswer,
//       source: "LLM + PDF context",
//     });
//   } catch (llmError) {
//     // console.error("Gemini failed, fallback to PDF-only");
//     console.error("Gemini failed:", llmError);
//     console.error("Details:", llmError?.response?.data || llmError?.message);

//     // 4. Fallback → Extractive QA
//     return res.json({
//       answer: getPdfOnlyAnswer,
//       source: "PDF only (fallback)",
//     });
//   }
// }
