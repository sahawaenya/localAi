const geminiAi = require("./gemini.js");
const { fetchSurveyData } = require("./api_client");

const getAiAnalysis = async (data, options = {}) => {
  try {
    // If data is not provided, fetch it
    const rawData = data || await fetchSurveyData();

    // Extract options
    const format = options.type || "full"; // 'text' or 'full'
    const requestedCharts = options.charts || ["bar"]; // e.g. ['bar', 'pie']
    const locationFilter = options.location_filter;
    const synthesizedData = options.synthesizedAnalysis;

    let regionContext = "seluruh Indonesia (Nasional)";
    if (locationFilter) {
      if (locationFilter.city) {
         regionContext = `Kabupaten/Kota ${locationFilter.city.name}, Provinsi ${locationFilter.prov.name}`;
      } else if (locationFilter.prov) {
         regionContext = `Provinsi ${locationFilter.prov.name}`;
      }
    }

    // Extract the array if it's the full API response object
    const surveyData = Array.isArray(rawData) ? rawData : (rawData.data || rawData);

    const isTextOnly = format === "text";
    
    let prompt = `
    Analisis data survei berikut untuk wilayah **${regionContext}** secara dinamis sesuai dengan jenis dan konteks pertanyaan yang ada, lalu berikan output dalam format JSON yang berisi ringkasan eksekutif${isTextOnly ? "." : " serta metrik visual untuk infografis."}
    ${synthesizedData ? "Anda juga diberikan data khusus untuk dibuatkan 'Analisis Sintesis' yang menghubungkan beberapa pertanyaan spesifik." : ""}

      Data Survei: ${JSON.stringify(surveyData)}
      ${synthesizedData ? `Data untuk Analisis Sintesis: ${JSON.stringify(synthesizedData)}` : ""}

      Anda WAJIB mengembalikan HANYA sebuah objek JSON murni tanpa teks pembuka/penutup dengan struktur berikut:
      {
        "summary": "Isi narasi di sini"${isTextOnly ? "" : `,
        "visuals": [
          {
            "title": "Judul Grafik berdasarkan Pertanyaan Survei",
            "type": "bar atau stat", 
            "items": [
              { "label": "Label Data", "value": 75, "max": 100, "suffix": "%", "color": "#004a99" }
            ]
          }
        ]`}${synthesizedData ? `,
        "synthesizedSubtitle": "Judul/Subtitle singkat untuk analisis sintesis (max 8 kata)",
        "synthesizedAnalysis": "Isi narasi analisis sintesis di sini"` : ""}
      }

      Aturan Ketat untuk properti "summary":
      1. Buat ringkasan singkat, padat, dan HANYA berisi informasi inti/kesimpulan utama dalam TEPAT 3 paragraf pendek.
      2. Paragraf 1 dan 2: Fokus pada analisis temuan survei secara dinamis. Sesuaikan narasi sepenuhnya dengan pertanyaan spesifik yang ada pada data (misalnya: kepuasan, opini, demografi, pilihan produk, evaluasi, dll). Identifikasi pola dan mayoritas tren secara akurat.
      3. Paragraf 3: KHUSUS dedikasikan untuk saran serta rekomendasi conkrit dan relevan yang bisa dilakukan oleh Kadin berdasarkan temuan dari respons spesifik survei ini.
      4. Penulisan nama institusi wajib menggunakan "Kadin" (bukan "KADIN").
      5. WAJIB menyertakan data kuantitatif spesifik (angka mentah atau persentase).
      6. Tandai frasa penting dengan tag <penting>.......</penting>.
      7. DILARANG menggunakan simbol markdown "*" atau "**", gunakan saja tag <penting>.
      8. HANYA gunakan data yang disediakan, dilarang menambahkan informasi luar atau mengarang fakta.

      ${synthesizedData ? `
      Aturan Ketat untuk properti "synthesizedSubtitle":
      1. Buat judul atau subtitle yang sangat menarik dan menggambarkan inti dari korelasi antar pertanyaan yang dianalisis.
      2. Maksimal 8 kata.
      3. Contoh: "Korelasi Tingkat Pendidikan terhadap Skala Prioritas Bisnis".

      Aturan Ketat untuk properti "synthesizedAnalysis":
      1. Buat analisis mendalam yang menghubungkan (sintesis) antara pertanyaan-pertanyaan yang diberikan dalam 'Data untuk Analisis Sintesis'.
      2. Fokus pada bagaimana jawaban pada satu pertanyaan mempengaruhi atau berhubungan dengan pertanyaan lainnya (cross-tabulation insight).
      3. Narasi harus mengalir dan memberikan wawasan strategis yang lebih dalam daripada ringkasan umum.
      4. Gunakan tag <penting> untuk poin-poin krusial.
      5. Panjang narasi antara 1-2 paragraf yang padat.
      ` : ""}
    `;

    if (!isTextOnly) {
      prompt += `
      Aturan Ketat untuk properti "visuals":
      1. Identifikasi 3-5 wawasan kuantitatif paling bervariasi dan krusial dari pertanyaan survei yang berbeda untuk mendukung visual infografis.
      2. Setiap "title" pada visual HARUS merepresentasikan topik pertanyaan survei yang spesifik.
      3. Gunakan tipe grafik yang sesuai dengan permintaan user: ${requestedCharts.join(", ")}.
      4. Gunakan "type": "bar" untuk perbandingan (seperti respons pilihan) dan "type": "stat" untuk metrik tunggal atau skor keseluruhan rata-rata.
      5. "value" harus berupa angka murni, "max" digunakan sebagai skala pembanding (misal: 100 untuk persentase, atau angka total suara dominan).
      6. Penulisan di dalam visual harus mematuhi aturan nama "Kadin".
      `;
    }

    prompt += `\nPENTING: Langsung hasilkan JSON saja.`;

    const responseText = await geminiAi(prompt, {
      model: "gemini-2.0-flash"
    });

    // Clean JSON response (handle potential markdown blocks)
    const jsonString = responseText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      return JSON.parse(jsonString);
    } catch (parseError) {
      console.error("Failed to parse AI JSON response:", parseError);
      // Fallback if AI fails to return valid JSON
      return {
        summary: responseText,
        visuals: []
      };
    }
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    throw error;
  }
};


