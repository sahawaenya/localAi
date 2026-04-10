const geminiAi = require("./gemini.js");
const { fetchSurveyData } = require("./api_client");

const getAiAnalysis = async (data) => {
  try {
    // If data is not provided, fetch it
    const surveyData = data || await fetchSurveyData();
    
    const result = await geminiAi(
      `uatkan ringkasan secara singkat, padat, dan HANYA berisi informasi inti/kesimpulan
      utama dalam TEPAT 3 paragraf pendek berdasarkan data survei 
      berikut: ${JSON.stringify(surveyData)}\n\nAturan penulisan:\n- Output ini akan
       disandingkan dengan infografis di PDF, sehingga narasi ini HANYA boleh berisi 
       insight atau kesimpulan penting agar tidak redundan dengan visual infografis\n- Buat dalam
        TEPAT 3 paragraf: Paragraf 1 dan 2 untuk ringkasan temuan survei (hambatan, kebutuhan, dll), 
        dan Paragraf 3 KHUSUS didedikasikan untuk saran serta rekomendasi konkrit yang bisa dilakukan oleh Kadin 
        berdasarkan hasil survei ini\n- Penulisan nama institusi wajib menggunakan 
        "Kadin" (bukan "KADIN")\n- HANYA gunakan data yang disediakan, 
        dilarang keras menambahkan informasi dari luar atau mengarang fakta\n- Wajib menyertakan data
         kuantitatif secara spesifik, baik berupa angka mentah maupun persentase 
         (misal: 4 responden, 66%, dsb)\n- Tandai frasa-frasa penting dengan 
         <penting> ........ </penting>\n- DILARANG menggunakan simbol markdown "*" atau "**"
          untuk cetak tebal, gunakan saja tag <penting>\n- Tidak usah sertakan citation\n- Langsung hasilnya saja, 
          tidak usah pakai judul/subjudul, langsung paragrafnya ⁠`
    );
    return result;
  } catch (error) {
    console.error("Error fetching AI analysis:", error);
    throw error;
  }
};

if (require.main === module) {
  getAiAnalysis().then(console.log).catch(console.error);
}

module.exports = { getAiAnalysis };