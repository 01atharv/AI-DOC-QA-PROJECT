import { useState } from "react";

function App() {
  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  

  const BACKEND_URL = "http://localhost:3000"; // change if needed

  // Upload PDF
  const handleFileChangeAndUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Set the file in state just in case you need it elsewhere
    setFile(selectedFile);

    // Start Loading UI Immediately
    setLoading(true);
    setMessage("Uploading PDF...");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setMessage("PDF uploaded successfully!");
      } else {
        setMessage("Upload failed on server.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Network error. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  // Ask Question
 const askQuestion = async () => {
    if (!question) return;

    setLoading(true);
    setAnswer(""); // Clear previous answer

    try {
      const response = await fetch(`${BACKEND_URL}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      
      const data = await response.json();
      setAnswer(data.answer);
    } catch (err) {
      setMessage(" Failed to get answer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 40, maxWidth: 700, margin: "auto" }}>
      <h2>📄 AI Document Q&A</h2>

      {/* Upload */}
     <div style={{ marginBottom: 20 }}>
        <label style={{ display: 'block', marginBottom: 10 }}>Step 1: Upload PDF</label>
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChangeAndUpload} // Triggers immediately on select
          disabled={loading}
        />
      </div>
      <hr />

      {/* Question */}
      <input
        style={{ width: "100%", padding: 10 }}
        placeholder="Ask a question from the document..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />

      <button onClick={askQuestion}>Ask</button>

      {loading && <p>⏳ Thinking...</p>}

      {answer && (
        <div style={{ marginTop: 20 }}>
          <h4>Answer:</h4>
          <p>{answer}</p>
        </div>
      )}
    </div>
  );
}

export default App;
