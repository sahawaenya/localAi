// Load environment variables from the consuming project's root directory or script directory
const path = require("path");
const fs = require("fs");

const envPaths = [
  path.join(process.cwd(), ".env"),
  path.join(__dirname, ".env"),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath });
    // console.log(`✅ Loaded environment variables from: ${envPath}`);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  // console.warn("⚠️  No .env file found in CWD or script directory.");
}


async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientError(error) {
  const msg = String(error && (error.message || error))
    .replace(/\n/g, " ")
    .trim();
  // Common transient conditions: HTTP 5xx, UNAVAILABLE, timeouts, resets
  return /\b(5\d{2}|UNAVAILABLE|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|fetch failed)\b/i.test(
    msg,
  );
}

// Token tracking
// const fs = require("fs");

function saveTokenUsage(inputText, outputText, model) {
  try {
    const logFile = path.join(process.cwd(), "gemini_tokens.json");

    // Estimate tokens (1 token ≈ 4 characters)
    const inputTokens = Math.ceil(inputText.length / 4);
    const outputTokens = Math.ceil(outputText.length / 4);
    const totalTokens = inputTokens + outputTokens;

    // Calculate cost (Gemini 2.5 Flash pricing)
    const inputCost = (inputTokens / 1000000) * 0.075;
    const outputCost = (outputTokens / 1000000) * 0.3;
    const totalCost = inputCost + outputCost;

    // Load existing log
    let log = { requests: [], totalTokens: 0, totalCost: 0 };
    if (fs.existsSync(logFile)) {
      try {
        log = JSON.parse(fs.readFileSync(logFile, "utf8"));
      } catch (e) {
        // If corrupted, start fresh
      }
    }

    // Add new request
    log.requests.push({
      timestamp: new Date().toLocaleString("en-GB", {
        timeZone: "Asia/Jakarta",
      }),
      model: model || "gemini",
      inputTokens,
      outputTokens,
      totalTokens,
      cost: totalCost,
    });

    log.totalTokens += totalTokens;
    log.totalCost += totalCost;
    log.lastUpdated = new Date().toISOString();

    // Save immediately
    fs.writeFileSync(logFile, JSON.stringify(log, null, 2));
  } catch (error) {
    // Silent fail - don't break the main flow
    console.warn("⚠️  Failed to save token usage:", error.message);
  }
}

// Global cache for GoogleGenAI instances to reuse connections
const clientCache = new Map();

/**
 * Robust Gemini caller with model fallback + exponential backoff.
 * @param {string|Array} prompt - String or Gemini contents[] format
 * @param {object} [config] - Extra request fields; may include:
 *   - {string} model - Specific model to use
 *   - {number} retries - Max retry attempts
 *   - {string} systemInstruction - System instruction for the model
 *   - {string} systemMessage - Alias for systemInstruction
 * @param {number} [retries=3] - Max attempts across all models
 */
