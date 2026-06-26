import { GoogleGenAI } from "@google/genai";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const modelName = "gemini-3.1-flash-lite";

const intentCache = new Map<string, string>();

export async function extractIntent(userMessage: string): Promise<string> {
  if (intentCache.has(userMessage)) {
    return intentCache.get(userMessage)!;
  }

  try {
    const response = await genai.models.generateContent({
      model: modelName,
      contents: userMessage,
      config: {
        systemInstruction:
          "Classify the user's intent into ONE of these labels:\n" +
          "- read_and_summarize: search the web, fetch pages, read content (e.g. using web_search_exa, web_fetch_exa)\n" +
          "- security_check: check security status of domains, IPs, or URLs (e.g. using check_domain, check_ip, scan_url)\n" +
          "- threat_analysis: analyze CVEs or get threat summaries (e.g. using lookup_cve, get_threat_summary)\n" +
          "- file_management: create, read, write, or list local files\n" +
          "- general_query: general chat or questions\n" +
          "- unknown: fallback.\n" +
          "Respond with ONLY the exact label name, nothing else.",
      },
    });

    const text = response.text?.trim() || "general_query";

    const validLabels = [
      "read_and_summarize",
      "security_check",
      "threat_analysis",
      "file_management",
      "general_query",
      "unknown",
    ];
    const label = validLabels.includes(text) ? text : "general_query";

    intentCache.set(userMessage, label);
    return label;
  } catch (e) {
    return "general_query";
  }
}
