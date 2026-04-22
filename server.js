const express = require('express');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const { generatePDF } = require('./generate_pdf');
const { getAiAnalysis } = require('./ai_analyze');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3010;

// Middleware to parse JSON bodies
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS Middleware
// CORS Middleware - Expose Content-Disposition for frontend visibility
app.use(cors({
    origin: '*',
    exposedHeaders: ['Content-Disposition']
}));


// GET endpoint untuk generate PDF (menggunakan data remote default)
app.get('/api/generate-pdf', async (req, res) => {
    try {
        const { id, format, options } = req.query;
        console.log(`GET PDF generation request received. ID: ${id || 'default'}, Format: ${format || 'both'}`);
        
        const pdfPath = await generatePDF(null, format, options, id);

        // Force browser to download the file on the device
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Kadin_Survey_Analysis_Report.pdf"');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        res.download(pdfPath, 'Kadin_Survey_Analysis_Report.pdf');
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF', message: error.message });
    }
});

// POST endpoint untuk generate PDF (dengan data custom & format)
// POST endpoint untuk generate PDF (dengan data custom & format)
app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { data, format, options, location_filter } = req.body;
        let surveyData = data;
        
        // Prepare valid options object for downstream
        const optionsObj = {
            charts: Array.isArray(options) ? options : (options?.charts || ["bar"]),
            location_filter: location_filter || options?.location_filter || null
        };
        
        // If no data provided in request, read from local data.json for testing
        if (!surveyData) {
            console.log('No data in request body for /api/generate-pdf, reading from data.json...');
            const dataPath = path.join(__dirname, 'data.json');
            if (fs.existsSync(dataPath)) {
                const rawContent = fs.readFileSync(dataPath, 'utf8');
                surveyData = JSON.parse(rawContent);
            }
        }

        if (!surveyData) {
            return res.status(400).json({ error: 'No survey data provided and data.json not found.' });
        }

        // Detailed logging for incoming data structure
        const responseArray = Array.isArray(surveyData) ? surveyData : (surveyData.data || []);
        console.log(`POST PDF generation request received. Format: ${format || 'both'}`);
        console.log(`Payload Title: "${surveyData.survey?.title || 'Unknown'}"`);
        console.log(`Response count: ${responseArray.length}`);
        
        if (responseArray.length === 0) {
            console.warn('WARNING: Received survey data with ZERO responses.');
        }

        const pdfPath = await generatePDF(surveyData, format, optionsObj);
        
        // Ensure headers are set for explicit download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Kadin_Survey_Analysis_Report.pdf"');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        res.download(pdfPath, 'Kadin_Survey_Analysis_Report.pdf', (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error downloading file' });
                }
            }
        });
    } catch (error) {
        console.error('Error in POST /api/generate-pdf:', error);
        res.status(500).json({ error: 'Failed to generate PDF', message: error.message });
    }
});


app.post('/api/analyze-test', async (req, res) => {
    try {
        let surveyData = req.body.data;
        // User preferences from frontend (aiOptions)
        const format = req.body.format || 'both'; // 'text' or 'full'
        const providedOptions = req.body.options || req.body.option || {};   
        const location_filter = req.body.location_filter;
        
        const optionsObj = {
            charts: Array.isArray(providedOptions) ? providedOptions : (providedOptions.charts || ["bar"]),
            location_filter: location_filter || providedOptions.location_filter || null
        };
        
        // If no data provided in request, read from local data.json for testing
        if (!surveyData) {
            console.log('No data in request body, reading from data.json...');
            const dataPath = path.join(__dirname, 'data.json');
            if (fs.existsSync(dataPath)) {
                const rawContent = fs.readFileSync(dataPath, 'utf8');
                surveyData = JSON.parse(rawContent);
            }
        }

        if (!surveyData) {
            return res.status(400).send('Error: No survey data provided and data.json not found.');
        }

        // Detailed logging for incoming data structure
        const responseArray = Array.isArray(surveyData) ? surveyData : (surveyData.data || []);
        console.log(`Received survey data. Title: "${surveyData.survey?.title || 'Unknown'}"`);
        console.log(`Format Choice: ${format}`);
        console.log(`Response count: ${responseArray.length}`);

        if (responseArray.length === 0) {
            console.warn('WARNING: Received survey data with ZERO responses.');
        }

        console.log('Generating AI Analysis and PDF Report...');
        
        // Mapping: Frontend 'full' -> Backend 'both', Frontend 'text' -> Backend 'text'
        const pdfPath = await generatePDF(surveyData, format === 'full' ? 'both' : format, optionsObj);

        // Force browser to download the file on the device
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="Kadin_Survey_Analysis_Report.pdf"');
        res.setHeader('X-Content-Type-Options', 'nosniff');

        res.download(pdfPath, 'Kadin_Survey_Analysis_Report.pdf', (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error downloading file' });
                }
            }
        });
    } catch (error) {
        console.error('Error in /api/analyze-test:', error);
        res.status(500).json({ error: 'Failed to generate analysis', message: error.message });
    }
});




app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GET /api/generate-pdf - Generate and download PDF`);
});