if (require.main === module) {
  getAiAnalysis().then(console.log).catch(console.error);
}

module.exports = { getAiAnalysis };


//  advance prompt == >>>

// const prompt = `
// Analisis data survei berikut dan berikan output dalam format JSON yang berisi ringkasan eksekutif serta metrik visual untuk infografis.

// Data Survei: ${JSON.stringify(surveyData)}

// Anda WAJIB mengembalikan HANYA sebuah objek JSON murni tanpa teks pembuka/penutup dengan struktur berikut:
// {
//   "summary": "Isi narasi di sini",
//   "visuals": [
//     {
//       "title": "Judul Grafik",
//       "type": "bar atau stat", 
//       "items": [
//         { "label": "Label Data", "value": 75, "max": 100, "suffix": "%", "color": "#004a99" }
//       ]
//     }
//   ]
// }

// Aturan Ketat untuk properti "summary":
// 1. Buat ringkasan singkat, padat, dan HANYA berisi informasi inti/kesimpulan utama dalam TEPAT 3 paragraf pendek.
// 2. Paragraf 1 dan 2: Fokus pada temuan survei (hambatan, kebutuhan, dll).
// 3. Paragraf 3: KHUSUS dedikasikan untuk saran serta rekomendasi konkrit yang bisa dilakukan oleh Kadin.
// 4. Penulisan nama institusi wajib menggunakan "Kadin" (bukan "KADIN").
// 5. WAJIB menyertakan data kuantitatif spesifik (angka mentah atau persentase).
// 6. Tandai frasa penting dengan tag <penting>.......</penting>.
// 7. DILARANG menggunakan simbol markdown "*" atau "**", gunakan saja tag <penting>.
// 8. HANYA gunakan data yang disediakan, dilarang menambahkan informasi luar atau mengarang fakta.

// Aturan Ketat untuk properti "visuals":
// 1. Identifikasi 3-5 wawasan kuantitatif paling penting untuk mendukung visual infografis agar tidak redundan dengan narasi.
// 2. Gunakan "type": "bar" untuk perbandingan/progress bar dan "type": "stat" untuk metrik tunggal atau persentase.
// 3. "value" harus berupa angka murni, "max" digunakan untuk skala (misal: 100 jika persentase).
// 4. Penulisan di dalam visual juga harus mengikuti aturan nama "Kadin".

// PENTING: Langsung hasilkan JSON saja.
// `;


// old prompt 

//  `uatkan ringkasan secara singkat, padat, dan HANYA berisi informasi inti/kesimpulan
//       utama dalam TEPAT 3 paragraf pendek berdasarkan data survei 
//       berikut: ${JSON.stringify(surveyData)}\n\nAturan penulisan:\n- Output ini akan
//        disandingkan dengan infografis di PDF, sehingga narasi ini HANYA boleh berisi 
//        insight atau kesimpulan penting agar tidak redundan dengan visual infografis\n- Buat dalam
//         TEPAT 3 paragraf: Paragraf 1 dan 2 untuk ringkasan temuan survei (hambatan, kebutuhan, dll), 
//         dan Paragraf 3 KHUSUS didedikasikan untuk saran serta rekomendasi konkrit yang bisa dilakukan oleh Kadin 
//         berdasarkan hasil survei ini\n- Penulisan nama institusi wajib menggunakan 
//         "Kadin" (bukan "KADIN")\n- HANYA gunakan data yang disediakan, 
//         dilarang keras menambahkan informasi dari luar atau mengarang fakta\n- Wajib menyertakan data
//          kuantitatif secara spesifik, baik berupa angka mentah maupun persentase 
//          (misal: 4 responden, 66%, dsb)\n- Tandai frasa-frasa penting dengan 
//          <penting> ........ </penting>\n- DILARANG menggunakan simbol markdown "*" atau "**"
//           untuk cetak tebal, gunakan saja tag <penting>\n- Tidak usah sertakan citation\n- Langsung hasilnya saja, 
//           tidak usah pakai judul/subjudul, langsung paragrafnya ⁠`