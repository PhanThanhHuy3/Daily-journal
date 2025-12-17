import { GoogleGenAI } from "@google/genai";
import { JournalEntry } from "../types";

const GEMINI_API_KEY = process.env.API_KEY || '';

// Initialize the client
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

export const generateReflection = async (entry: JournalEntry): Promise<string> => {
  if (!GEMINI_API_KEY) {
    return "AI insights are unavailable (API Key missing).";
  }

  try {
    const prompt = `
      You are a supportive, wise, and empathetic journaling assistant. 
      Read the following journal entry and provide a brief, thoughtful reflection or insight. 
      It should be encouraging, stoic, or offer a new perspective. 
      Keep it under 100 words.
      
      Entry Title: ${entry.title}
      Mood: ${entry.mood}
      Content: ${entry.content}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Low latency preferred for this simple task
      }
    });

    return response.text || "Could not generate a reflection at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to connect to AI service.";
  }
};