async function geminiAi(prompt, config = {}, retries = 3) {
  const { GoogleGenAI } = await import("@google/genai");

  // Read API keys from environment variable GEMINI_API_KEYS (comma separated) or fallback to single key
  const API_KEYS = process.env.GEMINI_API_KEYS
    ? process.env.GEMINI_API_KEYS.split(",")
        .map((k) => k.trim())
        .filter((k) => k)
    : [];
  if (API_KEYS.length === 0) {
    if (process.env.GEMINI_API_KEY) {
      API_KEYS.push(process.env.GEMINI_API_KEY);
    }
  }
  if (API_KEYS.length === 0) {
    throw new Error(
      "GEMINI_API_KEY atau GEMINI_API_KEYS tidak ditemukan di environment variable",
    );
  }

  // Initialize currentKeyIndex
  // Note: key rotation is now handled within the attempt loop

  // Normalize prompt -> contents[]
  const contents =
    typeof prompt === "string"
      ? [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ]
      : prompt;

  // Model rotation list — verified available via ListModels API (March 2026)
  // OLD 1.5.x models are DEPRECATED and return 404
  const defaultModels = [
    "gemini-3-flash-preview", // newest flash model
    "gemini-2.5-flash", // best balance of speed + quality
    "gemini-2.0-flash", // fast, reliable
    "gemini-2.0-flash-lite", // lightweight fallback
    "gemini-2.5-flash-lite", // newer lite variant
    // "gemini-3.1-pro-preview", // NOT available on free tier (limit: 0)
    // "gemini-1.5-flash-*",     // DEPRECATED — 404 errors
  ];

  // If caller forces a model, try it first then fall back to defaults (deduped)
  const models = (() => {
    const first = config && config.model ? [String(config.model)] : [];
    const rest = defaultModels.filter((m) => !first.includes(m));
    return [...first, ...rest];
  })();

  // Extract systemInstruction if provided
  const systemInstruction = config?.systemInstruction || config?.systemMessage;

  // Build base request (exclude reserved keys from config)
  const reservedKeys = [
    "model",
    "retries",
    "systemInstruction",
    "systemMessage",
  ];
  const extra =
    config && typeof config === "object"
      ? Object.fromEntries(
          Object.entries(config).filter(([k]) => !reservedKeys.includes(k)),
        )
      : {};

  let lastErr;
  const totalCombinations = API_KEYS.length * models.length;
  // Use provided retries or default to trying all combinations
  const maxAttempts = config.retries || Math.max(retries, totalCombinations);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    // Rotation logic: Try ALL keys for the FIRST model, then ALL keys for the SECOND model, etc.
    const keyIndex = (attempt - 1) % API_KEYS.length;
    const modelIndex =
      Math.floor((attempt - 1) / API_KEYS.length) % models.length;

    const model = models[modelIndex];
    const apiKey = API_KEYS[keyIndex];

    console.log(
      `${new Date().toLocaleString("en-GB", { timeZone: "Asia/Jakarta" })} | Attempt ${attempt}/${maxAttempts} using model '${model}' and API key index ${keyIndex}`,
    );

    // Reuse client if already created for this key
    let ai;
    if (clientCache.has(apiKey)) {
      ai = clientCache.get(apiKey);
    } else {
      ai = new GoogleGenAI({ apiKey });
      clientCache.set(apiKey, ai);
    }

    try {
      const req = {
        model,
        contents,
        ...extra,
      };

      // Add systemInstruction if provided
      if (systemInstruction) {
        req.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent(req);

      // Extract text from candidates
      const candidates = response?.candidates ?? [];
      let text = candidates
        .flatMap((c) => c?.content?.parts ?? [])
        .map((p) => p?.text || "")
        .join("")
        .trim();

      // Fallback for SDKs exposing response.text()
      if (!text && typeof response?.text === "function") {
        try {
          text = `${response.text()}`.trim();
        } catch (_) {}
      }
      if (!text && typeof response?.text === "string") {
        text = response.text.trim();
      }

      if (text) {
        console.log(
          "Gemini response received successfully on attempt",
          attempt,
          "using model",
          model,
          "and key index",
          keyIndex,
        );

        // Save token usage immediately
        const promptText =
          typeof contents === "string"
            ? contents
            : contents
                .map((c) => c.parts?.map((p) => p.text || "").join("") || "")
                .join("");
        saveTokenUsage(promptText, text, model);

        return text;
      }
      // If empty but not errored, treat as transient and retry
      throw new Error("Empty response text from Gemini");
    } catch (error) {
      lastErr = error;
      const msg = String(error && (error.message || error));

      // Log extended cause if available (e.g., for fetch failed)
      if (error.cause) {
        console.error(`Error cause for attempt ${attempt}:`, error.cause);
      }

      // Parse suggested retry delay if provided (e.g., "retry in 12s")
      const inMatch = msg.match(/retry in ([0-9.]+)s/i);
      const hdrMatch = msg.match(/Retry-After:\s*(\d+)/i);
      let delay = 0;
      if (inMatch)
        delay = Math.max(delay, Math.round(parseFloat(inMatch[1]) * 1000));
      if (hdrMatch) delay = Math.max(delay, parseInt(hdrMatch[1], 10) * 1000);

      if (
        /\b(RESOURCE_EXHAUSTED|quota|rate[- ]?limit|429|403|404|NOT_FOUND|5\d{2}|UNAVAILABLE|ECONNRESET|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|fetch failed|PERMISSION_DENIED)\b/i.test(
          msg,
        ) ||
        isTransientError(error)
      ) {
        // Log rotation if multiple keys/models
        if (totalCombinations > 1) {
          console.info(
            `Retrying with next combination due to error: ${msg.substring(0, 100)}${msg.length > 100 ? "..." : ""}`,
          );
        }

        // Exponential backoff with jitter, capped at 60s
        const base = Math.min(60000, 1000 * 2 ** Math.min(attempt - 1, 10));
        const jitter = Math.floor(Math.random() * 300);
        const waitMs = Math.max(delay, base + jitter);

        if (attempt < maxAttempts) {
          // If it's a quota/rate limit error and we have more keys to try for THIS model,
          // or if the wait is too long (> 30s), skip the wait to move to the next key.
          const isQuotaError =
            /\b(RESOURCE_EXHAUSTED|quota|rate[- ]?limit|429)\b/i.test(msg);
          const hasMoreKeysForModel = attempt % API_KEYS.length !== 0;

          if ((isQuotaError && hasMoreKeysForModel) || waitMs > 30000) {
            console.warn(
              `Transient/overload. Wait time ${Math.round(
                waitMs / 1000,
              )}s is long or Quota hit with keys remaining. Skipping wait to try next combination (Attempt ${attempt}/${maxAttempts}).`,
            );
            continue;
          }

          console.warn(
            `Transient/overload (${msg.substring(0, 50)}...). Attempt ${attempt}/${maxAttempts}. Retrying in ${Math.round(
              waitMs / 1000,
            )}s...`,
          );
          await sleep(waitMs);
          continue;
        }
      }

      // Non-transient or exhausted: bail out
      throw error;
    }
  }

  // Exhausted
  const errMsg = lastErr && lastErr.message ? lastErr.message : String(lastErr);
  console.error("Gemini API failed after all retries:", errMsg);
  throw new Error(
    `Gemini API failed after ${maxAttempts} attempts across combinations of models and keys — last error: ${errMsg}`,
  );
}

module.exports = geminiAi;
