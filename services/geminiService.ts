import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFishFact = async (fishName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `給我一個關於 ${fishName} 的有趣、簡短且令人驚訝的生物學冷知識。如果 "${fishName}" 是垃圾（如靴子或罐頭），請改為提供關於海洋污染或回收的簡短事實。請用繁體中文（台灣）回答，保持在兩句話以內。`,
    });
    return response.text || "這個物品非常神秘！";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI 目前潛水中，無法獲取資訊。";
  }
};

export const generateFishRecipe = async (fishName: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `建議一個我可以用 ${fishName} 做的美味菜餚名稱。如果是垃圾（如靴子、輪胎或罐頭），請編一個好笑的惡搞食譜名稱（例如「水煮舊鞋底」）。然後提供 3 個簡短的製作步驟（如果是垃圾，請寫得好笑一點）。請用繁體中文（台灣）回答。`,
    });
    return response.text || "這個物品最好是用來欣賞，而不是吃。";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "AI 廚師去吃午餐了。";
  }
};