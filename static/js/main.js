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

    // ── Reusable Custom Date Picker for Mobile ──────────────────
    const datePickerModal = document.getElementById('date-picker-modal');
    const datePickerOverlay = document.getElementById('date-picker-overlay');
    const datePickerCancel = document.getElementById('date-picker-cancel');
    const datePickerConfirm = document.getElementById('date-picker-confirm');
    const pickerDay = document.getElementById('picker-day');
    const pickerMonth = document.getElementById('picker-month');
    const pickerYear = document.getElementById('picker-year');

    const MONTHS_RU = [
        "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
        "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
    ];

    let activeDatePickerInput = null;

    function getDaysInMonth(monthIndex, year) {
        return new Date(year, monthIndex + 1, 0).getDate();
    }

    function initPickerColumns() {
        if (!pickerMonth || !pickerYear) return;
        // Month list
        let monthHtml = '<div class="custom-picker-spacer"></div>';
        MONTHS_RU.forEach((m, idx) => {
            monthHtml += `<div class="custom-picker-item" data-val="${idx}">${m}</div>`;
        });
        monthHtml += '<div class="custom-picker-spacer"></div>';
        pickerMonth.innerHTML = monthHtml;

        // Year list (from current year down to 1900)
        const currentYear = new Date().getFullYear();
        let yearHtml = '<div class="custom-picker-spacer"></div>';
        for (let y = currentYear; y >= 1900; y--) {
            yearHtml += `<div class="custom-picker-item" data-val="${y}">${y}</div>`;
        }
        yearHtml += '<div class="custom-picker-spacer"></div>';
        pickerYear.innerHTML = yearHtml;
    }

    function populateDaysColumn(daysCount) {
        if (!pickerDay) return;
        let dayHtml = '<div class="custom-picker-spacer"></div>';
        for (let d = 1; d <= daysCount; d++) {
            dayHtml += `<div class="custom-picker-item" data-val="${d}">${d}</div>`;
        }
        dayHtml += '<div class="custom-picker-spacer"></div>';
        pickerDay.innerHTML = dayHtml;
    }

    function getSelectedValue(columnEl) {
        if (!columnEl) return null;
        const scrollTop = columnEl.scrollTop;
        const index = Math.round(scrollTop / 36);
        const items = columnEl.querySelectorAll('.custom-picker-item');
        if (index >= 0 && index < items.length) {
            items.forEach((item, i) => {
                item.classList.toggle('active', i === index);
            });
            return parseInt(items[index].dataset.val, 10);
        }
        return null;
    }

    function scrollToValue(columnEl, val) {
        if (!columnEl) return;
        const items = columnEl.querySelectorAll('.custom-picker-item');
        let index = 0;
        for (let i = 0; i < items.length; i++) {
            if (parseInt(items[i].dataset.val, 10) === val) {
                index = i;
                break;
            }
        }
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
        columnEl.scrollTop = index * 36;
    }

    function setupDatePickerScrollListeners() {
        if (!pickerDay || !pickerMonth || !pickerYear) return;
        const onScroll = (e) => {
            getSelectedValue(e.target);
        };

        pickerDay.addEventListener('scroll', onScroll);
        pickerMonth.addEventListener('scroll', onScroll);
        pickerYear.addEventListener('scroll', onScroll);

        const onMonthOrYearScroll = () => {
            const mVal = getSelectedValue(pickerMonth);
            const yVal = getSelectedValue(pickerYear);
            if (mVal !== null && yVal !== null) {
                const daysCount = getDaysInMonth(mVal, yVal);
                const currentDayVal = getSelectedValue(pickerDay) || 1;
                
                const currentDaysInColumn = pickerDay.querySelectorAll('.custom-picker-item').length;
                if (currentDaysInColumn !== daysCount) {
                    populateDaysColumn(daysCount);
                    const targetDay = Math.min(currentDayVal, daysCount);
                    scrollToValue(pickerDay, targetDay);
                }
            }
        };

        let scrollTimeout = null;
        const handleMonthYearScrollStop = () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(onMonthOrYearScroll, 150);
        };

        pickerMonth.addEventListener('scroll', handleMonthYearScrollStop);
        pickerYear.addEventListener('scroll', handleMonthYearScrollStop);
    }

    function openCustomDatePicker(inputEl) {
        activeDatePickerInput = inputEl;
        
        let curDate = new Date();
        if (inputEl.value) {
            let parsedDate = null;
            if (inputEl.value.includes('.')) {
                // DD.MM.YYYY
                const parts = inputEl.value.split('.');
                if (parts.length === 3) {
                    parsedDate = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
                }
            } else if (inputEl.value.includes('-')) {
                // YYYY-MM-DD
                const parts = inputEl.value.split('-');
                if (parts.length === 3) {
                    parsedDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                }
            }
            if (parsedDate && !isNaN(parsedDate.getTime())) {
                curDate = parsedDate;
            }
        }

        const currentDay = curDate.getDate();
        const currentMonth = curDate.getMonth();
        const currentYear = curDate.getFullYear();

        const daysCount = getDaysInMonth(currentMonth, currentYear);
        populateDaysColumn(daysCount);

        datePickerModal.classList.remove('hidden');

        setTimeout(() => {
            scrollToValue(pickerYear, currentYear);
            scrollToValue(pickerMonth, currentMonth);
            scrollToValue(pickerDay, currentDay);
        }, 50);
    }

    function closeCustomDatePicker() {
        datePickerModal.classList.add('hidden');
        activeDatePickerInput = null;
    }

    if (datePickerCancel) datePickerCancel.addEventListener('click', closeCustomDatePicker);
    if (datePickerOverlay) datePickerOverlay.addEventListener('click', closeCustomDatePicker);

    if (datePickerConfirm) {
        datePickerConfirm.addEventListener('click', () => {
            if (!activeDatePickerInput) return;
            const day = getSelectedValue(pickerDay);
            const month = getSelectedValue(pickerMonth);
            const year = getSelectedValue(pickerYear);

            if (day !== null && month !== null && year !== null) {
                // On mobile, store as DD.MM.YYYY format visually
                const formatted = `${String(day).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}.${year}`;
                activeDatePickerInput.value = formatted;
                activeDatePickerInput.dispatchEvent(new Event('change'));
                activeDatePickerInput.dispatchEvent(new Event('input'));
            }
            closeCustomDatePicker();
        });
    }

    function setupCustomDatePickerForInput(inputEl) {
        if (!inputEl) return;
        if (isMobile()) {
            if (inputEl.type === 'date') {
                let val = inputEl.value;
                inputEl.type = 'text';
                if (val && val.includes('-')) {
                    const parts = val.split('-');
                    if (parts.length === 3) {
                        inputEl.value = `${parts[2]}.${parts[1]}.${parts[0]}`;
                    }
                }
            }
            inputEl.setAttribute('readonly', 'true');
            if (!inputEl.dataset.pickerInitialized) {
                inputEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openCustomDatePicker(inputEl);
                });
                inputEl.dataset.pickerInitialized = 'true';
            }
        } else {
            if (inputEl.type === 'text') {
                let val = inputEl.value;
                inputEl.type = 'date';
                if (val && val.includes('.')) {
                    const parts = val.split('.');
                    if (parts.length === 3) {
                        inputEl.value = `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                }
            }
            inputEl.removeAttribute('readonly');
        }
    }

    // Initialize columns once
    initPickerColumns();
    setupDatePickerScrollListeners();

    // ── Reusable Custom Time Picker for Mobile ──────────────────
    const timePickerModal = document.getElementById('time-picker-modal');
    const timePickerOverlay = document.getElementById('time-picker-overlay');
    const timePickerCancel = document.getElementById('time-picker-cancel');
    const timePickerConfirm = document.getElementById('time-picker-confirm');
    const pickerHour = document.getElementById('picker-hour');
    const pickerMinute = document.getElementById('picker-minute');
    const pickerSecond = document.getElementById('picker-second');

    let activeTimePickerInput = null;

    function initTimePickerColumns() {
        if (!pickerHour || !pickerMinute || !pickerSecond) return;

        // Hour list (00 to 23)
        let hourHtml = '<div class="custom-picker-spacer"></div>';
        for (let h = 0; h < 24; h++) {
            const displayVal = String(h).padStart(2, '0');
            hourHtml += `<div class="custom-picker-item" data-val="${h}">${displayVal}</div>`;
        }
        hourHtml += '<div class="custom-picker-spacer"></div>';
        pickerHour.innerHTML = hourHtml;

        // Minute list (00 to 59)
        let minuteHtml = '<div class="custom-picker-spacer"></div>';
        for (let m = 0; m < 60; m++) {
            const displayVal = String(m).padStart(2, '0');
            minuteHtml += `<div class="custom-picker-item" data-val="${m}">${displayVal}</div>`;
        }
        minuteHtml += '<div class="custom-picker-spacer"></div>';
        pickerMinute.innerHTML = minuteHtml;

        // Second list (00 to 59)
        let secondHtml = '<div class="custom-picker-spacer"></div>';
        for (let s = 0; s < 60; s++) {
            const displayVal = String(s).padStart(2, '0');
            secondHtml += `<div class="custom-picker-item" data-val="${s}">${displayVal}</div>`;
        }
        secondHtml += '<div class="custom-picker-spacer"></div>';
        pickerSecond.innerHTML = secondHtml;
    }

    function setupTimePickerScrollListeners() {
        if (!pickerHour || !pickerMinute || !pickerSecond) return;
        const onScroll = (e) => {
            getSelectedValue(e.target);
        };

        pickerHour.addEventListener('scroll', onScroll);
        pickerMinute.addEventListener('scroll', onScroll);
        pickerSecond.addEventListener('scroll', onScroll);
    }

    function openCustomTimePicker(inputEl) {
        activeTimePickerInput = inputEl;
        
        let curHour = 12;
        let curMinute = 0;
        let curSecond = 0;

        if (inputEl.value) {
            const parts = inputEl.value.split(':');
            if (parts.length >= 2) {
                curHour = parseInt(parts[0], 10);
                curMinute = parseInt(parts[1], 10);
                if (parts.length >= 3) {
                    curSecond = parseInt(parts[2], 10);
                }
            }
        }

        timePickerModal.classList.remove('hidden');

        setTimeout(() => {
            scrollToValue(pickerHour, curHour);
            scrollToValue(pickerMinute, curMinute);
            scrollToValue(pickerSecond, curSecond);
        }, 50);
    }

    function closeCustomTimePicker() {
        timePickerModal.classList.add('hidden');
        activeTimePickerInput = null;
    }

    if (timePickerCancel) timePickerCancel.addEventListener('click', closeCustomTimePicker);
    if (timePickerOverlay) timePickerOverlay.addEventListener('click', closeCustomTimePicker);

    if (timePickerConfirm) {
        timePickerConfirm.addEventListener('click', () => {
            if (!activeTimePickerInput) return;
            const hour = getSelectedValue(pickerHour);
            const minute = getSelectedValue(pickerMinute);
            const second = getSelectedValue(pickerSecond);

            if (hour !== null && minute !== null && second !== null) {
                const formatted = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
                activeTimePickerInput.value = formatted;
                activeTimePickerInput.dispatchEvent(new Event('change'));
                activeTimePickerInput.dispatchEvent(new Event('input'));
            }
            closeCustomTimePicker();
        });
    }

    function setupCustomTimePickerForInput(inputEl) {
        if (!inputEl) return;
        if (isMobile()) {
            if (inputEl.type === 'time') {
                inputEl.type = 'text';
            }
            inputEl.setAttribute('readonly', 'true');
            if (!inputEl.dataset.timePickerInitialized) {
                inputEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    openCustomTimePicker(inputEl);
                });
                inputEl.dataset.timePickerInitialized = 'true';
            }
        } else {
            if (inputEl.type === 'text') {
                inputEl.type = 'time';
            }
            inputEl.removeAttribute('readonly');
        }
    }

    // Initialize columns
    initTimePickerColumns();
    setupTimePickerScrollListeners();

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
        setupCustomDatePickerForInput(birthDateEl);
        setupCustomDatePickerForInput(document.getElementById('p1_birth_date'));
        setupCustomDatePickerForInput(document.getElementById('p2_birth_date'));
        setupCustomTimePickerForInput(birthTimeEl);
        setupCustomTimePickerForInput(document.getElementById('p1_birth_time'));
        setupCustomTimePickerForInput(document.getElementById('p2_birth_time'));
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => { if (lastChart) drawChart(lastChart, canvas); }, 300);
    });

    initSidebarToggle();
    
    // Bind date and time pickers for primary inputs
    setupCustomDatePickerForInput(birthDateEl);
    setupCustomTimePickerForInput(birthTimeEl);

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

    // ── House system picker toggle ────────────────────────────
    const houseSystemSelect = document.getElementById('house_system');
    const cuspOffsetGroup   = document.getElementById('cusp-offset-group');
    const placidusPolarOptions = document.getElementById('placidus-polar-options');
    const usePolarEqualCheckbox = document.getElementById('use_polar_equal');
    const polarBoundaryGroup = document.getElementById('polar-boundary-group');

    if (houseSystemSelect && cuspOffsetGroup && placidusPolarOptions) {
        houseSystemSelect.addEventListener('change', () => {
            const isEqualMC = houseSystemSelect.value === 'D';
            cuspOffsetGroup.classList.toggle('hidden', !isEqualMC);
            placidusPolarOptions.classList.toggle('hidden', isEqualMC);
        });
    }

    if (usePolarEqualCheckbox && polarBoundaryGroup) {
        usePolarEqualCheckbox.addEventListener('change', () => {
            polarBoundaryGroup.classList.toggle('hidden', !usePolarEqualCheckbox.checked);
        });
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
        if (!lastChart) return;
        window.print();
    });

    // Option: Download PDF (via print dialog with PDF save)
    document.getElementById('export-pdf').addEventListener('click', () => {
        exportDropdown.classList.remove('open');
        btnExport.setAttribute('aria-expanded', 'false');
        if (!lastChart) return;
        // Use print with a toast guide
        showToast('Выберите «Сохранить как PDF» в диалоге печати');
        setTimeout(() => window.print(), 400);
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

        let birth_date = birthDateEl.value;
        if (birth_date && birth_date.includes('.')) {
            const parts = birth_date.split('.');
            if (parts.length === 3) {
                birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
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
                    house_system: houseSystemSelect.value,
                    cusp_offset: parseFloat(document.getElementById('cusp_offset').value) || 0.0,
                    use_polar_equal: usePolarEqualCheckbox ? usePolarEqualCheckbox.checked : false,
                    polar_boundary: parseFloat(document.getElementById('polar_boundary').value) || 62.0,
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

        // Interpretations tab
        renderInterpretations(data);

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

        const printHouseSystemLabel = document.getElementById('print-house-system-label');
        if (printHouseSystemLabel) {
            if (meta.calculated_house_system === 'E') {
                printHouseSystemLabel.textContent = meta.use_polar_equal 
                    ? `Равнодомная (заполярная шир. > ${meta.polar_boundary || 62}°)`
                    : 'Равнодомная';
            } else if (meta.calculated_house_system === 'O') {
                printHouseSystemLabel.textContent = 'Порфирий';
            } else if (meta.house_system === 'D') {
                const offset = meta.cusp_offset || 0;
                printHouseSystemLabel.textContent = 'Равнодомная от МС' + (offset !== 0 ? ` (${offset > 0 ? '+' : ''}${offset}°)` : '');
            } else {
                printHouseSystemLabel.textContent = 'Placidus';
            }
        }

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

        // Draw print chart (sized to 220px to match CSS)
        const printCanvas = document.getElementById('print-chart-canvas');
        if (printCanvas) {
            printCanvas.width  = 220 * 2;   // @2x for sharpness
            printCanvas.height = 220 * 2;
            printCanvas.style.width  = '220px';
            printCanvas.style.height = '220px';
            drawChartFixed(data, printCanvas, 220);
        }

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

        // Populate print interpretations (page 2)
        populatePrintInterpretations(data);
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
        'Истинный Северный Узел':{ sym: '☊', cls: 'glyph-node' },
        'Истинный Южный Узел':   { sym: '☋', cls: 'glyph-node' },
        'Средний Северный Узел':{ sym: '☊', cls: 'glyph-node' },
        'Средний Южный Узел':   { sym: '☋', cls: 'glyph-node' },
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
        let normalized = lon;
        if (normalized < 0 || normalized >= 360) {
            normalized = (normalized % 360 + 360) % 360;
        }
        let d = Math.floor(normalized);
        let mf = (normalized - d) * 60.0;
        let m = Math.floor(mf);
        let sf = (mf - m) * 60.0;
        let s = Math.floor(sf);

        if (s >= 60) {
            s = 0;
            m += 1;
        }
        if (m >= 60) {
            m = 0;
            d += 1;
        }
        if (d >= 360) {
            d = 0;
        }

        const fmt1 = `${d}° ${String(m).padStart(2, '0')}' ${String(s).padStart(2, '0')}"`;

        // Format 2: Decimal representation, truncated to 5 decimal places
        const parts = normalized.toFixed(10).split('.');
        let integerPart = parts[0];
        if (integerPart === '360') {
            integerPart = '0';
        }
        const fractionalPart = parts[1].substring(0, 5);
        const fmt2 = `${integerPart},${fractionalPart}`;

        return `${fmt1}<br><span class="lon-dec" style="display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px;">${fmt2}</span>`;
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
            { 
                label: 'Система домов',        
                value: meta.calculated_house_system === 'E'
                    ? (meta.use_polar_equal 
                        ? `Равнодомная (заполярная шир. > ${meta.polar_boundary || 62}°)`
                        : 'Равнодомная (запасной вариант)')
                    : (meta.calculated_house_system === 'O'
                        ? 'Порфирий (запасной вариант)'
                        : (meta.house_system === 'D' 
                            ? `Равнодомная от МС${meta.cusp_offset !== 0 ? ` (${meta.cusp_offset > 0 ? '+' : ''}${meta.cusp_offset}°)` : ''}`
                            : 'Плацидус'))
            },
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

    // ── Interpretations tab ───────────────────────────────────
    function renderInterpretations(data) {
        const planetsGrid = document.getElementById('interpretations-planets-grid');
        const housesGrid  = document.getElementById('interpretations-houses-grid');
        if (!planetsGrid || !housesGrid) return;

        planetsGrid.innerHTML = '';
        housesGrid.innerHTML  = '';

        // Render Planets Interpretations
        data.planets.forEach(p => {
            const meta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
            const sm   = signMeta(p.formatted.sign);
            const card = document.createElement('div');
            card.className = 'interpretation-card';
            card.innerHTML = `
                <div class="interpretation-card-header">
                    <div class="interpretation-card-glyph ${meta.cls}">${meta.sym}</div>
                    <span class="interpretation-card-title">${p.name} в знаке ${sm.name}</span>
                </div>
                <div class="interpretation-card-text">
                    ${p.interpretation || 'Влияние планеты в данном положении.'}
                </div>
            `;
            planetsGrid.appendChild(card);
        });

        // Render Houses Interpretations
        data.houses.forEach(h => {
            const sm = signMeta(h.formatted.sign);
            const card = document.createElement('div');
            card.className = 'interpretation-card';
            
            // Format name nicely (e.g. I (ASC), X (MC))
            let dispName = toRoman(parseInt(h.name) || h.name);
            if (h.name == '1') dispName = 'Асцендент (I дом)';
            else if (h.name == '7') dispName = 'Десцендент (VII дом)';
            else if (h.name == '10') dispName = 'Середина Неба (X дом)';
            else if (h.name == '4') dispName = 'Надир (IV дом)';
            else dispName = `Дом ${dispName}`;

            const zodiacIndex = ZODIAC_META.findIndex(z => z.name === sm.name);
            const zColor = ZODIAC_COLORS[zodiacIndex >= 0 ? zodiacIndex : 0] || '#5E52B0';

            card.innerHTML = `
                <div class="interpretation-card-header">
                    <div class="interpretation-card-glyph" style="color: ${zColor}; font-weight: bold;">${sm.sym}</div>
                    <span class="interpretation-card-title">${dispName} в знаке ${sm.name}</span>
                </div>
                <div class="interpretation-card-text">
                    ${h.interpretation || 'Влияние куспида в данном положении.'}
                </div>
            `;
            housesGrid.appendChild(card);
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
        'Истинный Северный Узел':'#3F6E10',
        'Истинный Южный Узел':   '#3F6E10',
        'Средний Северный Узел':'#3F6E10',
        'Средний Южный Узел':   '#3F6E10',
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

    // ── Draw chart at a fixed size (for print canvas) ─────────
    function drawChartFixed(data, canvasEl, displayW) {
        if (!canvasEl) return;
        const scale = 2; // @2x retina
        canvasEl.width  = displayW * scale;
        canvasEl.height = displayW * scale;
        canvasEl.style.width  = displayW + 'px';
        canvasEl.style.height = displayW + 'px';

        const ctx = canvasEl.getContext('2d');
        ctx.setTransform(scale, 0, 0, scale, 0, 0);

        const size = displayW;
        const cx = size / 2;
        const cy = size / 2;
        const R  = size / 2 - 4;
        const r1 = R * 0.82;
        const r2 = R * 0.72;
        const r3 = R * 0.60;
        const r4 = R * 0.20;

        ctx.clearRect(0, 0, size, size);
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

        // Zodiac ring
        for (let i = 0; i < 12; i++) {
            const sA = degToRad(i * 30 - 90);
            const eA = degToRad((i + 1) * 30 - 90);
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, sA, eA); ctx.closePath();
            ctx.fillStyle = hexToRgba(ZODIAC_COLORS[i], 0.04); ctx.fill();
            ctx.strokeStyle = 'rgba(197,158,63,0.15)'; ctx.lineWidth = 0.8; ctx.stroke();
            const mA = degToRad(i * 30 + 15 - 90);
            const gx = cx + (R * 0.91) * Math.cos(mA);
            const gy = cy + (R * 0.91) * Math.sin(mA);
            ctx.font = 'bold 10px serif'; ctx.fillStyle = ZODIAC_COLORS[i];
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(ZODIAC_META[i].sym, gx, gy);
        }
        ctx.beginPath(); ctx.arc(cx, cy, R,  0, Math.PI*2); ctx.strokeStyle='rgba(197,158,63,0.35)'; ctx.lineWidth=1.2; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI*2); ctx.strokeStyle='rgba(197,158,63,0.15)'; ctx.lineWidth=0.8; ctx.stroke();

        const asc = data.houses[0].longitude;

        // House lines
        for (let i = 0; i < 12; i++) {
            const angle = degToRad(lonToAngle(data.houses[i].longitude, asc));
            const x1 = cx + r2 * Math.cos(angle), y1 = cy + r2 * Math.sin(angle);
            const x2 = cx + r3 * Math.cos(angle), y2 = cy + r3 * Math.sin(angle);
            ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
            ctx.strokeStyle = 'rgba(94,82,176,0.25)'; ctx.lineWidth = 0.8; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle));
            ctx.strokeStyle = 'rgba(197,158,63,0.08)'; ctx.lineWidth = 0.5; ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2); ctx.strokeStyle='rgba(197,158,63,0.2)'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r3, 0, Math.PI*2); ctx.strokeStyle='rgba(197,158,63,0.15)'; ctx.lineWidth=0.8; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r4, 0, Math.PI*2);
        ctx.fillStyle='rgba(250,248,245,0.95)'; ctx.fill();
        ctx.strokeStyle='rgba(197,158,63,0.25)'; ctx.lineWidth=0.8; ctx.stroke();

        // Aspects
        const ASPECTS = [
            { deg: 0,   orb: 8, color: 'rgba(197,158,63,0.5)',  dash: [] },
            { deg: 120, orb: 6, color: 'rgba(94,82,176,0.45)',  dash: [] },
            { deg: 90,  orb: 6, color: 'rgba(204,89,63,0.45)',  dash: [3,2] },
            { deg: 180, orb: 6, color: 'rgba(165,120,69,0.45)', dash: [] },
            { deg: 60,  orb: 5, color: 'rgba(94,82,176,0.25)',  dash: [2,3] },
        ];
        for (let i = 0; i < data.planets.length; i++) {
            for (let j = i + 1; j < data.planets.length; j++) {
                const diff = Math.abs(angleDiff(data.planets[i].longitude, data.planets[j].longitude));
                for (const asp of ASPECTS) {
                    if (Math.abs(diff - asp.deg) <= asp.orb || (asp.deg > 0 && Math.abs(360 - diff - asp.deg) <= asp.orb)) {
                        const a1 = degToRad(lonToAngle(data.planets[i].longitude, asc));
                        const a2 = degToRad(lonToAngle(data.planets[j].longitude, asc));
                        ctx.beginPath();
                        ctx.moveTo(cx + r3 * Math.cos(a1), cy + r3 * Math.sin(a1));
                        ctx.lineTo(cx + r3 * Math.cos(a2), cy + r3 * Math.sin(a2));
                        ctx.setLineDash(asp.dash); ctx.strokeStyle = asp.color; ctx.lineWidth = 0.6; ctx.stroke();
                        ctx.setLineDash([]);
                        break;
                    }
                }
            }
        }

        // Planets
        const placed = [];
        data.planets.forEach(p => {
            const meta = PLANET_META[p.name] || { sym: p.symbol || '?', cls: 'glyph-node' };
            let angle = degToRad(lonToAngle(p.longitude, asc));
            const r_dot = (r3 + r2) / 2;
            const dx = cx + r_dot * Math.cos(angle);
            const dy = cy + r_dot * Math.sin(angle);
            let pr = r3 * 0.7;
            let px = cx + pr * Math.cos(angle);
            let py = cy + pr * Math.sin(angle);
            // Simple overlap avoidance
            let tries = 0;
            while (placed.some(q => Math.hypot(q.x - px, q.y - py) < 10) && tries < 8) {
                angle += degToRad(5); px = cx + pr * Math.cos(angle); py = cy + pr * Math.sin(angle); tries++;
            }
            placed.push({ x: px, y: py });
            ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(px, py);
            ctx.strokeStyle = 'rgba(197,158,63,0.2)'; ctx.lineWidth = 0.5; ctx.stroke();
            ctx.font = '11px serif'; ctx.fillStyle = PLANET_COLORS[p.name] || '#2E2A20';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(meta.sym, px, py);
            if (p.is_retrograde) {
                ctx.font = 'bold 7px Inter,sans-serif'; ctx.fillStyle = '#E06D53';
                ctx.fillText('R', px + 7, py - 5);
            }
        });

        // Angle labels
        [
            { label: 'ASC', lon: asc },
            { label: 'DSC', lon: asc + 180 },
            { label: 'MC',  lon: data.houses[9].longitude },
            { label: 'IC',  lon: data.houses[3].longitude },
        ].forEach(({ label, lon }) => {
            const a = degToRad(lonToAngle(lon % 360, asc));
            const lx = cx + (R + 3) * Math.cos(a);
            const ly = cy + (R + 3) * Math.sin(a);
            ctx.font = 'bold 8px Inter,sans-serif'; ctx.fillStyle = '#C59E3F';
            ctx.textAlign = lx < cx ? 'right' : lx > cx ? 'left' : 'center';
            ctx.textBaseline = ly < cy ? 'bottom' : 'top';
            ctx.fillText(label, lx, ly);
        });
    }

    // ── Populate print interpretations (PDF page 2) ───────────
    function populatePrintInterpretations(data) {
        const planetsGrid = document.getElementById('print-interp-planets-grid');
        const housesGrid  = document.getElementById('print-interp-houses-grid');
        const p2ts        = document.getElementById('print-date-timestamp-p2');

        // Sync timestamp
        const ts1 = document.getElementById('print-date-timestamp');
        if (p2ts && ts1) p2ts.textContent = ts1.textContent;

        if (planetsGrid) {
            planetsGrid.innerHTML = '';
            data.planets.forEach(p => {
                const meta = PLANET_META[p.name] || { sym: p.symbol || '?', cls: 'glyph-node' };
                const sm   = signMeta(p.formatted.sign);
                const retroNote = p.is_retrograde ? ' <span style="color:#E06D53;font-weight:700;">(R)</span>' : '';
                const card = document.createElement('div');
                card.className = 'print-interp-card';
                card.innerHTML = `
                    <div class="print-interp-card-header">
                        <span class="print-interp-glyph" style="color:${PLANET_COLORS[p.name]||'#5E52B0'}">${meta.sym}</span>
                        <span class="print-interp-title">${p.name} в знаке ${sm.name}${retroNote}</span>
                    </div>
                    <p class="print-interp-text">${p.interpretation || 'Влияние планеты в данном положении.'}</p>
                `;
                planetsGrid.appendChild(card);
            });
        }

        if (housesGrid) {
            housesGrid.innerHTML = '';
            data.houses.forEach(h => {
                const sm = signMeta(h.formatted.sign);
                let dispName = toRoman(parseInt(h.name) || h.name);
                if (h.name == '1') dispName = 'Асцендент (I дом)';
                else if (h.name == '7') dispName = 'Десцендент (VII дом)';
                else if (h.name == '10') dispName = 'Середина Неба (X дом)';
                else if (h.name == '4') dispName = 'Надир (IV дом)';
                else dispName = `Дом ${dispName}`;

                const zodiacIndex = ZODIAC_META.findIndex(z => z.name === sm.name);
                const zColor = ZODIAC_COLORS[zodiacIndex >= 0 ? zodiacIndex : 0] || '#5E52B0';

                const card = document.createElement('div');
                card.className = 'print-interp-card';
                card.innerHTML = `
                    <div class="print-interp-card-header">
                        <span class="print-interp-glyph" style="color:${zColor}">${sm.sym}</span>
                        <span class="print-interp-title">${dispName} в знаке ${sm.name}</span>
                    </div>
                    <p class="print-interp-text">${h.interpretation || 'Влияние куспида в данном положении.'}</p>
                `;
                housesGrid.appendChild(card);
            });
        }
    }

    // ============================================================
    // COMPATIBILITY MODULE IMPLEMENTATION
    // ============================================================

    // Reusable city autocomplete helper
    function initCityAutocomplete(inputId, latId, lonId, clearId, spinnerId, suggestionsId) {
        const cityInput = document.getElementById(inputId);
        const latHidden = document.getElementById(latId);
        const lonHidden = document.getElementById(lonId);
        const cityClear = document.getElementById(clearId);
        const searchSpinner = document.getElementById(spinnerId);
        const suggestions = document.getElementById(suggestionsId);

        let debounce;
        let activeIdx = -1;
        let selectedCity = null;

        cityClear.addEventListener('click', () => {
            cityInput.value = '';
            latHidden.value = '';
            lonHidden.value = '';
            selectedCity = null;
            cityClear.classList.add('hidden');
            closeSuggestions();
            cityInput.focus();
        });

        cityInput.addEventListener('input', () => {
            const q = cityInput.value.trim();
            cityClear.classList.toggle('hidden', !q);
            clearTimeout(debounce);
            if (q.length < 2) { closeSuggestions(); return; }
            
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
                const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                icon.setAttribute('width', '14'); icon.setAttribute('height', '14');
                icon.setAttribute('viewBox', '0 0 16 16'); icon.setAttribute('fill', 'none');
                icon.classList.add('sug-icon');
                icon.innerHTML = `<path d="M8 1a5 5 0 0 1 5 5c0 3.5-5 9-5 9S3 9.5 3 6a5 5 0 0 1 5-5z" stroke="#D4AF37" stroke-width="1.3"/><circle cx="8" cy="6" r="1.8" stroke="#D4AF37" stroke-width="1.3"/>`;

                const body = document.createElement('div');
                body.className = 'sug-body';
                const parts = item.display_name.split(',');
                const primary = parts.slice(0, 2).join(',').trim();
                const sub = parts.slice(2).join(',').trim();

                const nameEl = document.createElement('span');
                nameEl.className = 'sug-name';
                nameEl.textContent = primary;

                const subEl = document.createElement('span');
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

        // Arrow navigation
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
    }

    // DOM References for Compatibility
    const navModeNatal = document.getElementById('nav-mode-natal');
    const navModeCompat = document.getElementById('nav-mode-compat');
    const sidebar = document.querySelector('.sidebar');
    const mainPanel = document.querySelector('.main-panel');
    const compatLayout = document.getElementById('compat-layout');

    const typeZodiacBtn = document.getElementById('type-zodiac-btn');
    const typeSynastryBtn = document.getElementById('type-synastry-btn');
    const zodiacInputCard = document.getElementById('zodiac-input-card');
    const synastryInputCard = document.getElementById('synastry-input-card');

    const compatInputView = document.getElementById('compat-input-view');
    const compatResultView = document.getElementById('compat-result-view');
    const btnCompatBack = document.getElementById('btn-compat-back');
    const btnCompatExport = document.getElementById('btn-compat-export');

    let currentCompatType = 'zodiac';

    // Initialize Autocompletes
    initCityAutocomplete('p1_city', 'p1_lat', 'p1_lon', 'p1-city-clear', 'p1-search-spinner', 'p1_suggestions');
    initCityAutocomplete('p2_city', 'p2_lat', 'p2_lon', 'p2-city-clear', 'p2-search-spinner', 'p2_suggestions');

    // GMT toggles for partners
    let p1IsGmt = false;
    const p1IsGmtHidden = document.getElementById('p1_is_gmt');
    const p1RadioLocalDot = document.getElementById('p1-radio-local-dot');
    const p1RadioGmtDot = document.getElementById('p1-radio-gmt-dot');
    
    document.getElementById('p1-radio-local').addEventListener('click', () => setP1Gmt(false));
    document.getElementById('p1-radio-gmt').addEventListener('click', () => setP1Gmt(true));
    
    function setP1Gmt(val) {
        p1IsGmt = val;
        p1IsGmtHidden.value = val ? '1' : '0';
        p1RadioLocalDot.classList.toggle('active', !val);
        p1RadioGmtDot.classList.toggle('active', val);
    }

    let p2IsGmt = false;
    const p2IsGmtHidden = document.getElementById('p2_is_gmt');
    const p2RadioLocalDot = document.getElementById('p2-radio-local-dot');
    const p2RadioGmtDot = document.getElementById('p2-radio-gmt-dot');
    
    document.getElementById('p2-radio-local').addEventListener('click', () => setP2Gmt(false));
    document.getElementById('p2-radio-gmt').addEventListener('click', () => setP2Gmt(true));
    
    function setP2Gmt(val) {
        p2IsGmt = val;
        p2IsGmtHidden.value = val ? '1' : '0';
        p2RadioLocalDot.classList.toggle('active', !val);
        p2RadioGmtDot.classList.toggle('active', val);
    }

    // Set default dates for partners
    const p1BirthDateEl = document.getElementById('p1_birth_date');
    const p2BirthDateEl = document.getElementById('p2_birth_date');
    p1BirthDateEl.value = new Date().toLocaleDateString('en-CA');
    p2BirthDateEl.value = new Date().toLocaleDateString('en-CA');
    setupCustomDatePickerForInput(p1BirthDateEl);
    setupCustomDatePickerForInput(p2BirthDateEl);

    // Mode navigation
    navModeNatal.addEventListener('click', () => {
        navModeNatal.classList.add('active');
        navModeCompat.classList.remove('active');
        sidebar.classList.remove('hidden');
        mainPanel.classList.remove('hidden');
        compatLayout.classList.add('hidden');
        if (lastChart) {
            resultsPanel.classList.remove('hidden');
            placeholderState.classList.add('hidden');
        } else {
            placeholderState.classList.remove('hidden');
            resultsPanel.classList.add('hidden');
        }
    });

    navModeCompat.addEventListener('click', () => {
        navModeCompat.classList.add('active');
        navModeNatal.classList.remove('active');
        sidebar.classList.add('hidden');
        mainPanel.classList.add('hidden');
        compatLayout.classList.remove('hidden');
        if (isMobile()) {
            sidebarCollapsible.classList.add('collapsed');
            sidebarToggle.classList.add('collapsed');
        }
    });

    // Compatibility sub-type switching
    typeZodiacBtn.addEventListener('click', () => {
        currentCompatType = 'zodiac';
        typeZodiacBtn.classList.add('active');
        typeSynastryBtn.classList.remove('active');
        zodiacInputCard.classList.remove('hidden');
        synastryInputCard.classList.add('hidden');
    });

    typeSynastryBtn.addEventListener('click', () => {
        currentCompatType = 'synastry';
        typeSynastryBtn.classList.add('active');
        typeZodiacBtn.classList.remove('active');
        synastryInputCard.classList.remove('hidden');
        zodiacInputCard.classList.add('hidden');
    });

    // Back to inputs button
    btnCompatBack.addEventListener('click', () => {
        compatInputView.classList.remove('hidden');
        compatResultView.classList.add('hidden');
    });

    // Zodiac calculate button click
    const btnCalcZodiac = document.getElementById('btn-calculate-zodiac');
    const zodiacP1Select = document.getElementById('zodiac-p1');
    const zodiacP2Select = document.getElementById('zodiac-p2');

    btnCalcZodiac.addEventListener('click', async () => {
        const sign1 = zodiacP1Select.value;
        const sign2 = zodiacP2Select.value;
        
        try {
            const res = await fetch(`/api/zodiac_compatibility?sign1=${encodeURIComponent(sign1)}&sign2=${encodeURIComponent(sign2)}`);
            const data = await res.json();
            if (data.error) {
                showToast(data.error);
                return;
            }
            renderCompatResults(data, 'zodiac', sign1, sign2);
        } catch (err) {
            showToast("Ошибка при расчете совместимости");
        }
    });

    // Synastry submit form
    const synastryForm = document.getElementById('synastry-form');
    const btnSubmitSynastry = document.getElementById('btn-submit-synastry');
    const btnSpinnerSynastry = document.getElementById('btn-spinner-synastry');

    synastryForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let p1_birth_date = document.getElementById('p1_birth_date').value;
        if (p1_birth_date && p1_birth_date.includes('.')) {
            const parts = p1_birth_date.split('.');
            if (parts.length === 3) {
                p1_birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        const p1_birth_time = document.getElementById('p1_birth_time').value;
        const p1_lat = document.getElementById('p1_lat').value;
        const p1_lon = document.getElementById('p1_lon').value;
        const p1_city = document.getElementById('p1_city').value;
        
        let p2_birth_date = document.getElementById('p2_birth_date').value;
        if (p2_birth_date && p2_birth_date.includes('.')) {
            const parts = p2_birth_date.split('.');
            if (parts.length === 3) {
                p2_birth_date = `${parts[2]}-${parts[1]}-${parts[0]}`;
            }
        }
        const p2_birth_time = document.getElementById('p2_birth_time').value;
        const p2_lat = document.getElementById('p2_lat').value;
        const p2_lon = document.getElementById('p2_lon').value;
        const p2_city = document.getElementById('p2_city').value;
        
        if (!p1_birth_date || !p1_birth_time || !p1_lat || !p1_lon) {
            showToast("Укажите полные данные Партнёра 1 (включая город)");
            return;
        }
        if (!p2_birth_date || !p2_birth_time || !p2_lat || !p2_lon) {
            showToast("Укажите полные данные Партнёра 2 (включая город)");
            return;
        }
        
        btnSubmitSynastry.disabled = true;
        btnSpinnerSynastry.classList.remove('hidden');
        
        const payload = {
            p1: {
                birth_date: p1_birth_date,
                birth_time: p1_birth_time,
                lat: p1_lat,
                lon: p1_lon,
                is_gmt: p1IsGmt,
                house_system: houseSystemSelect.value,
                cusp_offset: parseFloat(document.getElementById('cusp_offset').value) || 0.0,
                use_polar_equal: usePolarEqualCheckbox ? usePolarEqualCheckbox.checked : false,
                polar_boundary: parseFloat(document.getElementById('polar_boundary').value) || 62.0
            },
            p2: {
                birth_date: p2_birth_date,
                birth_time: p2_birth_time,
                lat: p2_lat,
                lon: p2_lon,
                is_gmt: p2IsGmt,
                house_system: houseSystemSelect.value,
                cusp_offset: parseFloat(document.getElementById('cusp_offset').value) || 0.0,
                use_polar_equal: usePolarEqualCheckbox ? usePolarEqualCheckbox.checked : false,
                polar_boundary: parseFloat(document.getElementById('polar_boundary').value) || 62.0
            }
        };
        
        try {
            const res = await fetch('/api/synastry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.error) {
                showToast(data.error);
                return;
            }
            
            // Inject cities display names into data for print report
            data.p1_city_name = p1_city;
            data.p2_city_name = p2_city;
            
            renderCompatResults(data, 'synastry');
        } catch (err) {
            showToast("Ошибка при расчете синастрии");
        } finally {
            btnSubmitSynastry.disabled = false;
            btnSpinnerSynastry.classList.add('hidden');
        }
    });

    // Helper functions for elements matching
    function getElementClass(sign) {
        const fire = ["Овен", "Лев", "Стрелец"];
        const earth = ["Телец", "Дева", "Козерог"];
        const air = ["Близнецы", "Весы", "Водолей"];
        const water = ["Рак", "Скорпион", "Рыбы"];
        
        if (fire.includes(sign)) return "el-fire";
        if (earth.includes(sign)) return "el-earth";
        if (air.includes(sign)) return "el-air";
        if (water.includes(sign)) return "el-water";
        return "el-earth";
    }

    function getElementRu(sign) {
        const fire = ["Овен", "Лев", "Стрелец"];
        const earth = ["Телец", "Дева", "Козерог"];
        const air = ["Близнецы", "Весы", "Водолей"];
        const water = ["Рак", "Скорпион", "Рыбы"];
        
        if (fire.includes(sign)) return "Огонь";
        if (earth.includes(sign)) return "Земля";
        if (air.includes(sign)) return "Воздух";
        if (water.includes(sign)) return "Вода";
        return "Земля";
    }

    // Animation utilities
    function animateScore(scoreElementId, circleBarId, targetScore) {
        const scoreEl = document.getElementById(scoreElementId);
        const circleBar = document.getElementById(circleBarId);
        
        const r = 56;
        const circ = 2 * Math.PI * r;
        const offsetVal = circ - (circ * targetScore / 100);
        
        if (circleBar) {
            circleBar.style.strokeDasharray = circ;
            circleBar.style.strokeDashoffset = circ;
            circleBar.getBoundingClientRect(); // Reflow
            circleBar.style.strokeDashoffset = offsetVal;
        }
        
        let cur = 0;
        const step = () => {
            if (cur < targetScore) {
                cur += Math.ceil((targetScore - cur) / 10) || 1;
                scoreEl.textContent = cur + '%';
                requestAnimationFrame(step);
            } else {
                scoreEl.textContent = targetScore + '%';
            }
        };
        requestAnimationFrame(step);
    }

    function animateProgressBar(barId, scoreValId, targetScore) {
        const bar = document.getElementById(barId);
        const valEl = document.getElementById(scoreValId);
        
        bar.style.width = '0%';
        bar.getBoundingClientRect(); // Reflow
        bar.style.width = targetScore + '%';
        
        let cur = 0;
        const step = () => {
            if (cur < targetScore) {
                cur += Math.ceil((targetScore - cur) / 10) || 1;
                valEl.textContent = cur + '%';
                requestAnimationFrame(step);
            } else {
                valEl.textContent = targetScore + '%';
            }
        };
        requestAnimationFrame(step);
    }

    // Render results view
    function renderCompatResults(data, type, sign1, sign2) {
        // Show result view, hide inputs
        compatInputView.classList.add('hidden');
        compatResultView.classList.remove('hidden');

        // Populate scores with animation
        const overall = data.scores ? data.scores.overall : data.overall;
        const love = data.scores ? data.scores.love : data.love;
        const friendship = data.scores ? data.scores.friendship : data.friendship;
        const work = data.scores ? data.scores.work : data.work;

        animateScore('score-overall', 'score-circle-bar', overall);
        animateProgressBar('bar-love', 'score-love', love);
        animateProgressBar('bar-friendship', 'score-friendship', friendship);
        animateProgressBar('bar-work', 'score-work', work);

        // Populate text descriptions
        document.getElementById('text-elements').textContent = data.elements_text || '—';
        document.getElementById('text-description').textContent = data.description || '—';
        document.getElementById('text-advice').textContent = data.advice || '—';

        // Update print view texts
        document.getElementById('print-compat-score-val').textContent = overall + '%';
        document.getElementById('print-compat-love').textContent = love + '%';
        document.getElementById('print-compat-friendship').textContent = friendship + '%';
        document.getElementById('print-compat-work').textContent = work + '%';
        document.getElementById('print-text-elements').textContent = data.elements_text || '—';
        document.getElementById('print-text-description').textContent = data.description || '—';
        document.getElementById('print-text-advice').textContent = data.advice || '—';

        const printTimestamp = new Date().toLocaleString('ru-RU', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        document.getElementById('print-compat-date-timestamp').textContent = 'Отчёт сформирован: ' + printTimestamp;

        const visualTitle = document.getElementById('compat-visual-title');
        const sCanvas = document.getElementById('synastry-canvas');

        // Setup element badges
        let s1 = '', s2 = '';
        if (type === 'zodiac') {
            s1 = sign1;
            s2 = sign2;
            
            // Hide synastry elements
            document.getElementById('synastry-legend').classList.add('hidden');
            document.getElementById('synastry-aspects-card').classList.add('hidden');
            document.getElementById('print-synastry-aspects-section').classList.add('hidden');

            visualTitle.textContent = 'Союз стихий';
            drawZodiacUnionGraphic(sign1, sign2, sCanvas, 320);

            // Print info
            document.getElementById('print-couple-details').innerHTML = `
                <div style="font-weight:600;margin-bottom:6px;color:#AA7C11;">Быстрый экспресс-анализ</div>
                <strong>Партнёр 1:</strong> Знак Зодиака ${sign1} (${getElementRu(sign1)})<br>
                <strong>Партнёр 2:</strong> Знак Зодиака ${sign2} (${getElementRu(sign2)})
            `;
        } else {
            s1 = data.p1.planets.find(p => p.name === "Солнце").formatted.sign;
            s2 = data.p2.planets.find(p => p.name === "Солнце").formatted.sign;
            
            // Show synastry elements
            document.getElementById('synastry-legend').classList.remove('hidden');
            document.getElementById('synastry-aspects-card').classList.remove('hidden');
            document.getElementById('print-synastry-aspects-section').classList.remove('hidden');

            visualTitle.textContent = 'Звёздная карта союза';
            drawSynastryChart(data, sCanvas, 340);

            // Print info
            const p1Meta = data.p1.metadata;
            const p2Meta = data.p2.metadata;
            document.getElementById('print-couple-details').innerHTML = `
                <div style="font-weight:600;margin-bottom:6px;color:#AA7C11;">Точный синастрический расчёт</div>
                <strong>Партнёр 1:</strong> родился ${p1Meta.birth_date_local} в ${p1Meta.birth_time_local} (${p1Meta.utc_offset}), г. ${data.p1_city_name || 'Не указан'}<br>
                Солнце в знаке: ${s1} | Асцендент: ${data.p1.angles.ascendant.sign}<br><br>
                <strong>Партнёр 2:</strong> родился ${p2Meta.birth_date_local} в ${p2Meta.birth_time_local} (${p2Meta.utc_offset}), г. ${data.p2_city_name || 'Не указан'}<br>
                Солнце в знаке: ${s2} | Асцендент: ${data.p2.angles.ascendant.sign}
            `;

            // Populate aspect list
            const aspectListEl = document.getElementById('synastry-aspects-list');
            const printAspectListEl = document.getElementById('print-synastry-aspects-list');
            aspectListEl.innerHTML = '';
            printAspectListEl.innerHTML = '';

            // Sort aspects by orb (most exact first)
            const sortedAspects = [...data.aspects].sort((a, b) => a.orb - b.orb);

            if (sortedAspects.length === 0) {
                aspectListEl.innerHTML = '<div class="compat-card-subtitle" style="margin: 20px 0;">Мажорных межкарточных аспектов не обнаружено.</div>';
                printAspectListEl.innerHTML = '<p style="font-size:9.5pt;color:#777;">Мажорных межкарточных аспектов не обнаружено.</p>';
            } else {
                sortedAspects.forEach(asp => {
                    const typeLabel = asp.type === 'harmonic' ? 'Гармоничный' : 'Напряженный';
                    const badgeClass = asp.type;
                    
                    // Web item
                    const item = document.createElement('div');
                    item.className = 'synastry-aspect-item';
                    item.innerHTML = `
                        <div class="synastry-aspect-header">
                            <span class="synastry-aspect-symbols">${asp.p1_symbol} ${asp.aspect_symbol} ${asp.p2_symbol}</span>
                            <span class="synastry-aspect-title">${asp.p1_planet} ${asp.aspect_name} ${asp.p2_planet}</span>
                            <span class="synastry-aspect-badge ${badgeClass}">${typeLabel} (орб ${asp.orb}°)</span>
                        </div>
                        <p class="synastry-aspect-text">${asp.interpretation}</p>
                    `;
                    aspectListEl.appendChild(item);

                    // Print item
                    const printItem = document.createElement('div');
                    printItem.className = 'print-synastry-aspect-card';
                    printItem.innerHTML = `
                        <div class="print-synastry-aspect-header">
                            <span>${asp.p1_symbol} ${asp.aspect_symbol} ${asp.p2_symbol} &nbsp; ${asp.p1_planet} ${asp.aspect_name} ${asp.p2_planet}</span>
                            <span style="color:${asp.type === 'harmonic' ? '#5E52B0' : '#CC593F'}">${typeLabel} (орб ${asp.orb}°)</span>
                        </div>
                        <p style="font-size:8pt;margin:4px 0 0 0;color:#4E493F;line-height:1.4;">${asp.interpretation}</p>
                    `;
                    printAspectListEl.appendChild(printItem);
                });
            }
        }

        // Set element badges text and classes
        const badge1 = document.getElementById('badge-p1');
        const badge2 = document.getElementById('badge-p2');
        const el1 = getElementRu(s1);
        const el2 = getElementRu(s2);
        badge1.textContent = el1;
        badge2.textContent = el2;
        badge1.className = 'element-badge ' + getElementClass(s1);
        badge2.className = 'element-badge ' + getElementClass(s2);
    }

    // Canvas drawing for Zodiac Union Union Graphic
    function drawZodiacUnionGraphic(sign1, sign2, canvasEl, displayW) {
        if (!canvasEl) return;
        const scale = 2;
        canvasEl.width = displayW * scale;
        canvasEl.height = displayW * scale;
        canvasEl.style.width = displayW + 'px';
        canvasEl.style.height = displayW + 'px';
        
        const ctx = canvasEl.getContext('2d');
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        
        const size = displayW;
        const cx = size / 2;
        const cy = size / 2;
        
        ctx.clearRect(0, 0, size, size);
        
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, size/2);
        grad.addColorStop(0, '#FAF8F5');
        grad.addColorStop(1, '#FFFFFF');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
        
        ctx.beginPath();
        ctx.arc(cx, cy, size/2 - 20, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(197, 158, 63, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(cx, cy, size/2 - 25, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(197, 158, 63, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        const getSym = (s) => ZODIAC_META.find(z => z.name === s)?.sym || '♈';
        const getCol = (s) => {
            const idx = ZODIAC_META.findIndex(z => z.name === s);
            return ZODIAC_COLORS[idx >= 0 ? idx : 0];
        };
        
        const sym1 = getSym(sign1);
        const sym2 = getSym(sign2);
        const col1 = getCol(sign1);
        const col2 = getCol(sign2);
        
        ctx.font = '54px serif';
        ctx.fillStyle = col1;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sym1, cx - 60, cy);
        
        ctx.font = '54px serif';
        ctx.fillStyle = col2;
        ctx.fillText(sym2, cx + 60, cy);
        
        ctx.font = '28px sans-serif';
        ctx.fillStyle = '#C59E3F';
        ctx.fillText('❤️', cx, cy - 5);
        
        ctx.font = '500 13px Inter, sans-serif';
        ctx.fillStyle = '#2E2A20';
        ctx.fillText(`${sign1} + ${sign2}`, cx, cy + 60);
    }

    // Canvas drawing for exact Synastry Chart
    function drawSynastryChart(data, canvasEl, displayW) {
        if (!canvasEl) return;
        const scale = 2;
        canvasEl.width = displayW * scale;
        canvasEl.height = displayW * scale;
        canvasEl.style.width = displayW + 'px';
        canvasEl.style.height = displayW + 'px';
        
        const ctx = canvasEl.getContext('2d');
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        
        const size = displayW;
        const cx = size / 2;
        const cy = size / 2;
        const R = size / 2 - 6;
        const r1 = R * 0.82;
        const r2 = R * 0.72;
        const r3 = R * 0.60;
        const r4 = R * 0.20;
        
        ctx.clearRect(0, 0, size, size);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw Zodiac ring
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

            const midAngle = degToRad(i * 30 + 15 - 90);
            const gx = cx + (R * 0.91) * Math.cos(midAngle);
            const gy = cy + (R * 0.91) * Math.sin(midAngle);
            ctx.font      = `bold 12px serif`;
            ctx.fillStyle = ZODIAC_COLORS[i];
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(ZODIAC_META[i].sym, gx, gy);
        }
        
        ctx.beginPath(); ctx.arc(cx, cy, R,  0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.35)'; ctx.lineWidth=1.5; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r1, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.15)'; ctx.lineWidth=1;   ctx.stroke();
        
        // Align to Partner 1 Ascendant
        const asc = data.p1.houses[0].longitude;
        
        // Partner 1 House lines
        for (let i = 0; i < 12; i++) {
            const hLon = data.p1.houses[i].longitude;
            const angle = degToRad(lonToAngle(hLon, asc));
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

            const hNext = data.p1.houses[(i + 1) % 12].longitude;
            const midLon = (hLon + angularMid(hLon, hNext)) / 2;
            const midAng = degToRad(lonToAngle(midLon, asc));
            const hx = cx + (r2 + r3) / 2 * Math.cos(midAng);
            const hy = cy + (r2 + r3) / 2 * Math.sin(midAng);
            ctx.font      = '8px Inter, sans-serif';
            ctx.fillStyle = '#C59E3F';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(toRoman(i + 1), hx, hy);
        }
        
        ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.15)'; ctx.lineWidth=1; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r3, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.12)'; ctx.lineWidth=1; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r4, 0, Math.PI*2); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(197, 158, 63, 0.12)'; ctx.lineWidth=1; ctx.stroke();
        
        // Aspect lines between planets of P1 and P2
        const ASPECTS_STYLES = {
            'Соединение': 'rgba(197, 158, 63, 0.6)',
            'Оппозиция': 'rgba(165, 120, 69, 0.6)',
            'Тригон': 'rgba(94, 82, 176, 0.6)',
            'Квадрат': 'rgba(204, 89, 63, 0.6)',
            'Секстиль': 'rgba(119, 113, 102, 0.5)',
        };
        
        const lineR = r3 - 28;
        
        data.aspects.forEach(asp => {
            const a1 = degToRad(lonToAngle(asp.p1_longitude, asc));
            const a2 = degToRad(lonToAngle(asp.p2_longitude, asc));
            const x1 = cx + lineR * Math.cos(a1);
            const y1 = cy + lineR * Math.sin(a1);
            const x2 = cx + lineR * Math.cos(a2);
            const y2 = cy + lineR * Math.sin(a2);
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = ASPECTS_STYLES[asp.aspect_name] || 'rgba(119, 113, 102, 0.4)';
            ctx.lineWidth = 1.2;
            if (asp.aspect_name === 'Квадрат') { ctx.setLineDash([4, 3]); }
            else { ctx.setLineDash([]); }
            ctx.stroke();
            ctx.setLineDash([]);
        });
        
        // Draw P1 Planets (Gold)
        const rP1 = r2 - 12;
        const placedP1 = [];
        data.p1.planets.forEach(p => {
            const meta = PLANET_META[p.name] || { sym: p.symbol };
            let angle = lonToAngle(p.longitude, asc);
            
            for (let attempt = 0; attempt < 8; attempt++) {
                if (!placedP1.some(a => Math.abs(angleDiff(a, angle)) < 11)) break;
                angle += 12;
            }
            placedP1.push(angle);
            
            const rad = degToRad(angle);
            const px = cx + rP1 * Math.cos(rad);
            const py = cy + rP1 * Math.sin(rad);
            
            const dotR = degToRad(lonToAngle(p.longitude, asc));
            const dx = cx + r2 * Math.cos(dotR);
            const dy = cy + r2 * Math.sin(dotR);
            ctx.beginPath();
            ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#C59E3F';
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = 'rgba(197, 158, 63, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            ctx.font = '12px serif';
            ctx.fillStyle = '#C59E3F';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(meta.sym, px, py);
        });
        
        // Draw P2 Planets (Dark Slate)
        const rP2 = r3 - 12;
        const placedP2 = [];
        data.p2.planets.forEach(p => {
            const meta = PLANET_META[p.name] || { sym: p.symbol };
            let angle = lonToAngle(p.longitude, asc);
            
            for (let attempt = 0; attempt < 8; attempt++) {
                if (!placedP2.some(a => Math.abs(angleDiff(a, angle)) < 11)) break;
                angle += 12;
            }
            placedP2.push(angle);
            
            const rad = degToRad(angle);
            const px = cx + rP2 * Math.cos(rad);
            const py = cy + rP2 * Math.sin(rad);
            
            const dotR = degToRad(lonToAngle(p.longitude, asc));
            const dx = cx + r3 * Math.cos(dotR);
            const dy = cy + r3 * Math.sin(dotR);
            ctx.beginPath();
            ctx.arc(dx, dy, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#777166';
            ctx.fill();
            
            ctx.beginPath();
            ctx.moveTo(dx, dy);
            ctx.lineTo(px, py);
            ctx.strokeStyle = 'rgba(119, 113, 102, 0.2)';
            ctx.lineWidth = 0.5;
            ctx.stroke();
            
            ctx.font = '12px serif';
            ctx.fillStyle = '#777166';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(meta.sym, px, py);
        });
    }

    // Export PDF for Compatibility
    btnCompatExport.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast("Подготовка печатной версии отчёта...");
        setTimeout(() => {
            window.print();
        }, 500);
    });

});
