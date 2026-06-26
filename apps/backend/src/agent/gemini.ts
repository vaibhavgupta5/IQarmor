import { GoogleGenAI, FunctionDeclaration, Content } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
export const geminiModel = "gemini-3.1-flash-lite";

export function startChat(
  systemInstruction: string,
  tools: FunctionDeclaration[],
) {
  // @google/genai syntax for chat sessions
  return genai.chats.create({
    model: geminiModel,
    config: {
      systemInstruction,
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_HATE_SPEECH' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT' as any, threshold: 'BLOCK_NONE' as any },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT' as any, threshold: 'BLOCK_NONE' as any }
      ]
    },
  });
}
