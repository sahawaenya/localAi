/**
 * Script untuk mengecek quota dan status API Gemini untuk setiap key
 * yang terdaftar di environment variable.
 */

const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.join(process.cwd(), ".env") });

const COLORS = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  bgGreen: "\x1b[42m",
  bgRed: "\x1b[41m",
  black: "\x1b[30m",
};

async function checkQuota() {
  const { GoogleGenAI } = await import("@google/genai");

  // Load API keys
  const API_KEYS = process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(",")
        .map((k) => k.trim())
        .filter((k) => k)
    : [];
  
  if (API_KEYS.length === 0 && process.env.GEMINI_API_KEY) {
    API_KEYS.push(process.env.GEMINI_API_KEY);
  }

  if (API_KEYS.length === 0) {
    console.log(`${COLORS.red}${COLORS.bright}❌ Error: Tidak ada API_KEY yang ditemukan di .env${COLORS.reset}`);
    return;
  }

  const modelsToCheck = [
    "gemini-3.1-pro-preview",
    "gemini-3-pro-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-2.5-pro",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemma-4-31b-it",
    "gemma-4-26b-a4b-it",
    // --- Specialized & Research ---
    "gemini-2.5-computer-use-preview-10-2025",
    "gemini-3-pro-image-preview",
    "gemini-3.1-flash-image-preview",
    "gemini-2.5-flash-image",
    "lyria-3-pro-preview",
    "lyria-3-clip-preview",
    "nano-banana-pro-preview",
    "gemini-robotics-er-1.6-preview",

    // --- TTS & Audio ---
    "gemini-2.5-pro-preview-tts",
    "gemini-pro-latest",
    "gemini-flash-latest",
    "gemini-flash-lite-latest",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite-001",
    "gemini-3.1-pro-preview-customtools",
  ];

  console.log(`\n${COLORS.cyan}${COLORS.bright}🚀 GEMINI QUOTA CHECKER${COLORS.reset}`);
  console.log(`${COLORS.dim}Mengecek ${API_KEYS.length} API Key dengan ${modelsToCheck.length} model...${COLORS.reset}\n`);

  const results = [];

  for (let i = 0; i < API_KEYS.length; i++) {
    const apiKey = API_KEYS[i];
    const maskedKey = `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`;
    
    console.log(`${COLORS.bright}Key #${i} (${maskedKey}):${COLORS.reset}`);
    
    const ai = new GoogleGenAI({ apiKey });
    const keyStatus = {
      index: i,
      maskedKey,
      models: {},
      resets: {}
    };

    // Test each model
    for (const modelName of modelsToCheck) {
      process.stdout.write(`  ${COLORS.dim}Testing ${modelName}... ${COLORS.reset}`);
      
      try {
        // Use the same pattern as gemini.js
        const result = await ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: "ping" }] }],
          generationConfig: { maxOutputTokens: 1 }
        });
        
        // If we got here, it's active
        console.log(`\r  ✅ ${COLORS.green}${modelName.padEnd(25)} : ACTIVE${COLORS.reset}`);
        keyStatus.models[modelName] = "ACTIVE";
      } catch (error) {
        const msg = error.message || String(error);
        let status = "ERROR";
        let color = COLORS.red;
        let resetInfo = "N/A";

        if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("429") || msg.includes("quota")) {
          status = "QUOTA EXCEEDED";
          color = COLORS.yellow;
          
          // Try to extract retry time
          const inMatch = msg.match(/retry in ([0-9.]+)s/i);
          const hdrMatch = msg.match(/Retry-After:\s*(\d+)/i);
          if (inMatch) resetInfo = `${inMatch[1]}s`;
          else if (hdrMatch) resetInfo = `${hdrMatch[1]}s`;
          else resetInfo = "Check Dashboard"; // Likely daily limit
        } else if (msg.includes("API_KEY_INVALID") || msg.includes("403")) {
          status = "INVALID KEY";
        } else if (msg.includes("NOT_FOUND") || msg.includes("404")) {
          status = "MODEL NOT FOUND";
        }

        const statusText = status === "QUOTA EXCEEDED" && resetInfo !== "N/A" 
          ? `${status} (Reset in ${resetInfo})`
          : status;

        console.log(`\r  ❌ ${color}${modelName.padEnd(25)} : ${statusText}${COLORS.reset} ${COLORS.dim}(${msg.substring(0, 40)}${msg.length > 40 ? "..." : ""})${COLORS.reset}`);
        keyStatus.models[modelName] = status;
        keyStatus.resets[modelName] = resetInfo;
      }
    }
    console.log("");
    results.push(keyStatus);
  }

  // Final Summary Table
  console.log(`${COLORS.cyan}${COLORS.bright}📊 SUMMARY STATUS${COLORS.reset}`);
  console.log(`${COLORS.dim}${"Key".padEnd(15)} | ${modelsToCheck.map(m => m.replace("gemini-", "").padEnd(12)).join(" | ")}${COLORS.reset}`);
  console.log(`${COLORS.dim}${"-".repeat(15 + (modelsToCheck.length * 15))}${COLORS.reset}`);

  for (const res of results) {
    let row = `${COLORS.bright}${res.maskedKey.padEnd(15)}${COLORS.reset} | `;
    const modelStatuses = modelsToCheck.map(m => {
      const s = res.models[m];
      const r = res.resets[m];
      if (s === "ACTIVE") return `${COLORS.green}ACTIVE      ${COLORS.reset}`;
      if (s === "QUOTA EXCEEDED") {
        const resetStr = r !== "N/A" ? `Q(${r})` : "QUOTA";
        return `${COLORS.yellow}${resetStr.padEnd(12)}${COLORS.reset}`;
      }
      if (s === "INVALID KEY") return `${COLORS.red}INVALID     ${COLORS.reset}`;
      return `${COLORS.red}ERROR       ${COLORS.reset}`;
    });
    console.log(row + modelStatuses.join(" | "));
  }

  // Token Usage from gemini_tokens.json
  const logFile = path.join(process.cwd(), "gemini_tokens.json");
  if (fs.existsSync(logFile)) {
    try {
      const log = JSON.parse(fs.readFileSync(logFile, "utf8"));
      console.log(`\n${COLORS.magenta}${COLORS.bright}💰 TOTAL USAGE (from logs)${COLORS.reset}`);
      console.log(`${COLORS.dim}Total Tokens : ${COLORS.reset}${COLORS.bright}${log.totalTokens.toLocaleString()}${COLORS.reset}`);
      console.log(`${COLORS.dim}Total Cost   : ${COLORS.reset}${COLORS.bright}$${log.totalCost.toFixed(4)}${COLORS.reset}`);
      console.log(`${COLORS.dim}Last Updated : ${COLORS.reset}${log.lastUpdated || "N/A"}`);
    } catch (e) {
      // Ignore log parsing errors
    }
  }

  console.log(`\n${COLORS.dim}Selesai.${COLORS.reset}\n`);
}

checkQuota().catch(err => {
  console.error(`\n${COLORS.red}${COLORS.bright}FATAL ERROR:${COLORS.reset}`, err);
});
