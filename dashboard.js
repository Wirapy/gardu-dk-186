/**
 * ==============================================================================
 * DASHBOARD TELEMETRI GARDU DISTRIBUSI DK-186 (PHB-TR 2 FEEDER)
 * Responsive Web Mobile & Desktop Dashboard with Realtime Sync & Simulation
 * ==============================================================================
 */

// --- GLOBAL APPLICATION STATE ---
const SubstationState = {
    mode: 'sim', // 'sim' | 'firebase'
    firebaseUrl: '',
    firebasePath: 'gardu_dk186',
    activeView: 'all', // 'all' | 'f1' | 'f2'
    pollingTimer: null,
    simTimer: null,
    data: {
        f1: {
            vrn: 220.5, vsn: 221.2, vtn: 219.8,
            vrs: 381.8, vst: 382.4, vtr: 380.6,
            ir: 142.5, is: 138.2, it: 135.0, in: 7.8,
            p: 91.2, q: 34.5, s: 97.5,
            pf: 0.93, freq: 50.02, energy: 384.25,
            temp: 45.2, load_pct: 46.4,
            status: 'NORMAL'
        },
        f2: {
            vrn: 221.8, vsn: 220.4, vtn: 221.0,
            vrs: 383.1, vst: 381.2, vtr: 382.5,
            ir: 126.4, is: 131.0, it: 124.8, in: 6.2,
            p: 82.6, q: 29.4, s: 87.7,
            pf: 0.94, freq: 50.01, energy: 342.10,
            temp: 42.8, load_pct: 41.7,
            status: 'NORMAL'
        }
    }
};

// --- CHART INSTANCES ---
let f1RtChart = null, f1TrendChart = null;
let f2RtChart = null, f2TrendChart = null;

