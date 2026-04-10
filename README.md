# Gemini Helper

Global Gemini AI helper with automatic token tracking, multi-key rotation, and model fallback support.

## 🚀 Cara Install

---

### 📦 Option 1 — Install via GitHub

> Cocok untuk **menggunakan** package di project kamu tanpa perlu clone atau setup lokal.

**Langkah-langkah:**

```bash
# 1. Tambahkan package ke project kamu
pnpm add github:sahawaenya/localAi
```

```bash
# 2. Buat file .env di root project kamu
GEMINI_API_KEY=your-api-key-here
# atau multiple keys:
GEMINI_API_KEYS=key1,key2,key3
```

```javascript
// 3. Gunakan di kode
const geminiAi = require("@sahawae/gemini-helper");

const result = await geminiAi("Your prompt here");
console.log(result);
```

**Untuk update ke versi terbaru:**

```bash
pnpm update github:sahawaenya/localAi
```

---

### 🔗 Option 2 — Install via pnpm link (Development)

> Cocok untuk **mengembangkan / mengedit** source package-nya secara lokal. Perubahan pada source langsung terasa di semua project yang menggunakannya.

**Langkah-langkah:**

```bash
# 1. Clone repository
git clone https://github.com/sahawaenya/localAi.git
cd localAi

# 2. Install dependencies
pnpm install

# 3. Daftarkan sebagai global package
pnpm link --global
```

```bash
# 4. Di project yang ingin menggunakan, jalankan:
cd /path/to/your-project
pnpm link --global @sahawae/gemini-helper
```

```javascript
// 5. Gunakan di kode (sama seperti Option 1)
const geminiAi = require("@sahawae/gemini-helper");
```

**Untuk melepas link:**

```bash
pnpm unlink --global @sahawae/gemini-helper
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

## 🗑️ Uninstall

```bash
# Jika install via GitHub
pnpm remove @sahawae/gemini-helper

# Jika install via pnpm link
pnpm unlink --global @sahawae/gemini-helper
```
