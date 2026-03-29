import { Feedback } from "../types";

export const generateAIInsights = async (feedbacks: Feedback[]): Promise<{ summary: string; suggestions: string[] }> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey || apiKey.includes("your_copied_api_key")) {
    return {
      summary: "Configuration Error",
      suggestions: ["Check .env file for valid API Key"]
    };
  }

  // --- STEP 1: Find a working model dynamically ---
  let selectedModel = "gemini-1.5-flash"; // Default preference
  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const listResp = await fetch(listUrl);
    const listData = await listResp.json();

    if (listData.models) {
      // Find models that support generation
      const availableModels = listData.models
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace("models/", "")); // e.g. "gemini-pro"

      console.log("✅ Available Models:", availableModels);

      // Pick the best one
      if (availableModels.includes("gemini-1.5-flash")) {
        selectedModel = "gemini-1.5-flash";
      } else if (availableModels.includes("gemini-pro")) {
        selectedModel = "gemini-pro";
      } else if (availableModels.length > 0) {
        selectedModel = availableModels[0]; // Fallback to whatever is there
      }
    }
  } catch (e) {
    console.warn("Could not list models, trying default...", e);
  }

  // --- STEP 2: Prepare Data ---
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const recentFeedback = feedbacks.filter(f => f.timestamp > thirtyDaysAgo);

  if (recentFeedback.length === 0) {
    return {
      summary: "No recent data to analyze.",
      suggestions: ["Submit some test feedback first."]
    };
  }

  const feedbackList = recentFeedback
    .slice(0, 30)
    .map(f => `- ${f.dishName} (${f.rating}/5): ${f.comment || 'No comment'}`)
    .join('\n');

  const promptText = `
    Analyze these hostel mess feedbacks:
    ${feedbackList}

    Return ONLY valid JSON with this structure:
    {
      "summary": "One sentence summary.",
      "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
    }
  `;

  // --- STEP 3: Generate Content using the Found Model ---
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Unknown API Error");
    }

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanText);

  } catch (error: any) {
    console.error("AI Generation Failed:", error);
    return {
      summary: `AI Failed (${selectedModel})`,
      suggestions: [`Error: ${error.message}`, "Check console logs for details."]
    };
  }
};