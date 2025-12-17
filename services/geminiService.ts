
import { GoogleGenAI } from "@google/genai";
import { Transaction } from '../types';

/**
 * Generates financial advice using Gemini AI based on user transactions.
 * Initializes a new GoogleGenAI instance per request as per the latest guidelines.
 */
export const getFinancialAdvice = async (transactions: Transaction[]): Promise<string> => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === "undefined") {
      console.warn("Gemini API Key missing in environment variables");
      return "AI service is not available. Please configure the Gemini API Key in your environment variables.";
  }

  // Always create a new instance right before the call to ensure the latest config/key is used
  const ai = new GoogleGenAI({ apiKey });

  if (transactions.length === 0) {
    return "Please add some transactions to receive AI-powered financial advice.";
  }

  const recentTransactions = transactions
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 50);

  const prompt = `
    You are a financial advisor. Analyze the following list of recent financial transactions (JSON format).
    
    Transactions:
    ${JSON.stringify(recentTransactions)}

    Please provide a concise analysis in Markdown format:
    1. Identify the top spending category.
    2. Point out any unusual spending patterns or frequent small expenses.
    3. Give one specific, actionable tip to improve savings based on this data.
    4. Keep the tone encouraging but professional.
    5. Keep it under 200 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    
    // Using .text property directly as per guidelines
    return response.text || "Could not generate advice at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Sorry, I'm having trouble analyzing your data right now. Please check your configuration.";
  }
};

/**
 * Suggests a category for an expense description using Gemini AI.
 */
export const categorizeDescription = async (description: string): Promise<string | null> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined") return null;

  const ai = new GoogleGenAI({ apiKey });

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
