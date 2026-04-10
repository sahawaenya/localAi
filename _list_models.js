// Temporary script to list available Gemini models
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

async function listModels() {
  const { GoogleGenAI } = await import("@google/genai");

  const apiKey = process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(",")[0].trim()
    : process.env.GEMINI_API_KEY;

  console.log("Using API key:", apiKey.substring(0, 10) + "...");

  const ai = new GoogleGenAI({ apiKey });

  try {
    const result = await ai.models.list();
    const models = [];
    for await (const model of result) {
      if (
        model.supportedActions &&
        model.supportedActions.includes("generateContent")
      ) {
        models.push(model.name);
      }
    }

    console.log("\n=== Models supporting generateContent ===");
    models.sort();
    for (const m of models) {
      console.log(`  ${m}`);
    }
    console.log(`\nTotal: ${models.length} models`);
  } catch (error) {
    console.error("Error listing models:", error.message);
  }
}

listModels();
