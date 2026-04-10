# Gemini Helper - Global Package

Global Gemini AI helper with automatic token tracking and system instruction support.

## 🚀 Installation

### Install Globally

```bash
cd /Users/sahawae/Documents/Development_Local/localGemini
npm install
npm link
```

Now you can use it in ANY project:

```javascript
// In any project
const geminiAi = require("@sahawae/gemini-helper");

const result = await geminiAi("Your prompt here");
console.log(result);
```

## 📊 CLI Tool

After `npm link`, you get a global command:

```bash
# View token usage in current directory
gemini-tokens              # All requests
gemini-tokens today        # Today's requests
gemini-tokens week         # Last 7 days
gemini-tokens month        # Last 30 days
```

## 🔧 Usage

### Basic Examples

```javascript
const geminiAi = require("@sahawae/gemini-helper");

async function main() {
  // Simple usage
  const result = await geminiAi("Generate 10 questions about AI");

  // With system instruction
  const result2 = await geminiAi("Create a poem", {
    systemInstruction:
      "You are a professional poet. Write in a romantic style.",
  });

  // With custom model and system instruction
  const result3 = await geminiAi("Explain quantum physics", {
    model: "gemini-2.5-pro",
    systemInstruction:
      "You are a physics professor. Explain concepts simply for beginners.",
    retries: 5,
  });

  // Using systemMessage (alias)
  const result4 = await geminiAi("Write code", {
    systemMessage: "You are an expert JavaScript developer.",
  });

  console.log(result);
}
```

### Parameters

- **prompt** (string|array): The user prompt or Gemini contents[] format
- **config** (object, optional):
  - `model` (string): Specific model to use (e.g., 'gemini-2.5-pro')
  - `systemInstruction` (string): System instruction for the model
  - `systemMessage` (string): Alias for systemInstruction
  - `retries` (number): Max retry attempts
  - Any other Gemini API parameters
- **retries** (number, optional): Default max attempts (default: 3)

### More Examples

See `examples.js` for comprehensive usage examples:

```bash
node /Users/sahawae/Documents/Development_Local/localGemini/examples.js
```

### Token Tracking

Token usage is **automatically saved** to `gemini_tokens.json` in your current working directory every time you call `geminiAi()`.

## 🌍 Environment Variables

### Option 1: Using .env File (Recommended)

The package includes a `.env` file with 15 pre-configured API keys:

```bash
# Already configured in .env
GEMINI_API_KEYS=key1,key2,key3,...
```

**No additional setup needed!** The keys are automatically loaded from `.env`.

### Option 2: Custom Keys

To use your own keys:

```bash
# Edit .env file
code /Users/sahawae/Documents/Development_Local/localGemini/.env

# Or set environment variable
export GEMINI_API_KEYS="your-key-1,your-key-2,your-key-3"
```

### Priority Order

1. `GEMINI_API_KEYS` from environment variable
2. `GEMINI_API_KEY` from environment variable
3. Keys from `.env` file (15 keys included)
4. Error if no keys found

## 📁 Files Generated

- `gemini_tokens.json` - Token usage log (created in current directory)

## 🎯 Features

- ✅ Global installation via `npm link`
- ✅ **System instruction support** (systemInstruction / systemMessage)
- ✅ Automatic token tracking (real-time)
- ✅ Real-time cost estimation
- ✅ Multi-key rotation (15 keys from .env)
- ✅ Retry logic with exponential backoff
- ✅ CLI tool for viewing usage
- ✅ Works in any project

## 📝 Editing

To edit `gemini.js`:

```bash
# 1. Edit the file
code /Users/sahawae/Documents/Development_Local/localGemini/gemini.js

# 2. Changes are immediately available to all projects
# No sync needed - gemini.js is the main file!
```

## 🔄 Uninstall

```bash
npm unlink -g @sahawae/gemini-helper
```

## 📝 Example Projects

After `npm link`, use in any project:

```javascript
// project1/index.js
const geminiAi = require("@sahawae/gemini-helper");
await geminiAi("Generate code...");

// project2/app.js
const geminiAi = require("@sahawae/gemini-helper");
await geminiAi("Analyze data...", {
  systemInstruction: "You are a data scientist.",
});

// Both will track tokens in their respective directories!
```
