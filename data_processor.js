const { fetchSurveyData } = require("./api_client");

/**
 * Processes survey data and extracts metrics for visualization.
 * @param {Object} [data] Optonal already fetched data. If not provided, it will be fetched from API.
 * @returns {Promise<Object|null>} The processed metrics or null on error.
 */
const processSurveyData = async (data) => {
    try {
        const rawData = data || await fetchSurveyData();
        
        // Handle if the data is already the array or the full object with .data
        const responses = Array.isArray(rawData) ? rawData : (rawData.data || []);
        
        // Handle total count from pagination, survey object, or array length
        const total = (rawData.pagination && rawData.pagination.total) ? rawData.pagination.total : 
                      (rawData.survey && rawData.survey.total_submissions) ? rawData.survey.total_submissions :
                      responses.length;

        const metrics = {
            total,
            survey: {
                title: rawData.survey?.title || 'Hasil Analisis Survei',
                description: rawData.survey?.description || 'Ringkasan & Rekomendasi'
            },
            hambatanUtama: {},
            skalaUsaha: {},
            legalitasUsaha: {},
            statusPerbankan: {
                bankable: 0,
                belum: 0
            },
            areaPemasaran: {
                lokal: 0,
                ekspor: 0
            }
        };

        responses.forEach(r => {
            // Safely extract survey data or fallback to empty object
            const sd = r.surveyData || r.data || r || {};

            // Hambatan Utama
            const h = sd.hambatanUtama || 'Lainnya';
            metrics.hambatanUtama[h] = (metrics.hambatanUtama[h] || 0) + 1;

            // Skala Usaha
            const s = sd.skalaUsaha || 'Lainnya';
            metrics.skalaUsaha[s] = (metrics.skalaUsaha[s] || 0) + 1;

            // Legalitas Usaha
            const l = sd.legalitasUsaha || 'Belum ada';
            metrics.legalitasUsaha[l] = (metrics.legalitasUsaha[l] || 0) + 1;

            // Status Perbankan
            const statusPub = sd.statusPerbankan || '';
            if (typeof statusPub === 'string' && statusPub.includes('bankable')) {
                metrics.statusPerbankan.bankable++;
            } else {
                metrics.statusPerbankan.belum++;
            }

            // Area Pemasaran
            if (sd.areaPemasaran === 'Ekspor') {
                metrics.areaPemasaran.ekspor++;
            } else {
                metrics.areaPemasaran.lokal++;
            }
        });

        // Sort hambatanUtama by count
        metrics.hambatanUtamaSorted = Object.entries(metrics.hambatanUtama)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        return metrics;
    } catch (error) {
        console.error("Error processing survey data:", error);
        return null;
    }
};

module.exports = { processSurveyData };

// Test
if (require.main === module) {
    processSurveyData().then(m => console.log(JSON.stringify(m, null, 2))).catch(console.error);
}
