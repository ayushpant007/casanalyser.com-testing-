import type { Express, Request, Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Groq from "groq-sdk";
import { chatStorage } from "./storage";

const CHAT_GEMINI_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
  process.env.GEMINI_API_KEY_4,
].filter(Boolean) as string[];

function isChatQuotaError(err: any): boolean {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("429") || msg.includes("quota") || msg.includes("too many requests") || msg.includes("resource_exhausted");
}

async function getGroqChatResponse(messages: { role: "user" | "assistant"; content: string }[], userMessage: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error("No GROQ_API_KEY configured");
  const groq = new Groq({ apiKey: groqKey });
  const history = messages.map(m => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));
  const completion = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: history,
    temperature: 0.7,
    max_tokens: 4096,
  });
  return completion.choices[0]?.message?.content || "";
}

export function registerChatRoutes(app: Express): void {
  // Get all conversations
  app.get("/api/conversations", async (req: Request, res: Response) => {
    try {
      const conversations = await chatStorage.getAllConversations();
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });

  // Create new conversation
  app.post("/api/conversations", async (req: Request, res: Response) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  // Delete conversation
  app.delete("/api/conversations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Send message and get AI response (streaming)
  app.post("/api/conversations/:id/messages", async (req: Request, res: Response) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content } = req.body;

      // Save user message
      await chatStorage.createMessage(conversationId, "user", content);

      // Get conversation history for context
      const messages = await chatStorage.getMessagesByConversation(conversationId);
      const chatMessages = messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Set up SSE
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const rawModel = process.env.GEMINI_MODEL || "gemini-2.0-flash";
      const sanitizedModel = rawModel.toLowerCase().replace(/\s+/g, '-');

      let fullResponse = "";
      let geminiSucceeded = false;

      // Try each Gemini key in rotation
      for (const key of CHAT_GEMINI_KEYS) {
        try {
          const genAI = new GoogleGenerativeAI(key);
          const model = genAI.getGenerativeModel({ model: sanitizedModel });
          const chat = model.startChat({
            history: chatMessages.slice(0, -1).map(m => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content }],
            })),
          });

          const result = await chat.sendMessageStream(content);

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              fullResponse += chunkText;
              res.write(`data: ${JSON.stringify({ content: chunkText })}\n\n`);
            }
          }
          geminiSucceeded = true;
          break;
        } catch (err: any) {
          console.error(`[Chat] Gemini key ${key.substring(0, 8)} failed: ${err.message}`);
          if (!isChatQuotaError(err)) {
            // Non-quota error — don't try more keys
            throw err;
          }
          // 429 quota — try next key
        }
      }

      // If all Gemini keys hit quota, fall back to Groq (non-streaming)
      if (!geminiSucceeded) {
        if (process.env.GROQ_API_KEY) {
          console.log("[Chat] All Gemini keys quota-exhausted — using Groq fallback");
          fullResponse = await getGroqChatResponse(chatMessages.slice(0, -1), content);
          // Stream the Groq response as chunks for frontend compatibility
          const chunkSize = 100;
          for (let i = 0; i < fullResponse.length; i += chunkSize) {
            res.write(`data: ${JSON.stringify({ content: fullResponse.slice(i, i + chunkSize) })}\n\n`);
          }
        } else {
          throw new Error("All Gemini API keys have exceeded their quota. Please try again later.");
        }
      }

      // Save assistant message
      await chatStorage.createMessage(conversationId, "assistant", fullResponse);

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error) {
      console.error("Error sending message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Failed to send message" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to send message" });
      }
    }
  });
}

