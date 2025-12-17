import { GoogleGenAI } from "@google/genai";
import { JournalEntry } from "../types";

// Always use process.env.API_KEY directly for initialization
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateReflection = async (entry: JournalEntry): Promise<string> => {
  if (!process.env.API_KEY) {
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

    // Using the recommended model for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });

    return response.text || "Could not generate a reflection at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Unable to connect to AI service.";
  }
};