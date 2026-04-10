const express = require('express');
const path = require('path');
require('dotenv').config();

const { generatePDF } = require('./generate_pdf');

const app = express();
const PORT = process.env.PORT || 3000;

// GET endpoint untuk generate PDF
app.get('/api/generate-pdf', async (req, res) => {
    try {
        console.log('PDF generation request received...');
        
        const pdfPath = await generatePDF();
        
        res.download(pdfPath, 'Kadin_Survey_Analysis_Report.pdf', (err) => {
            if (err) {
                console.error('Error sending PDF:', err);
            } else {
                console.log('PDF sent successfully');
            }
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ 
            error: 'Failed to generate PDF', 
            message: error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`GET /api/generate-pdf - Generate and download PDF`);
    console.log(`GET /health - Health check`);
});
