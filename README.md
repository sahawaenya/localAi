# Gemini Helper

Global Gemini AI helper with automatic token tracking, multi-key rotation, and model fallback support.

## 🚀 Installation

### Option 1: Install via GitHub (Recommended)

Install langsung ke project kamu tanpa perlu setup lokal:

```bash
# npm
npm install github:sahawaenya/localAi

# pnpm
pnpm add github:sahawaenya/localAi

# yarn
yarn add github:sahawaenya/localAi
```

Kemudian gunakan di kode:

```javascript
const geminiAi = require("@sahawae/gemini-helper");

const result = await geminiAi("Your prompt here");
console.log(result);
```

### Option 2: Install Global via npm link (Development)

Jika kamu ingin mengedit source-nya secara lokal:

```bash
git clone https://github.com/sahawaenya/localAi.git
cd localAi
npm install
npm link
```

Setelah `npm link`, gunakan di project manapun:

```javascript
const geminiAi = require("@sahawae/gemini-helper");
```

## 🔑 Environment Variables

Buat file `.env` di **root project kamu** (bukan di dalam package):

```bash
# .env
GEMINI_API_KEY=your-api-key-here

# Atau multiple keys untuk rotasi otomatis:
GEMINI_API_KEYS=key1,key2,key3
```

> Dapatkan API key gratis di [Google AI Studio](https://aistudio.google.com/app/apikey)

### Urutan Prioritas

1. `GEMINI_API_KEYS` — multiple keys, dirotasi otomatis
2. `GEMINI_API_KEY` — single key
3. Error jika tidak ada key yang ditemukan

## 🔧 Penggunaan

### Contoh Dasar

```javascript
const geminiAi = require("@sahawae/gemini-helper");

async function main() {
  // Simple usage
  const result = await geminiAi("Generate 10 questions about AI");

  // Dengan system instruction
  const result2 = await geminiAi("Buat sebuah puisi", {
    systemInstruction: "Kamu adalah penyair profesional. Tulis dengan gaya romantis.",
  });

  // Dengan model spesifik
  const result3 = await geminiAi("Jelaskan fisika kuantum", {
    model: "gemini-2.5-pro",
    systemInstruction: "Kamu adalah profesor fisika. Jelaskan untuk pemula.",
    retries: 5,
  });

  // Alias systemMessage
  const result4 = await geminiAi("Tulis kode", {
    systemMessage: "Kamu adalah developer JavaScript senior.",
  });

  console.log(result);
}
```

### Parameter

| Parameter | Tipe | Keterangan |
|---|---|---|
| `prompt` | `string \| array` | Prompt teks atau format Gemini `contents[]` |
| `config.model` | `string` | Model spesifik, misal `gemini-2.5-pro` |
| `config.systemInstruction` | `string` | System instruction untuk model |
| `config.systemMessage` | `string` | Alias untuk `systemInstruction` |
| `config.retries` | `number` | Maksimal percobaan ulang |
| `retries` | `number` | Default maks percobaan (default: `3`) |

## 📊 CLI: Token Usage

Setelah install, tersedia command untuk melihat penggunaan token:

```bash
# Semua request
gemini-tokens

# Filter berdasarkan periode
gemini-tokens today    # Hari ini
gemini-tokens week     # 7 hari terakhir
gemini-tokens month    # 30 hari terakhir
```

> Token usage otomatis disimpan ke `gemini_tokens.json` di root project yang memanggilnya.

## 🎯 Fitur

- ✅ Install via GitHub — tidak perlu setup lokal
- ✅ Multi-key rotation otomatis
- ✅ Model fallback (Gemini 3 Flash → 2.5 Flash → 2.0 Flash → dst.)
- ✅ Retry dengan exponential backoff
- ✅ System instruction support
- ✅ Token tracking & estimasi biaya otomatis
- ✅ CLI tool untuk melihat penggunaan

## 🔄 Update Package

Jika ada update dari repository, jalankan di project kamu:

```bash
# npm
npm update github:sahawaenya/localAi

# pnpm
pnpm update github:sahawaenya/localAi
```

## 🗑️ Uninstall

```bash
npm uninstall @sahawae/gemini-helper
```
