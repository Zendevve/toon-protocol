import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const generateDataFromPrompt = async (prompt: string): Promise<any> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are a synthetic data generator. 
      Create a realistic, rich JSON dataset based on this request: "${prompt}".
      
      Rules:
      1. Return ONLY valid JSON. No markdown blocks, no explanation.
      2. Prefer arrays of objects (table-like data) to demonstrate structure.
      3. If the user asks for code, return a JSON structure representing that code or its AST, but prefer data structures.
      4. Generate at least 5-10 items for arrays to demonstrate scalability.`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4 // Lower temperature for more deterministic structural data
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response text from Gemini");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating data:", error);
    throw error;
  }
};