// ==============================================================================
// 1. CLOCK & TIME UPDATER
// ==============================================================================
function updateTopClock() {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} WIB`;
    const elClock = document.getElementById('top-clock');
    if (elClock) elClock.textContent = timeStr;
}

// ==============================================================================
// 2. DEVICE & FEEDER NAVIGATION (DESKTOP & MOBILE)
// ==============================================================================
function selectFeederView(view) {
    SubstationState.activeView = view;
    const f1Section = document.getElementById('feeder-1-section');
    const f2Section = document.getElementById('feeder-2-section');

    // Update Segmented Tab Buttons
    document.querySelectorAll('.segment-btn').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-segment') === view);
    });

    // Update Sidebar Navigation
    document.querySelectorAll('.sidebar-menu .menu-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });

    // Update Mobile Bottom Nav
    document.querySelectorAll('.bottom-nav-item[data-view]').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-view') === view);
    });

    // Toggle Visibility
    if (view === 'all') {
        f1Section.style.display = 'block';
        f2Section.style.display = 'block';
    } else if (view === 'f1') {
        f1Section.style.display = 'block';
        f2Section.style.display = 'none';
        f1Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (view === 'f2') {
        f1Section.style.display = 'none';
        f2Section.style.display = 'block';
        f2Section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('open');
}

// Close sidebar on outside click on mobile
document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.getElementById('mobileNavToggle');
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    }
});

function focusParameter(paramType) {
    if (window.innerWidth <= 768) {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('open');
    }
    const targetSection = document.getElementById('feeder-1-section');
    if (targetSection) {
        targetSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// ==============================================================================
// 3. UI RENDERING & CIRCULAR GAUGE LOGIC
// ==============================================================================
function updateGauge(circleId, pctValId, percent) {
    const circle = document.getElementById(circleId);
    const text = document.getElementById(pctValId);
    if (!circle || !text) return;

    // Circumference for r=42: 2 * PI * 42 = 263.89
    const maxOffset = 264;
    const clampedPct = Math.min(Math.max(percent, 0), 100);
    const offset = maxOffset - (maxOffset * (clampedPct / 100));

    circle.style.strokeDashoffset = offset;
    text.textContent = `${clampedPct.toFixed(1)}%`;

    // Dynamic color based on loading condition
    if (clampedPct < 60) {
        circle.style.stroke = 'var(--c-green)';
    } else if (clampedPct < 80) {
        circle.style.stroke = 'var(--c-amber)';
    } else {
        circle.style.stroke = 'var(--c-red)';
    }
}

function renderTelemetryUI() {
    const { f1, f2 } = SubstationState.data;
    const nowStr = new Date().toLocaleTimeString('id-ID');

    // --- RENDER FEEDER 1 (9 PARAMETERS) ---
    // 1. Arus (Current A)
    setText('f1-ir', f1.ir.toFixed(1));
    setText('f1-is', f1.is.toFixed(1));
    setText('f1-it', f1.it.toFixed(1));
    setText('f1-in', f1.in.toFixed(1));

    // 2. Tegangan (Voltage V)
    setText('f1-vrn', f1.vrn.toFixed(1));
    setText('f1-vsn', f1.vsn.toFixed(1));
    setText('f1-vtn', f1.vtn.toFixed(1));
    setText('f1-vrs', f1.vrs.toFixed(1));
    setText('f1-vst', f1.vst.toFixed(1));
    setText('f1-vtr', f1.vtr.toFixed(1));

    // 3. Daya Aktif (P in kW)
    setText('f1-p', `${f1.p.toFixed(2)} kW`);
    // 4. Daya Reaktif (Q in kVAR)
    setText('f1-q', `${f1.q.toFixed(2)} kVAR`);
    // 5. Daya Semu (S in kVA)
    setText('f1-s', `${f1.s.toFixed(2)} kVA`);
    setText('f1-val-kva', `${f1.s.toFixed(1)} kVA`);
    // 6. Faktor Daya (PF)
    setText('f1-pf', f1.pf.toFixed(2));
    // 7. Frekuensi (Hz)
    setText('f1-freq', `${f1.freq.toFixed(2)} Hz`);
    // 8. Energi (kWh)
    setText('f1-energy', `${f1.energy.toFixed(1)} kWh`);
    // 9. Suhu (°C)
    setText('f1-val-temp', `${f1.temp.toFixed(1)} °C`);
    updateGauge('f1-gauge-circle', 'f1-val-load-pct', f1.load_pct);

    // Feeder 1 Suhu Status
    const f1TempBadge = document.getElementById('f1-temp-badge');
    if (f1TempBadge) {
        if (f1.temp < 55) {
            f1TempBadge.className = 'val-ok';
            f1TempBadge.textContent = 'Normal';
        } else if (f1.temp < 75) {
            f1TempBadge.className = 'val-warn';
            f1TempBadge.textContent = 'Waspada';
        } else {
            f1TempBadge.className = 'val-alert';
            f1TempBadge.textContent = 'Panas Berlebih';
        }
    }
    setText('f1-last-time', nowStr);

    // --- RENDER FEEDER 2 (9 PARAMETERS) ---
    // 1. Arus
    setText('f2-ir', f2.ir.toFixed(1));
    setText('f2-is', f2.is.toFixed(1));
    setText('f2-it', f2.it.toFixed(1));
    setText('f2-in', f2.in.toFixed(1));

    // 2. Tegangan
    setText('f2-vrn', f2.vrn.toFixed(1));
    setText('f2-vsn', f2.vsn.toFixed(1));
    setText('f2-vtn', f2.vtn.toFixed(1));
    setText('f2-vrs', f2.vrs.toFixed(1));
    setText('f2-vst', f2.vst.toFixed(1));
    setText('f2-vtr', f2.vtr.toFixed(1));

    // 3, 4, 5. Daya
    setText('f2-p', `${f2.p.toFixed(2)} kW`);
    setText('f2-q', `${f2.q.toFixed(2)} kVAR`);
    setText('f2-s', `${f2.s.toFixed(2)} kVA`);
    setText('f2-val-kva', `${f2.s.toFixed(1)} kVA`);
    // 6. Faktor Daya
    setText('f2-pf', f2.pf.toFixed(2));
    // 7. Frekuensi
    setText('f2-freq', `${f2.freq.toFixed(2)} Hz`);
    // 8. Energi
    setText('f2-energy', `${f2.energy.toFixed(1)} kWh`);
    // 9. Suhu
    setText('f2-val-temp', `${f2.temp.toFixed(1)} °C`);
    updateGauge('f2-gauge-circle', 'f2-val-load-pct', f2.load_pct);

    // Feeder 2 Suhu Status
    const f2TempBadge = document.getElementById('f2-temp-badge');
    if (f2TempBadge) {
        if (f2.temp < 55) {
            f2TempBadge.className = 'val-ok';
            f2TempBadge.textContent = 'Normal';
        } else if (f2.temp < 75) {
            f2TempBadge.className = 'val-warn';
            f2TempBadge.textContent = 'Waspada';
        } else {
            f2TempBadge.className = 'val-alert';
            f2TempBadge.textContent = 'Panas Berlebih';
        }
    }
    setText('f2-last-time', nowStr);

    // --- RENDER KPI SUBSTATION SUMMARY ---
    const totalKva = f1.s + f2.s;
    const totalKw = f1.p + f2.p;
    const totalEnergy = f1.energy + f2.energy;
    const avgPf = ((f1.pf + f2.pf) / 2).toFixed(2);
    const maxTemp = Math.max(f1.temp, f2.temp).toFixed(1);
    const totalCapacity = 1260; // 2 x 630 kVA
    const totalPct = ((totalKva / totalCapacity) * 100).toFixed(1);

    setText('kpi-total-kva', `${totalKva.toFixed(1)} kVA`);
    setText('kpi-total-load-pct', `${totalPct}% dari ${totalCapacity} kVA`);
    setText('kpi-total-kw', `${totalKw.toFixed(1)} kW`);
    setText('kpi-total-energy', `Kumulatif: ${totalEnergy.toFixed(1)} kWh`);
    setText('kpi-freq', `${f1.freq.toFixed(2)} Hz`);
    setText('kpi-pf', avgPf);
    setText('kpi-max-temp', `${maxTemp} °C`);

    // Append to charts
    pushChartData(nowStr, f1, f2);
}

function setText(elementId, value) {
    const el = document.getElementById(elementId);
    if (el) el.textContent = value;
}

// ==============================================================================
// 4. CHART.JS REAL-TIME INITIALIZATION & STREAMING
// ==============================================================================
function initCharts() {
    Chart.defaults.color = '#475569';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 11;

    const commonLineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: true,
                position: 'top',
                labels: { boxWidth: 12, padding: 10, color: '#334155', font: { weight: '600' } }
            }
        },
        scales: {
            x: { 
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { color: '#64748b' }
            },
            y: {
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { color: '#64748b' },
                title: { display: true, text: 'Tegangan (V)', color: '#d97706', font: { weight: '700' } },
                min: 200, max: 240
            },
            y1: {
                position: 'right',
                grid: { display: false },
                ticks: { color: '#64748b' },
                title: { display: true, text: 'Arus (A)', color: '#dc2626', font: { weight: '700' } },
                min: 80, max: 200
            }
        }
    };

    const commonTrendOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { 
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { color: '#64748b' }
            },
            y: {
                min: 0, max: 100,
                grid: { color: 'rgba(0, 0, 0, 0.05)' },
                ticks: { color: '#64748b' },
                title: { display: true, text: 'Pembebanan (%)', color: '#475569', font: { weight: '700' } }
            }
        }
    };

    // Feeder 1 Realtime (Voltage & Current)
    const ctxF1Rt = document.getElementById('f1-chart-rt')?.getContext('2d');
    if (ctxF1Rt) {
        f1RtChart = new Chart(ctxF1Rt, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Tegangan R-N', data: [], borderColor: '#d97706', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y' },
                    { label: 'Arus R', data: [], borderColor: '#dc2626', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y1' }
                ]
            },
            options: commonLineOptions
        });
    }

    // Feeder 1 Trend (Load %)
    const ctxF1Trend = document.getElementById('f1-chart-trend')?.getContext('2d');
    if (ctxF1Trend) {
        f1TrendChart = new Chart(ctxF1Trend, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Beban Feeder 1',
                    data: [],
                    borderColor: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.35
                }]
            },
            options: commonTrendOptions
        });
    }

    // Feeder 2 Realtime
    const ctxF2Rt = document.getElementById('f2-chart-rt')?.getContext('2d');
    if (ctxF2Rt) {
        f2RtChart = new Chart(ctxF2Rt, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    { label: 'Tegangan R-N', data: [], borderColor: '#d97706', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y' },
                    { label: 'Arus R', data: [], borderColor: '#059669', borderWidth: 2, pointRadius: 0, tension: 0.35, yAxisID: 'y1' }
                ]
            },
            options: commonLineOptions
        });
    }

    // Feeder 2 Trend
    const ctxF2Trend = document.getElementById('f2-chart-trend')?.getContext('2d');
    if (ctxF2Trend) {
        f2TrendChart = new Chart(ctxF2Trend, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Beban Feeder 2',
                    data: [],
                    borderColor: '#059669',
                    backgroundColor: 'rgba(5, 150, 105, 0.12)',
                    fill: true,
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.35
                }]
            },
            options: commonTrendOptions
        });
    }
}

function pushChartData(timeLabel, f1, f2) {
    const maxPoints = 12;

    const append = (chart, val1, val2) => {
        if (!chart) return;
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(val1);
        if (chart.data.datasets.length > 1 && val2 !== undefined) {
            chart.data.datasets[1].data.push(val2);
        }
        if (chart.data.labels.length > maxPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
            if (chart.data.datasets.length > 1) chart.data.datasets[1].data.shift();
        }
        chart.update('none'); // Update smoothly without lag
    };

    append(f1RtChart, f1.vrn, f1.ir);
    append(f1TrendChart, f1.load_pct);
    append(f2RtChart, f2.vrn, f2.ir);
    append(f2TrendChart, f2.load_pct);
}

// ==============================================================================
// 5. LIVE SIMULATION ENGINE (REALISTIC ELECTRICAL FLUCTUATIONS)
// ==============================================================================
function runSimulationStep() {
    const rand = (min, max) => min + Math.random() * (max - min);

    // Simulate Feeder 1
    const f1 = SubstationState.data.f1;
    f1.vrn = 220 + rand(-1.8, 1.8);
    f1.vsn = 221 + rand(-1.6, 1.6);
    f1.vtn = 220 + rand(-2.0, 2.0);
    f1.vrs = f1.vrn * 1.732;
    f1.vst = f1.vsn * 1.732;
    f1.vtr = f1.vtn * 1.732;

    f1.ir = 142 + rand(-3.5, 4.0);
    f1.is = 138 + rand(-3.0, 3.5);
    f1.it = 135 + rand(-3.2, 3.8);
    f1.in = Math.abs(f1.ir - f1.it) * 0.8 + rand(1, 4);

    const iAvgF1 = (f1.ir + f1.is + f1.it) / 3;
    f1.pf = 0.93 + rand(-0.015, 0.015);
    f1.freq = 50.00 + rand(-0.04, 0.04);
    f1.s = (Math.sqrt(3) * f1.vrs * iAvgF1) / 1000;
    f1.p = f1.s * f1.pf;
    f1.q = Math.sqrt(Math.max(0, (f1.s * f1.s) - (f1.p * f1.p)));
    f1.load_pct = (f1.s / 630) * 100;
    f1.temp = 45.0 + (f1.load_pct * 0.08) + rand(-0.2, 0.2);
    f1.energy += (f1.p * (2 / 3600)); // Accumulate energy every 2s

    // Simulate Feeder 2
    const f2 = SubstationState.data.f2;
    f2.vrn = 221 + rand(-1.5, 1.5);
    f2.vsn = 220 + rand(-1.8, 1.8);
    f2.vtn = 221 + rand(-1.7, 1.7);
    f2.vrs = f2.vrn * 1.732;
    f2.vst = f2.vsn * 1.732;
    f2.vtr = f2.vtn * 1.732;

    f2.ir = 127 + rand(-3.0, 3.5);
    f2.is = 130 + rand(-3.2, 3.2);
    f2.it = 125 + rand(-2.8, 3.0);
    f2.in = Math.abs(f2.ir - f2.is) * 0.7 + rand(1, 3);

    const iAvgF2 = (f2.ir + f2.is + f2.it) / 3;
    f2.pf = 0.94 + rand(-0.01, 0.01);
    f2.freq = f1.freq; // Shared busbar frequency
    f2.s = (Math.sqrt(3) * f2.vrs * iAvgF2) / 1000;
    f2.p = f2.s * f2.pf;
    f2.q = Math.sqrt(Math.max(0, (f2.s * f2.s) - (f2.p * f2.p)));
    f2.load_pct = (f2.s / 630) * 100;
    f2.temp = 42.5 + (f2.load_pct * 0.07) + rand(-0.2, 0.2);
    f2.energy += (f2.p * (2 / 3600));

    renderTelemetryUI();
}

// ==============================================================================
// 6. FIREBASE REALTIME DATABASE SYNC (REST POLLING & STREAMING)
// ==============================================================================
async function fetchFirebaseData() {
    if (!SubstationState.firebaseUrl) return;

    try {
        let cleanUrl = SubstationState.firebaseUrl.trim();
        if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
        const endpoint = `${cleanUrl}/${SubstationState.firebasePath}.json`;

        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);

        const json = await response.json();
        if (json) {
            parseAndApplyFirebaseTelemetry(json);
            updateConnectionBadge(true);
        }
    } catch (err) {
        console.warn('Gagal mengambil data dari Firebase, fallback ke state lokal:', err);
        updateConnectionBadge(false);
    }
}

function parseAndApplyFirebaseTelemetry(payload) {
    // Check if telemetry structure is nested by feeder or flat
    const f1Data = payload.feeder_1 || payload.f1 || payload;
    const f2Data = payload.feeder_2 || payload.f2 || payload;

    const mapFeeder = (target, src, prefix) => {
        if (!src) return;
        // Voltages
        if (src[`${prefix}vrn`] !== undefined) target.vrn = Number(src[`${prefix}vrn`]);
        else if (src.vrn !== undefined) target.vrn = Number(src.vrn);
        else if (src.voltage !== undefined) target.vrn = Number(src.voltage);

        if (src[`${prefix}vsn`] !== undefined) target.vsn = Number(src[`${prefix}vsn`]);
        else target.vsn = target.vrn + 0.5;

        if (src[`${prefix}vtn`] !== undefined) target.vtn = Number(src[`${prefix}vtn`]);
        else target.vtn = target.vrn - 0.4;

        target.vrs = target.vrn * 1.732;
        target.vst = target.vsn * 1.732;
        target.vtr = target.vtn * 1.732;

        // Currents
        if (src[`${prefix}ir`] !== undefined) target.ir = Number(src[`${prefix}ir`]);
        else if (src.current !== undefined) target.ir = Number(src.current);

        if (src[`${prefix}is`] !== undefined) target.is = Number(src[`${prefix}is`]);
        else target.is = target.ir * 0.98;

        if (src[`${prefix}it`] !== undefined) target.it = Number(src[`${prefix}it`]);
        else target.it = target.ir * 0.96;

        if (src[`${prefix}in`] !== undefined) target.in = Number(src[`${prefix}in`]);
        else target.in = Math.abs(target.ir - target.it) * 0.8;

        // Powers
        if (src[`${prefix}p`] !== undefined) target.p = Number(src[`${prefix}p`]);
        else target.p = (Math.sqrt(3) * target.vrs * ((target.ir + target.is + target.it) / 3) * 0.93) / 1000;

        if (src[`${prefix}q`] !== undefined) target.q = Number(src[`${prefix}q`]);
        else target.q = target.p * 0.38;

        if (src[`${prefix}s`] !== undefined) target.s = Number(src[`${prefix}s`]);
        else target.s = Math.sqrt((target.p * target.p) + (target.q * target.q));

        // Power Factor, Freq, Energy, Temp
        if (src[`${prefix}pf`] !== undefined) target.pf = Number(src[`${prefix}pf`]);
        else if (src.pf !== undefined) target.pf = Number(src.pf);

        if (src[`${prefix}freq`] !== undefined) target.freq = Number(src[`${prefix}freq`]);
        else if (src.frequency !== undefined) target.freq = Number(src.frequency);

        if (src[`${prefix}energy`] !== undefined) target.energy = Number(src[`${prefix}energy`]);
        else if (src.energy !== undefined) target.energy = Number(src.energy);

        if (src[`${prefix}temp`] !== undefined) target.temp = Number(src[`${prefix}temp`]);
        else if (src.temperature !== undefined) target.temp = Number(src.temperature);

        target.load_pct = (target.s / 630) * 100;
    };

    mapFeeder(SubstationState.data.f1, f1Data, 'f1_');
    mapFeeder(SubstationState.data.f2, f2Data, 'f2_');

    renderTelemetryUI();
}

function updateConnectionBadge(isConnected) {
    const badge = document.getElementById('dataSourceBadge');
    const label = document.getElementById('dataSourceLabel');
    if (!badge || !label) return;

    if (SubstationState.mode === 'firebase') {
        badge.classList.remove('sim-mode');
        if (isConnected) {
            label.textContent = 'ESP32-S3 Terhubung (Live)';
        } else {
            label.textContent = 'Firebase Menghubungkan...';
        }
    } else {
        badge.classList.add('sim-mode');
        label.textContent = 'Mode: Simulasi Live';
    }
}

// ==============================================================================
// 7. CONFIGURATION MODAL & LOCALSTORAGE
// ==============================================================================
function openConfigModal() {
    const modal = document.getElementById('configModal');
    if (modal) {
        document.getElementById('cfgDataMode').value = SubstationState.mode;
        document.getElementById('cfgFirebaseUrl').value = SubstationState.firebaseUrl;
        document.getElementById('cfgFirebasePath').value = SubstationState.firebasePath;
        onModeChange();
        modal.classList.add('open');
    }
}

function closeConfigModal() {
    const modal = document.getElementById('configModal');
    if (modal) modal.classList.remove('open');
}

function onModeChange() {
    const mode = document.getElementById('cfgDataMode').value;
    const groupUrl = document.getElementById('groupFirebaseUrl');
    const groupPath = document.getElementById('groupFirebasePath');
    if (mode === 'sim') {
        groupUrl.style.opacity = '0.5';
        groupPath.style.opacity = '0.5';
    } else {
        groupUrl.style.opacity = '1';
        groupPath.style.opacity = '1';
    }
}

function saveConfiguration() {
    const mode = document.getElementById('cfgDataMode').value;
    const url = document.getElementById('cfgFirebaseUrl').value.trim();
    const path = document.getElementById('cfgFirebasePath').value.trim() || 'gardu_dk186';

    SubstationState.mode = mode;
    SubstationState.firebaseUrl = url;
    SubstationState.firebasePath = path;

    localStorage.setItem('gardu_dk186_mode', mode);
    localStorage.setItem('gardu_dk186_firebase_url', url);
    localStorage.setItem('gardu_dk186_firebase_path', path);

    closeConfigModal();
    restartDataEngine();
}

function loadSavedConfig() {
    // Check window.FIREBASE_CONFIG fallback first
    if (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.databaseURL) {
        SubstationState.firebaseUrl = window.FIREBASE_CONFIG.databaseURL;
        SubstationState.firebasePath = window.FIREBASE_CONFIG.basePath || 'gardu_dk186';
        SubstationState.mode = 'firebase';
    }

    // Check localStorage overrides
    const savedMode = localStorage.getItem('gardu_dk186_mode');
    const savedUrl = localStorage.getItem('gardu_dk186_firebase_url');
    const savedPath = localStorage.getItem('gardu_dk186_firebase_path');

    if (savedMode) SubstationState.mode = savedMode;
    if (savedUrl) SubstationState.firebaseUrl = savedUrl;
    if (savedPath) SubstationState.firebasePath = savedPath;
}

function restartDataEngine() {
    if (SubstationState.simTimer) clearInterval(SubstationState.simTimer);
    if (SubstationState.pollingTimer) clearInterval(SubstationState.pollingTimer);

    updateConnectionBadge(false);

    if (SubstationState.mode === 'firebase' && SubstationState.firebaseUrl) {
        fetchFirebaseData();
        SubstationState.pollingTimer = setInterval(fetchFirebaseData, 2500);
    } else {
        // Fallback to active live simulation
        SubstationState.mode = 'sim';
        runSimulationStep();
        SubstationState.simTimer = setInterval(runSimulationStep, 2000);
        updateConnectionBadge(false);
    }
}

// ==============================================================================
// 8. AUTENTIKASI SESI & LOGOUT
// ==============================================================================
function checkAuthSession() {
    const isAuth = sessionStorage.getItem('gardu_dk186_auth');
    const user = sessionStorage.getItem('gardu_dk186_user') || 'up3cengkareng';

    const sbUser = document.getElementById('sbUserLabel');
    if (sbUser) sbUser.textContent = user;
    const curUser = document.getElementById('currentUserLabel');
    if (curUser) curUser.textContent = user;

    // Jika belum login, redirect ke halaman login (index.html)
    if (!isAuth) {
        window.location.href = 'index.html';
    }
}

function logoutUser() {
    sessionStorage.removeItem('gardu_dk186_auth');
    sessionStorage.removeItem('gardu_dk186_user');
    window.location.href = 'index.html';
}

// ==============================================================================
// 9. APP INITIALIZATION
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
    checkAuthSession();
    updateTopClock();
    setInterval(updateTopClock, 1000);

    initCharts();
    loadSavedConfig();
    restartDataEngine();

    // Default view: all feeders
    selectFeederView('all');
});
