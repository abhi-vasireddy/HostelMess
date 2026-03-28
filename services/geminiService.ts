import { Feedback } from "../types";

export const generateAIInsights = async (
  feedbacks: Feedback[]
): Promise<{ summary: string; suggestions: string[] }> => {
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // ✅ Check API key
  if (!apiKey || apiKey.includes("your_copied_api_key")) {
    return {
      summary: "Configuration Error",
      suggestions: ["Check .env file for valid API Key"]
    };
  }

  // ✅ Use stable model directly (NO dynamic listing)
  const selectedModel = "gemini-1.5-flash";

  // --- STEP 1: Prepare Data ---
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  const recentFeedback = feedbacks.filter(
    (f) => f.timestamp > thirtyDaysAgo
  );

  if (recentFeedback.length === 0) {
    return {
      summary: "No recent data to analyze.",
      suggestions: ["Submit some test feedback first."]
    };
  }

  const feedbackList = recentFeedback
    .slice(0, 30)
    .map(
      (f) =>
        `- ${f.dishName} (${f.rating}/5): ${
          f.comment || "No comment"
        }`
    )
    .join("\n");

  const promptText = `
Analyze these hostel mess feedbacks:

${feedbackList}

Return ONLY valid JSON with this structure:
{
  "summary": "One sentence summary.",
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}
`;

  // --- STEP 2: Call Gemini API ---
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: promptText }],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "Unknown API Error");
    }

    // ✅ Extract response safely
    const rawText =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // ✅ Clean markdown if Gemini returns ```json
    const cleanText = rawText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    // ✅ Parse JSON safely
    try {
      return JSON.parse(cleanText);
    } catch {
      return {
        summary: "AI response parsing failed",
        suggestions: [
          "Try again",
          "Check prompt formatting",
          cleanText.slice(0, 100)
        ],
      };
    }

  } catch (error: any) {
    console.error("AI Generation Failed:", error);

    return {
      summary: `AI Failed (${selectedModel})`,
      suggestions: [
        `Error: ${error.message}`,
        "Check console logs for details."
      ],
    };
  }
};