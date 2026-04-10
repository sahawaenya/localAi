const API_URL = 'https://server-asia-trip.kadin360.id/universal/parapara-survey';

/**
 * Fetches survey data from the remote API.
 * @returns {Promise<Object>} The survey data JSON.
 */
const fetchSurveyData = async () => {
    try {
        console.log(`Fetching survey data from: ${API_URL}`);
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Successfully fetched ${data.data.length} responses.`);
        return data;
    } catch (error) {
        console.error("Error fetching data from API:", error);
        throw error;
    }
};

module.exports = { fetchSurveyData };

// Test
if (require.main === module) {
    fetchSurveyData().then(data => {
        console.log("Sample Data ID:", data.data[0]?.id);
    }).catch(console.error);
}
