import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will fail.");
  }
  const ai = new GoogleGenAI({ apiKey: apiKey || "" });

  // 1. Generate Email Route
  app.post("/api/generate-email", async (req, res) => {
    try {
      const { recipient, context, purpose, tone, language } = req.body;

      if (!purpose) {
        return res.status(400).json({ error: "Email purpose or description is required." });
      }

      const prompt = `
        You are an elite email writing assistant. Write a polished, professional, and context-appropriate email based on the details below.
        
        Details:
        - Recipient: ${recipient || "N/A (infer from context or use generic)"}
        - Language: ${language || "English"}
        - Tone/Style: ${tone || "Professional"}
        - Context/Goal: ${purpose}
        - Additional Details/Context: ${context || "None"}

        Requirements:
        1. Write a highly appropriate "Subject:" line first.
        2. Provide a clear salutation and sign-off.
        3. Keep the email concise, natural, and persuasive.
        4. Match the requested tone exactly:
           - Professional: respectful, clear, objective, polite.
           - Friendly: warm, enthusiastic, personal, supportive.
           - Formal: structured, highly respectful, corporate.
           - Persuasive: compelling, highlighting value, clear call-to-action.
           - Casual: relaxed, informal but respectful, breezy.
        5. The response must be written entirely in the requested language (${language || "English"}).
        6. Return ONLY the Subject line and the Email Body. Format your output clearly as:
           Subject: <Subject Here>
           
           <Email Body Here>
           
           DO NOT add any conversational introduction or explanation like "Here is your email:".
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "";
      let subject = "No Subject";
      let body = responseText;

      const subjectMatch = responseText.match(/^Subject:\s*(.*)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        body = responseText.replace(/^Subject:\s*(.*)/i, "").trim();
      }

      res.json({ subject, body });
    } catch (error: any) {
      console.error("Error generating email:", error);
      res.status(500).json({ error: error.message || "Failed to generate email." });
    }
  });

  // 2. Improve/Refine Email Route
  app.post("/api/improve-email", async (req, res) => {
    try {
      const { currentBody, currentSubject, instruction, tone, language } = req.body;

      if (!currentBody) {
        return res.status(400).json({ error: "Email body is required to apply improvements." });
      }

      const prompt = `
        You are an elite email writing assistant. Your task is to revise and improve an existing email based on specific instructions.
        
        Current Email Subject: ${currentSubject || "N/A"}
        Current Email Body:
        """
        ${currentBody}
        """

        Instructions for Improvement:
        - Specific Instruction: ${instruction || "Refine and make more polished"}
        - Target Tone: ${tone || "Keep original tone"}
        - Target Language: ${language || "Keep original language"}

        Requirements:
        1. Maintain the core meaning but significantly improve flow, clarity, impact, grammar, and phrasing.
        2. Adjust the subject line if necessary to match the changes.
        3. Return ONLY the updated Subject and the updated Email Body in the following format:
           Subject: <Subject Here>
           
           <Email Body Here>
           
           DO NOT add any extra introductory or concluding sentences.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "";
      let subject = currentSubject || "No Subject";
      let body = responseText;

      const subjectMatch = responseText.match(/^Subject:\s*(.*)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        body = responseText.replace(/^Subject:\s*(.*)/i, "").trim();
      }

      res.json({ subject, body });
    } catch (error: any) {
      console.error("Error improving email:", error);
      res.status(500).json({ error: error.message || "Failed to improve email." });
    }
  });

  // 3. Generate Reply Suggestion Route (Gmail Inbox Integration Twist!)
  app.post("/api/generate-reply", async (req, res) => {
    try {
      const { incomingSubject, incomingBody, replyContext, tone, language } = req.body;

      if (!incomingBody) {
        return res.status(400).json({ error: "Incoming email content is required to generate a reply." });
      }

      const prompt = `
        You are an elite email writing assistant. Analyze the incoming email below and write an outstanding reply.

        Incoming Email Subject: ${incomingSubject || "No Subject"}
        Incoming Email Body:
        """
        ${incomingBody}
        """

        Your Reply Context/Intent: ${replyContext || "Politely acknowledge or respond appropriately"}
        Target Tone: ${tone || "Professional"}
        Target Language: ${language || "English"}

        Requirements:
        1. Create an appropriate reply subject line (e.g., "Re: " + incoming subject, or a refined version).
        2. Write a highly context-aware reply body that directly addresses the points in the incoming email.
        3. Match the target tone (${tone}) and target language (${language}) perfectly.
        4. Format the output strictly as:
           Subject: <Subject Here>
           
           <Reply Body Here>
           
           DO NOT add any introductory or explaining text.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = response.text || "";
      let subject = incomingSubject ? (incomingSubject.toLowerCase().startsWith("re:") ? incomingSubject : `Re: ${incomingSubject}`) : "Re: Email";
      let body = responseText;

      const subjectMatch = responseText.match(/^Subject:\s*(.*)/i);
      if (subjectMatch) {
        subject = subjectMatch[1].trim();
        body = responseText.replace(/^Subject:\s*(.*)/i, "").trim();
      }

      res.json({ subject, body });
    } catch (error: any) {
      console.error("Error generating reply:", error);
      res.status(500).json({ error: error.message || "Failed to generate reply." });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
