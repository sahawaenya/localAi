const { fetchSurveyData } = require("./api_client");

/**
 * Processes survey data and extracts metrics for visualization.
 * @param {Object} [data] Optonal already fetched data. If not provided, it will be fetched from API.
 * @returns {Promise<Object|null>} The processed metrics or null on error.
 */
const processSurveyData = async (data) => {
    try {
        const rawData = data || await fetchSurveyData();
        const responses = rawData.data;
        const total = rawData.pagination.total;

        const metrics = {
            total,
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
            const sd = r.surveyData;

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
            if (sd.statusPerbankan && sd.statusPerbankan.includes('bankable')) {
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
