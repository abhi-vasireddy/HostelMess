import { GoogleGenAI, Type } from "@google/genai";
import { Feedback } from "../types";

export const generateAIInsights = async (feedbacks: Feedback[]): Promise<{ summary: string; suggestions: string[] }> => {
  if (!process.env.API_KEY) {
    console.warn("API_KEY missing");
    return { 
      summary: "AI Insights unavailable. Please verify your API Key configuration.", 
      suggestions: ["Ensure API Key is valid.", "Check environment variables."] 
    };
  }

  // Filter for recent feedback (last 30 days) to keep context relevant
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentFeedback = feedbacks.filter(f => f.timestamp > thirtyDaysAgo);

  if (recentFeedback.length === 0) {
    return { 
      summary: "No sufficient feedback data from the last 30 days to generate insights.", 
      suggestions: ["Encourage students to submit daily feedback.", "Wait for more data to accumulate."] 
    };
  }

  // Format feedback for the prompt, including rating context
  const feedbackList = recentFeedback
    .map(f => `- [${f.mealType}] ${f.dishName} (${f.rating}/5): "${f.comment || 'No comment'}"`)
    .join('\n');

  const prompt = `
    You are an expert Hostel Food Manager AI. Analyze the following student feedback logs for the past 30 days.
    
    Feedback Logs:
    ${feedbackList}
    
    Tasks:
    1. Analyze the sentiment and identify key trends (both positive and negative).
    2. Provide a concise summary (max 3 sentences) of the overall food quality and student satisfaction.
    3. Provide 3-5 specific, actionable, and constructive suggestions to improve the menu, cooking quality, or service. Focus on the most critical issues identified.

    Output must be valid JSON matching the schema.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { 
              type: Type.STRING,
              description: "A concise summary of feedback trends and satisfaction levels."
            },
            suggestions: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "A list of actionable suggestions for improvement." 
            }
          },
          required: ["summary", "suggestions"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return { 
      summary: "Unable to generate insights at this time due to a service error.", 
      suggestions: ["Please try again later.", "Check system logs for more details."] 
    };
  }
};