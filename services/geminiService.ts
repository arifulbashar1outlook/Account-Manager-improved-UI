
import { GoogleGenAI } from "@google/genai";

/**
 * Suggests a category for an expense description using Gemini AI.
 */
export const categorizeDescription = async (description: string): Promise<string | null> => {
  if (!process.env.API_KEY || process.env.API_KEY === "undefined") return null;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Categorize this expense description into a single short category name (e.g. 'Food', 'Transport', 'Utilities'). Description: "${description}". Return ONLY the category word.`,
    });
    return response.text?.trim() || null;
  } catch (e) {
    console.error("Gemini Categorization Error:", e);
    return null;
  }
}
