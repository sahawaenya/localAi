const geminiAi = require("./gemini.js");
const { fetchSurveyData } = require("./api_client");

// ── Schema helpers ────────────────────────────────────────────────────────────

const CHART_SCHEMAS = {
  bar: `{ "title": "...", "type": "bar", "items": [ { "label": "Nama Opsi", "value": 65, "color": "#0000BD" } ] }`,
  pie: `{ "title": "...", "type": "pie", "items": [ { "label": "Kategori A", "value": 40, "color": "#0000BD" }, { "label": "Kategori B", "value": 35, "color": "#4F46E5" }, { "label": "Kategori C", "value": 25, "color": "#818CF8" } ] }`,
  trend: `{ "title": "...", "type": "trend", "items": [ { "label": "Titik 1", "value": 55 }, { "label": "Titik 2", "value": 63 }, { "label": "Titik 3", "value": 70 } ] }`,
};

const CHART_RULES = {
  bar: `Perbandingan frekuensi antar opsi jawaban. Setiap item = satu opsi. "value" = jumlah/persen responden. Wajib sertakan "color" hex.`,
  pie: `Komposisi/proporsi keseluruhan. Total nilai mendekati 100 jika persen. Wajib sertakan "color" hex berbeda tiap item. Gunakan palet biru-indigo.`,
  trend: `Perubahan nilai secara berurutan. "label" = titik waktu/urutan. "value" = angka numerik. Minimal 3, maksimal 8 titik data.`,
};

const schemaFor = (type) => CHART_SCHEMAS[type] || CHART_SCHEMAS.bar;
const ruleFor  = (type) => CHART_RULES[type]  || CHART_RULES.bar;

// ── Region context helper ─────────────────────────────────────────────────────

const buildRegionContext = (locationFilter) => {
  if (!locationFilter) return "seluruh Indonesia (Nasional)";

  // New multi-select format: { provs: [...], cities: [...] }
  const provs  = locationFilter.provs  || [];
  const cities = locationFilter.cities || [];

  if (provs.length > 0 || cities.length > 0) {
    const parts = [];
    if (cities.length > 0) parts.push(`Kab./Kota ${cities.map(c => c.name).join(", ")}`);
    if (provs.length > 0)  parts.push(`Provinsi ${provs.map(p => p.name).join(", ")}`);
    return parts.join(" — ");
  }

  // Legacy single format: { prov: {...}, city: {...} }
  if (locationFilter.city) return `Kabupaten/Kota ${locationFilter.city.name}, Provinsi ${locationFilter.prov.name}`;
  if (locationFilter.prov) return `Provinsi ${locationFilter.prov.name}`;

  return "seluruh Indonesia (Nasional)";
};

// ── Main analysis function ────────────────────────────────────────────────────

