/* ============================================================
   HUMANTICA — main.js
   Handles: autocomplete, form submit, tab switching,
            result rendering, natal chart canvas drawing
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

    // ── DOM refs ──────────────────────────────────────────────
    const form          = document.getElementById('calc-form');
    const cityInput     = document.getElementById('city');
    const suggestions   = document.getElementById('suggestions');
    const searchSpinner = document.getElementById('search-spinner');
    const cityClear     = document.getElementById('city-clear');
    const latHidden     = document.getElementById('lat');
    const lonHidden     = document.getElementById('lon');
    const isGmtHidden   = document.getElementById('is_gmt');
    const radioLocalDot = document.getElementById('radio-local-dot');
    const radioGmtDot   = document.getElementById('radio-gmt-dot');
    const btnSubmit     = document.getElementById('btn-submit');
    const btnLabel      = document.getElementById('btn-label');
    const btnSpinner    = document.getElementById('btn-spinner');
    const birthDateEl   = document.getElementById('birth_date');
    const birthTimeEl   = document.getElementById('birth_time');

    const placeholderState = document.getElementById('placeholder-state');
    const resultsPanel     = document.getElementById('results-panel');

    // Mobile sidebar toggle
    const sidebarToggle      = document.getElementById('sidebar-toggle');
    const sidebarCollapsible = document.getElementById('sidebar-collapsible');

    function isMobile() { return window.innerWidth <= 768; }

    function initSidebarToggle() {
        if (isMobile()) {
            sidebarToggle.style.display = 'flex';
        } else {
            sidebarToggle.style.display = 'none';
            sidebarCollapsible.classList.remove('collapsed');
        }
    }

    sidebarToggle.addEventListener('click', () => {
        const isCollapsed = sidebarCollapsible.classList.contains('collapsed');
        sidebarCollapsible.classList.toggle('collapsed', !isCollapsed);
        sidebarToggle.classList.toggle('collapsed', !isCollapsed);
    });

    window.addEventListener('resize', () => {
        initSidebarToggle();
        if (lastChart) drawChart(lastChart, canvas);
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => { if (lastChart) drawChart(lastChart, canvas); }, 300);
    });

    initSidebarToggle();
    // Start collapsed on mobile
    if (isMobile()) {
        sidebarCollapsible.classList.add('collapsed');
        sidebarToggle.classList.add('collapsed');
    }

    // Info strip
    const icCity   = document.getElementById('ic-city');
    const icCoords = document.getElementById('ic-coords');
    const icTz     = document.getElementById('ic-tz');
    const icLocal  = document.getElementById('ic-local');
    const icGmt    = document.getElementById('ic-gmt');
    const icJd     = document.getElementById('ic-jd');

    // Tables
    const planetsTbody = document.getElementById('planets-tbody');
    const housesTbody  = document.getElementById('houses-tbody');
    const infoGrid     = document.getElementById('info-detail-grid');

    // Canvas
    const canvas = document.getElementById('chart-canvas');
    const ctx    = canvas.getContext('2d');

    // ── Default date ──────────────────────────────────────────
    birthDateEl.value = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    // ── State ─────────────────────────────────────────────────
    let debounce     = null;
    let activeIdx    = -1;
    let isGmt        = false;
    let selectedCity = null;   // { display, lat, lon }
    let lastChart    = null;   // last calculation result
    const geoCache   = new Map(); // local geocoding cache

    // ── Radio time mode ───────────────────────────────────────
    document.getElementById('radio-local').addEventListener('click', () => setGmt(false));
    document.getElementById('radio-gmt').addEventListener('click',   () => setGmt(true));

    function setGmt(val) {
        isGmt = val;
        isGmtHidden.value = val ? '1' : '0';
        radioLocalDot.classList.toggle('active', !val);
        radioGmtDot.classList.toggle('active',  val);
    }

    // ── City clear button ─────────────────────────────────────
    cityClear.addEventListener('click', () => {
        cityInput.value = '';
        latHidden.value = '';
        lonHidden.value = '';
        selectedCity    = null;
        cityClear.classList.add('hidden');
        closeSuggestions();
        cityInput.focus();
    });

    // ── Autocomplete ──────────────────────────────────────────
    cityInput.addEventListener('input', () => {
        const q = cityInput.value.trim();
        cityClear.classList.toggle('hidden', !q);
        clearTimeout(debounce);
        if (q.length < 2) { closeSuggestions(); return; }
        
        // If query is already in cache, show it instantly!
        const cacheKey = q.toLowerCase();
        if (geoCache.has(cacheKey)) {
            renderSuggestions(geoCache.get(cacheKey));
            return;
        }
        
        debounce = setTimeout(() => fetchCities(q), 80);
    });

    cityInput.addEventListener('keydown', (e) => {
        const items = suggestions.querySelectorAll('li');
        if (!items.length) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(items, activeIdx + 1); }
        if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(items, activeIdx - 1); }
        if (e.key === 'Enter')     { e.preventDefault(); if (activeIdx > -1) pickSuggestion(items[activeIdx]); }
        if (e.key === 'Escape')    { closeSuggestions(); }
    });

    document.addEventListener('click', (e) => {
        if (!cityInput.contains(e.target) && !suggestions.contains(e.target)) closeSuggestions();
    });

    async function fetchCities(q) {
        const cacheKey = q.toLowerCase();
        if (geoCache.has(cacheKey)) {
            renderSuggestions(geoCache.get(cacheKey));
            return;
        }
        searchSpinner.classList.remove('hidden');
        try {
            const res  = await fetch(`/api/geocode?query=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (Array.isArray(data)) {
                geoCache.set(cacheKey, data);
            }
            renderSuggestions(data);
        } catch { closeSuggestions(); }
        finally  { searchSpinner.classList.add('hidden'); }
    }

    function renderSuggestions(items) {
        suggestions.innerHTML = '';
        activeIdx = -1;
        if (!items || !items.length) { closeSuggestions(); return; }

        items.forEach(item => {
            const li = document.createElement('li');

            // Icon
            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('width', '14'); icon.setAttribute('height', '14');
            icon.setAttribute('viewBox', '0 0 16 16'); icon.setAttribute('fill', 'none');
            icon.classList.add('sug-icon');
            icon.innerHTML = `<path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z" stroke="#D4AF37" stroke-width="1.3"/><circle cx="8" cy="6" r="1.8" stroke="#D4AF37" stroke-width="1.3"/>`;

            // Text
            const body    = document.createElement('div');
            body.className = 'sug-body';
            // Split display_name: first part is city name, rest is country
            const parts   = item.display_name.split(',');
            const primary = parts.slice(0, 2).join(',').trim();
            const sub     = parts.slice(2).join(',').trim();

            const nameEl  = document.createElement('span');
            nameEl.className = 'sug-name';
            nameEl.textContent = primary;

            const subEl   = document.createElement('span');
            subEl.className = 'sug-sub';
            subEl.textContent = sub;

            body.appendChild(nameEl);
            if (sub) body.appendChild(subEl);
            li.appendChild(icon);
            li.appendChild(body);

            li.dataset.lat  = item.lat;
            li.dataset.lon  = item.lon;
            li.dataset.name = primary;

            li.addEventListener('click', () => pickSuggestion(li));
            suggestions.appendChild(li);
        });

        suggestions.classList.add('open');
    }

    function setActive(items, idx) {
        items.forEach(i => i.classList.remove('active'));
        activeIdx = Math.max(0, Math.min(idx, items.length - 1));
        items[activeIdx].classList.add('active');
    }

    function pickSuggestion(li) {
        selectedCity = { display: li.dataset.name, lat: parseFloat(li.dataset.lat), lon: parseFloat(li.dataset.lon) };
        cityInput.value = li.dataset.name;
        latHidden.value = li.dataset.lat;
        lonHidden.value = li.dataset.lon;
        cityClear.classList.remove('hidden');
        closeSuggestions();
    }

    function closeSuggestions() {
        suggestions.classList.remove('open');
        suggestions.innerHTML = '';
        activeIdx = -1;
    }

    // ── Tabs ──────────────────────────────────────────────────
    document.querySelectorAll('.tab').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('content-' + btn.dataset.tab).classList.add('active');
        });
    });

    // ── Export ────────────────────────────────────────────────
    const btnExport = document.getElementById('btn-export');
    const exportDropdown = document.getElementById('export-dropdown');

    btnExport.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!lastChart) return;
        const isOpen = exportDropdown.classList.contains('open');
        if (isOpen) {
            exportDropdown.classList.remove('open');
            btnExport.setAttribute('aria-expanded', 'false');
        } else {
            exportDropdown.classList.add('open');
            btnExport.setAttribute('aria-expanded', 'true');
        }
    });

    // Close dropdown on click outside
    window.addEventListener('click', (e) => {
        if (exportDropdown.classList.contains('open')) {
            if (!exportDropdown.contains(e.target) && e.target !== btnExport) {
                exportDropdown.classList.remove('open');
                btnExport.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Option: PNG Export
    document.getElementById('export-png').addEventListener('click', () => {
        if (!lastChart) return;
        exportDropdown.classList.remove('open');
        btnExport.setAttribute('aria-expanded', 'false');

        // Create a temporary high-quality canvas to draw a premium background plate
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Fill background with warm champagne matching the theme
        tempCtx.fillStyle = '#FAF8F5';
        tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw gold card border
        tempCtx.strokeStyle = 'rgba(197, 158, 63, 0.4)';
        tempCtx.lineWidth = Math.max(2, tempCanvas.width * 0.008);
        tempCtx.strokeRect(0, 0, tempCanvas.width, tempCanvas.height);

        // Draw original chart canvas on top
        tempCtx.drawImage(canvas, 0, 0);

        // Download PNG
        const link = document.createElement('a');
        link.download = `humantica_natal_${lastChart.metadata.birth_date_local}.png`;
        link.href = tempCanvas.toDataURL('image/png');
        link.click();
    });

    // Option: Print / PDF
    document.getElementById('export-print').addEventListener('click', () => {
        exportDropdown.classList.remove('open');
        btnExport.setAttribute('aria-expanded', 'false');
        window.print();
    });

    // Option: Copy Report
    document.getElementById('export-copy').addEventListener('click', () => {
        if (!lastChart) return;
        exportDropdown.classList.remove('open');
        btnExport.setAttribute('aria-expanded', 'false');

        const lines = [];
        lines.push('✨ HUMANTICA — АСТРОЛОГИЧЕСКИЙ ОТЧЕТ ✨');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push(`📅 Дата рождения: ${lastChart.metadata.birth_date_local} ${lastChart.metadata.birth_time_local}`);
        lines.push(`📍 Город: ${selectedCity ? selectedCity.display : '—'}`);
        lines.push(`🌐 Координаты: ${lastChart.metadata.latitude}°N, ${lastChart.metadata.longitude}°E`);
        lines.push(`⏰ GMT: ${lastChart.metadata.datetime_gmt}`);
        lines.push(`⏰ Часовой пояс: ${lastChart.metadata.timezone} (${lastChart.metadata.utc_offset})`);
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push('');
        lines.push('🪐 ПОЛОЖЕНИЯ ПЛАНЕТ:');
        lines.push('────────────────────────────────────────');
        lastChart.planets.forEach(p => {
            const retro = p.is_retrograde ? ' 🔴 [Ретроградная]' : '';
            const f = p.formatted;
            lines.push(`• ${p.name.padEnd(8)} → ${f.deg}°${f.min}'${f.sec}" ${f.sign}${retro}`);
        });
        lines.push('');
        lines.push('🏠 КУСПИДЫ ДОМОВ:');
        lines.push('────────────────────────────────────────');
        lastChart.houses.forEach(h => {
            const f = h.formatted;
            lines.push(`• Дом ${h.name.toString().padEnd(3)} → ${f.deg}°${f.min}'${f.sec}" ${f.sign}`);
        });
        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push('Рассчитано на humantica.app (Swiss Ephemeris)');

        const textReport = lines.join('\n');

        navigator.clipboard.writeText(textReport).then(() => {
            showToast('Отчёт успешно скопирован в буфер обмена');
        }).catch(err => {
            console.error('Ошибка копирования:', err);
            // Fallback copy method
            const textarea = document.createElement('textarea');
            textarea.value = textReport;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                showToast('Отчёт успешно скопирован в буфер обмена');
            } catch (e) {
                alert('Не удалось скопировать отчёт. Скопируйте текст вручную.');
            }
            document.body.removeChild(textarea);
        });
    });

    // Toast helper function
    function showToast(message) {
        const toast = document.getElementById('toast-notification');
        const toastMsg = document.getElementById('toast-message');
        if (!toast || !toastMsg) return;

        toastMsg.textContent = message;
        toast.classList.add('show');

        if (toast.timeoutId) {
            clearTimeout(toast.timeoutId);
        }

        toast.timeoutId = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // ── Form submit ───────────────────────────────────────────
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const birth_date = birthDateEl.value;
        const birth_time = birthTimeEl.value;

        if (!birth_date || !birth_time) { alert('Укажите дату и время рождения'); return; }
        if (!isGmt && (!latHidden.value || !lonHidden.value)) {
            alert('Выберите город из выпадающего списка'); return;
        }

        // Show loading
        btnLabel.textContent = 'Расчёт...';
        btnSpinner.classList.remove('hidden');
        btnSubmit.disabled = true;

        try {
            const resp = await fetch('/api/calculate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    birth_date,
                    birth_time,
                    is_gmt: isGmt,
                    lat: isGmt ? null : parseFloat(latHidden.value),
                    lon: isGmt ? null : parseFloat(lonHidden.value),
                })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'Ошибка расчёта');

            lastChart = data;
            renderResults(data);

        } catch (err) {
            alert(err.message);
        } finally {
            btnLabel.textContent = 'Рассчитать карту';
            btnSpinner.classList.add('hidden');
            btnSubmit.disabled = false;
        }
    });

    // ── Render results ────────────────────────────────────────
    function renderResults(data) {
        const meta = data.metadata;

        // Info strip
        const cityName = selectedCity ? selectedCity.display : '—';
        icCity.textContent = cityName;
        if (meta.latitude && meta.longitude) {
            const lat = parseFloat(meta.latitude).toFixed(4);
            const lon = parseFloat(meta.longitude).toFixed(4);
            icCoords.textContent = `${lat}° N, ${lon}° E`;
        } else {
            icCoords.textContent = '—';
        }
        icTz.textContent     = `${meta.timezone} (${meta.utc_offset})`;
        const tzSub          = `Историческое смещение: ${meta.utc_offset}`;
        icTz.title           = tzSub;
        icLocal.textContent  = `${meta.birth_date_local}, ${meta.birth_time_local}`;
        icGmt.textContent    = `GMT/UTC: ${meta.datetime_gmt.split(' ')[1]}`;
        // Calculate Julian day from GMT datetime
        const [ymd, hms] = meta.datetime_gmt.split(' ');
        const [yr,mo,dy] = ymd.split('-').map(Number);
        const [hh,mm,ss] = hms.split(':').map(Number);
        const jd = julianDay(yr, mo, dy, hh + mm/60 + ss/3600);
        icJd.textContent = jd.toFixed(5);

        // Planets table
        renderPlanetsTable(data.planets);

        // Houses table
        renderHousesTable(data.houses);

        // Info detail tab
        renderInfoTab(data, cityName, jd);

        // ============================================================
        // Populate Print Report Template
        // ============================================================
        const printDateEl = document.getElementById('print-date-timestamp');
        if (printDateEl) {
            const now = new Date();
            const formatOptions = { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedCurrentDate = now.toLocaleDateString('ru-RU', formatOptions);
            printDateEl.textContent = `Отчёт сформирован: ${formattedCurrentDate} (${meta.utc_offset})`;
        }

        // Print Meta Cards
        document.getElementById('pm-city').textContent = cityName;
        if (meta.latitude && meta.longitude) {
            const latVal = parseFloat(meta.latitude).toFixed(4);
            const lonVal = parseFloat(meta.longitude).toFixed(4);
            document.getElementById('pm-coords').textContent = `${Math.abs(latVal)}°${latVal >= 0 ? 'N' : 'S'}, ${Math.abs(lonVal)}°${lonVal >= 0 ? 'E' : 'W'}`;
        } else {
            document.getElementById('pm-coords').textContent = '—';
        }
        
        // Print local time format (DD.MM.YYYY HH:MM:SS)
        const dateParts = meta.birth_date_local.split('-'); // YYYY-MM-DD
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : meta.birth_date_local;
        document.getElementById('pm-time').textContent = `${formattedDate} ${meta.birth_time_local} (${meta.utc_offset})`;
        document.getElementById('pm-gmt').textContent = `GMT/UTC: ${meta.datetime_gmt.split(' ')[1]}`;
        
        document.getElementById('pm-timezone').textContent = meta.timezone;
        document.getElementById('pm-offset').textContent = `Историческое смещение: ${meta.utc_offset}`;
        document.getElementById('pm-jd').textContent = jd.toFixed(5);

        // Populate print planets table
        const printPlanetsTbody = document.getElementById('print-planets-tbody');
        if (printPlanetsTbody) {
            printPlanetsTbody.innerHTML = '';
            data.planets.forEach(p => {
                const pMeta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
                const sm = signMeta(p.formatted.sign);
                const tr = document.createElement('tr');
                
                tr.innerHTML = `
                    <td>
                        <div class="print-planet-cell">
                            <div class="print-planet-glyph ${pMeta.cls}">${pMeta.sym}</div>
                            <strong>${p.name}</strong>
                        </div>
                    </td>
                    <td class="lon-cell">${lonToStr(p.longitude)}</td>
                    <td>
                        <div class="print-sign-cell">
                            <span class="print-sign-glyph">${sm.sym}</span>
                            <span>${sm.name}</span>
                        </div>
                    </td>
                    <td>${fmtPos(p.formatted)}</td>
                    <td style="text-align: center;">${p.is_retrograde ? '<span class="print-retro-badge">R</span>' : '<span style="color: #9E978A;">—</span>'}</td>
                `;
                printPlanetsTbody.appendChild(tr);
            });
        }

        // Populate print houses grid
        const printHousesRow = document.getElementById('print-houses-row');
        if (printHousesRow) {
            printHousesRow.innerHTML = '';
            data.houses.forEach(h => {
                const sm = signMeta(h.formatted.sign);
                const card = document.createElement('div');
                card.className = 'print-house-card';
                
                // Format name nicely (e.g. I (ASC), X (MC))
                let dispName = toRoman(parseInt(h.name) || h.name);
                if (h.name == '1') dispName = 'I (ASC)';
                if (h.name == '7') dispName = 'VII (DSC)';
                if (h.name == '10') dispName = 'MC (X)';
                if (h.name == '4') dispName = 'IC (IV)';

                const zodiacIndex = ZODIAC_META.findIndex(z => z.name === sm.name);
                const zColor = ZODIAC_COLORS[zodiacIndex >= 0 ? zodiacIndex : 0] || '#5E52B0';

                card.innerHTML = `
                    <span class="print-house-name">${dispName}</span>
                    <span class="print-house-deg">${fmtPos(h.formatted)}</span>
                    <span class="print-house-sign-glyph" style="color: ${zColor}">${sm.sym}</span>
                `;
                printHousesRow.appendChild(card);
            });
        }

        // Draw screen chart
        drawChart(data, canvas);

        // Draw print chart
        drawChart(data, document.getElementById('print-chart-canvas'));

        // Show results, reset tabs
        placeholderState.classList.add('hidden');
        resultsPanel.classList.remove('hidden');

        // Switch to planets tab
        document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        document.getElementById('tab-planets').classList.add('active');
        document.getElementById('content-planets').classList.add('active');

        // On mobile: collapse the sidebar and scroll to results
        if (isMobile()) {
            sidebarCollapsible.classList.add('collapsed');
            sidebarToggle.classList.add('collapsed');
            setTimeout(() => resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } else {
            resultsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    // ── Julian Day calculator (JS fallback for display) ───────
    function julianDay(y, m, d, h) {
        if (m <= 2) { y -= 1; m += 12; }
        const A = Math.floor(y / 100);
        const B = 2 - A + Math.floor(A / 4);
        return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + h/24 + B - 1524.5;
    }

    // ── Planet meta (symbol, glyph-class) ─────────────────────
    const PLANET_META = {
        'Солнце':       { sym: '☉', cls: 'glyph-sun' },
        'Луна':         { sym: '☽', cls: 'glyph-moon' },
        'Меркурий':     { sym: '☿', cls: 'glyph-mercury' },
        'Венера':       { sym: '♀', cls: 'glyph-venus' },
        'Марс':         { sym: '♂', cls: 'glyph-mars' },
        'Юпитер':       { sym: '♃', cls: 'glyph-jupiter' },
        'Сатурн':       { sym: '♄', cls: 'glyph-saturn' },
        'Уран':         { sym: '♅', cls: 'glyph-uranus' },
        'Нептун':       { sym: '♆', cls: 'glyph-neptune' },
        'Плутон':       { sym: '♇', cls: 'glyph-pluto' },
        'Северный Узел':{ sym: '☊', cls: 'glyph-node' },
        'Южный Узел':   { sym: '☋', cls: 'glyph-node' },
    };

    const ZODIAC_META = [
        { sym: '♈', name: 'Овен' },
        { sym: '♉', name: 'Телец' },
        { sym: '♊', name: 'Близнецы' },
        { sym: '♋', name: 'Рак' },
        { sym: '♌', name: 'Лев' },
        { sym: '♍', name: 'Дева' },
        { sym: '♎', name: 'Весы' },
        { sym: '♏', name: 'Скорпион' },
        { sym: '♐', name: 'Стрелец' },
        { sym: '♑', name: 'Козерог' },
        { sym: '♒', name: 'Водолей' },
        { sym: '♓', name: 'Рыбы' },
    ];

    function signMeta(signName) {
        return ZODIAC_META.find(z => z.name === signName) || { sym: '?', name: signName };
    }

    function fmtPos(f) {
        return `${f.deg}° ${String(f.min).padStart(2,'0')}' ${String(f.sec).padStart(2,'0')}"`;
    }
    function lonToStr(lon) {
        const sign = Math.floor(lon / 30);
        const deg  = lon % 30;
        const d    = Math.floor(deg);
        const mf   = (deg - d) * 60;
        const m    = Math.floor(mf);
        const s    = Math.round((mf - m) * 60);
        const z    = ZODIAC_META[sign % 12];
        return `${Math.round(lon)}° ${String(m).padStart(2,'0')}' ${String(s).padStart(2,'0')}"`;
    }

    // ── Planets table ─────────────────────────────────────────
    function renderPlanetsTable(planets) {
        planetsTbody.innerHTML = '';
        planets.forEach(p => {
            const meta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
            const sm   = signMeta(p.formatted.sign);

            const tr = document.createElement('tr');
            if (p.is_retrograde) {
                tr.classList.add('retro-row');
            }
            tr.innerHTML = `
                <td>
                    <div class="planet-cell">
                        <div class="planet-glyph ${meta.cls}">${meta.sym}</div>
                        <span class="planet-name">${p.name}</span>
                    </div>
                </td>
                <td class="lon-cell">${lonToStr(p.longitude)}</td>
                <td>
                    <div class="sign-cell">
                        <span class="sign-glyph">${sm.sym}</span>
                        <span class="sign-name">${sm.name}</span>
                    </div>
                </td>
                <td>${fmtPos(p.formatted)}</td>
                <td>${p.is_retrograde
                    ? '<span class="retro-badge">R</span>'
                    : '<span class="direct-dash">—</span>'}</td>`;
            planetsTbody.appendChild(tr);
        });
    }

    // ── Houses table ─────────────────────────────────────────
    function renderHousesTable(houses) {
        housesTbody.innerHTML = '';
        houses.forEach(h => {
            const sm = signMeta(h.formatted.sign);
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${h.name}</strong></td>
                <td class="lon-cell">${lonToStr(h.longitude)}</td>
                <td>
                    <div class="sign-cell">
                        <span class="sign-glyph">${sm.sym}</span>
                        <span class="sign-name">${sm.name}</span>
                    </div>
                </td>
                <td>${fmtPos(h.formatted)}</td>`;
            housesTbody.appendChild(tr);
        });
    }

    // ── Info detail tab ───────────────────────────────────────
    function renderInfoTab(data, cityName, jd) {
        const meta = data.metadata;
        infoGrid.innerHTML = '';
        const items = [
            { label: 'Город',               value: cityName },
            { label: 'Дата рождения',        value: meta.birth_date_local },
            { label: 'Время рождения',       value: meta.birth_time_local },
            { label: 'Часовой пояс',         value: meta.timezone,   sub: meta.utc_offset },
            { label: 'GMT / UTC',            value: meta.datetime_gmt },
            { label: 'Юлианский день (UT)',  value: jd.toFixed(5) },
            { label: 'Широта',               value: meta.latitude  ? `${parseFloat(meta.latitude).toFixed(6)}°` : '—' },
            { label: 'Долгота',              value: meta.longitude ? `${parseFloat(meta.longitude).toFixed(6)}°` : '—' },
            { label: 'Система домов',        value: 'Плацидус' },
            { label: 'Движок расчётов',      value: 'Swiss Ephemeris (pyswisseph)' },
        ];
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'info-detail-card';
            div.innerHTML = `
                <div class="info-detail-label">${item.label}</div>
                <div class="info-detail-value">${item.value}</div>
                ${item.sub ? `<div class="info-detail-sub">${item.sub}</div>` : ''}`;
            infoGrid.appendChild(div);
        });
    }

    // ============================================================
    //  NATAL CHART CANVAS DRAWING
    // ============================================================
    const ZODIAC_COLORS = [
        '#C59E3F','#C5A059','#777166',  // Aries (Fire), Taurus (Earth), Gemini (Air)
        '#5E52B0','#C59E3F','#C5A059',  // Cancer (Water), Leo (Fire), Virgo (Earth)
        '#777166','#5E52B0','#C59E3F',  // Libra (Air), Scorpio (Water), Sagittarius (Fire)
        '#C5A059','#777166','#5E52B0',  // Capricorn (Earth), Aquarius (Air), Pisces (Water)
    ];

    const PLANET_COLORS = {
        'Солнце':       '#C59E3F',
        'Луна':         '#4E493F',
        'Меркурий':     '#5F707A',
        'Венера':       '#B44682',
        'Марс':         '#B23D3D',
        'Юпитер':       '#C28100',
        'Сатурн':       '#5E6A75',
        'Уран':         '#0E829E',
        'Нептун':       '#3C33C0',
        'Плутон':       '#7C2D12',
        'Северный Узел':'#3F6E10',
        'Южный Узел':   '#3F6E10',
    };

    function drawChart(data, canvasEl) {
        if (!canvasEl) return;
        const canvas = canvasEl;
        const ctx    = canvas.getContext('2d');

        // Make canvas fill its container on mobile
        const container = canvas.parentElement;
        const isScreenCanvas = (canvas.id === 'chart-canvas');
        const displayW  = isScreenCanvas ? Math.min(container.clientWidth || 380, 380) : 440;
        const scale     = isScreenCanvas ? (window.devicePixelRatio || 1) : 2;

        // Set actual pixel size for sharpness
        canvas.width  = displayW * scale;
        canvas.height = displayW * scale;
        canvas.style.width  = displayW + 'px';
        canvas.style.height = displayW + 'px';
        ctx.setTransform(scale, 0, 0, scale, 0, 0);

        const size = displayW;
        const cx    = size / 2;
        const cy    = size / 2;
        const R     = size / 2 - 6;      // outer ring
        const r1    = R * 0.82;          // zodiac inner
        const r2    = R * 0.72;          // houses outer
        const r3    = R * 0.60;          // houses inner / aspect outer
        const r4    = R * 0.20;          // centre circle

        ctx.clearRect(0, 0, size, size);

        // Background (Pure White matching CSS --bg-card)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();

        // -- Zodiac ring (outer) --
        for (let i = 0; i < 12; i++) {
            const startAngle = degToRad(i * 30 - 90);
            const endAngle   = degToRad((i + 1) * 30 - 90);
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, R, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = hexToRgba(ZODIAC_COLORS[i], 0.04);
            ctx.fill();
            ctx.strokeStyle = 'rgba(197, 158, 63, 0.15)';
            ctx.lineWidth   = 1;
            ctx.stroke();

            // Zodiac glyph
            const midAngle = degToRad(i * 30 + 15 - 90);
            const gx = cx + (R * 0.91) * Math.cos(midAngle);
            const gy = cy + (R * 0.91) * Math.sin(midAngle);
            ctx.font      = `bold 12px serif`;
            ctx.fillStyle = ZODIAC_COLORS[i];
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ZODIAC_META[i].sym, gx, gy);
        }

        // Outer ring border
        ctx.beginPath(); ctx.arc(cx, cy, R,  0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.35)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.15)'; ctx.lineWidth=1;   ctx.stroke();

        // -- House dividers --
        const asc = data.houses[0].longitude;  // Ascendant longitude

        for (let i = 0; i < 12; i++) {
            const hLon   = data.houses[i].longitude;
            const angle  = degToRad(lonToAngle(hLon, asc));
            const x1 = cx + r2 * Math.cos(angle);
            const y1 = cy + r2 * Math.sin(angle);
            const x2 = cx + r3 * Math.cos(angle);
            const y2 = cy + r3 * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = 'rgba(197, 158, 63, 0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();

            // House number
            const hNext  = data.houses[(i + 1) % 12].longitude;
            const midLon = (hLon + angularMid(hLon, hNext)) / 2;
            const midAng = degToRad(lonToAngle(midLon, asc));
            const hx = cx + (r2 + r3) / 2 * Math.cos(midAng);
            const hy = cy + (r2 + r3) / 2 * Math.sin(midAng);
            ctx.font      = '9px Inter, sans-serif';
            ctx.fillStyle = '#777166';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(toRoman(i + 1), hx, hy);
        }

        ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.15)'; ctx.lineWidth=1; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r3, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.12)'; ctx.lineWidth=1; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r4, 0, Math.PI*2); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(197, 158, 63, 0.12)'; ctx.lineWidth=1; ctx.stroke();

        // -- Aspects (between planets) --
        const planets = data.planets;
        const ASPECTS = [
            { name:'conj', orb:10, color:'rgba(197, 158, 63, 0.6)',  deg:0 },    // gold
            { name:'oppo', orb:10, color:'rgba(165, 120, 69, 0.6)',  deg:180 },  // bronze
            { name:'trig', orb:8,  color:'rgba(94, 82, 176, 0.6)', deg:120 },  // purple
            { name:'squa', orb:8,  color:'rgba(204, 89, 63, 0.6)',  deg:90 },   // coral
            { name:'sext', orb:6,  color:'rgba(119, 113, 102, 0.5)',  deg:60 },   // platinum
        ];

        for (let i = 0; i < planets.length; i++) {
            for (let j = i + 1; j < planets.length; j++) {
                const diff = Math.abs(planets[i].longitude - planets[j].longitude);
                const arc  = Math.min(diff, 360 - diff);
                for (const asp of ASPECTS) {
                    if (Math.abs(arc - asp.deg) <= asp.orb) {
                        const a1 = degToRad(lonToAngle(planets[i].longitude, asc));
                        const a2 = degToRad(lonToAngle(planets[j].longitude, asc));
                        const x1 = cx + r3 * Math.cos(a1);
                        const y1 = cy + r3 * Math.sin(a1);
                        const x2 = cx + r3 * Math.cos(a2);
                        const y2 = cy + r3 * Math.sin(a2);
                        ctx.beginPath();
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                        ctx.strokeStyle = asp.color;
                        ctx.lineWidth   = 1.2;
                        if (asp.name === 'squa') { ctx.setLineDash([4, 3]); }
                        else { ctx.setLineDash([]); }
                        ctx.stroke();
                        ctx.setLineDash([]);
                        break;
                    }
                }
            }
        }

        // -- Planet symbols on wheel --
        const placed = [];  // track placed angles to avoid overlap
        planets.forEach(p => {
            const meta  = PLANET_META[p.name] || { sym: p.symbol };
            let angle   = lonToAngle(p.longitude, asc);

            // Nudge if too close to existing
            for (let attempt = 0; attempt < 8; attempt++) {
                if (!placed.some(a => Math.abs(angleDiff(a, angle)) < 12)) break;
                angle += 13;
            }
            placed.push(angle);

            const rad = degToRad(angle);
            const pr  = (r2 + r3) * 0.5 + 6;  // between house ring and aspects
            const px  = cx + pr * Math.cos(rad);
            const py  = cy + pr * Math.sin(rad);

            // Tiny dot on zodiac ring
            const dotR = degToRad(lonToAngle(p.longitude, asc));
            const dx   = cx + r2 * Math.cos(dotR);
            const dy   = cy + r2 * Math.sin(dotR);
            ctx.beginPath();
            ctx.arc(dx, dy, 3, 0, Math.PI*2);
            ctx.fillStyle = '#C59E3F';
            ctx.fill();

            // Line from dot to symbol
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = 'rgba(197, 158, 63, 0.25)';
            ctx.lineWidth = 0.7;
            ctx.stroke();

            // Symbol
            ctx.font      = '13px serif';
            ctx.fillStyle = PLANET_COLORS[p.name] || '#2E2A20';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(meta.sym, px, py);

            // Retrograde indicator
            if (p.is_retrograde) {
                ctx.font      = 'bold 9px Inter, sans-serif';
                ctx.fillStyle = '#E06D53'; // terracotta/red highlight
                ctx.fillText('R', px + 9, py - 7);
            }
        });

        // ASC / DSC / MC / IC labels
        const angles_labels = [
            { label: 'ASC', lon: asc,       side: -1 },
            { label: 'DSC', lon: asc + 180, side:  1 },
            { label: 'MC',  lon: data.houses[9].longitude,  side: 0, top: true },
            { label: 'IC',  lon: data.houses[3].longitude,  side: 0, top: false },
        ];
        angles_labels.forEach(({ label, lon, side, top }) => {
            const a = degToRad(lonToAngle(lon % 360, asc));
            const lx = cx + (R + 4) * Math.cos(a);
            const ly = cy + (R + 4) * Math.sin(a);
            ctx.font      = 'bold 10px Inter, sans-serif';
            ctx.fillStyle = '#C59E3F';
            ctx.textAlign = lx < cx ? 'right' : lx > cx ? 'left' : 'center';
            ctx.textBaseline = ly < cy ? 'bottom' : 'top';
            ctx.fillText(label, lx, ly);
        });
    }

    // ── Chart helpers ─────────────────────────────────────────
    function degToRad(d) { return d * Math.PI / 180; }

    // Convert ecliptic longitude to canvas angle (0° = right, CCW = increasing lon)
    // ASC is placed at left (180°), so canvas angle = 180 - (lon - asc)
    function lonToAngle(lon, asc) {
        return (180 - (lon - asc) % 360 + 360) % 360;
    }

    function angularMid(a, b) {
        let diff = ((b - a) % 360 + 360) % 360;
        return diff / 2;
    }

    function angleDiff(a, b) {
        let d = ((b - a) % 360 + 360) % 360;
        return d > 180 ? d - 360 : d;
    }

    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1,3),16);
        const g = parseInt(hex.slice(3,5),16);
        const b = parseInt(hex.slice(5,7),16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
    function toRoman(n) { return ROMAN[n - 1] || n; }
});
