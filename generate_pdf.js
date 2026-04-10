const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { fetchSurveyData } = require('./api_client');
const { getAiAnalysis } = require('./ai_analyze');
const { processSurveyData } = require('./data_processor');

const processText = (text) => {
    return text.replace(/<penting>(.*?)<\/penting>/g, '<span class="important-insight">$1</span>')
               .split('\n\n')
               .map(p => `<p>${p.trim()}</p>`)
               .join('');
};

const getLogoBase64 = () => {
    const logoPath = path.join(__dirname, 'assets/logo.png');
    if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        return `data:image/png;base64,${logoBuffer.toString('base64')}`;
    }
    return null;
};

const getHtmlTemplate = (analysisText, metrics, logoBase64) => {
    const mainHambatan = metrics.hambatanUtamaSorted || [];
    const skalaUsaha = Object.entries(metrics.skalaUsaha) || [];
    
    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            line-height: 1.4;
            color: #2d3748;
            margin: 0;
            padding: 0;
            background-color: #ffffff;
        }
        
        .container {
            max-width: 100%;
            margin: 0;
            padding: 0;
        }
        
        header {
            margin-bottom: 20px;
            border-bottom: 2px solid #004a99;
            padding-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .brand-section {
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .logo-container img {
            height: 50px;
            width: auto;
        }
        
        .institution-name {
            font-size: 20px;
            font-weight: 700;
            color: #004a99;
            letter-spacing: -0.02em;
        }
        
        .report-info {
            text-align: right;
        }
        
        .report-title {
            font-size: 10px;
            color: #a0aec0;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            font-weight: 700;
        }
        
        .main-title {
            font-size: 28px;
            font-weight: 800;
            color: #1a202c;
            margin-top: 5px;
            margin-bottom: 2px;
            letter-spacing: -0.04em;
        }
        
        .main-subtitle {
            font-size: 12px;
            font-weight: 600;
            color: #004a99;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 20px;
            display: block;
        }
        
        h1 {
            font-size: 16px;
            font-weight: 700;
            color: #2d3748;
            margin-top: 0;
            margin-bottom: 10px;
            line-height: 1.2;
            border-left: 3px solid #004a99;
            padding-left: 10px;
        }
        
        h2 {
            font-size: 13px;
            font-weight: 600;
            color: #2d3748;
            margin-top: 15px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }

        h2::after {
            content: '';
            flex: 1;
            height: 1px;
            background: #e2e8f0;
            margin-left: 12px;
        }
        
        p {
            margin-bottom: 10px;
            font-size: 11.5px;
            text-align: justify;
        }
        
        .important-insight {
            font-weight: 700;
            color: #1a202c;
        }
        
        /* Charts Styling */
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-top: 10px;
        }
        
        .chart-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 10px;
        }
        
        .chart-title {
            font-size: 9px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 8px;
            display: block;
        }
        
        .bar-container {
            margin-bottom: 6px;
        }
        
        .bar-label {
            font-size: 9px;
            display: flex;
            justify-content: space-between;
            margin-bottom: 2px;
        }
        
        .bar-wrapper {
            height: 5px;
            background: #e2e8f0;
            border-radius: 3px;
            overflow: hidden;
        }
        
        .bar-fill {
            height: 100%;
            background: #004a99;
            border-radius: 3px;
        }
        
        .bar-fill.accent {
            background: #d4af37;
        }

        .stat-group {
            display: flex;
            justify-content: space-around;
            padding: 4px 0;
        }

        .stat-circle {
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }

        .stat-value {
            font-size: 18px;
            font-weight: 700;
            color: #004a99;
        }

        .stat-label {
            font-size: 8.5px;
            color: #64748b;
            text-align: center;
        }
        
        footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #edf2f7;
            font-size: 8.5px;
            color: #cbd5e0;
            text-align: center;
        }
        
        .date {
            margin-top: 4px;
            color: #a0aec0;
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand-section">
                <div class="logo-container">
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo Kadin">` : '<div style="font-weight:700; color:#004a99; font-size:20px;">KADIN INDONESIA</div>'}
                </div>
                <div class="institution-name">Kadin Indonesia</div>
            </div>
            <div class="report-info">
                <div class="report-title">HASIL ANALISIS SURVEI</div>
            </div>
        </header>

        <div class="main-title">Papua Business Pulse</div>
        <div class="main-subtitle">Hasil Analisis Survei & Rekomendasi</div>
        
        <h1>Ringkasan Eksekutif</h1>
        
        <div class="content">
            ${processText(analysisText)}
        </div>

        <h2>Visualisasi Data Utama (${metrics.total} Responden)</h2>
        
        <div class="charts-grid">
            <!-- Hambatan Utama -->
            <div class="chart-card">
                <span class="chart-title">Hambatan Utama Berbisnis</span>
                ${mainHambatan.map(([label, count]) => `
                    <div class="bar-container">
                        <div class="bar-label"><span>${label}</span><span>${count}</span></div>
                        <div class="bar-wrapper"><div class="bar-fill" style="width: ${(count / metrics.total) * 100}%;"></div></div>
                    </div>
                `).join('')}
            </div>

            <!-- Skala Usaha -->
            <div class="chart-card">
                <span class="chart-title">Profil Skala Usaha</span>
                ${skalaUsaha.map(([label, count], idx) => `
                    <div class="bar-container">
                        <div class="bar-label"><span>${label}</span><span>${count}</span></div>
                        <div class="bar-wrapper"><div class="bar-fill ${idx % 2 === 1 ? 'accent' : ''}" style="width: ${(count / metrics.total) * 100}%;"></div></div>
                    </div>
                `).join('')}
            </div>

            <!-- Status Finansial & Pasar -->
            <div class="chart-card">
                <span class="chart-title">Akses Finansial & Pemasaran</span>
                <div class="stat-group">
                    <div class="stat-circle">
                        <span class="stat-value">${Math.round((metrics.statusPerbankan.bankable / metrics.total) * 100)}%</span>
                        <span class="stat-label">Bankable</span>
                    </div>
                    <div class="stat-circle">
                        <span class="stat-value">${Math.round((metrics.areaPemasaran.ekspor / metrics.total) * 100)}%</span>
                        <span class="stat-label">Jangkauan Ekspor</span>
                    </div>
                </div>
            </div>

            <!-- Legalitas Usaha -->
            <div class="chart-card">
                <span class="chart-title">Status Legalitas Usaha</span>
                <div class="stat-group">
                    <div class="stat-circle">
                        <span class="stat-value" style="color: #d4af37;">${metrics.legalitasUsaha['Sudah lengkap'] || 0}</span>
                        <span class="stat-label">Dokumen Lengkap</span>
                    </div>
                    <div class="stat-circle">
                        <span class="stat-value" style="color: #64748b;">${(metrics.legalitasUsaha['Sebagian'] || 0) + (metrics.legalitasUsaha['Belum ada'] || 0)}</span>
                        <span class="stat-label">Perlu Pendampingan</span>
                    </div>
                </div>
            </div>
        </div>
        
        <footer>
            <p>Dihasilkan secara otomatis oleh Kadin Data Analytics AI</p>
            <p class="date">${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </footer>
    </div>
</body>
</html>
`;
};

async function generatePDF() {
    console.log("Starting live API PDF generation with Branding...");
    
    // 1. Fetch Data Once
    const surveyData = await fetchSurveyData();
    
    // 2. Get AI Analysis Text
    console.log("Fetching AI analysis...");
    const analysisText = await getAiAnalysis(surveyData);
    
    // 3. Process Survey Data for Charts
    console.log("Processing survey data...");
    const metrics = await processSurveyData(surveyData);
    
    // 4. Get Logo
    const logoBase64 = getLogoBase64();
    
    if (!analysisText || !metrics) {
        throw new Error("Failed to retrieve analysis text or metrics.");
    }

    // 5. Generate HTML
    const html = getHtmlTemplate(analysisText, metrics, logoBase64);

    // 6. Launch Puppeteer and Save PDF
    const browser = await puppeteer.launch({
        headless: "new"
    });
    const page = await browser.newPage();
    
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    const pdfPath = path.join(__dirname, 'Kadin_Survey_Analysis_Report.pdf');
    
    await page.pdf({
        path: pdfPath,
        format: 'A4',
        margin: {
            top: '15mm',
            right: '15mm',
            bottom: '15mm',
            left: '15mm'
        },
        printBackground: true
    });
    
    await browser.close();
    console.log(`PDF successfully generated: ${pdfPath}`);
    return pdfPath;
}

module.exports = { generatePDF };

// Run directly if executed as script
if (require.main === module) {
    generatePDF().catch(err => {
        console.error('Error generating PDF:', err);
        process.exit(1);
    });
}