const getAiAnalysis = async (data, options = {}) => {
  try {
    const rawData = data || await fetchSurveyData();

    const format          = options.type || "full";
    const locationFilter  = options.location_filter;
    const synthesizedData = options.synthesizedAnalysis;
    const chartConfigs    = options.chartConfigs; // new per-chart format
    const legacyCharts    = options.charts;        // legacy ["bar"] format

    const regionContext = buildRegionContext(locationFilter);
    const allData       = Array.isArray(rawData) ? rawData : (rawData.data || rawData);
    const isTextOnly    = format === "text";

    // ── Summary rules (shared between both modes) ─────────────────────────────
    const summaryRules = `
      Aturan Ketat untuk properti "summary" (Wajib Diikuti):
      1. Konteks: Buat ringkasan secara singkat, padat, dan HANYA berisi informasi inti/kesimpulan utama. Output ini akan disandingkan dengan infografis di PDF, sehingga narasi ini HANYA boleh berisi insight atau kesimpulan penting agar tidak redundan dengan visual infografis.
      2. Struktur: WAJIB buat dalam TEPAT 3 paragraf terpisah. Gunakan "\\n\\n" sebagai pemisah antar paragraf di dalam teks JSON. 
         - Paragraf 1: Ringkasan temuan utama secara umum.
         - Paragraf 2: Analisis mendalam (hambatan, kebutuhan, pola tren).
         - Paragraf 3: KHUSUS saran dan rekomendasi konkrit untuk Kadin.
      3. Penulisan Nama: Penulisan nama institusi wajib menggunakan "Kadin" (bukan "KADIN").
      4. Integritas Data: HANYA gunakan data yang disediakan, dilarang keras menambahkan informasi dari luar atau mengarang fakta.
      5. Data Kuantitatif: WAJIB menyertakan data kuantitatif secara spesifik. Anda SEDANG menganalisis TEPAT ${allData.length} responden. Sebutkan angka ${allData.length} ini di awal narasi agar konsisten dengan grafik (contoh: "Dari total ${allData.length} responden...").
      6. Format: Tandai frasa-frasa penting dengan tag <penting> ........ </penting>. DILARANG menggunakan simbol markdown "*" atau "**" untuk cetak tebal, gunakan saja tag <penting>.
      7. Gaya Bahasa: Tidak usah sertakan citation. Langsung hasilnya saja, tidak usah pakai judul/subjudul, langsung paragrafnya.
      8. Ketelitian Geografis: CUKUP sebutkan nama tingkat Provinsi saja di dalam narasi (TIDAK PERLU merincikan nama kota/kabupaten karena rincian tersebut sudah tertulis di header dokumen). Jika mencakup banyak provinsi, sebutkan provinsinya atau gunakan frasa "di beberapa provinsi" (jangan menggeneralisasi ke satu provinsi jika ada data dari provinsi lain).
    `;

    const synthesisRules = synthesizedData ? `
      Aturan untuk "synthesizedSubtitle": Buat judul menarik max 8 kata yang menggambarkan korelasi antar pertanyaan. Contoh: "Korelasi Pendidikan terhadap Prioritas Bisnis".
      Aturan untuk "synthesizedAnalysis": Analisis mendalam menghubungkan pertanyaan-pertanyaan yang ada. Fokus pada cross-tabulation insight. Gunakan tag <penting>. Panjang 1-2 paragraf padat.
    ` : "";

    // ═══════════════════════════════════════════════════════════════════════
    // MODE A — New per-chart chartConfigs format
    // ═══════════════════════════════════════════════════════════════════════
    if (!isTextOnly && chartConfigs && chartConfigs.length > 0) {
      const N = chartConfigs.length;

      // Build per-chart instruction blocks
      const chartInstructions = chartConfigs.map((cfg, i) => {
        const type    = cfg.type || "bar";
        const hasData = cfg.questions && cfg.questions.length > 0;

        const dataBlock = hasData
          ? `Data Pertanyaan: ${JSON.stringify(cfg.questions)}\nData Jawaban: ${JSON.stringify(cfg.submissions)}`
          : `[TIDAK ADA PERTANYAAN SPESIFIK — gunakan data survei penuh di bawah, pilih pertanyaan paling relevan dan kuantitatif untuk grafik ${type} ini]`;

        return `
--- CHART ${i + 1} (wajib type: "${type}") ---
${dataBlock}
Skema wajib: ${schemaFor(type)}
Aturan tipe: ${ruleFor(type)}
`;
      }).join("\n");

      const visualsSchema = chartConfigs.map((cfg, i) => schemaFor(cfg.type || "bar")).join(",\n          ");

      const prompt = `
Analisis data survei untuk wilayah **${regionContext}** dan hasilkan output JSON.
${synthesizedData ? "Anda juga akan membuat Analisis Sintesis dari data khusus yang diberikan." : ""}

DATA SURVEI PENUH (digunakan untuk "summary" dan untuk chart yang tidak punya pertanyaan spesifik):
${JSON.stringify(allData)}
${synthesizedData ? `\nData untuk Analisis Sintesis: ${JSON.stringify(synthesizedData)}` : ""}

INSTRUKSI CHART (${N} chart, WAJIB hasilkan visuals array dengan tepat ${N} elemen dalam urutan yang sama):
${chartInstructions}

Anda WAJIB mengembalikan HANYA objek JSON murni berikut:
{
  "summary": "Isi narasi di sini",
  "visuals": [
    ${visualsSchema}
  ]${synthesizedData ? `,
  "synthesizedSubtitle": "...",
  "synthesizedAnalysis": "..."` : ""}
}

${summaryRules}
${synthesisRules}

Aturan Ketat untuk "visuals":
1. Array "visuals" WAJIB memiliki tepat ${N} elemen, sesuai urutan chart instruksi di atas.
2. Elemen ke-i WAJIB menggunakan "type" sesuai instruksi chart ke-i.
3. "value" WAJIB berupa angka numerik murni, tanpa satuan/string.
4. Jika chart tidak punya data spesifik, pilih pertanyaan paling kuantitatif dari data survei penuh.
5. Setiap "title" harus informatif dan merepresentasikan topik pertanyaan spesifik.
6. Penulisan nama institusi wajib "Kadin".

PENTING: Langsung hasilkan JSON saja. Jangan sertakan markdown code block, langsung mulai dengan karakter '{'.
      `;

      const responseText = await geminiAi(prompt, { model: "gemini-2.0-flash" });
      const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

      try {
        const parsed = JSON.parse(jsonString);
        // Safety: ensure visuals array length matches configs
        if (parsed.visuals && parsed.visuals.length !== N) {
          console.warn(`AI returned ${parsed.visuals.length} visuals but expected ${N}. Padding/trimming.`);
          // Trim if too many
          parsed.visuals = parsed.visuals.slice(0, N);
          // Pad with empty fallbacks if too few
          while (parsed.visuals.length < N) {
            const cfg = chartConfigs[parsed.visuals.length];
            parsed.visuals.push({ title: "Data tidak tersedia", type: cfg?.type || "bar", items: [] });
          }
        }
        // Enforce correct type per config (override AI mistakes)
        parsed.visuals = parsed.visuals.map((v, i) => ({
          ...v,
          type: chartConfigs[i]?.type || v.type || "bar"
        }));
        return parsed;
      } catch (parseError) {
        console.error("Failed to parse AI JSON (chartConfigs mode):", parseError);
        return { summary: responseText, visuals: [] };
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODE B — Legacy single chart type format
    // ═══════════════════════════════════════════════════════════════════════
    const chartOption    = legacyCharts || ["bar"];
    const requestedChart = Array.isArray(chartOption) ? (chartOption[0] || "bar") : chartOption;

    let prompt = `
    Analisis data survei berikut untuk wilayah **${regionContext}** secara dinamis, lalu berikan output dalam format JSON yang berisi ringkasan eksekutif${isTextOnly ? "." : " serta metrik visual untuk infografis."}
    ${synthesizedData ? "Anda juga diberikan data khusus untuk dibuatkan 'Analisis Sintesis'." : ""}

      Data Survei: ${JSON.stringify(allData)}
      ${synthesizedData ? `Data untuk Analisis Sintesis: ${JSON.stringify(synthesizedData)}` : ""}

      Anda WAJIB mengembalikan HANYA sebuah objek JSON murni:
      {
        "summary": "Isi narasi di sini"${isTextOnly ? "" : `,
        "visuals": [ ${schemaFor(requestedChart)} ]`}${synthesizedData ? `,
        "synthesizedSubtitle": "...",
        "synthesizedAnalysis": "..."` : ""}
      }

      ${summaryRules}
      ${synthesisRules}
    `;

    if (!isTextOnly) {
      prompt += `
      Aturan Ketat untuk "visuals":
      1. Identifikasi 3-5 wawasan kuantitatif paling krusial dari pertanyaan survei berbeda.
      2. Setiap "title" HARUS merepresentasikan topik pertanyaan yang spesifik dan informatif.
      3. SEMUA visual WAJIB menggunakan type "${requestedChart}". Jangan gunakan type lain.
      4. ${ruleFor(requestedChart)}
      5. "value" WAJIB berupa angka numerik murni, tanpa satuan.
      6. Penulisan nama institusi wajib "Kadin".
      `;
    }

    prompt += `\nPENTING: Langsung hasilkan JSON saja. Jangan sertakan markdown code block, langsung mulai dengan karakter '{'.`;

    const responseText = await geminiAi(prompt, { model: "gemini-2.0-flash" });
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI JSON (legacy mode):", parseError);
      return { summary: responseText, visuals: [] };
    }

  } catch (error) {
    console.error("Error in getAiAnalysis:", error);
    throw error;
  }
};


if (require.main === module) {
  getAiAnalysis().then(console.log).catch(console.error);
}

module.exports = { getAiAnalysis };
