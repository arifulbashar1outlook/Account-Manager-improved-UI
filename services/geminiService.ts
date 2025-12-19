
import { GoogleGenAI, Type } from "@google/genai";

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

/**
 * Analyzes spending habits and provides a short insight.
 */
export const getFinancialAdvice = async (income: number, expense: number, projected: number): Promise<string> => {
    if (!process.env.API_KEY || process.env.API_KEY === "undefined") return "Connect AI to see insights.";
    
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const savingsRate = income > 0 ? ((income - expense) / income * 100).toFixed(1) : 0;
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `As a financial coach, give a 2-sentence max advice. 
            Monthly Income: ${income}, Expenses: ${expense}, Projected end-of-month: ${projected}, Savings Rate: ${savingsRate}%. 
            Be encouraging but direct. Use professional tone.`,
        });
        return response.text?.trim() || "Analyze your spending to improve your health score.";
    } catch (e) {
        return "Keep tracking to see financial patterns.";
    }
}

/**
 * Extracts items and prices from a receipt image.
 */
export const analyzeReceipt = async (base64Image: string, mimeType: string): Promise<{ name: string, price: number }[]> => {
  if (!process.env.API_KEY || process.env.API_KEY === "undefined") throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: [
        {
          inlineData: {
            data: base64Image,
            mimeType: mimeType
          }
        },
        {
          text: "Analyze this bazar memo/receipt and extract all items with their prices. Return a JSON array of objects with 'name' and 'price' (number). If a price is unclear, use 0. Return ONLY the JSON."
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              price: { type: Type.NUMBER }
            },
            required: ["name", "price"]
          }
        }
      }
    });

    const result = JSON.parse(response.text || "[]");
    return result;
  } catch (e) {
    console.error("Receipt Analysis Error:", e);
    return [];
  }
};

/**
 * Parses natural language input into a structured transaction.
 */
export const parseNaturalLanguage = async (text: string, accountNames: string[]): Promise<any> => {
  if (!process.env.API_KEY || process.env.API_KEY === "undefined") throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Convert this spending note into a structured JSON transaction.
      Input: "${text}"
      Available Wallets: ${accountNames.join(", ")}
      
      Return JSON with:
      - description (string)
      - amount (number)
      - type (expense | income | transfer)
      - category (string)
      - accountName (string, must match one of the available wallets if mentioned, otherwise leave empty)
      - targetAccountName (string, for transfers, must match one of available wallets if mentioned)`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["expense", "income", "transfer"] },
            category: { type: Type.STRING },
            accountName: { type: Type.STRING },
            targetAccountName: { type: Type.STRING }
          },
          required: ["description", "amount", "type", "category"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Natural Language Parsing Error:", e);
    return null;
  }
};
