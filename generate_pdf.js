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

const getHtmlTemplate = (analysis, metrics, logoBase64, format = 'both', options = {}) => {
    const showText = format === 'both' || format === 'text summarize' || format === 'text';
    const showViz = format === 'both' || format === 'full';
    const { summary, visuals = [], synthesizedAnalysis, synthesizedSubtitle } = analysis;

    const locationFilter = options.location_filter;
    let locationText = "";
    if (locationFilter) {
      const provs  = locationFilter.provs  || [];
      const cities = locationFilter.cities || [];

      if (provs.length > 0) {
        const grouped = provs.map(p => {
          const citiesInProv = cities.filter(c => p.cityIds?.includes(c.id));
          return {
            name: p.name,
            cities: citiesInProv.map(c => c.name)
          };
        });

        const locationLines = grouped.map(g => {
          const citiesStr = g.cities.length > 0 ? g.cities.join(', ') : 'Semua Kabupaten / Kota';
          return `<div style="margin-bottom: 2px;"><strong>${g.name}</strong>: ${citiesStr}</div>`;
        }).join('');
        
        locationText = `<div style="font-weight: 700; color: #0000BD; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; font-size: 9px;">Wilayah Analisis:</div>${locationLines}`;
      } else if (locationFilter.city) {
        // Legacy single format fallback
        locationText = `<strong>Wilayah Analisis:</strong> Kabupaten/Kota ${locationFilter.city.name}, Provinsi ${locationFilter.prov.name}`;
      } else if (locationFilter.prov) {
        locationText = `<strong>Wilayah Analisis:</strong> Provinsi ${locationFilter.prov.name}`;
      }
    }

    // ── SVG Chart Renderers ─────────────────────────────────────────────────────

    const renderBarChart = (chart) => {
        const items = chart.items || [];
        const maxVal = Math.max(...items.map(i => Number(i.value) || 0), 1);
        const barH = 12;
        const gap = 20;
        // Dynamically size the label area based on longest label
        const maxLabelLen = Math.max(...items.map(i => String(i.label).length), 4);
        const labelW = Math.min(Math.max(maxLabelLen * 5.5 + 10, 80), 200);
        const barAreaW = 180;
        const valueW = 40;
        const svgW = labelW + barAreaW + valueW;
        const svgH = items.length * (barH + gap) + 10;

        const bars = items.map((item, idx) => {
            const y = idx * (barH + gap) + 6;
            const fillW = Math.max(2, (Number(item.value) / maxVal) * barAreaW);
            const color = item.color || '#0000BD';
            const label = String(item.label);
            return `
                <text x="${labelW - 6}" y="${y + barH - 2}" text-anchor="end" font-size="7.5" fill="#475569" font-family="Inter,sans-serif">${label}</text>
                <rect x="${labelW}" y="${y}" width="${barAreaW}" height="${barH}" rx="3" fill="#F1F5F9"/>
                <rect x="${labelW}" y="${y}" width="${fillW}" height="${barH}" rx="3" fill="${color}"/>
                <text x="${labelW + fillW + 4}" y="${y + barH - 2}" font-size="8" fill="#0F172A" font-weight="700" font-family="Inter,sans-serif">${item.value}${item.suffix || ''}</text>
            `;
        }).join('');

        return `
        <div class="chart-card">
            <span class="chart-title">${chart.title}</span>
            <svg width="100%" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg" overflow="visible">
                ${bars}
            </svg>
        </div>`;
    };

    const renderPieChart = (chart) => {
        const items = (chart.items || []).filter(i => Number(i.value) > 0);
        const total = items.reduce((s, i) => s + Number(i.value), 0) || 1;

        // Donut dimensions
        const cx = 80, cy = 80, R = 65, r = 36;
        const svgW = 320;

        // Build slices
        let currentAngle = -Math.PI / 2;
        const slices = items.map(item => {
            const val = Number(item.value);
            const angle = (val / total) * 2 * Math.PI;
            const x1 = cx + R * Math.cos(currentAngle);
            const y1 = cy + R * Math.sin(currentAngle);
            currentAngle += angle;
            const x2 = cx + R * Math.cos(currentAngle);
            const y2 = cy + R * Math.sin(currentAngle);
            const xi1 = cx + r * Math.cos(currentAngle);
            const yi1 = cy + r * Math.sin(currentAngle);
            currentAngle -= angle;
            const xi2 = cx + r * Math.cos(currentAngle);
            const yi2 = cy + r * Math.sin(currentAngle);
            currentAngle += angle;
            const large = angle > Math.PI ? 1 : 0;
            const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${xi1} ${yi1} A ${r} ${r} 0 ${large} 0 ${xi2} ${yi2} Z`;
            const pct = Math.round((val / total) * 100);
            return { d, color: item.color || '#0000BD', label: String(item.label), pct, val };
        });

        const paths = slices.map(s => `<path d="${s.d}" fill="${s.color}" stroke="#fff" stroke-width="1.5"/>`)  .join('');

        // Legend placed to the right of the donut — full width, no truncation
        const legendX = cx * 2 + 20;  // starts right after donut diameter + gap
        const legendAvailableW = svgW - legendX - 8;
        const legendStartY = 16;
        const rowH = 20;
        const legendItems = slices.map((s, i) => {
            const ly = legendStartY + i * rowH;
            return `
                <rect x="${legendX}" y="${ly}" width="9" height="9" rx="2" fill="${s.color}"/>
                <text x="${legendX + 14}" y="${ly + 8}" font-size="8" fill="#0F172A" font-family="Inter,sans-serif" text-decoration="none">
                    ${s.label} <tspan font-weight="700" fill="#0000BD">(${s.pct}%)</tspan>
                </text>
            `;
        }).join('');

        // Height = max of donut diameter vs legend total height
        const svgH = Math.max(cx * 2 + 10, legendStartY + slices.length * rowH + 10);

        return `
        <div class="chart-card">
            <span class="chart-title">${chart.title}</span>
            <svg width="100%" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
                ${paths}
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>
                <text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="11" font-weight="700" fill="#0F172A" font-family="Inter,sans-serif">${total}</text>
                <text x="${cx}" y="${cy + 17}" text-anchor="middle" font-size="7.5" fill="#64748B" font-family="Inter,sans-serif">Total</text>
                ${legendItems}
            </svg>
        </div>`;
    };

    const renderTrendChart = (chart) => {
        const items = chart.items || [];
        if (items.length < 2) return renderBarChart({ ...chart, type: 'bar' });

        const vals = items.map(i => Number(i.value) || 0);
        const minV = Math.min(...vals);
        const maxV = Math.max(...vals, minV + 1);
        const padT = 14, padB = 24, padL = 30, padR = 10;
        const svgW = 280, svgH = 110;
        const chartW = svgW - padL - padR;
        const chartH = svgH - padT - padB;
        const stepX = chartW / (items.length - 1);

        const toX = i => padL + i * stepX;
        const toY = v => padT + chartH - ((v - minV) / (maxV - minV)) * chartH;

        const pts = items.map((item, i) => `${toX(i)},${toY(vals[i])}`).join(' ');
        const areaClose = `${toX(items.length - 1)},${padT + chartH} ${padL},${padT + chartH}`;

        const color = '#0000BD';
        const colorLight = 'rgba(0,0,189,0.12)';

        const dots = items.map((item, i) => `
            <circle cx="${toX(i)}" cy="${toY(vals[i])}" r="3" fill="${color}" stroke="#fff" stroke-width="1.5"/>
            <text x="${toX(i)}" y="${toY(vals[i]) - 6}" text-anchor="middle" font-size="7" fill="#0F172A" font-weight="700" font-family="Inter,sans-serif">${vals[i]}</text>
        `).join('');

        const labels = items.map((item, i) => {
            const lbl = String(item.label);
            // Split label into two lines if > 10 chars to avoid x-axis crowding
            if (lbl.length > 10) {
                const mid = lbl.lastIndexOf(' ', 10) > 0 ? lbl.lastIndexOf(' ', 10) : 10;
                const line1 = lbl.slice(0, mid);
                const line2 = lbl.slice(mid).trim();
                return `
                    <text x="${toX(i)}" y="${padT + chartH + 11}" text-anchor="middle" font-size="6.5" fill="#64748B" font-family="Inter,sans-serif">
                        <tspan x="${toX(i)}" dy="0">${line1}</tspan>
                        <tspan x="${toX(i)}" dy="8">${line2}</tspan>
                    </text>`;
            }
            return `<text x="${toX(i)}" y="${padT + chartH + 12}" text-anchor="middle" font-size="6.5" fill="#64748B" font-family="Inter,sans-serif">${lbl}</text>`;
        }).join('');

        // Y-axis guide lines
        const yLines = [0, 0.5, 1].map(frac => {
            const yv = minV + frac * (maxV - minV);
            const y = toY(yv);
            return `
                <line x1="${padL}" y1="${y}" x2="${svgW - padR}" y2="${y}" stroke="#E2E8F0" stroke-width="0.8"/>
                <text x="${padL - 3}" y="${y + 3}" text-anchor="end" font-size="6.5" fill="#94A3B8" font-family="Inter,sans-serif">${Math.round(yv)}</text>
            `;
        }).join('');

        return `
        <div class="chart-card">
            <span class="chart-title">${chart.title}</span>
            <svg width="100%" viewBox="0 0 ${svgW} ${svgH}" xmlns="http://www.w3.org/2000/svg">
                ${yLines}
                <polygon points="${pts} ${areaClose}" fill="${colorLight}"/>
                <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
                ${dots}
                ${labels}
            </svg>
        </div>`;
    };

    const renderChart = (chart) => {
        if (!chart || !chart.type) return '';
        switch (chart.type) {
            case 'bar':   return renderBarChart(chart);
            case 'pie':   return renderPieChart(chart);
            case 'trend': return renderTrendChart(chart);
            // Legacy fallback
            case 'stat':  return renderBarChart({ ...chart, type: 'bar' });
            default:      return renderBarChart(chart);
        }
    };

    return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
        
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
            border-bottom: 2px solid #0000BD;
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
            color: #0000BD;
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
            color: #0000BD;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin-bottom: 20px;
            display: block;
        }

        .location-info {
            display: block;
            font-size: 10px;
            color: #4a5568;
            background-color: #f8fafc;
            padding: 10px 14px;
            border-radius: 8px;
            margin-bottom: 24px;
            margin-top: -8px;
            border: 1px solid #e2e8f0;
            line-height: 1.5;
        }
        
        h1 {
            font-size: 16px;
            font-weight: 700;
            color: #2d3748;
            margin-top: 0;
            margin-bottom: 10px;
            line-height: 1.2;
            border-left: 3px solid #0000BD;
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

        .subtitle-analysis {
            font-size: 10.5px;
            font-weight: 700;
            color: #0000BD;
            background-color: #f0f7ff;
            padding: 5px 12px;
            border-radius: 4px;
            margin-top: -5px;
            margin-bottom: 15px;
            display: inline-block;
            text-transform: uppercase;
            letter-spacing: 0.02em;
            border-left: 2px solid #0000BD;
        }
        
        /* Charts Grid */
        .charts-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-top: 10px;
        }
        
        .chart-card {
            background: #F8FAFC;
            border: 1px solid #E2E8F0;
            border-radius: 10px;
            padding: 14px;
            box-shadow: 0 1px 4px rgba(0,0,0,0.05);
        }
        
        .chart-title {
            font-size: 9px;
            font-weight: 700;
            color: #64748B;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-bottom: 10px;
            display: block;
            line-height: 1.4;
        }

        /* Legacy bar support */
        .bar-container { margin-bottom: 7px; }
        .bar-label { font-size: 9px; display: flex; justify-content: space-between; margin-bottom: 3px; }
        .bar-wrapper { height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden; }
        .bar-fill { height: 100%; background: #0000BD; border-radius: 3px; }

        /* Legacy stat support */
        .stat-group { display: flex; justify-content: space-around; padding: 4px 0; }
        .stat-circle { display: flex; align-items: center; justify-content: center; flex-direction: column; }
        .stat-value { font-size: 18px; font-weight: 700; color: #0000BD; }
        .stat-label { font-size: 8.5px; color: #64748b; text-align: center; }
        
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
                    ${logoBase64 ? `<img src="${logoBase64}" alt="Logo Kadin">` : '<div style="font-weight:700; color:#0000BD; font-size:20px;">KADIN INDONESIA</div>'}
                </div>
                <div class="institution-name">Kadin Indonesia</div>
            </div>
            <div class="report-info">
                <div class="report-title">HASIL ANALISIS SURVEI</div>
            </div>
        </header>

        <div class="main-title">${metrics.survey?.title || 'Hasil Analisis Survei'}</div>
        <div class="main-subtitle" style="${locationText ? 'margin-bottom: 12px;' : ''}">${metrics.survey?.description || 'Ringkasan & Rekomendasi'}</div>
        ${locationText ? `<div class="location-info">${locationText}</div>` : ''}
        
        ${showText ? `
        <h1>Ringkasan Eksekutif</h1>
        <div class="content">
            ${processText(summary)}
        </div>
        ` : ''}

        ${synthesizedAnalysis ? `
        <h1>Analisis Sintesis</h1>
        ${synthesizedSubtitle ? `<p class="subtitle-analysis">${synthesizedSubtitle}</p>` : ''}
        <div class="content">
            ${processText(synthesizedAnalysis)}
        </div>
        ` : ''}

        ${showViz && visuals.length > 0 ? `
        <h2>Visualisasi Data Utama (${metrics.total} Responden)</h2>
        <div class="charts-grid">
            ${visuals.map(chart => renderChart(chart)).join('')}
        </div>
        ` : ''}

        
        <footer>
            <p>Dihasilkan secara otomatis oleh Kadin Data Analytics AI</p>
            <p class="date">${new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </footer>
    </div>
</body>
</html>
`;

};


async function generatePDF(inputData = null, format = 'both', options = {}) {
    console.log(`Starting PDF generation (Format: ${format}, Options: ${JSON.stringify(options)})...`);

    
    // 1. Fetch Data if not provided
    const surveyData = inputData || await fetchSurveyData();

    
    // 2. Get AI Analysis (Summary + Visuals)
    let aiResponse;
    const responses = Array.isArray(surveyData) ? surveyData : (surveyData.data || []);
    
    if (responses.length === 0) {
        console.log("No responses found. using empty-state template...");
        aiResponse = {
            summary: "Belum ada data respons untuk survei ini. Paragraf ini akan berisi ringkasan temuan setelah data tersedia.\n\nSilakan bagikan tautan survei kepada target responden Anda untuk mulai mengumpulkan data.\n\nKadin merekomendasikan pemantauan berkala terhadap masuknya data untuk analisis lebih lanjut.",
            visuals: []
        };
    } else {
        console.log(`Generating AI analysis for ${responses.length} responses...`);
        aiResponse = await getAiAnalysis(surveyData, options);
    }
    
    // 3. Process Survey Metadata
    console.log("Processing survey metadata...");
    const metrics = await processSurveyData(surveyData);
    
    // 4. Get Logo
    const logoBase64 = getLogoBase64();
    
    if (!aiResponse || !metrics) {
        throw new Error("Failed to retrieve analysis or metrics.");
    }

    // 5. Generate HTML
    const html = getHtmlTemplate(aiResponse, metrics, logoBase64, format, options);




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
    const run = async () => {
        const arg = process.argv[2];
        let inputData = null;

        if (arg && fs.existsSync(arg)) {
            console.log(`Using local JSON data from: ${arg}`);
            try {
                const fileContent = fs.readFileSync(arg, 'utf8');
                inputData = JSON.parse(fileContent);
            } catch (error) {
                console.error(`Error parsing JSON from ${arg}:`, error.message);
                process.exit(1);
            }
        }

        try {
            await generatePDF(inputData);
        } catch (err) {
            console.error('Error generating PDF:', err);
            process.exit(1);
        }
    };
    
    run();
}

