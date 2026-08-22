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
    const planetsTbody   = document.getElementById('planets-tbody');
    const housesTbody    = document.getElementById('houses-tbody');
    const hexagramsTbody = document.getElementById('hexagrams-tbody');
    const infoGrid       = document.getElementById('info-detail-grid');

    // Canvas
    const canvas = document.getElementById('chart-canvas');
    const ctx    = canvas.getContext('2d');

    // Layout Toggle (Maximized vs Minimized)
    const chartLayoutContainer = document.querySelector('.natal-chart-layout');
    const chartLayoutToggleBtn = document.getElementById('chart-layout-toggle');
    if (chartLayoutContainer && chartLayoutToggleBtn) {
        // Always start as maximized when opening the page
        chartLayoutContainer.classList.remove('layout-minimized');
        chartLayoutContainer.classList.add('layout-maximized');

        chartLayoutToggleBtn.addEventListener('click', () => {
            if (chartLayoutContainer.classList.contains('layout-maximized')) {
                chartLayoutContainer.classList.remove('layout-maximized');
                chartLayoutContainer.classList.add('layout-minimized');
            } else {
                chartLayoutContainer.classList.remove('layout-minimized');
                chartLayoutContainer.classList.add('layout-maximized');
            }
            // Redraw chart to fit the new size
            if (lastChart) {
                drawChart(lastChart, canvas);
            }
        });
    }

    // ── Default date ──────────────────────────────────────────
    birthDateEl.value = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

    // ── State ─────────────────────────────────────────────────
    let debounce     = null;
    let activeIdx    = -1;
    let isGmt        = false;
    let selectedCity = null;   // { display, lat, lon }
    let lastChart    = null;   // last calculation result
    let lastCompatData = null; // last synastry compatibility calculation result
    let activePlanets = null;  // Set of active planet names to display on chart
    let activeBgDesign = null; // Set of active planet names for Bodygraph Design (red) column
    let activeBgPers = null;   // Set of active planet names for Bodygraph Personality (black) column
    const DEFAULT_INACTIVE_PLANETS = [
        'Хирон',
        'Лилит (средняя)',
        'Лилит (истинная)',
        'Лилит (интерп.)',
        'Приап (интерп.)'
    ];
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
        if (q.length < 1) { closeSuggestions(); return; }

        // If query is already in cache, show it instantly
        const cacheKey = q.toLowerCase();
        if (geoCache.has(cacheKey)) {
            renderSuggestions(geoCache.get(cacheKey));
            return;
        }

        debounce = setTimeout(() => fetchCities(q), 120);
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
            const url = `/api/geocode?query=${encodeURIComponent(q)}`;
            const res  = await fetch(url);
            if (!res.ok) {
                console.error('[geocode] HTTP error:', res.status, res.statusText);
                closeSuggestions();
                return;
            }
            const data = await res.json();
            geoCache.set(cacheKey, data);
            renderSuggestions(data);
        } catch(err) {
            console.error('[geocode] fetch failed:', err);
            closeSuggestions();
        }
        finally  { searchSpinner.classList.add('hidden'); }
    }

    function repositionSuggestions() {
        const rect = cityInput.getBoundingClientRect();
        suggestions.style.top   = (rect.bottom + 4) + 'px';
        suggestions.style.left  = rect.left + 'px';
        suggestions.style.width = rect.width + 'px';
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

        repositionSuggestions();
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
            const lat = truncTo(meta.latitude, 4);
            const lon = truncTo(meta.longitude, 4);
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

        // Hexagrams (Programs) table
        renderHexagramsTable(data);

        // Bodygraph Table
        renderBodygraphTable(data);

        // Mandala Table
        renderMandalaTable(data);

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
            const latVal = truncTo(meta.latitude, 4);
            const lonVal = truncTo(meta.longitude, 4);
            const latNum = parseFloat(latVal);
            const lonNum = parseFloat(lonVal);
            document.getElementById('pm-coords').textContent = `${Math.abs(latNum)}°${latNum >= 0 ? 'N' : 'S'}, ${Math.abs(lonNum)}°${lonNum >= 0 ? 'E' : 'W'}`;
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
                    ? `Равнодомная от AS (заполярная шир. > ${meta.polar_boundary || 62}°)`
                    : 'Равнодомная от AS';
            } else if (meta.calculated_house_system === 'D') {
                if (meta.house_system === 'P') {
                    printHouseSystemLabel.textContent = `Равнодомная от МС (заполярная шир. > ${meta.polar_boundary || 62}°)`;
                } else {
                    const offset = meta.cusp_offset || 0;
                    printHouseSystemLabel.textContent = 'Равнодомная от МС' + (offset !== 0 ? ` (${offset > 0 ? '+' : ''}${offset}°)` : '');
                }
            } else if (meta.calculated_house_system === 'O') {
                printHouseSystemLabel.textContent = 'Порфирий';
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

        // Draw Rave Bodygraph (canvas fallback kept for print)
        const bgCanvas = document.getElementById('bodygraph-canvas');
        if (bgCanvas) drawBodygraph(data, bgCanvas);

        // Render SVG Bodygraph with planet columns
        renderSvgBodygraph(data);

        // Draw Rave Mandala
        drawMandala(data, document.getElementById('mandala-canvas'));
        updateHdTypeProfile(data);

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

    const MIRROR_GATE_ORDER = [
        41, 61, 60, 10, 58, 54, 38, 24, 27, 42,  3, 25, 17, 51, 21, 13, 49, 55, 30, 36,
        22, 37, 63,  2, 23, 20,  8, 12, 45, 16, 35, 33, 31, 62, 56, 15, 52, 53, 39, 44,
        28, 32, 50, 46, 18, 57, 48,  7,  4, 59, 29,  6, 47, 40, 64,  1, 43, 34, 14, 11,
        26,  9,  5, 19
    ];

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
        'Земля':                 { sym: '⊕', cls: 'glyph-earth' },
        'Хирон':                 { sym: '⚷', cls: 'glyph-chiron' },
        'Лилит (средняя)':       { sym: '⚸', cls: 'glyph-lilith-mean' },
        'Лилит (истинная)':      { sym: '⚸', cls: 'glyph-lilith-true' },
        'Лилит (интерп.)':       { sym: '⚸', cls: 'glyph-lilith-intp' },
        'Приап (интерп.)':       { sym: '⯓', cls: 'glyph-priapus' },
    };

    const ZODIAC_META = [
        { sym: '♈\uFE0E', name: 'Овен' },
        { sym: '♉\uFE0E', name: 'Телец' },
        { sym: '♊\uFE0E', name: 'Близнецы' },
        { sym: '♋\uFE0E', name: 'Рак' },
        { sym: '♌\uFE0E', name: 'Лев' },
        { sym: '♍\uFE0E', name: 'Дева' },
        { sym: '♎\uFE0E', name: 'Весы' },
        { sym: '♏\uFE0E', name: 'Скорпион' },
        { sym: '♐\uFE0E', name: 'Стрелец' },
        { sym: '♑\uFE0E', name: 'Козерог' },
        { sym: '♒\uFE0E', name: 'Водолей' },
        { sym: '♓\uFE0E', name: 'Рыбы' },
    ];

    const PLANET_VECTORS = {
        'солнце': (ctx) => {
            ctx.beginPath(); ctx.arc(8, 8, 5.6, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.arc(8, 8, 1.1, 0, 2*Math.PI); ctx.fill();
        },
        'земля': (ctx) => {
            ctx.beginPath(); ctx.arc(8, 8, 5.6, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2.4, 8); ctx.lineTo(13.6, 8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, 2.4); ctx.lineTo(8, 13.6); ctx.stroke();
        },
        'луна': (ctx) => {
            const p = new Path2D("M 10.5 2.6 A 5.8 5.8 0 0 0 10.5 13.4 A 4.6 4.6 0 0 1 10.5 2.6 Z");
            ctx.stroke(p);
        },
        'северный узел': (ctx) => {
            const p = new Path2D("M 3.8 11.2 A 4.6 4.6 0 0 1 12.2 11.2");
            ctx.stroke(p);
            ctx.beginPath(); ctx.arc(3.8, 11.8, 1.3, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.arc(12.2, 11.8, 1.3, 0, 2*Math.PI); ctx.stroke();
        },
        'южный узел': (ctx) => {
            const p = new Path2D("M 3.8 4.8 A 4.6 4.6 0 0 0 12.2 4.8");
            ctx.stroke(p);
            ctx.beginPath(); ctx.arc(3.8, 4.2, 1.3, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.arc(12.2, 4.2, 1.3, 0, 2*Math.PI); ctx.stroke();
        },
        'меркурий': (ctx) => {
            const p = new Path2D("M 4.2 2.4 A 3.8 3.8 0 0 0 11.8 2.4");
            ctx.stroke(p);
            ctx.beginPath(); ctx.arc(8, 6.8, 2.8, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, 9.6); ctx.lineTo(8, 14.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5.2, 12.5); ctx.lineTo(10.8, 12.5); ctx.stroke();
        },
        'венера': (ctx) => {
            ctx.beginPath(); ctx.arc(8, 5.4, 3.8, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, 9.2); ctx.lineTo(8, 14.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5.0, 12.2); ctx.lineTo(11.0, 12.2); ctx.stroke();
        },
        'марс': (ctx) => {
            ctx.beginPath(); ctx.arc(6.5, 9.5, 3.8, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(9.2, 6.8); ctx.lineTo(14.0, 2.0); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(10.2, 2.0); ctx.lineTo(14.0, 2.0); ctx.lineTo(14.0, 5.8); ctx.stroke();
        },
        'юпитер': (ctx) => {
            const p = new Path2D("M 2.0 6.5 C 2.0 1.5 6.5 0.8 6.5 4.5 C 6.5 7.0 2.5 8.5 2.5 9.8 L 13.5 9.8");
            ctx.stroke(p);
            ctx.beginPath(); ctx.moveTo(9.8, 1.8); ctx.lineTo(9.8, 14.8); ctx.stroke();
        },
        'сатурн': (ctx) => {
            ctx.beginPath(); ctx.moveTo(5.2, 2.0); ctx.lineTo(5.2, 14.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(2.6, 4.8); ctx.lineTo(7.8, 4.8); ctx.stroke();
            const p = new Path2D("M 5.2 8.2 C 9.5 8.2 11.8 10.5 9.5 13.8 C 8.5 15.2 7.0 14.5 7.5 13.2");
            ctx.stroke(p);
        },
        'уран': (ctx) => {
            ctx.beginPath(); ctx.arc(8, 12.8, 2.0, 0, 2*Math.PI); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(8, 2.0); ctx.lineTo(8, 10.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(3.2, 5.2); ctx.lineTo(12.8, 5.2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(3.2, 2.0); ctx.lineTo(3.2, 8.4); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(12.8, 2.0); ctx.lineTo(12.8, 8.4); ctx.stroke();
        },
        'нептун': (ctx) => {
            const p = new Path2D("M 3.2 3.2 L 3.2 6.8 C 3.2 9.2 12.8 9.2 12.8 6.8 L 12.8 3.2");
            ctx.stroke(p);
            ctx.beginPath(); ctx.moveTo(8, 2.0); ctx.lineTo(8, 14.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(5.0, 12.5); ctx.lineTo(11.0, 12.5); ctx.stroke();
            const p2 = new Path2D("M 2.2 4.0 L 3.2 2.4 L 4.2 4.0"); ctx.stroke(p2);
            const p3 = new Path2D("M 7.0 2.8 L 8.0 1.5 L 9.0 2.8"); ctx.stroke(p3);
            const p4 = new Path2D("M 11.8 4.0 L 12.8 2.4 L 13.8 4.0"); ctx.stroke(p4);
        },
        'плутон': (ctx) => {
            ctx.beginPath(); ctx.arc(8, 3.6, 2.5, 0, 2*Math.PI); ctx.stroke();
            const p = new Path2D("M 2.4 6.0 A 5.6 5.6 0 0 0 13.6 6.0");
            ctx.stroke(p);
            ctx.beginPath(); ctx.moveTo(8, 9.4); ctx.lineTo(8, 14.8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(4.8, 12.4); ctx.lineTo(11.2, 12.4); ctx.stroke();
        }
    };

    function getPlanetHtmlSymbol(name) {
        if (!name) return '';
        const nameLower = name.toLowerCase();
        if (nameLower.includes('солнце')) return typeof SVG_SUN !== 'undefined' ? SVG_SUN : '☉';
        if (nameLower.includes('земля')) return typeof SVG_EARTH !== 'undefined' ? SVG_EARTH : '⊕';
        if (nameLower.includes('луна')) return typeof SVG_MOON !== 'undefined' ? SVG_MOON : '☽';
        if (nameLower.includes('северный узел')) return typeof SVG_NODE_NORTH !== 'undefined' ? SVG_NODE_NORTH : '☊';
        if (nameLower.includes('южный узел')) return typeof SVG_NODE_SOUTH !== 'undefined' ? SVG_NODE_SOUTH : '☋';
        if (nameLower.includes('меркурий')) return typeof SVG_MERCURY !== 'undefined' ? SVG_MERCURY : '☿';
        if (nameLower.includes('венера')) return typeof SVG_VENUS !== 'undefined' ? SVG_VENUS : '♀';
        if (nameLower.includes('марс')) return typeof SVG_MARS !== 'undefined' ? SVG_MARS : '♂';
        if (nameLower.includes('юпитер')) return typeof SVG_JUPITER !== 'undefined' ? SVG_JUPITER : '♃';
        if (nameLower.includes('сатурн')) return typeof SVG_SATURN !== 'undefined' ? SVG_SATURN : '♄';
        if (nameLower.includes('уран')) return typeof SVG_URANUS !== 'undefined' ? SVG_URANUS : '♅';
        if (nameLower.includes('нептун')) return typeof SVG_NEPTUNE !== 'undefined' ? SVG_NEPTUNE : '♆';
        if (nameLower.includes('плутон')) return typeof SVG_PLUTO !== 'undefined' ? SVG_PLUTO : '♇';

        const key = name === 'Северный Узел' ? 'Истинный Северный Узел' : (name === 'Южный Узел' ? 'Истинный Южный Узел' : name);
        const meta = PLANET_META[key] || PLANET_META[name];
        return meta ? meta.sym : name.substring(0,2);
    }

    function drawPlanetOnCanvas(ctx, pName, symStr, x, y, size = 15, color = '#000000') {
        const nameStr = (pName || '').toLowerCase();
        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = Math.max(1.1, size * 0.08);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        let drawFn = null;
        for (const [key, fn] of Object.entries(PLANET_VECTORS)) {
            if (nameStr.includes(key)) {
                drawFn = fn;
                break;
            }
        }
        
        if (!drawFn) {
            if (symStr === "☊") drawFn = PLANET_VECTORS["северный узел"];
            else if (symStr === "☋") drawFn = PLANET_VECTORS["южный узел"];
        }

        if (drawFn) {
            ctx.translate(x - size/2, y - size/2);
            ctx.scale(size/16, size/16);
            drawFn(ctx);
        } else {
            ctx.font = `bold ${size}px "DM Sans", "Segoe UI Symbol", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(symStr || '', x, y);
        }
        ctx.restore();
    }

    function signMeta(signName) {
        return ZODIAC_META.find(z => z.name === signName) || { sym: '?', name: signName };
    }

    function truncTo(val, decimals) {
        if (val === null || val === undefined || val === '') return '—';
        const num = parseFloat(val);
        if (isNaN(num)) return '—';
        const parts = num.toFixed(12).split('.');
        const integerPart = parts[0];
        const fractionalPart = parts[1].substring(0, decimals);
        return `${integerPart}.${fractionalPart}`;
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

        // Format 2: Decimal representation, truncated to 6 decimal places
        const parts = normalized.toFixed(12).split('.');
        let integerPart = parts[0];
        if (integerPart === '360') {
            integerPart = '0';
        }
        const fractionalPart = parts[1].substring(0, 6);
        const fmt2 = `${integerPart},${fractionalPart}`;

        return `${fmt1}<br><span class="lon-dec" style="display: block; font-size: 11px; color: var(--text-muted); margin-top: 2px;">${fmt2}</span>`;
    }


    // ── Planets table ─────────────────────────────────────────
    function renderPlanetsTable(planets) {
        if (activePlanets === null) {
            activePlanets = new Set();
            planets.forEach(p => {
                if (!DEFAULT_INACTIVE_PLANETS.includes(p.name)) {
                    activePlanets.add(p.name);
                }
            });
        }

        planetsTbody.innerHTML = '';
        planets.forEach(p => {
            const meta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
            const sm   = signMeta(p.formatted.sign);

            const tr = document.createElement('tr');
            if (p.is_retrograde) {
                tr.classList.add('retro-row');
            }
            const isChecked = activePlanets.has(p.name) ? 'checked' : '';
            tr.innerHTML = `
                <td style="text-align: center; width: 40px; padding: 0 4px;">
                    <input type="checkbox" class="planet-toggle-checkbox" data-name="${p.name}" ${isChecked} style="cursor:pointer; accent-color:var(--primary); transform:scale(1.15); vertical-align: middle;">
                </td>
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

        // Attach change listeners to checkboxes
        planetsTbody.querySelectorAll('.planet-toggle-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const name = e.target.getAttribute('data-name');
                if (e.target.checked) {
                    activePlanets.add(name);
                } else {
                    activePlanets.delete(name);
                }
                // Redraw canvases
                const canvas = document.getElementById('chart-canvas');
                if (lastChart) {
                    drawChart(lastChart, canvas);
                    const printCanvas = document.getElementById('print-chart-canvas');
                    if (printCanvas) {
                        drawChartFixed(lastChart, printCanvas, 220);
                    }
                    // Redraw Rave Bodygraph and Mandala
                    const bgCv = document.getElementById('bodygraph-canvas');
                    if (bgCv) drawBodygraph(lastChart, bgCv);
                    renderSvgBodygraph(lastChart);
                    drawMandala(lastChart, document.getElementById('mandala-canvas'));
                    renderBodygraphTable(lastChart);
                    renderMandalaTable(lastChart);
                }
                const sCanvas = document.getElementById('synastry-canvas');
                if (sCanvas && lastCompatData) {
                    drawSynastryChart(lastCompatData, sCanvas, 340);
                }
            });
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
                <td>${fmtPos(h.formatted)}</td>
                <td>
                    ${h.hexagram ? `<span class="hex-gate-badge">Гекс. ${h.hexagram.gate}.${h.hexagram.line}</span>` : '—'}
                </td>`;
            housesTbody.appendChild(tr);
        });
    }

    // ── Hexagrams (Programs) table ────────────────────────────
    function renderHexagramsTable(data) {
        if (!hexagramsTbody) return;
        hexagramsTbody.innerHTML = '';
        
        // Personality planets
        data.planets.forEach(p => {
            if (!p.hexagram) return;
            const meta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
            const hx = p.hexagram;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="planet-cell">
                        <div class="planet-glyph ${meta.cls}">${meta.sym}</div>
                        <span class="planet-name">${p.name} <span style="font-size:10px; color:var(--text-muted); font-weight:normal;">(Личность)</span></span>
                    </div>
                </td>
                <td>
                    <span class="hex-gate-badge">Гекс. ${hx.gate}</span>
                </td>
                <td><span class="hex-num">${hx.line}</span></td>
                <td><span class="hex-num">${hx.color}</span></td>
                <td><span class="hex-num">${hx.tone}</span></td>
                <td><span class="hex-num">${hx.base}</span></td>
                <td><span class="hex-num">${hx.theos}</span></td>
            `;
            hexagramsTbody.appendChild(tr);
        });

        // Design planets
        const designPlanetsList = data.design_planets || [];
        designPlanetsList.forEach(p => {
            if (!p.hexagram) return;
            const meta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
            const hx = p.hexagram;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <div class="planet-cell">
                        <div class="planet-glyph ${meta.cls}" style="color:rgb(255,96,96);">${meta.sym}</div>
                        <span class="planet-name" style="color:rgb(255,96,96);">${p.name} <span style="font-size:10px; color:rgba(255,96,96,0.7); font-weight:normal;">(Дизайн)</span></span>
                    </div>
                </td>
                <td>
                    <span class="hex-gate-badge" style="background:rgba(255,96,96,0.1); color:rgb(255,96,96); border:1px solid rgba(255,96,96,0.2);">Гекс. ${hx.gate}</span>
                </td>
                <td><span class="hex-num" style="color:rgb(255,96,96);">${hx.line}</span></td>
                <td><span class="hex-num" style="color:rgb(255,96,96);">${hx.color}</span></td>
                <td><span class="hex-num" style="color:rgb(255,96,96);">${hx.tone}</span></td>
                <td><span class="hex-num" style="color:rgb(255,96,96);">${hx.base}</span></td>
                <td><span class="hex-num" style="color:rgb(255,96,96);">${hx.theos}</span></td>
            `;
            hexagramsTbody.appendChild(tr);
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
            { label: 'Широта',               value: meta.latitude  ? `${truncTo(meta.latitude, 6)}°` : '—' },
            { label: 'Долгота',              value: meta.longitude ? `${truncTo(meta.longitude, 6)}°` : '—' },
            { 
                label: 'Система домов',        
                value: meta.calculated_house_system === 'E'
                    ? (meta.use_polar_equal 
                        ? `Равнодомная от AS (заполярная шир. > ${meta.polar_boundary || 62}°)`
                        : 'Равнодомная от AS (запасной вариант)')
                    : (meta.calculated_house_system === 'D'
                        ? (meta.house_system === 'P'
                            ? `Равнодомная от МС (заполярная шир. > ${meta.polar_boundary || 62}°)`
                            : `Равнодомная от МС${meta.cusp_offset !== 0 ? ` (${meta.cusp_offset > 0 ? '+' : ''}${meta.cusp_offset}°)` : ''}`)
                        : (meta.calculated_house_system === 'O'
                            ? 'Порфирий (запасной вариант)'
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
        'Земля':                 '#2D82B7',
        'Хирон':                 '#8B5CF6',
        'Лилит (средняя)':       '#8C8C9C',
        'Лилит (истинная)':      '#1C1917',
        'Лилит (интерп.)':       '#4B5563',
        'Приап (интерп.)':       '#A16207',
    };

    function drawChart(data, canvasEl) {
        if (!canvasEl) return;
        const canvas = canvasEl;
        const ctx    = canvas.getContext('2d');

        // Make canvas fill its container on mobile
        const container = canvas.parentElement;
        const isScreenCanvas = (canvas.id === 'chart-canvas');
        const displayW  = isScreenCanvas ? Math.min(container.clientWidth || 500, 500) : 440;
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
            ctx.font      = '9px DM Sans, sans-serif';
            ctx.fillStyle = '#777166';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(toRoman(i + 1), hx, hy);
        }

        ctx.beginPath(); ctx.arc(cx, cy, r2, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.15)'; ctx.lineWidth=1; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r3, 0, Math.PI*2); ctx.strokeStyle='rgba(197, 158, 63, 0.12)'; ctx.lineWidth=1; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, r4, 0, Math.PI*2); ctx.fillStyle='#FFFFFF'; ctx.fill(); ctx.strokeStyle='rgba(197, 158, 63, 0.12)'; ctx.lineWidth=1; ctx.stroke();

        // -- Aspects (between planets) --
        const planets = data.planets.filter(p => !activePlanets || activePlanets.has(p.name));
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
            drawPlanetOnCanvas(ctx, p.name, meta.sym, px, py, 13, PLANET_COLORS[p.name] || '#2E2A20');

            // Retrograde indicator
            if (p.is_retrograde) {
                ctx.font      = 'bold 9px DM Sans, sans-serif';
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
            ctx.font      = 'bold 10px DM Sans, sans-serif';
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
        const planets = data.planets.filter(p => !activePlanets || activePlanets.has(p.name));
        const ASPECTS = [
            { deg: 0,   orb: 8, color: 'rgba(197,158,63,0.5)',  dash: [] },
            { deg: 120, orb: 6, color: 'rgba(94,82,176,0.45)',  dash: [] },
            { deg: 90,  orb: 6, color: 'rgba(204,89,63,0.45)',  dash: [3,2] },
            { deg: 180, orb: 6, color: 'rgba(165,120,69,0.45)', dash: [] },
            { deg: 60,  orb: 5, color: 'rgba(94,82,176,0.25)',  dash: [2,3] },
        ];
        for (let i = 0; i < planets.length; i++) {
            for (let j = i + 1; j < planets.length; j++) {
                const diff = Math.abs(angleDiff(planets[i].longitude, planets[j].longitude));
                for (const asp of ASPECTS) {
                    if (Math.abs(diff - asp.deg) <= asp.orb || (asp.deg > 0 && Math.abs(360 - diff - asp.deg) <= asp.orb)) {
                        const a1 = degToRad(lonToAngle(planets[i].longitude, asc));
                        const a2 = degToRad(lonToAngle(planets[j].longitude, asc));
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
        planets.forEach(p => {
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
            drawPlanetOnCanvas(ctx, p.name, meta.sym, px, py, 12.5, PLANET_COLORS[p.name] || '#2E2A20');
            if (p.is_retrograde) {
                ctx.font = 'bold 7px DM Sans,sans-serif'; ctx.fillStyle = '#E06D53';
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
            ctx.font = 'bold 8px DM Sans,sans-serif'; ctx.fillStyle = '#C59E3F';
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
            if (q.length < 1) { closeSuggestions(); return; }

            const cacheKey = q.toLowerCase();
            if (geoCache.has(cacheKey)) {
                renderSuggestions(geoCache.get(cacheKey));
                return;
            }

            debounce = setTimeout(() => fetchCities(q), 120);
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
                const url = `/api/geocode?query=${encodeURIComponent(q)}`;
                const res  = await fetch(url);
                if (!res.ok) { console.error('[geocode-compat] HTTP error:', res.status); closeSuggestions(); return; }
                const data = await res.json();
                geoCache.set(cacheKey, data);
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
        lastCompatData = (type === 'synastry') ? data : null;
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
        
        const getSym = (s) => ZODIAC_META.find(z => z.name === s)?.sym || '♈\uFE0E';
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
        
        ctx.font = '500 13px DM Sans, sans-serif';
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
            ctx.font      = '8px DM Sans, sans-serif';
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
            if (activePlanets && (!activePlanets.has(asp.p1_planet) || !activePlanets.has(asp.p2_planet))) {
                return;
            }
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
        const p1Planets = data.p1.planets.filter(p => !activePlanets || activePlanets.has(p.name));
        p1Planets.forEach(p => {
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
            
            drawPlanetOnCanvas(ctx, p.name, meta.sym, px, py, 12, '#C59E3F');
        });
        
        // Draw P2 Planets (Dark Slate)
        const rP2 = r3 - 12;
        const placedP2 = [];
        const p2Planets = data.p2.planets.filter(p => !activePlanets || activePlanets.has(p.name));
        p2Planets.forEach(p => {
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
            
            drawPlanetOnCanvas(ctx, p.name, meta.sym, px, py, 12, '#777166');
        });
    }

    // ============================================================
    //  HUMAN DESIGN RAVE BODYGRAPH & MANDALA DRAWING
    // ============================================================

    // ═══════════════════════════════════════════════════════════════
    //  BODYGRAPH & MANDALA — Reference-accurate layout
    // ═══════════════════════════════════════════════════════════════

    const BG_W = 400, BG_H = 650;

    const BG_CENTERS = {
        'Head': { cx: 200, cy: 60, label: 'Head', poly: [[154, 8], [180, 38], [134, 38]], gates: {"64": [185, 82], "61": [200, 82], "63": [215, 82]} },
        'Ajna': { cx: 200, cy: 130, label: 'Ajna', poly: [[170, 110], [190, 80], [144, 80]], gates: {"47": [185, 108], "24": [200, 108], "4": [215, 108], "17": [185, 142], "43": [200, 142], "11": [215, 142]} },
        'Throat': { cx: 200, cy: 220, label: 'Throat', poly: [[138, 142], [189, 142], [189, 196], [138, 196]], gates: {"62": [185, 200], "23": [200, 200], "56": [215, 200], "16": [180, 215], "20": [180, 235], "31": [185, 240], "8": [200, 240], "33": [215, 240], "35": [220, 210], "12": [220, 225], "45": [220, 240]} },
        'G-Center': { cx: 200, cy: 330, label: 'G-Center', poly: [[170, 226], [190, 246], [171, 279], [136, 260]], gates: {"7": [188, 292], "1": [200, 295], "13": [212, 292], "10": [165, 330], "25": [235, 330], "15": [188, 368], "2": [200, 365], "46": [212, 368]} },
        'Heart': { cx: 270, cy: 300, label: 'Heart', poly: [[225, 263], [205, 285], [243, 302]], gates: {"21": [270, 295], "26": [260, 305], "40": [280, 305], "51": [270, 315]} },
        'Sacral': { cx: 200, cy: 450, label: 'Sacral', poly: [[137, 317], [188, 317], [188, 371], [137, 371]], gates: {"34": [175, 425], "5": [190, 425], "14": [200, 425], "29": [215, 425], "27": [175, 450], "59": [225, 450], "42": [180, 475], "3": [200, 475], "9": [220, 475]} },
        'Root': { cx: 200, cy: 560, label: 'Root', poly: [[137, 391], [189, 391], [189, 445], [137, 445]], gates: {"53": [180, 540], "60": [200, 540], "52": [220, 540], "54": [180, 550], "38": [180, 565], "58": [180, 580], "19": [220, 550], "39": [220, 565], "41": [220, 580]} },
        'Spleen': { cx: 80, cy: 450, label: 'Spleen', poly: [[81, 337], [49, 316], [35, 371]], gates: {"48": [75, 400], "57": [85, 415], "44": [95, 430], "50": [105, 445], "32": [95, 465], "28": [85, 480], "18": [75, 495]} },
        'SolarPlexus': { cx: 320, cy: 450, label: 'SolarPlexus', poly: [[248, 338], [279, 318], [292, 369]], gates: {"36": [325, 400], "22": [315, 415], "37": [305, 430], "6": [295, 445], "49": [305, 465], "55": [315, 480], "30": [325, 495]} },
    };

    const CHANNELS_DATA = [
        { gateA: 64, gateB: 47, centerA: 'Head', centerB: 'Ajna', type: 'straight' },
        { gateA: 61, gateB: 24, centerA: 'Head', centerB: 'Ajna', type: 'straight' },
        { gateA: 63, gateB: 4, centerA: 'Head', centerB: 'Ajna', type: 'straight' },
        { gateA: 17, gateB: 62, centerA: 'Ajna', centerB: 'Throat', type: 'straight' },
        { gateA: 43, gateB: 23, centerA: 'Ajna', centerB: 'Throat', type: 'straight' },
        { gateA: 11, gateB: 56, centerA: 'Ajna', centerB: 'Throat', type: 'straight' },
        { gateA: 31, gateB: 7, centerA: 'Throat', centerB: 'G-Center', type: 'straight' },
        { gateA: 8, gateB: 1, centerA: 'Throat', centerB: 'G-Center', type: 'straight' },
        { gateA: 33, gateB: 13, centerA: 'Throat', centerB: 'G-Center', type: 'straight' },
        { gateA: 16, gateB: 48, centerA: 'Throat', centerB: 'Spleen', type: 'straight' },
        { gateA: 20, gateB: 57, centerA: 'Throat', centerB: 'Spleen', type: 'straight' },
        { gateA: 10, gateB: 57, centerA: 'G-Center', centerB: 'Spleen', type: 'straight' },
        { gateA: 35, gateB: 36, centerA: 'Throat', centerB: 'SolarPlexus', type: 'straight' },
        { gateA: 12, gateB: 22, centerA: 'Throat', centerB: 'SolarPlexus', type: 'straight' },
        { gateA: 45, gateB: 21, centerA: 'Throat', centerB: 'Heart', type: 'straight' },
        { gateA: 25, gateB: 51, centerA: 'G-Center', centerB: 'Heart', type: 'straight' },
        { gateA: 26, gateB: 44, centerA: 'Heart', centerB: 'Spleen', type: 'straight' },
        { gateA: 40, gateB: 37, centerA: 'Heart', centerB: 'SolarPlexus', type: 'straight' },
        { gateA: 5, gateB: 15, centerA: 'Sacral', centerB: 'G-Center', type: 'straight' },
        { gateA: 14, gateB: 2, centerA: 'Sacral', centerB: 'G-Center', type: 'straight' },
        { gateA: 29, gateB: 46, centerA: 'Sacral', centerB: 'G-Center', type: 'straight' },
        { gateA: 50, gateB: 27, centerA: 'Spleen', centerB: 'Sacral', type: 'straight' },
        { gateA: 6, gateB: 59, centerA: 'SolarPlexus', centerB: 'Sacral', type: 'straight' },
        { gateA: 32, gateB: 54, centerA: 'Spleen', centerB: 'Root', type: 'straight' },
        { gateA: 28, gateB: 38, centerA: 'Spleen', centerB: 'Root', type: 'straight' },
        { gateA: 18, gateB: 58, centerA: 'Spleen', centerB: 'Root', type: 'straight' },
        { gateA: 49, gateB: 19, centerA: 'SolarPlexus', centerB: 'Root', type: 'straight' },
        { gateA: 55, gateB: 39, centerA: 'SolarPlexus', centerB: 'Root', type: 'straight' },
        { gateA: 30, gateB: 41, centerA: 'SolarPlexus', centerB: 'Root', type: 'straight' },
        { gateA: 42, gateB: 53, centerA: 'Sacral', centerB: 'Root', type: 'straight' },
        { gateA: 3, gateB: 60, centerA: 'Sacral', centerB: 'Root', type: 'straight' },
        { gateA: 9, gateB: 52, centerA: 'Sacral', centerB: 'Root', type: 'straight' },
        { gateA: 10, gateB: 34, centerA: 'G-Center', centerB: 'Sacral', type: 'straight' },
        { gateA: 10, gateB: 20, centerA: 'G-Center', centerB: 'Throat', type: 'straight' },
        { gateA: 20, gateB: 34, centerA: 'Throat', centerB: 'Sacral', type: 'bent_34_20' }
    ];

    /* ── shared drawing core (used by standalone bodygraph + mandala overlay) ── */
    function drawBodygraphOnCtx(ctx, data, sc, ox, oy, activeGatesPersonality, activeGatesDesign, definedCenters, hoverState = null) {
        const S = (p) => [p[0] * sc + ox, p[1] * sc + oy];

        const hoverType = hoverState ? hoverState.type : null;
        const hoverTarget = hoverState ? hoverState.target : null;

        function getQuarterNameForIdx(idx) {
            if (idx >= 56 || idx <= 7) return "Инициация";
            if (idx >= 8 && idx <= 23) return "Цивилизация";
            if (idx >= 24 && idx <= 39) return "Дуальность";
            if (idx >= 40 && idx <= 55) return "Мутация";
            return "";
        }

        const GATE_ORDER = [
            25, 36, 22, 63, 37, 55, 30, 49, 13, 19, 41, 60, 61, 54, 38, 58,
            10, 11, 26,  5,  9, 34, 14, 43,  1, 44, 28, 50, 32, 57, 48, 18,
            46,  6, 47, 64, 40, 59, 29,  4,  7, 33, 31, 56, 62, 53, 39, 52,
            15, 12, 45, 35, 16, 20,  8, 23,  2, 24, 27,  3, 42, 51, 21, 17
        ];

        const activeGatesCombined = new Set([...activeGatesPersonality, ...activeGatesDesign]);

        function getBodygraphOpacity(centerName, gateNum) {
            if (!hoverType) return 1.0;
            
            if (hoverType === 'center') {
                const connectedCenters = new Set([hoverTarget]);
                CHANNELS_DATA.forEach(ch => {
                    const isActive = activeGatesCombined.has(ch.gateA) && activeGatesCombined.has(ch.gateB);
                    if (isActive) {
                        if (ch.centerA === hoverTarget) connectedCenters.add(ch.centerB);
                        if (ch.centerB === hoverTarget) connectedCenters.add(ch.centerA);
                    }
                });

                if (centerName && connectedCenters.has(centerName)) return 1.0;
                if (gateNum) {
                    const isGateInConnected = Array.from(connectedCenters).some(c => {
                        return Object.keys(BG_CENTERS[c].gates).map(Number).includes(gateNum);
                    });
                    if (isGateInConnected) return 1.0;
                }
                return 0.15;
            }
            
            if (hoverType === 'gate') {
                if (gateNum && gateNum === hoverTarget) return 1.0;
                
                // Find the center containing the hovered gate
                let gateCenter = null;
                for (const [cName, c] of Object.entries(BG_CENTERS)) {
                    if (Object.keys(c.gates).map(Number).includes(hoverTarget)) {
                        gateCenter = cName;
                        break;
                    }
                }
                
                if (gateCenter) {
                    const connectedCenters = new Set([gateCenter]);
                    CHANNELS_DATA.forEach(ch => {
                        const isActive = activeGatesCombined.has(ch.gateA) && activeGatesCombined.has(ch.gateB);
                        if (isActive) {
                            if (ch.centerA === gateCenter) connectedCenters.add(ch.centerB);
                            if (ch.centerB === gateCenter) connectedCenters.add(ch.centerA);
                        }
                    });

                    if (centerName && connectedCenters.has(centerName)) return 1.0;
                    if (gateNum) {
                        const isGateInConnected = Array.from(connectedCenters).some(c => {
                            return Object.keys(BG_CENTERS[c].gates).map(Number).includes(gateNum);
                        });
                        if (isGateInConnected) return 1.0;
                    }
                }
                return 0.15;
            }
            
            if (hoverType === 'quarter') {
                if (gateNum) {
                    const q = getQuarterNameForIdx(hoverState.gateIdx);
                    const gIdx = GATE_ORDER.indexOf(gateNum);
                    if (gIdx !== -1 && getQuarterNameForIdx(gIdx) === q) return 1.0;
                }
                if (centerName) {
                    const centerGates = Object.keys(BG_CENTERS[centerName].gates).map(Number);
                    const q = getQuarterNameForIdx(hoverState.gateIdx);
                    const hasGateInQuarter = centerGates.some(g => {
                        const gIdx = GATE_ORDER.indexOf(g);
                        return gIdx !== -1 && getQuarterNameForIdx(gIdx) === q;
                    });
                    if (hasGateInQuarter) return 1.0;
                }
                return 0.15;
            }

            if (hoverType === 'godhead') {
                if (gateNum) {
                    const ghIdx = Math.floor(hoverState.gateIdx / 4);
                    const gIdx = GATE_ORDER.indexOf(gateNum);
                    if (gIdx !== -1 && Math.floor(gIdx / 4) === ghIdx) return 1.0;
                }
                if (centerName) {
                    const centerGates = Object.keys(BG_CENTERS[centerName].gates).map(Number);
                    const ghIdx = Math.floor(hoverState.gateIdx / 4);
                    const hasGateInGodhead = centerGates.some(g => {
                        const gIdx = GATE_ORDER.indexOf(g);
                        return gIdx !== -1 && Math.floor(gIdx / 4) === ghIdx;
                    });
                    if (hasGateInGodhead) return 1.0;
                }
                return 0.15;
            }

            return 1.0;
        }

        // ── Channels ──
        const inactiveColor = 'rgba(197,158,63,0.13)';
        const personalityColor = '#4D4D4D'; // Black/Grey
        const designColor = '#E06D53'; // Red/Coral
        const bgWidth = Math.max(8 * sc, 2);
        const fgWidth = Math.max(6 * sc, 1.5);

        CHANNELS_DATA.forEach(ch => {
            const pA = BG_CENTERS[ch.centerA].gates[ch.gateA];
            const pB = BG_CENTERS[ch.centerB].gates[ch.gateB];
            if (!pA || !pB) return;

            let path = [];
            if (ch.type === 'straight') {
                path = [S(pA), S(pB)];
            } else if (ch.type === 'bent_34_20') {
                path = [S(pA), S([145, 235]), S([145, 425]), S(pB)];
            }

            let op = 1.0;
            if (hoverType) {
                if (hoverType === 'center') {
                    if (ch.centerA === hoverTarget || ch.centerB === hoverTarget) op = 1.0;
                    else op = 0.15;
                } else if (hoverType === 'gate') {
                    let gateCenter = null;
                    for (const [cName, c] of Object.entries(BG_CENTERS)) {
                        if (Object.keys(c.gates).map(Number).includes(hoverTarget)) {
                            gateCenter = cName;
                            break;
                        }
                    }
                    if (gateCenter && (ch.centerA === gateCenter || ch.centerB === gateCenter)) {
                        op = 1.0;
                    } else {
                        op = 0.15;
                    }
                } else {
                    op = Math.max(getBodygraphOpacity(ch.centerA, ch.gateA), getBodygraphOpacity(ch.centerB, ch.gateB));
                }
            }

            ctx.save();
            ctx.globalAlpha = op;

            // Draw background
            strokeLine(path, inactiveColor, bgWidth);

            const aA_pers = activeGatesPersonality.has(ch.gateA);
            const aA_des  = activeGatesDesign.has(ch.gateA);
            const aB_pers = activeGatesPersonality.has(ch.gateB);
            const aB_des  = activeGatesDesign.has(ch.gateB);

            // Gate A half
            if (aA_pers && aA_des) {
                strokeHalf(path, designColor, fgWidth, true);
                strokeHalf(path, personalityColor, fgWidth * 0.5, true);
            } else if (aA_pers) {
                strokeHalf(path, personalityColor, fgWidth, true);
            } else if (aA_des) {
                strokeHalf(path, designColor, fgWidth, true);
            }

            // Gate B half
            if (aB_pers && aB_des) {
                strokeHalf(path, designColor, fgWidth, false);
                strokeHalf(path, personalityColor, fgWidth * 0.5, false);
            } else if (aB_pers) {
                strokeHalf(path, personalityColor, fgWidth, false);
            } else if (aB_des) {
                strokeHalf(path, designColor, fgWidth, false);
            }

            ctx.restore();
        });

        // ── Center shapes ──
        // Per-center colors matching Human Design standard reference
        const CENTER_COLORS = {
            'Head':        { def: '#FFE600', stroke: '#D4C000', hover: '#FFF176' },
            'Ajna':        { def: '#4CAF50', stroke: '#388E3C', hover: '#81C784' },
            'Throat':      { def: '#29B6F6', stroke: '#0288D1', hover: '#81D4FA' },
            'G-Center':    { def: '#FFD700', stroke: '#C9A800', hover: '#FFF176' },
            'Heart':       { def: '#C62828', stroke: '#8B0000', hover: '#E57373' },
            'Sacral':      { def: '#E53935', stroke: '#B71C1C', hover: '#EF9A9A' },
            'Root':        { def: '#FF8C00', stroke: '#E65100', hover: '#FFCC80' },
            'Spleen':      { def: '#FF8C00', stroke: '#E65100', hover: '#FFCC80' },
            'SolarPlexus': { def: '#FF8C00', stroke: '#E65100', hover: '#FFCC80' },
        };
        const uFill   = 'rgba(220, 215, 205, 0.45)';
        const uStroke = 'rgba(160, 150, 130, 0.5)';

        Object.entries(BG_CENTERS).forEach(([name, c]) => {
            const isDef = definedCenters.has(name);
            const cc = CENTER_COLORS[name] || { def: '#C59E3F', stroke: '#A8832E', hover: '#DFB135' };
            let fill   = isDef ? cc.def    : uFill;
            let stroke = isDef ? cc.stroke : uStroke;

            let op = getBodygraphOpacity(name, null);

            ctx.save();
            ctx.globalAlpha = op;

            if (hoverType === 'center' && name === hoverTarget) {
                fill   = isDef ? cc.hover : 'rgba(197,158,63,0.22)';
                stroke = isDef ? cc.def   : '#C59E3F';
            }

            if (c.poly) {
                const pts = c.poly.map(p => S(p));
                drawPolygon(ctx, pts, fill, stroke);
            }
            ctx.restore();
        });

        // ── Gate labels ──
        const fontActive = `bold ${Math.max(Math.round(9*sc),5)}px DM Sans, sans-serif`;
        const fontInactive = `${Math.max(Math.round(8*sc),4)}px DM Sans, sans-serif`;

        Object.entries(BG_CENTERS).forEach(([cName, c]) => {
            const isCDef = definedCenters.has(cName);
            Object.entries(c.gates).forEach(([gStr, pos]) => {
                const g = parseInt(gStr);
                const aPers = activeGatesPersonality.has(g);
                const aDes = activeGatesDesign.has(g);
                const pt = S(pos);

                let op = getBodygraphOpacity(cName, g);
                ctx.save();
                ctx.globalAlpha = op;

                if (aPers || aDes) {
                    ctx.font = fontActive;
                } else {
                    ctx.font = fontInactive;
                }
                ctx.fillStyle = '#000000';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(g.toString(), pt[0], pt[1]);
                ctx.restore();
            });
        });

        // ── Center labels ──
        const labelSz = Math.max(Math.round(9 * sc), 5);
        ctx.font = `bold ${labelSz}px DM Sans, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Custom center label positions (relative to cx, cy)
        const labelOffsets = {
            'Head': [0, -12],
            'Ajna': [0, 12],
            'Throat': [0, 0],
            'G-Center': [0, 0],
            'Heart': [0, 0],
            'Sacral': [0, 0],
            'Root': [0, 0],
            'Spleen': [12, 0],
            'SolarPlexus': [-12, 0]
        };

        Object.entries(BG_CENTERS).forEach(([name, c]) => {
            let op = getBodygraphOpacity(name, null);
            ctx.save();
            ctx.globalAlpha = op;
            // White text on defined colored centers, dark on open centers
            ctx.fillStyle = definedCenters.has(name) ? 'rgba(255,255,255,0.92)' : 'rgba(100,90,70,0.55)';
            const off = labelOffsets[name] || [0,0];
            const pt = S([c.cx + off[0], c.cy + off[1]]);
            ctx.fillText(c.label, pt[0], pt[1]);
            ctx.restore();
        });
    }
    /* ── Standalone Bodygraph renderer ── */
    function drawBodygraph(data, canvasEl) {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext('2d');

        const container = canvasEl.parentElement;
        const maxW = container.clientWidth || 660;
        const displayW = Math.min(maxW, 660);
        const displayH = displayW * (880 / 660);

        const dpr = window.devicePixelRatio || 1;
        canvasEl.width = displayW * dpr;
        canvasEl.height = displayH * dpr;
        canvasEl.style.width = displayW + 'px';
        canvasEl.style.height = displayH + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, displayW, displayH);

        const scaleFactor = displayW / 660;
        ctx.scale(scaleFactor, scaleFactor);

        // Logical dimensions: 660 x 880
        const activeGatesPersonality = new Set();
        data.planets.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name)))
                activeGatesPersonality.add(p.hexagram.gate);
        });

        const activeGatesDesign = new Set();
        const designPlanetsList = data.design_planets || [];
        designPlanetsList.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name)))
                activeGatesDesign.add(p.hexagram.gate);
        });

        const activeGates = new Set([...activeGatesPersonality, ...activeGatesDesign]);

        const definedCenters = new Set();
        CHANNELS_DATA.forEach(ch => {
            if (activeGates.has(ch.gateA) && activeGates.has(ch.gateB)) {
                definedCenters.add(ch.centerA);
                definedCenters.add(ch.centerB);
            }
        });

        // 1. Draw Bodygraph in the center
        const sc = 0.95;
        const ox = 140;
        const oy = 131.25;
        drawBodygraphOnCtx(ctx, data, sc, ox, oy, activeGatesPersonality, activeGatesDesign, definedCenters);

        // 2. Draw Side Columns
        const planetNames = [
            "Солнце",
            "Земля",
            "Луна",
            "Истинный Северный Узел",
            "Истинный Южный Узел",
            "Меркурий",
            "Венера",
            "Марс",
            "Юпитер",
            "Сатурн",
            "Уран",
            "Нептун",
            "Плутон",
            "Хирон",
            "Лилит (истинная)",
            "Лилит (средняя)",
            "Лилит (интерп.)",
            "Приап (интерп.)"
        ];

        const lineFixations = {
            "Солнце-62-5": "exalted",
            "Луна-34-5": "detriment",
            "Юпитер-36-1": "detriment",
            "Нептун-10-6": "detriment",
            "Луна-62-5": "exalted",
            "Меркурий-25-2": "exalted",
            "Марс-38-1": "detriment",
            "Юпитер-63-2": "exalted"
        };

        function getFixation(planetName, gate, line) {
            const key = `${planetName}-${gate}-${line}`;
            if (lineFixations[key]) {
                return lineFixations[key];
            }
            const hash = (planetName.charCodeAt(0) + gate * 13 + line * 37) % 7;
            if (hash === 1) return "exalted";
            if (hash === 2) return "detriment";
            return "none";
        }

        function findPlanet(planetsList, baseName) {
            let p = planetsList.find(x => x.name === baseName);
            if (p) return p;
            if (baseName === "Истинный Северный Узел") {
                return planetsList.find(x => x.name === "Средний Северный Узел" || x.name.includes("Северный Узел"));
            }
            if (baseName === "Истинный Южный Узел") {
                return planetsList.find(x => x.name === "Средний Южный Узел" || x.name.includes("Южный Узел"));
            }
            return null;
        }

        function drawUpTriangle(ctx, x, y, size, color) {
            ctx.beginPath();
            ctx.moveTo(x, y - size / 2);
            ctx.lineTo(x + size / 2, y + size / 2);
            ctx.lineTo(x - size / 2, y + size / 2);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }

        function drawDownTriangle(ctx, x, y, size, color) {
            ctx.beginPath();
            ctx.moveTo(x - size / 2, y - size / 2);
            ctx.lineTo(x + size / 2, y - size / 2);
            ctx.lineTo(x, y + size / 2);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
        }

        function drawArrow(ctx, x, y, size, color, isRight) {
            ctx.beginPath();
            if (isRight) {
                ctx.moveTo(x - size / 2, y);
                ctx.lineTo(x + size / 2, y);
                ctx.moveTo(x + size / 6, y - size / 3);
                ctx.lineTo(x + size / 2, y);
                ctx.lineTo(x + size / 6, y + size / 3);
            } else {
                ctx.moveTo(x + size / 2, y);
                ctx.lineTo(x - size / 2, y);
                ctx.moveTo(x - size / 6, y - size / 3);
                ctx.lineTo(x - size / 2, y);
                ctx.lineTo(x - size / 6, y + size / 3);
            }
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        const yStart = 189;
        const ySpacing = 41.8;

        const persColor = 'rgb(77,77,77)';
        const persBaseColor = 'rgb(82,82,82)';
        const desColor = 'rgb(255,96,96)';
        const desBaseColor = 'rgb(255,106,106)';
        const glyphColor = 'rgb(136,136,136)';
        const signColor = '#B0B0B0';

        planetNames.forEach((pName, i) => {
            const y = yStart + i * ySpacing;

            // --- Personality Column (Right, xCenter = 595) ---
            const pPers = findPlanet(data.planets, pName);
            if (pPers && pPers.hexagram) {
                const xCenter = 595;
                const hx = pPers.hexagram;

                ctx.beginPath();
                ctx.arc(xCenter, y, 15, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 222, 117, 0.05)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(219, 167, 0, 0.1)';
                ctx.lineWidth = 1.0;
                ctx.stroke();

                drawPlanetOnCanvas(ctx, pName, pPers.symbol, xCenter, y, 15, glyphColor);

                const xText = xCenter - 35.85;
                ctx.font = 'normal 13px DM Sans, sans-serif';
                ctx.fillStyle = persColor;
                ctx.fillText(hx.gate.toString(), xText - 6, y);
                
                ctx.font = 'normal 9px DM Sans, sans-serif';
                ctx.fillText(hx.line.toString(), xText + 8, y - 4);

                ctx.font = 'normal 10px DM Sans, sans-serif';
                ctx.fillStyle = persBaseColor;
                ctx.fillText(`${hx.color}.${hx.tone}.${hx.base}`, xText, y + 14);

                const signSym = signMeta(pPers.formatted.sign).sym;
                ctx.font = '13px sans-serif';
                ctx.fillStyle = signColor;
                ctx.fillText(signSym, xCenter - 71, y);

                const fix = getFixation(pName, hx.gate, hx.line);
                if (fix === "exalted") {
                    drawUpTriangle(ctx, xCenter - 31, y - 18, 6, persBaseColor);
                } else if (fix === "detriment") {
                    drawDownTriangle(ctx, xCenter - 31, y - 18, 6, persBaseColor);
                }

                if (pName !== "Солнце" && pName !== "Земля" && pName !== "Луна") {
                    drawArrow(ctx, xCenter - 45, y - 24, 10, persBaseColor, !pPers.is_retrograde);
                }
            }

            // --- Design Column (Left, xCenter = 65) ---
            const pDes = findPlanet(designPlanetsList, pName);
            if (pDes && pDes.hexagram) {
                const xCenter = 65;
                const hx = pDes.hexagram;

                ctx.beginPath();
                ctx.arc(xCenter, y, 15, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 96, 96, 0.05)';
                ctx.fill();
                ctx.strokeStyle = 'rgba(255, 96, 96, 0.1)';
                ctx.lineWidth = 1.0;
                ctx.stroke();

                drawPlanetOnCanvas(ctx, pName, pDes.symbol, xCenter, y, 15, glyphColor);

                const xText = xCenter + 35.85;
                ctx.font = 'normal 13px DM Sans, sans-serif';
                ctx.fillStyle = desColor;
                ctx.fillText(hx.gate.toString(), xText - 6, y);
                
                ctx.font = 'normal 9px DM Sans, sans-serif';
                ctx.fillText(hx.line.toString(), xText + 8, y - 4);

                ctx.font = 'normal 10px DM Sans, sans-serif';
                ctx.fillStyle = desBaseColor;
                ctx.fillText(`${hx.color}.${hx.tone}.${hx.base}`, xText, y + 14);

                const signSym = signMeta(pDes.formatted.sign).sym;
                ctx.font = '13px sans-serif';
                ctx.fillStyle = signColor;
                ctx.fillText(signSym, xCenter + 58, y);

                const fix = getFixation(pName, hx.gate, hx.line);
                if (fix === "exalted") {
                    drawUpTriangle(ctx, xCenter + 40, y - 18, 6, desBaseColor);
                } else if (fix === "detriment") {
                    drawDownTriangle(ctx, xCenter + 40, y - 18, 6, desBaseColor);
                }

                if (pName !== "Солнце" && pName !== "Земля" && pName !== "Луна") {
                    drawArrow(ctx, xCenter + 25, y - 24, 10, desBaseColor, !pDes.is_retrograde);
                }
            }
        });
    }

    /* ── Helper utilities ── */
    function getQuadraticBezierPoint(t, p0, p1, p2) {
        const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
        const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
        return [x, y];
    }

    function drawBezierHalf(ctx, start, ctrl, end, strokeColor, width) {
        ctx.beginPath();
        ctx.moveTo(start[0], start[1]);
        ctx.quadraticCurveTo(ctrl[0], ctrl[1], end[0], end[1]);
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.stroke();
    }

    function drawPolygon(ctx, pts, fill, stroke) {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function drawTriangle(ctx, x1, y1, x2, y2, x3, y3, fill, stroke) {
        drawPolygon(ctx, [[x1,y1],[x2,y2],[x3,y3]], fill, stroke);
    }

    function drawRect(ctx, x, y, w, h, fill, stroke) {
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }

    function drawDiamond(ctx, cx, cy, w, h, fill, stroke) {
        drawPolygon(ctx, [[cx,cy-h/2],[cx+w/2,cy],[cx,cy+h/2],[cx-w/2,cy]], fill, stroke);
    }

    const mandalaSettings = {
        bodygraph: true,
        hexagrams: true,
        mirror: true,
        zodiac: true,
        houses: true,
        cross: true
    };

    const mandalaAnimState = {
        hexagrams: { progress: 1, startAngle: -0.22 },
        mirror:    { progress: 1, startAngle:  0.22 },
        zodiac:    { progress: 1, startAngle: -0.18 },
        houses:    { progress: 1, startAngle:  0.18 },
        cross:     { progress: 1, startAngle: -0.25 }
    };

    let mandalaAnimFrameId = null;

    // ── HD Type, Profile & Authority ──────────────────────────────────────────
    function computeHdInfo(data) {
        // Build active gates from personality + design
        const activeGates = new Set();
        (data.planets || []).forEach(p => { if (p.hexagram) activeGates.add(p.hexagram.gate); });
        (data.design_planets || []).forEach(p => { if (p.hexagram) activeGates.add(p.hexagram.gate); });

        // Defined centers via channels
        const definedCenters = new Set();
        CHANNELS_DATA.forEach(ch => {
            if (activeGates.has(ch.gateA) && activeGates.has(ch.gateB)) {
                definedCenters.add(ch.centerA);
                definedCenters.add(ch.centerB);
            }
        });

        // Motor centers
        const motors = ['Heart', 'Root', 'SolarPlexus', 'Sacral'];
        const hasSacral   = definedCenters.has('Sacral');
        const hasThroat   = definedCenters.has('Throat');
        const hasHeart    = definedCenters.has('Heart');
        const hasRoot     = definedCenters.has('Root');
        const hasSolar    = definedCenters.has('SolarPlexus');

        // Check if any motor is connected to Throat via defined channel
        function motorConnectedToThroat() {
            // Direct channel between motor and throat
            const motorThroatChannels = [
                [45, 21], // Heart-Throat
                [35, 36], // Throat-SolarPlexus
                [12, 22], // Throat-SolarPlexus
            ];
            // Also indirect: motor → G → Throat, motor → Sacral → G → Throat etc.
            // Simplified: check if any defined channel connects a motor center to Throat
            return CHANNELS_DATA.some(ch => {
                const active = activeGates.has(ch.gateA) && activeGates.has(ch.gateB);
                if (!active) return false;
                const centersInvolved = [ch.centerA, ch.centerB];
                const hasMotor = centersInvolved.some(c => motors.includes(c) && c !== 'Sacral');
                const hasThroatC = centersInvolved.includes('Throat');
                return hasMotor && hasThroatC;
            });
        }

        // Determine type
        let type;
        if (definedCenters.size === 0) {
            type = 'Рефлектор';
        } else if (hasSacral) {
            // Generator family
            if (motorConnectedToThroat()) {
                type = 'Манифестирующий Генератор';
            } else {
                type = 'Генератор';
            }
        } else {
            // No sacral
            if (motorConnectedToThroat()) {
                type = 'Манифестор';
            } else {
                type = 'Проектор';
            }
        }

        // Determine profile from Personality Sun line
        const sunPers = (data.planets || []).find(p => p.name === 'Sun' || p.name === 'Солнце' || p.id === 0);
        const sunDes  = (data.design_planets || []).find(p => p.name === 'Sun' || p.name === 'Солнце' || p.id === 0);
        const persLine = sunPers?.hexagram?.line || null;
        const desLine  = sunDes?.hexagram?.line  || null;
        const profile  = (persLine && desLine) ? `${persLine}/${desLine}` : null;

        // Determine authority
        let authority = 'Нет внутреннего авторитета';
        if (hasSolar)  authority = 'Эмоциональный';
        else if (hasSacral) authority = 'Сакральный';
        else if (definedCenters.has('Spleen')) authority = 'Селезёночный';
        else if (hasHeart && hasThroat) authority = 'Эго-манифестированный';
        else if (hasHeart) authority = 'Эго-проецированный';
        else if (definedCenters.has('G-Center') && hasThroat) authority = 'Ментально-проецированный';
        else if (definedCenters.size === 0) authority = 'Лунный цикл';

        return { type, profile, authority };
    }

    function updateHdTypeProfile(data) {
        const block = document.getElementById('hd-type-profile-block');
        const typeBadge = document.getElementById('hd-type-badge');
        const profileBadge = document.getElementById('hd-profile-badge');
        const authorityBadge = document.getElementById('hd-authority-badge');
        if (!block || !typeBadge) return;

        const info = computeHdInfo(data);

        // Type colors
        const typeStyles = {
            'Генератор':                  { bg: '#FF8C00', color: '#fff' },
            'Манифестирующий Генератор':  { bg: '#F5C400', color: '#2E2A20' },
            'Манифестор':                 { bg: '#E53935', color: '#fff' },
            'Проектор':                   { bg: '#1E88E5', color: '#fff' },
            'Рефлектор':                  { bg: '#546E7A', color: '#fff' },
        };
        const st = typeStyles[info.type] || { bg: '#C59E3F', color: '#fff' };
        typeBadge.textContent = info.type;
        typeBadge.style.background = st.bg;
        typeBadge.style.color = st.color;
        typeBadge.style.boxShadow = `0 2px 12px ${st.bg}44`;

        profileBadge.innerHTML = info.profile
            ? `<span style="opacity:0.6;font-weight:500;">Профиль</span> <strong>${info.profile}</strong>`
            : '';

        authorityBadge.innerHTML = `<span style="opacity:0.6;font-weight:500;">Авторитет</span> <strong>${info.authority}</strong>`;

        block.style.display = 'block';
    }
    // ─────────────────────────────────────────────────────────────────────────

    function animateMandala() {
        if (mandalaAnimFrameId) cancelAnimationFrame(mandalaAnimFrameId);

        const canvasEl = document.getElementById('mandala-canvas');
        if (!canvasEl || !lastChart) return;

        const speed = 0.12;

        function step() {
            let stillMoving = false;

            for (const [key, state] of Object.entries(mandalaAnimState)) {
                const target = mandalaSettings[key] ? 1 : 0;
                const diff = target - state.progress;
                if (Math.abs(diff) > 0.001) {
                    state.progress += diff * speed;
                    stillMoving = true;
                } else {
                    state.progress = target;
                }
            }

            drawMandala(lastChart, canvasEl, typeof mandalaHoverState !== 'undefined' ? mandalaHoverState : null);

            if (stillMoving) {
                mandalaAnimFrameId = requestAnimationFrame(step);
            } else {
                mandalaAnimFrameId = null;
            }
        }

        step();
    }

    /* ── Mandala renderer (with bodygraph overlay inside) ── */
    function drawMandala(data, canvasEl, hoverState = null) {
        if (!canvasEl) return;
        const ctx = canvasEl.getContext('2d');

        const container = canvasEl.parentElement;
        const displayW = Math.min(container.clientWidth || 780, 780);
        const dpr = window.devicePixelRatio || 1;

        canvasEl.width = displayW * dpr;
        canvasEl.height = displayW * dpr;
        canvasEl.style.width = displayW + 'px';
        canvasEl.style.height = displayW + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const size = displayW;
        const cx = size / 2;
        const cy = size / 2;
        const R = size / 2 - 8;

        // ── All rings stack from outside in with FIXED widths ──────────────────
        // When outer rings are off, inner rings (incl. gates) shift outward to fill the gap.
        // Bodygraph scale is independent and never changes.
        const pH  = mandalaAnimState.hexagrams.progress;
        const pM  = mandalaAnimState.mirror.progress;
        const pZ  = mandalaAnimState.zodiac.progress;
        const pH2 = mandalaAnimState.houses.progress;

        const W_HEX     = R * 0.080;
        const W_MIRROR  = R * 0.052;
        const W_GATENUM = R * 0.054;  // gate numbers band width
        const W_DIAL    = R * 0.024;  // 6-line dial band width with ticks and activations
        const W_GATES   = W_GATENUM + W_DIAL;  // gates dial — always visible, but position can shift
        const W_ZODIAC  = R * 0.070;
        const W_HOUSES  = R * 0.090;

        // Outer rings: stack from R inward
        const rHexagramsOuter = R;
        const rHexagramsInner = R - W_HEX * pH;

        const rMirrorOuter    = rHexagramsInner;
        const rMirrorInner    = rMirrorOuter - W_MIRROR * pM;

        // Gates dial: always drawn, but shifts outward when outer rings turn off
        const rGatesOuter     = rMirrorInner;
        const rGatesInner     = rGatesOuter - W_GATENUM;  // gate numbers band
        const rDialOuter      = rGatesInner;
        const rDialInner      = rGatesOuter - W_GATES;    // 6-line dial band bottom edge

        // Inner rings: stack from gates inward
        const W_ZODIAC_C = R * 0.070;
        const W_HOUSES_C = R * 0.090;

        const rZodiacOuter    = rDialInner;
        const rZodiacInner    = rZodiacOuter - W_ZODIAC_C * pZ;

        const rHousesOuter    = rZodiacInner;
        const rHousesInner    = rHousesOuter - W_HOUSES_C * pH2;

        const rInnerBorder    = rHousesInner;
        // ─────────────────────────────────────────────────────────────────────










        ctx.clearRect(0, 0, size, size);

        // 1. Draw solid clean background
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx, cy, R, 0, Math.PI * 2);
        ctx.fill();

        // Soft radial gradient for central bodygraph area
        const centerGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rInnerBorder);
        centerGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        centerGrad.addColorStop(0.70, 'rgba(253, 251, 248, 0.95)');
        centerGrad.addColorStop(1, 'rgba(240, 236, 225, 0.35)');
        ctx.fillStyle = centerGrad;
        ctx.beginPath();
        ctx.arc(cx, cy, rInnerBorder, 0, Math.PI * 2);
        ctx.fill();
        // Subtle semi-transparent blue background for the outermost hexagram ring
        ctx.beginPath();
        ctx.arc(cx, cy, rHexagramsOuter, 0, Math.PI * 2);
        ctx.arc(cx, cy, rHexagramsInner, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(41, 98, 160, 0.09)';
        ctx.fill();


        const GATE_ORDER = [
            25, 36, 22, 63, 37, 55, 30, 49, 13, 19, 41, 60, 61, 54, 38, 58,
            10, 11, 26,  5,  9, 34, 14, 43,  1, 44, 28, 50, 32, 57, 48, 18,
            46,  6, 47, 64, 40, 59, 29,  4,  7, 33, 31, 56, 62, 53, 39, 52,
            15, 12, 45, 35, 16, 20,  8, 23,  2, 24, 27,  3, 42, 51, 21, 17
        ];
        const WHEEL_START = 358.0 + 15.0 / 60.0 + 1.0 / 3600.0;
        const GATE_INTERVAL = 5.625;

        // Compile active gates and planets
        const activeGatesPersonality = new Set();
        data.planets.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name)))
                activeGatesPersonality.add(p.hexagram.gate);
        });

        const activeGatesDesign = new Set();
        const designPlanetsList = data.design_planets || [];
        designPlanetsList.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name)))
                activeGatesDesign.add(p.hexagram.gate);
        });

        const activeGatesCombined = new Set([...activeGatesPersonality, ...activeGatesDesign]);

        // Group activations by gate
        const activationsByGate = {};
        for (let g = 1; g <= 64; g++) {
            activationsByGate[g] = [];
        }
        data.planets.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name))) {
                activationsByGate[p.hexagram.gate].push({
                    type: 'personality',
                    symbol: PLANET_META[p.name]?.sym || p.symbol || '?',
                    color: '#2E2A20',
                    line: p.hexagram.line
                });
            }
        });
        designPlanetsList.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name))) {
                activationsByGate[p.hexagram.gate].push({
                    type: 'design',
                    symbol: PLANET_META[p.name]?.sym || p.symbol || '?',
                    color: 'rgb(255,96,96)',
                    line: p.hexagram.line
                });
            }
        });

        // Incarnation Cross gates & exact longitudes (Sun and Earth)
        // Planet names come from backend in Russian: 'Солнце', 'Земля'
        let pSunGate = null, pEarthGate = null, pSunLine = null, pEarthLine = null;
        let dSunGate = null, dEarthGate = null, dSunLine = null, dEarthLine = null;
        let pSunLon = null, pEarthLon = null;
        let dSunLon = null, dEarthLon = null;
        data.planets.forEach(p => {
            if (p.name === 'Солнце') {
                pSunGate = p.hexagram?.gate;
                pSunLine = p.hexagram?.line ?? null;
                pSunLon  = p.longitude;
            }
            if (p.name === 'Земля') {
                pEarthGate = p.hexagram?.gate;
                pEarthLine = p.hexagram?.line ?? null;
                pEarthLon  = p.longitude;
            }
        });
        designPlanetsList.forEach(p => {
            if (p.name === 'Солнце') {
                dSunGate = p.hexagram?.gate;
                dSunLine = p.hexagram?.line ?? null;
                dSunLon  = p.longitude;
            }
            if (p.name === 'Земля') {
                dEarthGate = p.hexagram?.gate;
                dEarthLine = p.hexagram?.line ?? null;
                dEarthLon  = p.longitude;
            }
        });

        // Hover state helper variables
        const hoverType = hoverState ? hoverState.type : null;
        const hoverTarget = hoverState ? hoverState.target : null;

        // ── Draw Incarnation Cross — two axes through mandala center ──────────
        // Gate+line position on the mandala wheel:
        //   gate sector starts at WHEEL_START + gateIdx * GATE_INTERVAL
        //   each of 6 lines = GATE_INTERVAL/6 wide
        //   line N midpoint = gateStart + (N - 0.5) * lineWidth
        function gateLineAngle(gateNum, lineNum) {
            const idx = GATE_ORDER.indexOf(gateNum);
            if (idx < 0) return null;
            const lineWidth = GATE_INTERVAL / 6;
            const gateStart = WHEEL_START + idx * GATE_INTERVAL;
            const line = (lineNum >= 1 && lineNum <= 6) ? lineNum : 3.5; // fallback = midpoint
            const lon = (gateStart + (line - 0.5) * lineWidth) % 360;
            return degToRad(lon - 180);
        }

        function drawCrossAxis(gateA, lineA, gateB, lineB, col, colHover, lineW) {
            const aA = gateLineAngle(gateA, lineA);
            const aB = gateLineAngle(gateB, lineB);
            if (aA === null || aB === null) return;

            const isHov = hoverType === 'gate' && (
                hoverTarget === pSunGate || hoverTarget === pEarthGate ||
                hoverTarget === dSunGate || hoverTarget === dEarthGate
            );
            const color = isHov ? colHover : col;
            const rLine = R + 18;

            // Full line from gate A through center to gate B
            ctx.beginPath();
            ctx.moveTo(cx + rLine * Math.cos(aA), cy + rLine * Math.sin(aA));
            ctx.lineTo(cx + rLine * Math.cos(aB), cy + rLine * Math.sin(aB));
            ctx.strokeStyle = color;
            ctx.lineWidth   = lineW;
            ctx.lineCap     = 'round';
            ctx.setLineDash([]);
            ctx.stroke();

            // Dot markers at both gate positions on the rim
            const dotR = lineW * 1.8;
            [aA, aB].forEach(a => {
                ctx.beginPath();
                ctx.arc(cx + rLine * Math.cos(a), cy + rLine * Math.sin(a), dotR, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            });
        }

        const pCross = mandalaAnimState.cross.progress;
        if (pCross > 0.001) {
            ctx.save();
            ctx.globalAlpha = pCross;
            const rotCross = (1 - pCross) * mandalaAnimState.cross.startAngle;
            if (Math.abs(rotCross) > 0.0001) {
                ctx.translate(cx, cy);
                ctx.rotate(rotCross);
                ctx.translate(-cx, -cy);
            }
            // Design axis — RED (красное Солнце Дизайна → красная Земля Дизайна)
            drawCrossAxis(dSunGate, dSunLine, dEarthGate, dEarthLine, 'rgba(210, 55, 55, 0.30)', 'rgba(210, 55, 55, 0.95)', 2.5);
            // Personality axis — BLACK (чёрное Солнце → чёрная Земля)
            drawCrossAxis(pSunGate, pSunLine, pEarthGate, pEarthLine, 'rgba(30, 25, 15, 0.30)', 'rgba(30, 25, 15, 0.95)', 2.5);
            ctx.restore();
        }







        function getQuarterNameForIdx(idx) {
            if (idx >= 56 || idx <= 7) return "Инициация";
            if (idx >= 8 && idx <= 23) return "Цивилизация";
            if (idx >= 24 && idx <= 39) return "Дуальность";
            if (idx >= 40 && idx <= 55) return "Мутация";
            return "";
        }

        function isGateHighlighted(gateNum, gateIdx) {
            if (!hoverType) return true;
            if (hoverType === 'gate') {
                // If hovering over one of the incarnation cross gates,
                // keep all 4 cross gates highlighted (Personality & Design Sun/Earth)
                const isCrossHovered = (
                    hoverTarget === pSunGate || 
                    hoverTarget === pEarthGate || 
                    hoverTarget === dSunGate || 
                    hoverTarget === dEarthGate
                );
                if (isCrossHovered) {
                    return (
                        gateNum === pSunGate || 
                        gateNum === pEarthGate || 
                        gateNum === dSunGate || 
                        gateNum === dEarthGate
                    );
                }
                return gateNum === hoverTarget;
            }
            if (hoverType === 'center') {
                const centerGates = Object.keys(BG_CENTERS[hoverTarget].gates).map(Number);
                return centerGates.includes(gateNum);
            }
            if (hoverType === 'quarter') {
                const qIdx = hoverState.gateIdx;
                return getQuarterNameForIdx(qIdx) === getQuarterNameForIdx(gateIdx);
            }
            if (hoverType === 'godhead') {
                const ghIdx = Math.floor(hoverState.gateIdx / 4);
                return ghIdx === Math.floor(gateIdx / 4);
            }
            if (hoverType === 'house') {
                if (data.houses && data.houses.length === 12) {
                    const houseIdx = hoverTarget - 1;
                    const h = data.houses[houseIdx];
                    const hNext = data.houses[(houseIdx + 1) % 12];
                    const getProgramBoundary = (houseData) => {
                        if (!houseData || !houseData.hexagram) return houseData ? houseData.longitude : 0;
                        const gIdx = GATE_ORDER.indexOf(houseData.hexagram.gate);
                        if (gIdx === -1) return houseData.longitude;
                        const lineIdx = (houseData.hexagram.line || 1) - 1;
                        return (WHEEL_START + gIdx * GATE_INTERVAL + lineIdx * (GATE_INTERVAL / 6)) % 360;
                    };
                    const s = getProgramBoundary(hNext);
                    const e = getProgramBoundary(h);
                    const midLon = (WHEEL_START + gateIdx * GATE_INTERVAL + GATE_INTERVAL / 2) % 360;
                    
                    if (e < s) {
                        return (midLon >= s || midLon < e);
                    } else {
                        return (midLon >= s && midLon < e);
                    }
                }
                return false;
            }
            return true;
        }

        // Helper function for rotated labels that corrects for upside-down reading
        function drawRotatedText(text, r, angle, font, color) {
            ctx.save();
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            ctx.translate(x, y);
            
            let rotation = angle + Math.PI / 2;
            if (angle > 0 && angle < Math.PI) {
                rotation = angle - Math.PI / 2;
            }
            ctx.rotate(rotation);
            ctx.fillText(text, 0, 0);
            ctx.restore();
        }

        // 1. Quarters segment drawing removed as requested
        // 2. Godheads drawing removed as requested


        // 3. Hexagrams and Gates rings rendering
        const HEX_LINES = {
            1: "111111", 2: "000000", 3: "100010", 4: "010001", 5: "111010", 6: "010111", 7: "010000", 8: "000010",
            9: "111011", 10: "110111", 11: "111000", 12: "000111", 13: "101111", 14: "111101", 15: "001000", 16: "000100",
            17: "100110", 18: "011001", 19: "110000", 20: "000011", 21: "100101", 22: "101001", 23: "000001", 24: "100000",
            25: "100111", 26: "111001", 27: "100001", 28: "011110", 29: "010010", 30: "101101", 31: "001110", 32: "011100",
            33: "001111", 34: "111100", 35: "000101", 36: "101000", 37: "101011", 38: "110101", 39: "001010", 40: "010100",
            41: "110001", 42: "100011", 43: "111110", 44: "011111", 45: "000110", 46: "011000", 47: "010110", 48: "011010",
            49: "101110", 50: "011101", 51: "100100", 52: "001001", 53: "001011", 54: "110100", 55: "101100", 56: "001101",
            57: "011011", 58: "110110", 59: "010011", 60: "110010", 61: "110011", 62: "001100", 63: "101010", 64: "010101"
        };

        for (let i = 0; i < 64; i++) {
            const gateNum = GATE_ORDER[i];
            const isPersActive = activeGatesPersonality.has(gateNum);
            const isDesActive = activeGatesDesign.has(gateNum);
            const isCombinedActive = activeGatesCombined.has(gateNum);

            const isHighlighted = isGateHighlighted(gateNum, i);
            const isAnyHovered = (hoverType !== null);

            const startLon = (WHEEL_START + i * GATE_INTERVAL) % 360;
            const startAngle = degToRad(startLon - 180);
            const endAngle = degToRad(startLon + GATE_INTERVAL - 180);
            const midAngle = (startAngle + endAngle) / 2;

            const activations = activationsByGate[gateNum] || [];
            const byLine = {};
            activations.forEach(act => {
                const ln = act.line || 1;
                if (!byLine[ln]) byLine[ln] = [];
                byLine[ln].push(act);
            });

            // Highlight active gate cell background
            if (isCombinedActive) {
                ctx.beginPath();
                ctx.moveTo(cx + rGatesInner * Math.cos(startAngle), cy + rGatesInner * Math.sin(startAngle));
                ctx.arc(cx, cy, rGatesOuter, startAngle, endAngle);
                ctx.lineTo(cx + rGatesInner * Math.cos(endAngle), cy + rGatesInner * Math.sin(endAngle));
                ctx.closePath();

                let opacityScale = 1.0;
                if (isAnyHovered && !isHighlighted) opacityScale = 0.15;

                const isCrossGate = (gateNum === pSunGate || gateNum === pEarthGate || gateNum === dSunGate || gateNum === dEarthGate);
                if (isCrossGate) {
                    const isDesign = (gateNum === dSunGate || gateNum === dEarthGate);
                    ctx.fillStyle = isDesign ? `rgba(255,96,96,${0.28 * opacityScale})` : `rgba(46,42,32,${0.18 * opacityScale})`;
                } else {
                    if (isPersActive && isDesActive) {
                        ctx.fillStyle = `rgba(46,42,32,${0.12 * opacityScale})`;
                    } else if (isDesActive) {
                        ctx.fillStyle = `rgba(255,96,96,${0.12 * opacityScale})`;
                    } else if (isPersActive) {
                        ctx.fillStyle = `rgba(46,42,32,${0.10 * opacityScale})`;
                    } else {
                        ctx.fillStyle = 'rgba(0,0,0,0)';
                    }
                }
                ctx.fill();
            }

            // Draw colored activation blocks inside the 6 dial cells
            const slotSize = GATE_INTERVAL / 6;
            Object.entries(byLine).forEach(([lineStr, acts]) => {
                const lineNum = parseInt(lineStr); // 1-6
                const slotStartLon = startLon + (lineNum - 1) * slotSize;
                const N = acts.length;
                
                acts.forEach((act, idx) => {
                    // Divide cell angularly if there are multiple activations in this line
                    const subStartLon = slotStartLon + idx * (slotSize / N);
                    const subEndLon = slotStartLon + (idx + 1) * (slotSize / N);
                    const aStart = degToRad(subStartLon - 180);
                    const aEnd = degToRad(subEndLon - 180);

                    ctx.beginPath();
                    ctx.moveTo(cx + rDialInner * Math.cos(aStart), cy + rDialInner * Math.sin(aStart));
                    ctx.arc(cx, cy, rGatesInner, aStart, aEnd);
                    ctx.lineTo(cx + rDialInner * Math.cos(aEnd), cy + rDialInner * Math.sin(aEnd));
                    ctx.arc(cx, cy, rDialInner, aEnd, aStart, true);
                    ctx.closePath();

                    let fillColor = act.color;
                    if (isAnyHovered) {
                        fillColor = isHighlighted ? act.color : 'rgba(150, 150, 150, 0.08)';
                    }
                    ctx.fillStyle = fillColor;
                    ctx.fill();
                });
            });

            // Radial divider lines for gates (extended through dial ring to rDialInner)
            ctx.beginPath();
            ctx.moveTo(cx + rDialInner * Math.cos(startAngle), cy + rDialInner * Math.sin(startAngle));
            ctx.lineTo(cx + rGatesOuter * Math.cos(startAngle), cy + rGatesOuter * Math.sin(startAngle));
            
            let strokeColor;
            if (isAnyHovered) {
                strokeColor = isHighlighted
                    ? (isDesActive ? 'rgba(255,96,96,0.7)' : 'rgba(46,42,32,0.7)')
                    : 'rgba(120,120,120,0.04)';
            } else {
                strokeColor = isCombinedActive
                    ? (isDesActive && isPersActive ? 'rgba(46,42,32,0.35)' : isDesActive ? 'rgba(255,96,96,0.35)' : 'rgba(46,42,32,0.35)')
                    : 'rgba(180,175,165,0.18)';
            }
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = isAnyHovered ? (isHighlighted ? 1.2 : 0.4) : (isCombinedActive ? 1.0 : 0.6);
            ctx.stroke();

            // 6 slots per gate: sub-divider ticks in the dial ring (from rGatesInner to rDialInner)
            const tickSpacing = GATE_INTERVAL / 6;
            for (let t = 1; t <= 5; t++) {
                const tickLon = startLon + t * tickSpacing;
                const tickAngle = degToRad(tickLon - 180);
                let tickColor = 'rgba(180,175,165,0.22)';
                if (isAnyHovered) {
                    tickColor = isHighlighted ? 'rgba(120,115,105,0.45)' : 'rgba(120,120,120,0.03)';
                }
                ctx.beginPath();
                ctx.moveTo(cx + rGatesInner * Math.cos(tickAngle), cy + rGatesInner * Math.sin(tickAngle));
                ctx.lineTo(cx + rDialInner * Math.cos(tickAngle), cy + rDialInner * Math.sin(tickAngle));
                ctx.strokeStyle = tickColor;
                ctx.lineWidth = 0.6;
                ctx.stroke();
            }

            // Draw Gate Number
            const lx = cx + (rGatesOuter + rGatesInner) / 2 * Math.cos(midAngle);
            const ly = cy + (rGatesOuter + rGatesInner) / 2 * Math.sin(midAngle);
            
            let font = isCombinedActive ? 'bold 11px DM Sans, sans-serif' : '600 9.5px DM Sans, sans-serif';
            // Color logic: Personality=black, Design=red, Both=black, inactive=softer grey
            const gBoth = isPersActive && isDesActive;
            let fillStyle = (gBoth || isPersActive) ? '#2E2A20'
                          : isDesActive             ? 'rgb(220,60,60)'
                          : 'rgba(165, 158, 145, 0.48)';

            if (isAnyHovered) {
                if (isHighlighted) {
                    font = 'bold 13px DM Sans, sans-serif';
                } else {
                    fillStyle = 'rgba(180, 180, 180, 0.12)';
                }
            }

            ctx.font = font;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = fillStyle;
            ctx.fillText(gateNum.toString(), lx, ly);

            const pHex = mandalaAnimState.hexagrams.progress;
            if (pHex > 0.001) {
                ctx.save();
                ctx.globalAlpha = pHex;
                const rotHex = (1 - pHex) * mandalaAnimState.hexagrams.startAngle;
                if (Math.abs(rotHex) > 0.0001) {
                    ctx.translate(cx, cy);
                    ctx.rotate(rotHex);
                    ctx.translate(-cx, -cy);
                }

                // Draw I Ching Hexagram (6 stacked horizontal lines, unrotated, matching reference)
                const lineStr = HEX_LINES[gateNum] || "000000";
                const rHexMid = (rHexagramsInner + rHexagramsOuter) / 2;
                const hx = cx + rHexMid * Math.cos(midAngle);
                const hy = cy + rHexMid * Math.sin(midAngle);

                const lineLen = 14.0;     // Total width of each line in px
                const lineSpacing = 2.8;  // Equal vertical distance between all lines
                const gap = 3.0;          // Center gap in Yin (broken) line in px
                const halfLen = lineLen / 2;
                const halfGap = gap / 2;

                let hexColor = isPersActive ? '#2E2A20' : (isDesActive ? 'rgb(220, 60, 60)' : 'rgba(195, 188, 178, 0.32)');
                if (isAnyHovered) {
                    if (isHighlighted) {
                        hexColor = isPersActive ? '#000000' : (isDesActive ? 'rgb(230, 60, 60)' : 'rgba(80, 80, 80, 0.9)');
                    } else {
                        hexColor = 'rgba(180, 180, 180, 0.12)';
                    }
                }

                ctx.lineWidth = 1.2;
                ctx.lineCap = 'butt';
                ctx.strokeStyle = hexColor;

                // Stack 6 lines vertically (Line 6 at top, Line 1 at bottom)
                for (let j = 0; j < 6; j++) {
                    const lineType = lineStr[j]; // '1' = Yang (solid), '0' = Yin (broken)
                    const yOff = (2.5 - j) * lineSpacing; // Line 6 (j=5) at top, Line 1 (j=0) at bottom
                    const yLine = hy + yOff;

                    ctx.beginPath();
                    if (lineType === '1') {
                        // Solid Yang line
                        ctx.moveTo(hx - halfLen, yLine);
                        ctx.lineTo(hx + halfLen, yLine);
                    } else {
                        // Broken Yin line
                        ctx.moveTo(hx - halfLen, yLine);
                        ctx.lineTo(hx - halfGap, yLine);
                        ctx.moveTo(hx + halfGap, yLine);
                        ctx.lineTo(hx + halfLen, yLine);
                    }
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        // 3.5 Mirror Ring — Зеркало Жизни
        // Placed between hexagram lines (outer) and gate numbers ring.
        // Gate sequence starts at the Ascendant (AS = 0°), step 5.625°.
        // Shows ONLY activated gate numbers — inactive ones are completely hidden.
        const MIRROR_GATE_ORDER = [
            41, 61, 60, 10, 58, 54, 38, 24, 27, 42,  3, 25, 17, 51, 21, 13, 49, 55, 30, 36,
            22, 37, 63,  2, 23, 20,  8, 12, 45, 16, 35, 33, 31, 62, 56, 15, 52, 53, 39, 44,
            28, 32, 50, 46, 18, 57, 48,  7,  4, 59, 29,  6, 47, 40, 64,  1, 43, 34, 14, 11,
            26,  9,  5, 19
        ];

        const pMir = mandalaAnimState.mirror.progress;
        if (pMir > 0.001 && data.houses && data.houses.length >= 1) {
            ctx.save();
            ctx.globalAlpha = pMir;
            const rotMir = (1 - pMir) * mandalaAnimState.mirror.startAngle;
            if (Math.abs(rotMir) > 0.0001) {
                ctx.translate(cx, cy);
                ctx.rotate(rotMir);
                ctx.translate(-cx, -cy);
            }

            const AS = data.houses[0].longitude;
            const MIRROR_INTERVAL = GATE_INTERVAL; // same 5.625°

            // Determine which mirror sectors are activated (have a planet landing in them)
            const mirrorActivated = new Set(); // indices 0-63
            const mirrorHasPers  = new Set();
            const mirrorHasDes   = new Set();

            data.planets.forEach(p => {
                if (p.longitude != null && (!activePlanets || activePlanets.has(p.name))) {
                    // Clockwise from AS: mirror offset = (AS - lon + 360) % 360
                    const mIdx = Math.floor(((AS - p.longitude + 360) % 360) / MIRROR_INTERVAL) % 64;
                    mirrorActivated.add(mIdx);
                    mirrorHasPers.add(mIdx);
                }
            });
            (data.design_planets || []).forEach(p => {
                if (p.longitude != null && (!activePlanets || activePlanets.has(p.name))) {
                    const mIdx = Math.floor(((AS - p.longitude + 360) % 360) / MIRROR_INTERVAL) % 64;
                    mirrorActivated.add(mIdx);
                    mirrorHasDes.add(mIdx);
                }
            });

            const rMirrorMid = (rMirrorOuter + rMirrorInner) / 2;
            const mirrorBand = rMirrorOuter - rMirrorInner;
            const fontSize   = Math.round(mirrorBand * 0.65);

            for (let i = 0; i < 64; i++) {
                const gateNum  = MIRROR_GATE_ORDER[i];
                const hasAct   = mirrorActivated.has(i);

                // Completely hide inactive (dimmed) mirror programs
                if (!hasAct) continue;

                const isP      = mirrorHasPers.has(i);
                const isD      = mirrorHasDes.has(i);

                // Sectors go CLOCKWISE from AS, matching the houses ring direction.
                // Sector i covers [AS - (i+1)*INTERVAL, AS - i*INTERVAL] in longitude.
                const startLon   = (AS - (i + 1) * MIRROR_INTERVAL + 720) % 360;
                const endLon     = (AS - i * MIRROR_INTERVAL + 720) % 360;
                let   startAngle = degToRad(startLon - 180);
                let   endAngle   = degToRad(endLon   - 180);
                if (endAngle < startAngle) endAngle += 2 * Math.PI;
                const midAngle   = (startAngle + endAngle) / 2;

                // Sector background
                let bgFill;
                if (isP && isD)       bgFill = 'rgba(46,42,32,0.11)';
                else if (isP)         bgFill = 'rgba(46,42,32,0.09)';
                else if (isD)         bgFill = 'rgba(255,96,96,0.10)';
                else                  bgFill = 'rgba(0,0,0,0)';
                ctx.beginPath();
                ctx.moveTo(cx + rMirrorInner * Math.cos(startAngle), cy + rMirrorInner * Math.sin(startAngle));
                ctx.arc(cx, cy, rMirrorOuter, startAngle, endAngle);
                ctx.lineTo(cx + rMirrorInner * Math.cos(endAngle), cy + rMirrorInner * Math.sin(endAngle));
                ctx.arc(cx, cy, rMirrorInner, endAngle, startAngle, true);
                ctx.closePath();
                ctx.fillStyle = bgFill;
                ctx.fill();

                // Divider line at sector start
                ctx.beginPath();
                ctx.moveTo(cx + rMirrorInner * Math.cos(startAngle), cy + rMirrorInner * Math.sin(startAngle));
                ctx.lineTo(cx + rMirrorOuter * Math.cos(startAngle), cy + rMirrorOuter * Math.sin(startAngle));
                ctx.strokeStyle = 'rgba(160,155,145,0.22)';
                ctx.lineWidth = 0.5;
                ctx.stroke();

                // Gate number — centered in sector
                const gnx = cx + rMirrorMid * Math.cos(midAngle);
                const gny = cy + rMirrorMid * Math.sin(midAngle);

                let numColor, numFont;
                if (hasAct) {
                    const mBoth = isP && isD;
                    numColor = (mBoth || isP) ? '#2E2A20' : 'rgb(220,80,80)';
                    numFont  = 'bold 10.5px "DM Sans", sans-serif';
                } else {
                    numColor = 'rgba(150,145,130,0.28)';
                    numFont  = '500 9px "DM Sans", sans-serif';
                }

                ctx.font = numFont;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = numColor;
                ctx.fillText(gateNum.toString(), gnx, gny);
            }
            ctx.restore();
        }

        // Draw light white inner circle background (before zodiac/houses so they render on top)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
        ctx.beginPath();
        ctx.arc(cx, cy, rInnerBorder, 0, Math.PI * 2);
        ctx.fill();

        // 4. Zodiac Ring and Ticks

        const pZod = mandalaAnimState.zodiac.progress;
        if (pZod > 0.001) {
            ctx.save();
            ctx.globalAlpha = pZod;
            const rotZod = (1 - pZod) * mandalaAnimState.zodiac.startAngle;
            if (Math.abs(rotZod) > 0.0001) {
                ctx.translate(cx, cy);
                ctx.rotate(rotZod);
                ctx.translate(-cx, -cy);
            }

            // hoveredSignIdx: Rave sign (0=Aries) that a gate belongs to, anchored at WHEEL_START
            const hoveredSignIdx = (hoverType === 'gate' && hoverTarget) 
                ? Math.floor(((GATE_ORDER.indexOf(hoverTarget) * GATE_INTERVAL + GATE_INTERVAL / 2)) / 30) % 12
                : -1;

            const hoveredSignIdxs = new Set();
            if (hoverType === 'house' && data.houses && data.houses.length === 12) {
                const houseIdx = hoverTarget - 1; // 0 for Sector 1
                const h = data.houses[houseIdx];
                const hNext = data.houses[(houseIdx + 1) % 12];
                const getProgramBoundary = (houseData) => {
                    if (!houseData || !houseData.hexagram) return houseData ? houseData.longitude : 0;
                    const gateIdx = GATE_ORDER.indexOf(houseData.hexagram.gate);
                    if (gateIdx === -1) return houseData.longitude;
                    const lineIdx = (houseData.hexagram.line || 1) - 1;
                    return (WHEEL_START + gateIdx * GATE_INTERVAL + lineIdx * (GATE_INTERVAL / 6)) % 360;
                };
                const s = getProgramBoundary(hNext);
                const e = getProgramBoundary(h);
                
                for (let j = 0; j < 12; j++) {
                    const signMidLon = (WHEEL_START + j * 30 + 15) % 360;
                    let inHouse = false;
                    if (e < s) {
                        inHouse = (signMidLon >= s || signMidLon < e);
                    } else {
                        inHouse = (signMidLon >= s && signMidLon < e);
                    }
                    if (inHouse) hoveredSignIdxs.add(j);
                }
            }
            // Element colors: Fire=orange, Earth=green, Water=blue, Air=light-blue
            const ELEMENT_COLORS = {
                fire:  '#E07820', // orange
                earth: '#4A9A52', // green
                water: '#2A6EBB', // blue
                air:   '#4AB0D4'  // light blue
            };
            // Order: Aries, Taurus, Gemini, Cancer, Leo, Virgo, Libra, Scorpio, Sagittarius, Capricorn, Aquarius, Pisces
            const SIGN_ELEMENTS = [
                'fire','earth','air','water','fire','earth','air','water','fire','earth','air','water'
            ];
            const MANDALA_ZODIAC_COLORS = SIGN_ELEMENTS.map(e => ELEMENT_COLORS[e]);

            for (let i = 0; i < 12; i++) {
                // Rave Mandala: Aries (i=0) starts at WHEEL_START (358.25°) on the ecliptic
                const sLon = (WHEEL_START + i * 30) % 360;
                const eLon = (WHEEL_START + (i + 1) * 30) % 360;
                const startAngle = degToRad(sLon - 180);
                let endAngle = degToRad(eLon - 180);
                if (endAngle < startAngle) endAngle += 2 * Math.PI;
                const isAnyHovered = (hoverType !== null);
                const isHighlightedSign = (hoverType === 'gate') ? (i === hoveredSignIdx)
                                        : (hoverType === 'house') ? hoveredSignIdxs.has(i)
                                        : true;

                // Annular sector fill (ring segment, not pie from center)
                ctx.beginPath();
                ctx.arc(cx, cy, rZodiacOuter, startAngle, endAngle);
                ctx.arc(cx, cy, rZodiacInner, endAngle, startAngle, true);
                ctx.closePath();
                
                let fillOpacity = 0.22;
                if (isAnyHovered) {
                    fillOpacity = isHighlightedSign ? 0.38 : 0.04;
                }
                ctx.fillStyle = hexToRgba(MANDALA_ZODIAC_COLORS[i], fillOpacity);
                ctx.fill();

                // Sector divider line at start of each sign
                ctx.beginPath();
                ctx.moveTo(cx + rZodiacInner * Math.cos(startAngle), cy + rZodiacInner * Math.sin(startAngle));
                ctx.lineTo(cx + rZodiacOuter * Math.cos(startAngle), cy + rZodiacOuter * Math.sin(startAngle));
                ctx.strokeStyle = hexToRgba(MANDALA_ZODIAC_COLORS[i], isAnyHovered ? (isHighlightedSign ? 0.7 : 0.08) : 0.45);
                ctx.lineWidth = 1.0;
                ctx.stroke();

                // Label at midpoint of this sign's sector
                const midLon = (WHEEL_START + i * 30 + 15) % 360;
                const midAngle = degToRad(midLon - 180);
                const gx = cx + (rZodiacOuter + rZodiacInner) / 2 * Math.cos(midAngle);
                const gy = cy + (rZodiacOuter + rZodiacInner) / 2 * Math.sin(midAngle);
                ctx.font = '400 14px "Segoe UI Symbol", "Apple Symbols", "Arial Unicode MS", "DejaVu Sans", sans-serif';
                
                let labelColor = MANDALA_ZODIAC_COLORS[i];
                if (isAnyHovered && !isHighlightedSign) {
                    labelColor = 'rgba(150, 150, 150, 0.12)';
                }
                ctx.fillStyle = labelColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(ZODIAC_META[i].sym, gx, gy);
            }
            ctx.restore();
        }

        // 4.5 Nidana (Houses) Ring — Spatial layout matching reference
        // Gold transparent background, house# (inner ring), gate.line (center), stacked ▲/▽ rulers (right)
        // Each sector begins with its own calculated program on the 1st dial
        const pHou = mandalaAnimState.houses.progress;
        if (pHou > 0.001 && data.houses && data.houses.length === 12) {
            ctx.save();
            ctx.globalAlpha = pHou;
            const rotHou = (1 - pHou) * mandalaAnimState.houses.startAngle;
            if (Math.abs(rotHou) > 0.0001) {
                ctx.translate(cx, cy);
                ctx.rotate(rotHou);
                ctx.translate(-cx, -cy);
            }

            const band = rHousesOuter - rHousesInner;
            const rMid = (rHousesOuter + rHousesInner) / 2;
            
            // Snap exact boundary to the indicated program on the 1st dial (gate + line)
            const getProgramBoundary = (houseData) => {
                if (!houseData || !houseData.hexagram) return houseData ? houseData.longitude : 0;
                const gateIdx = GATE_ORDER.indexOf(houseData.hexagram.gate);
                if (gateIdx === -1) return houseData.longitude;
                const lineIdx = (houseData.hexagram.line || 1) - 1;
                return (WHEEL_START + gateIdx * GATE_INTERVAL + lineIdx * (GATE_INTERVAL / 6)) % 360;
            };

            for (let i = 0; i < 12; i++) {
                const h = data.houses[i];
                const hNext = data.houses[(i + 1) % 12];

                // Each sector starts with its own calculated program on the 1st dial
                const startLon = getProgramBoundary(h);
                const endLon = getProgramBoundary(hNext);

                let aStart = degToRad(((endLon - 180.0 + 720.0) % 360.0));
                let aEnd   = degToRad(((startLon - 180.0 + 720.0) % 360.0));
                if (aEnd < aStart) aEnd += 2 * Math.PI;

                const houseNum = i + 1;
                const isThisHouseHovered = (hoverType === 'house' && hoverTarget === houseNum);
                const isAnyHouseHovered = (hoverType === 'house');

                // 1. Sector background fill (gold transparent, gradient tone from house 1 to 12)
                let fillOpacity = 0.05 + (i / 11) * 0.23;
                if (isAnyHouseHovered) {
                    fillOpacity = isThisHouseHovered ? 0.28 : 0.02;
                }
                ctx.beginPath();
                ctx.moveTo(cx + rHousesInner * Math.cos(aStart), cy + rHousesInner * Math.sin(aStart));
                ctx.arc(cx, cy, rHousesOuter, aStart, aEnd);
                ctx.lineTo(cx + rHousesInner * Math.cos(aEnd), cy + rHousesInner * Math.sin(aEnd));
                ctx.arc(cx, cy, rHousesInner, aEnd, aStart, true);
                ctx.closePath();
                ctx.fillStyle = `rgba(225, 190, 110, ${fillOpacity})`;
                ctx.fill();

                // 2. Cusp divider line (at startLon = aEnd)
                ctx.beginPath();
                ctx.moveTo(cx + rHousesInner * Math.cos(aEnd), cy + rHousesInner * Math.sin(aEnd));
                ctx.lineTo(cx + rHousesOuter * Math.cos(aEnd), cy + rHousesOuter * Math.sin(aEnd));
                
                let cuspColor = 'rgba(197, 158, 63, 0.35)';
                if (isAnyHouseHovered) {
                    cuspColor = isThisHouseHovered ? 'rgba(197, 158, 63, 0.7)' : 'rgba(197, 158, 63, 0.08)';
                }
                ctx.strokeStyle = cuspColor;
                ctx.lineWidth = isThisHouseHovered ? 1.2 : 0.8;
                ctx.stroke();

                // Text opacity
                let textAlpha = 1.0;
                if (isAnyHouseHovered && !isThisHouseHovered) {
                    textAlpha = 0.12;
                }

                const midAngle = (aStart + aEnd) / 2;
                const gate = h.hexagram ? h.hexagram.gate : '?';
                const line = h.hexagram ? h.hexagram.line : '?';

                // --- House Number: near the cusp border (aEnd), inside gold band ---
                const houseAngleOffset = (aEnd - aStart) * 0.85;
                const angleHouseNum = aStart + houseAngleOffset;
                const xHN = cx + rMid * Math.cos(angleHouseNum);
                const yHN = cy + rMid * Math.sin(angleHouseNum);
                ctx.font = 'bold 12.5px "DM Sans", sans-serif';
                ctx.fillStyle = hexToRgba('#C59E3F', textAlpha);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(houseNum.toString(), xHN, yHN);

                // --- Gate.Line: horizontal (unrotated), centered in sector ---
                const xGL = cx + rMid * Math.cos(midAngle);
                const yGL = cy + rMid * Math.sin(midAngle);
                ctx.font = 'bold italic 13.5px "DM Sans", sans-serif';
                ctx.fillStyle = hexToRgba('#2E2A20', textAlpha);
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${gate}.${line}`, xGL, yGL);

                // --- Rulers: near opposite border (aStart), inside gold band ---
                const rulers = (typeof getNidanaRulers === 'function')
                    ? getNidanaRulers(gate, line) : null;

                if (rulers) {
                    const rulerAngleOffset = (aEnd - aStart) * 0.18;
                    const angleRulerPos = aStart + rulerAngleOffset;
                    const xRP = cx + rMid * Math.cos(angleRulerPos);
                    const yRP = cy + rMid * Math.sin(angleRulerPos);

                    const upColor   = hexToRgba('#2E2A20', textAlpha);
                    const downColor = hexToRgba('#2E2A20', textAlpha);

                    const tx = xRP - 8.0; // Column for triangles (strictly aligned vertically)
                    const px = xRP + 5.0; // Column for planet symbols

                    const tHalf = 3.5; // Base half-width = 7.0px
                    const tH    = 3.25; // Half-height = 6.5px total height

                    // ▲ Exaltation triangle (filled, pointing UP)
                    const yUp = yRP - 6.5;
                    ctx.beginPath();
                    ctx.moveTo(tx,         yUp - tH); // apex
                    ctx.lineTo(tx - tHalf, yUp + tH); // bottom-left
                    ctx.lineTo(tx + tHalf, yUp + tH); // bottom-right
                    ctx.closePath();
                    ctx.fillStyle = upColor;
                    ctx.fill();

                    // ▲ Exaltation planet symbol
                    const upSym = rulers.up === '⊕' ? '⊕' : rulers.up;
                    if (upSym === '⊕') {
                        ctx.strokeStyle = upColor;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.arc(px, yUp, 4.2, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(px - 4.2, yUp); ctx.lineTo(px + 4.2, yUp);
                        ctx.moveTo(px, yUp - 4.2); ctx.lineTo(px, yUp + 4.2);
                        ctx.stroke();
                    } else {
                        ctx.font = 'bold 13px "DM Sans", sans-serif';
                        ctx.fillStyle = upColor;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(upSym, px, yUp);
                    }

                    // ▽ Detriment triangle (stroke, pointing DOWN - strictly under Exaltation triangle)
                    const yDown = yRP + 6.5;
                    ctx.beginPath();
                    ctx.moveTo(tx,         yDown + tH); // nadir
                    ctx.lineTo(tx - tHalf, yDown - tH); // top-left
                    ctx.lineTo(tx + tHalf, yDown - tH); // top-right
                    ctx.closePath();
                    ctx.strokeStyle = downColor;
                    ctx.lineWidth = 1.2;
                    ctx.stroke();

                    // ▽ Detriment planet symbol
                    const downSym = rulers.down === '⊕' ? '⊕' : rulers.down;
                    if (downSym === '⊕') {
                        ctx.strokeStyle = downColor;
                        ctx.lineWidth = 1.2;
                        ctx.beginPath();
                        ctx.arc(px, yDown, 4.2, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.beginPath();
                        ctx.moveTo(px - 4.2, yDown); ctx.lineTo(px + 4.2, yDown);
                        ctx.moveTo(px, yDown - 4.2); ctx.lineTo(px, yDown + 4.2);
                        ctx.stroke();
                    } else {
                        ctx.font = 'bold 13px "DM Sans", sans-serif';
                        ctx.fillStyle = downColor;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(downSym, px, yDown);
                    }
                }
            }
            ctx.restore();
        }

        // Ticks around the Zodiac Outer Border removed as requested

        // 5. Draw concentric circle dividing lines
        const concentricBorders = [
            { r: rInnerBorder, alpha: 1.0 },
            { r: rDialInner, alpha: 1.0 },
            { r: rGatesInner, alpha: 1.0 },
            { r: rZodiacInner, alpha: Math.max(mandalaAnimState.zodiac.progress, mandalaAnimState.houses.progress) },
            { r: rMirrorInner, alpha: mandalaAnimState.mirror.progress },
            { r: rHexagramsInner, alpha: mandalaAnimState.hexagrams.progress },
            { r: rHexagramsOuter, alpha: mandalaAnimState.hexagrams.progress }
        ];
        concentricBorders.forEach(({ r, alpha }, idx) => {
            if (alpha < 0.001) return;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.strokeStyle = idx === 0 ? 'rgba(197,158,63,0.35)' : 'rgba(197,158,63,0.18)';
            ctx.lineWidth = idx === 0 ? 1.5 : 1.0;
            ctx.stroke();
            ctx.restore();
        });
        // 6. Quarters dividing rods removed as requested

        // 7. Planet activation lines and symbols inside the wheel
        for (let i = 0; i < 64; i++) {
            const gateNum = GATE_ORDER[i];
            const activations = activationsByGate[gateNum];
            if (!activations || activations.length === 0) continue;

            const isHighlighted = isGateHighlighted(gateNum, i);
            const isAnyHovered = (hoverType !== null);

            const midAngle = degToRad((WHEEL_START + i * GATE_INTERVAL + GATE_INTERVAL / 2 - 180) % 360);
            const cos = Math.cos(midAngle);
            const sin = Math.sin(midAngle);

        function drawPlutoCanvas(ctx, ax, ay, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 1.35;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const s = size / 16;
            // 1. Top circle
            ctx.beginPath();
            ctx.arc(ax, ay - 4.2 * s, 2.5 * s, 0, Math.PI * 2);
            ctx.stroke();

            // 2. Crescent cup holding the circle
            ctx.beginPath();
            ctx.arc(ax, ay - 1.8 * s, 5.6 * s, 0.15 * Math.PI, 0.85 * Math.PI, false);
            ctx.stroke();

            // 3. Vertical stem & horizontal cross bar
            const botY = ay + 3.8 * s;
            const endY = ay + 8.2 * s;
            const barY = ay + 6.0 * s;
            const barW = 3.2 * s;

            ctx.beginPath();
            ctx.moveTo(ax, botY);
            ctx.lineTo(ax, endY);
            ctx.moveTo(ax - barW, barY);
            ctx.lineTo(ax + barW, barY);
            ctx.stroke();

            ctx.restore();
        }

        function drawJupiterCanvas(ctx, ax, ay, size, color) {
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.35;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            const s = size / 16;
            const hY = ay + 1.8 * s; // Horizontal bar height

            // 1. Left 2-shaped curve into horizontal bar
            ctx.beginPath();
            ctx.moveTo(ax - 6.0 * s, ay - 1.2 * s);
            ctx.bezierCurveTo(ax - 6.0 * s, ay - 6.5 * s, ax - 1.5 * s, ay - 7.2 * s, ax - 1.5 * s, ay - 3.2 * s);
            ctx.bezierCurveTo(ax - 1.5 * s, ay - 1.0 * s, ax - 5.5 * s, ay + 0.2 * s, ax - 5.5 * s, hY);
            ctx.lineTo(ax + 5.5 * s, hY);
            ctx.stroke();

            // 2. Vertical cross stroke
            const vX = ax + 1.8 * s;
            ctx.beginPath();
            ctx.moveTo(vX, ay - 6.2 * s);
            ctx.lineTo(vX, ay + 7.5 * s);
            ctx.stroke();

            ctx.restore();
        }

        // Draw stacked planet symbols inside the inner circle
            activations.forEach((act, aIdx) => {
                const rAct = rInnerBorder - 14 - aIdx * 20;
                const ax = cx + rAct * cos;
                const ay = cy + rAct * sin;

                let planetColor = act.color;
                if (isAnyHovered) {
                    if (isHighlighted) {
                        planetColor = act.color;
                    } else {
                        planetColor = 'rgba(150, 150, 150, 0.1)';
                    }
                }

                drawPlanetOnCanvas(ctx, act.name, act.symbol, ax, ay, isAnyHovered && isHighlighted ? 18 : 15, planetColor);

                // Draw line number subscript next to planet symbol
                const subAngle = midAngle + 0.032;
                const sx = cx + (rAct + 1) * Math.cos(subAngle);
                const sy = cy + (rAct + 1) * Math.sin(subAngle);
                ctx.font = 'bold 9px DM Sans, sans-serif';
                
                let lineCol = act.type === 'design' ? 'rgba(220,60,60,1.0)' : 'rgba(46,42,32,0.95)';
                if (isAnyHovered && !isHighlighted) {
                    lineCol = 'rgba(150, 150, 150, 0.1)';
                }
                ctx.fillStyle = lineCol;
                ctx.fillText(act.line.toString(), sx, sy);
            });
        }

        // 7.5 Draw radial activation wedges (rays) from the center to the gates
        // -- Center color lookup for each gate --
        const GATE_CENTER_COLORS = {};
        const CENTER_HUES = {
            'Head':        'rgba(255,230,0,',   // yellow
            'Ajna':        'rgba(76,175,80,',    // green
            'Throat':      'rgba(41,182,246,',   // blue
            'G-Center':    'rgba(255,215,0,',    // gold-yellow
            'Heart':       'rgba(198,40,40,',    // dark red
            'Sacral':      'rgba(229,57,53,',    // red
            'Root':        'rgba(255,140,0,',    // orange
            'Spleen':      'rgba(255,140,0,',    // orange
            'SolarPlexus': 'rgba(255,140,0,'     // orange
        };
        Object.entries(BG_CENTERS).forEach(([cName, c]) => {
            const hue = CENTER_HUES[cName] || 'rgba(150,150,150,';
            Object.keys(c.gates).forEach(gStr => {
                GATE_CENTER_COLORS[parseInt(gStr)] = hue;
            });
        });

        for (let i = 0; i < 64; i++) {
            const gateNum = GATE_ORDER[i];
            const activations = activationsByGate[gateNum];
            if (!activations || activations.length === 0) continue;

            const isHighlighted = isGateHighlighted(gateNum, i);
            const isAnyHovered = (hoverType !== null);

            const startLon = (WHEEL_START + i * GATE_INTERVAL) % 360;
            const startAngle = degToRad(startLon - 180);
            const endAngle = degToRad(startLon + GATE_INTERVAL - 180);

            const isP = activations.some(a => a.type === 'personality');
            const isD = activations.some(a => a.type === 'design');

            const centerHue = GATE_CENTER_COLORS[gateNum] || 'rgba(150,150,150,';

            let opacity = 1.0;
            if (isAnyHovered) {
                opacity = isHighlighted ? 1.0 : 0.06;
            }

            let fillStyle;
            if (isP && isD) {
                fillStyle = centerHue + (0.13 * opacity) + ')';
            } else if (isD) {
                fillStyle = centerHue + (0.09 * opacity) + ')';
            } else if (isP) {
                fillStyle = centerHue + (0.08 * opacity) + ')';
            } else {
                fillStyle = 'rgba(0,0,0,0)';
            }

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, rDialInner, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }


        // 8. Bodygraph overlay inside inner circle
        const activeGatesCombinedForBG = new Set([...activeGatesPersonality, ...activeGatesDesign]);
        const definedCenters = new Set();
        CHANNELS_DATA.forEach(ch => {
            if (activeGatesCombinedForBG.has(ch.gateA) && activeGatesCombinedForBG.has(ch.gateB)) {
                definedCenters.add(ch.centerA);
                definedCenters.add(ch.centerB);
            }
        });

        // Soft white overlay over rays before bodygraph SVG renders on top
        ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';
        ctx.beginPath();
        ctx.arc(cx, cy, rInnerBorder, 0, Math.PI * 2);
        ctx.fill();

        // 8.5 Incarnation Cross bars already drawn early (step after gate setup above)


        // Position and update the HTML SVG overlay
        const bgScale = (R * 0.630 * 2 * 0.748) / BG_H; // fixed size — does not change when rings toggle
        const bgOffX = cx - (BG_W * bgScale) / 2 + (10 * bgScale);
        const bgOffY = cy - (BG_H * bgScale) / 2;

        updateMandalaSvgOverlay(data, bgScale, bgOffX, bgOffY, activeGatesPersonality, activeGatesDesign, definedCenters, hoverState);
    }

    function updateMandalaSvgOverlay(data, bgScale, bgOffX, bgOffY, activeGatesPersonality, activeGatesDesign, definedCenters, hoverState) {
        const wrap = document.getElementById('mandala-bodygraph-wrap');
        if (!wrap) return;

        wrap.style.opacity = mandalaSettings.bodygraph ? '1' : '0';
        wrap.style.transform = mandalaSettings.bodygraph ? 'scale(1)' : 'scale(0.93)';
        wrap.style.pointerEvents = 'none';

        // Position the wrapper exactly over the canvas inner circle (adding 20px to compensate for #mandala-container padding)
        wrap.style.left = (bgOffX + 20) + 'px';
        wrap.style.top = (bgOffY + 20) + 'px';
        wrap.style.width = (400 * bgScale) + 'px';
        wrap.style.height = (650 * bgScale) + 'px';

        // Always copy the main SVG bodygraph to ensure it mirrors the main chart perfectly
        const mainSvg = document.querySelector('#bodygraph-svg-wrap svg');
        if (!mainSvg) return;
        
        let svg = mainSvg.cloneNode(true);
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.removeAttribute('id');
        
        // Make all IDs inside the cloned SVG unique to avoid ID conflicts and browser rendering/clip-path bugs
        const suffix = '-mandala';
        svg.querySelectorAll('[id]').forEach(el => {
            const oldId = el.getAttribute('id');
            el.setAttribute('id', oldId + suffix);
        });

        // Update all references in attributes and styles
        const attrsToUpdate = ['clip-path', 'fill', 'filter', 'mask', 'marker-start', 'marker-mid', 'marker-end'];
        const hrefAttrs = ['href', 'xlink:href'];
        svg.querySelectorAll('*').forEach(el => {
            attrsToUpdate.forEach(attr => {
                if (el.hasAttribute(attr)) {
                    const val = el.getAttribute(attr);
                    const match = val.match(/^url\(#(.+)\)$/);
                    if (match) {
                        el.setAttribute(attr, `url(#${match[1]}${suffix})`);
                    }
                }
            });
            hrefAttrs.forEach(attr => {
                if (el.hasAttribute(attr)) {
                    const val = el.getAttribute(attr);
                    if (val.startsWith('#')) {
                        el.setAttribute(attr, val + suffix);
                    }
                }
            });
            if (el.hasAttribute('style')) {
                let style = el.getAttribute('style');
                style = style.replace(/url\(#([^)]+)\)/g, (m, oldId) => `url(#${oldId}${suffix})`);
                el.setAttribute('style', style);
            }
        });

        // Override external CSS references to clip-paths and gradients by setting them inline with !important
        const cssIdOverrides = {
            'cls-18': { prop: 'clip-path', id: 'clip-path' },
            'cls-20': { prop: 'clip-path', id: 'clip-path-2' },
            'cls-22': { prop: 'clip-path', id: 'clip-path-3' },
            'cls-27': { prop: 'clip-path', id: 'clip-path-4' },
            'cls-28': { prop: 'clip-path', id: 'clip-path-5' },
            'cls-33': { prop: 'clip-path', id: 'clip-path-6' },
            
            'cls-5':  { prop: 'fill', id: 'GradientFill_1' },
            'cls-13': { prop: 'fill', id: 'GradientFill_2' },
            'cls-29': { prop: 'fill', id: 'GradientFill_2-2' },
            'cls-34': { prop: 'fill', id: 'GradientFill_2-3' }
        };
        Object.entries(cssIdOverrides).forEach(([cls, target]) => {
            svg.querySelectorAll(`.${cls}`).forEach(el => {
                el.style.setProperty(target.prop, `url(#${target.id}${suffix})`, 'important');
            });
        });
        
        // Remove old bodygraph completely and append new
        wrap.innerHTML = '';
        wrap.appendChild(svg);

        const hoverType = hoverState ? hoverState.type : null;
        const hoverTarget = hoverState ? hoverState.target : null;

        const activeGatesCombined = new Set([...activeGatesPersonality, ...activeGatesDesign]);

        // Reset opacities and filters
        svg.querySelectorAll('[class*="block__"]').forEach(el => {
            el.style.opacity = '';
            el.style.filter = '';
        });
        svg.querySelectorAll('[class*="cls__"]').forEach(el => {
            el.style.opacity = '';
            el.style.filter = '';
        });
        svg.querySelectorAll('[class*="cls_"]').forEach(el => {
            el.style.opacity = '';
            el.style.filter = '';
        });
        svg.querySelectorAll('[class^="a"]').forEach(el => {
            el.style.fill = '';
            el.style.filter = '';
        });

        function getQuarterNameForIdx(idx) {
            if (idx >= 56 || idx <= 7) return "Инициация";
            if (idx >= 8 && idx <= 23) return "Цивилизация";
            if (idx >= 24 && idx <= 39) return "Дуальность";
            if (idx >= 40 && idx <= 55) return "Мутация";
            return "";
        }

        const GATE_ORDER = [
            25, 36, 22, 63, 37, 55, 30, 49, 13, 19, 41, 60, 61, 54, 38, 58,
            10, 11, 26,  5,  9, 34, 14, 43,  1, 44, 28, 50, 32, 57, 48, 18,
            46,  6, 47, 64, 40, 59, 29,  4,  7, 33, 31, 56, 62, 53, 39, 52,
            15, 12, 45, 35, 16, 20,  8, 23,  2, 24, 27,  3, 42, 51, 21, 17
        ];

        // Apply dimming / highlights based on hover
        if (hoverType === 'center') {
            const centerBlockMap = {
                'Head': 1, 'Ajna': 2, 'Throat': 3, 'G-Center': 4,
                'Heart': 5, 'Spleen': 6, 'Sacral': 7, 'SolarPlexus': 8, 'Root': 9
            };

            // Dim other centers
            Object.entries(centerBlockMap).forEach(([cName, blockNum]) => {
                const el = svg.querySelector('.block__' + blockNum);
                if (el && cName !== hoverTarget) {
                    el.style.opacity = '0.15';
                }
            });

            // Dim other gates & channels
            const centerGates = Object.keys(BG_CENTERS[hoverTarget].gates).map(Number);
            svg.querySelectorAll('[class*="cls__"]').forEach(el => {
                const classList = Array.from(el.classList);
                const gateClass = classList.find(c => c.startsWith('cls__'));
                if (gateClass) {
                    const gateNum = parseInt(gateClass.replace('cls__', ''));
                    if (!centerGates.includes(gateNum)) {
                        el.style.opacity = '0.15';
                    }
                }
            });

            svg.querySelectorAll('[class*="cls_"]').forEach(el => {
                const classList = Array.from(el.classList);
                const chClass = classList.find(c => c.startsWith('cls_') && !c.startsWith('cls__'));
                if (chClass) {
                    const gateNum = parseInt(chClass.replace('cls_', ''));
                    if (!centerGates.includes(gateNum)) {
                        el.style.opacity = '0.15';
                    }
                }
            });
        } else if (hoverType === 'gate') {
            // Do NOT dim any activations! Keep all at 100% opacity.
            // Apply beautiful golden glow to the hovered gate shapes
            const num = String(hoverTarget);
            svg.querySelectorAll('.cls__' + num + ', .cls_' + num + ', .cls____' + num).forEach(el => {
                el.style.filter = 'drop-shadow(0 0 5px rgba(197, 158, 63, 0.95)) drop-shadow(0 0 10px rgba(197, 158, 63, 0.6))';
            });

            // Also highlight the text/path label of the gate number inside the center (class: .a[gateNum])
            svg.querySelectorAll('.a' + num).forEach(el => {
                el.style.fill = '#C59E3F';
                el.style.filter = 'drop-shadow(0 0 4px #C59E3F)';
            });

            // Also highlight the parent center
            let parentCenter = null;
            for (const [cName, c] of Object.entries(BG_CENTERS)) {
                if (Object.keys(c.gates).map(Number).includes(hoverTarget)) {
                    parentCenter = cName;
                    break;
                }
            }
            if (parentCenter) {
                const centerBlockMap = {
                    'Head': 1, 'Ajna': 2, 'Throat': 3, 'G-Center': 4,
                    'Heart': 5, 'Spleen': 6, 'Sacral': 7, 'SolarPlexus': 8, 'Root': 9
                };
                const blockNum = centerBlockMap[parentCenter];
                const el = svg.querySelector('.block__' + blockNum);
                if (el) {
                    el.style.filter = 'drop-shadow(0 0 6px rgba(197, 158, 63, 0.8))';
                }
            }
        } else if (hoverType === 'quarter') {
            const qName = getQuarterNameForIdx(hoverState.gateIdx);
            
            // Highlight active gates in the hovered quarter
            svg.querySelectorAll('[class*="cls__"]').forEach(el => {
                const classList = Array.from(el.classList);
                const gateClass = classList.find(c => c.startsWith('cls__'));
                if (gateClass) {
                    const gateNum = parseInt(gateClass.replace('cls__', ''));
                    const gIdx = GATE_ORDER.indexOf(gateNum);
                    if (gIdx !== -1 && getQuarterNameForIdx(gIdx) === qName && activeGatesCombined.has(gateNum)) {
                        el.style.filter = 'drop-shadow(0 0 5px rgba(197, 158, 63, 0.95))';
                        // Highlight text label inside the center too
                        svg.querySelectorAll('.a' + gateNum).forEach(lbl => {
                            lbl.style.fill = '#C59E3F';
                            lbl.style.filter = 'drop-shadow(0 0 3px #C59E3F)';
                        });
                    }
                }
            });
        } else if (hoverType === 'godhead') {
            const ghIdx = Math.floor(hoverState.gateIdx / 4);

            // Highlight active gates in the hovered godhead
            svg.querySelectorAll('[class*="cls__"]').forEach(el => {
                const classList = Array.from(el.classList);
                const gateClass = classList.find(c => c.startsWith('cls__'));
                if (gateClass) {
                    const gateNum = parseInt(gateClass.replace('cls__', ''));
                    const gIdx = GATE_ORDER.indexOf(gateNum);
                    if (gIdx !== -1 && Math.floor(gIdx / 4) === ghIdx && activeGatesCombined.has(gateNum)) {
                        el.style.filter = 'drop-shadow(0 0 5px rgba(197, 158, 63, 0.95))';
                        // Highlight text label inside the center too
                        svg.querySelectorAll('.a' + gateNum).forEach(lbl => {
                            lbl.style.fill = '#C59E3F';
                            lbl.style.filter = 'drop-shadow(0 0 3px #C59E3F)';
                        });
                    }
                }
            });
        }
    }


    function renderBodygraphTable(data) {
        const tbody = document.getElementById('bodygraph-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        // Personality planets
        data.planets.forEach(p => {
            if (!p.hexagram) return;
            const meta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
            const hx = p.hexagram;

            const isActive = !activePlanets || activePlanets.has(p.name);

            const tr = document.createElement('tr');
            if (!isActive) tr.style.opacity = '0.5';

            tr.innerHTML = `
                <td>
                    <div class="planet-cell">
                        <div class="planet-glyph ${meta.cls}">${meta.sym}</div>
                        <span class="planet-name">${p.name} <span style="font-size:10px; color:var(--text-muted); font-weight:normal;">(Личность)</span></span>
                    </div>
                </td>
                <td>
                    <span class="hex-gate-badge">Ворота ${hx.gate}</span>
                </td>
                <td><span class="hex-num">${hx.line}</span></td>
                <td>
                    ${isActive 
                        ? '<span class="status-badge active" style="background: var(--primary-light); color: var(--primary); border: 1px solid var(--border); padding: 2px 8px; border-radius: 10px; font-size: 11px;">Активны</span>' 
                        : '<span class="status-badge inactive" style="background: #F9FAFB; color: #9CA3AF; border: 1px solid rgba(0,0,0,0.08); padding: 2px 8px; border-radius: 10px; font-size: 11px;">Отключены</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Design planets
        const designPlanetsList = data.design_planets || [];
        designPlanetsList.forEach(p => {
            if (!p.hexagram) return;
            const meta = PLANET_META[p.name] || { sym: p.symbol, cls: 'glyph-node' };
            const hx = p.hexagram;

            const isActive = !activePlanets || activePlanets.has(p.name);

            const tr = document.createElement('tr');
            if (!isActive) tr.style.opacity = '0.5';

            tr.innerHTML = `
                <td>
                    <div class="planet-cell">
                        <div class="planet-glyph ${meta.cls}" style="color:rgb(255,96,96);">${meta.sym}</div>
                        <span class="planet-name" style="color:rgb(255,96,96);">${p.name} <span style="font-size:10px; color:rgba(255,96,96,0.7); font-weight:normal;">(Дизайн)</span></span>
                    </div>
                </td>
                <td>
                    <span class="hex-gate-badge" style="background:rgba(255,96,96,0.1); color:rgb(255,96,96); border:1px solid rgba(255,96,96,0.2);">Ворота ${hx.gate}</span>
                </td>
                <td><span class="hex-num" style="color:rgb(255,96,96);">${hx.line}</span></td>
                <td>
                    ${isActive 
                        ? '<span class="status-badge active" style="background: rgba(255,96,96,0.1); color: rgb(255,96,96); border: 1px solid rgba(255,96,96,0.2); padding: 2px 8px; border-radius: 10px; font-size: 11px;">Активны</span>' 
                        : '<span class="status-badge inactive" style="background: #F9FAFB; color: #9CA3AF; border: 1px solid rgba(0,0,0,0.08); padding: 2px 8px; border-radius: 10px; font-size: 11px;">Отключены</span>'}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderMandalaTable(data) {
        const tbody = document.getElementById('mandala-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        const GATE_ORDER = [
            25, 36, 22, 63, 37, 55, 30, 49, 13, 19, 41, 60, 61, 54, 38, 58,
            10, 11, 26,  5,  9, 34, 14, 43,  1, 44, 28, 50, 32, 57, 48, 18,
            46,  6, 47, 64, 40, 59, 29,  4,  7, 33, 31, 56, 62, 53, 39, 52,
            15, 12, 45, 35, 16, 20,  8, 23,  2, 24, 27,  3, 42, 51, 21, 17
        ];
        const WHEEL_START = 358.0 + 15.0 / 60.0 + 1.0 / 3600.0;
        const GATE_INTERVAL = 5.625;

        const gateActivators = {};
        
        // Personality activators
        data.planets.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name))) {
                const gNum = p.hexagram.gate;
                if (!gateActivators[gNum]) {
                    gateActivators[gNum] = [];
                }
                const meta = PLANET_META[p.name] || { sym: p.symbol, cls: '' };
                gateActivators[gNum].push(`<span class="planet-badge ${meta.cls}" style="display:inline-flex; align-items:center; gap:2px; font-size:10px; background:rgba(197,158,63,0.06); border:1px solid rgba(197,158,63,0.15); padding:1px 6px; border-radius:10px; margin-right:4px;">${meta.sym} ${p.name}</span>`);
            }
        });

        // Design activators
        const designPlanetsList = data.design_planets || [];
        designPlanetsList.forEach(p => {
            if (p.hexagram && (!activePlanets || activePlanets.has(p.name))) {
                const gNum = p.hexagram.gate;
                if (!gateActivators[gNum]) {
                    gateActivators[gNum] = [];
                }
                const meta = PLANET_META[p.name] || { sym: p.symbol, cls: '' };
                gateActivators[gNum].push(`<span class="planet-badge ${meta.cls}" style="display:inline-flex; align-items:center; gap:2px; font-size:10px; background:rgba(255,96,96,0.06); border:1px solid rgba(255,96,96,0.15); color:rgb(255,96,96); padding:1px 6px; border-radius:10px; margin-right:4px;">${meta.sym} ${p.name} (Д)</span>`);
            }
        });

        for (let i = 0; i < 64; i++) {
            const gateNum = GATE_ORDER[i];
            // signIdx: Rave sign (0=Aries, anchored at WHEEL_START) for this gate
            const signIdx = Math.floor((i * GATE_INTERVAL + GATE_INTERVAL / 2) / 30) % 12;
            const sm = ZODIAC_META[signIdx];
            const activatorHtml = gateActivators[gateNum] ? gateActivators[gateNum].join('') : '<span style="color:#9E978A;">—</span>';
            const isActive = !!gateActivators[gateNum];

            const tr = document.createElement('tr');
            if (isActive) {
                tr.style.background = 'rgba(197, 158, 63, 0.03)';
            }

            tr.innerHTML = `
                <td style="font-size:11px; color:#9E978A;">${i + 1}</td>
                <td><span class="hex-gate-badge" style="background:${isActive ? 'var(--primary)' : 'var(--primary-light)'}; color:${isActive ? '#FFF' : 'var(--primary)'};">Ворота ${gateNum}</span></td>
                <td>
                    <div class="sign-cell" style="font-size:12px;">
                        <span class="sign-glyph" style="font-size:14px;">${sm.sym}</span>
                        <span>${sm.name}</span>
                    </div>
                </td>
                <td>${activatorHtml}</td>
            `;
            tbody.appendChild(tr);
        }
    }

    // Export PDF for Compatibility
    btnCompatExport.addEventListener('click', (e) => {
        e.stopPropagation();
        showToast("Подготовка печатной версии отчёта...");
        setTimeout(() => {
            window.print();
        }, 500);
    });

    // ═══════════════════════════════════════════════════════════════════
    // SVG BODYGRAPH RENDERER
    // ═══════════════════════════════════════════════════════════════════
    /**
     * renderSvgBodygraph(data)
     *
     * Populates the SVG bodygraph tab with:
     *  - Left column:  Design (red/unconscious) planet rows — clickable toggles
     *  - Center:       Reference SVG bodygraph, gates lit per active planets
     *  - Right column: Personality (black/conscious) planet rows — clickable toggles
     *
     * Activated gates:
     *   - Personality only  → dark channel/gate (cls-17 = black)
     *   - Design only       → red channel/gate
     *   - Both              → striped red+black
     *
     * Each planet row click toggles that planet's gate on/off.
     */
    function renderSvgBodygraph(data) {
        const mandalaWrap = document.getElementById('mandala-bodygraph-wrap');
        if (mandalaWrap) mandalaWrap.innerHTML = '';

        const svgWrap = document.getElementById('bodygraph-svg-wrap');
        const designList = document.getElementById('bg-design-list');
        const persList   = document.getElementById('bg-personality-list');
        if (!svgWrap || !designList || !persList) return;

        // Trigrams and Hexagram line mapping for 64 gates
        const TRIGRAMS = {
            'Qian': [1, 1, 1], // Heaven
            'Kun':  [0, 0, 0], // Earth
            'Zhen': [1, 0, 0], // Thunder
            'Kan':  [0, 1, 0], // Water
            'Gen':  [0, 0, 1], // Mountain
            'Xun':  [0, 1, 1], // Wind
            'Li':   [1, 0, 1], // Fire
            'Dui':  [1, 1, 0], // Lake
        };

        const HEX_MAP = {
            1:  ['Qian', 'Qian'], 2:  ['Kun',  'Kun'], 3:  ['Kan',  'Zhen'], 4:  ['Gen',  'Kan'],
            5:  ['Kan',  'Qian'], 6:  ['Qian', 'Kan'], 7:  ['Kan',  'Kun'], 8:  ['Kun',  'Kan'],
            9:  ['Xun',  'Qian'], 10: ['Qian', 'Dui'], 11: ['Kun',  'Qian'], 12: ['Qian', 'Kun'],
            13: ['Qian', 'Li'], 14: ['Li',   'Qian'], 15: ['Gen',  'Kun'], 16: ['Zhen', 'Kun'],
            17: ['Dui',  'Zhen'], 18: ['Gen',  'Xun'], 19: ['Kun',  'Dui'], 20: ['Xun',  'Kun'],
            21: ['Li',   'Zhen'], 22: ['Gen',  'Li'], 23: ['Gen',  'Kun'], 24: ['Kun',  'Zhen'],
            25: ['Qian', 'Zhen'], 26: ['Gen',  'Qian'], 27: ['Gen',  'Zhen'], 28: ['Dui',  'Xun'],
            29: ['Kan',  'Kan'], 30: ['Li',   'Li'], 31: ['Dui',  'Gen'], 32: ['Zhen', 'Xun'],
            33: ['Qian', 'Gen'], 34: ['Zhen', 'Qian'], 35: ['Li',   'Kun'], 36: ['Kun',  'Li'],
            37: ['Xun',  'Li'], 38: ['Li',   'Dui'], 39: ['Kan',  'Gen'], 40: ['Zhen', 'Kan'],
            41: ['Gen',  'Dui'], 42: ['Xun',  'Zhen'], 43: ['Dui',  'Qian'], 44: ['Qian', 'Xun'],
            45: ['Dui',  'Kun'], 46: ['Kun',  'Xun'], 47: ['Kan',  'Dui'], 48: ['Kan',  'Xun'],
            49: ['Dui',  'Li'], 50: ['Li',   'Xun'], 51: ['Zhen', 'Zhen'], 52: ['Gen',  'Gen'],
            53: ['Xun',  'Gen'], 54: ['Zhen', 'Dui'], 55: ['Zhen', 'Li'], 56: ['Li',   'Gen'],
            57: ['Xun',  'Xun'], 58: ['Dui',  'Dui'], 59: ['Xun',  'Kan'], 60: ['Kan',  'Dui'],
            61: ['Xun',  'Dui'], 62: ['Zhen', 'Gen'], 63: ['Kan',  'Li'], 64: ['Li',   'Kan']
        };

        // Helper to extract and format standard planets plus Chiron, Lilith, Priapus
        function getBodygraphPlanets(planetList) {
            const map = {};
            planetList.forEach(p => {
                map[p.name] = p;
            });
            const result = [];
            if (map['Солнце']) result.push(map['Солнце']);
            if (map['Земля']) result.push(map['Земля']);
            
            const nNode = map['Истинный Северный Узел'] || map['Средний Северный Узел'] || map['Северный Узел'];
            if (nNode) result.push({ ...nNode, displayName: 'Северный Узел' });
            
            const sNode = map['Истинный Южный Узел'] || map['Средний Южный Узел'] || map['Южный Узел'];
            if (sNode) result.push({ ...sNode, displayName: 'Южный Узел' });
            
            if (map['Луна']) result.push(map['Луна']);
            if (map['Меркурий']) result.push(map['Меркурий']);
            if (map['Венера']) result.push(map['Венера']);
            if (map['Марс']) result.push(map['Марс']);
            if (map['Юпитер']) result.push(map['Юпитер']);
            if (map['Сатурн']) result.push(map['Сатурн']);
            if (map['Уран']) result.push(map['Уран']);
            if (map['Нептун']) result.push(map['Нептун']);
            if (map['Плутон']) result.push(map['Плутон']);
            if (map['Хирон']) result.push(map['Хирон']);
            if (map['Лилит (истинная)']) result.push(map['Лилит (истинная)']);
            if (map['Лилит (средняя)']) result.push(map['Лилит (средняя)']);
            if (map['Лилит (интерп.)']) result.push(map['Лилит (интерп.)']);
            if (map['Приап (интерп.)']) result.push(map['Приап (интерп.)']);
            return result;
        }

        const personalityPlanets = getBodygraphPlanets(data.planets || []);
        const designPlanets      = getBodygraphPlanets(data.design_planets || []);

        // Initialize sets if not present, excluding default inactive planets
        if (!activeBgPers) {
            activeBgPers = new Set();
            personalityPlanets.forEach(p => {
                if (!DEFAULT_INACTIVE_PLANETS.includes(p.name)) activeBgPers.add(p.name);
            });
        }
        if (!activeBgDesign) {
            activeBgDesign = new Set();
            designPlanets.forEach(p => {
                if (!DEFAULT_INACTIVE_PLANETS.includes(p.name)) activeBgDesign.add(p.name);
            });
        }

        // Maps: gate# -> array of planet names
        const persGates   = {};
        const designGates = {};

        personalityPlanets.forEach(p => {
            if (!p.hexagram) return;
            if (activeBgPers && !activeBgPers.has(p.name)) return;
            const g = p.hexagram.gate;
            if (!persGates[g]) persGates[g] = [];
            persGates[g].push(p.name);
        });

        designPlanets.forEach(p => {
            if (!p.hexagram) return;
            if (activeBgDesign && !activeBgDesign.has(p.name)) return;
            const g = p.hexagram.gate;
            if (!designGates[g]) designGates[g] = [];
            designGates[g].push(p.name);
        });

        // ── Apply gate visibility on SVG ───────────────────────────────
        function applyGatesToSvg() {
            // Reset all gate elements to hidden
            svgWrap.querySelectorAll('[class*="cls__"], [class*="cls_"]').forEach(el => {
                el.classList.remove(
                    'bg-gate-active-personality',
                    'bg-gate-active-design',
                    'bg-gate-active-both'
                );
                el.style.display = '';
            });

            // Collect current active gates
            const activePersGates   = {};
            const activeDesignGates = {};

            personalityPlanets.forEach(p => {
                if (!p.hexagram) return;
                if (activeBgPers && !activeBgPers.has(p.name)) return;
                const g = p.hexagram.gate;
                if (!activePersGates[g]) activePersGates[g] = [];
                activePersGates[g].push(p.name);
            });

            designPlanets.forEach(p => {
                if (!p.hexagram) return;
                if (activeBgDesign && !activeBgDesign.has(p.name)) return;
                const g = p.hexagram.gate;
                if (!activeDesignGates[g]) activeDesignGates[g] = [];
                activeDesignGates[g].push(p.name);
            });

            // Activate gate elements
            function activateGate(gateNum, cls) {
                const num = String(gateNum);
                svgWrap.querySelectorAll('.cls__' + num).forEach(el => {
                    el.classList.add(cls);
                    el.style.display = 'block';
                });
                const chEl = svgWrap.querySelector('.cls_' + num);
                if (chEl) {
                    chEl.classList.add(cls);
                    chEl.style.display = 'block';
                }
                const chEl2 = svgWrap.querySelector('.cls____' + num);
                if (chEl2) {
                    chEl2.classList.add(cls);
                    chEl2.style.display = 'block';
                }
            }

            // Gates active in personality only
            Object.keys(activePersGates).forEach(g => {
                if (activeDesignGates[g]) return;
                activateGate(g, 'bg-gate-active-personality');
            });

            // Gates active in design only
            Object.keys(activeDesignGates).forEach(g => {
                if (activePersGates[g]) return;
                activateGate(g, 'bg-gate-active-design');
            });

            // Gates active in both
            Object.keys(activePersGates).forEach(g => {
                if (!activeDesignGates[g]) return;
                activateGate(g, 'bg-gate-active-both');
            });

            // Activate center blocks when channels are defined
            // A channel connects TWO centers. When both gates are active, BOTH centers become defined.
            const CHANNELS = [
                // Head (1) ↔ Ajna (2)
                { gates: [64, 47], centers: ['head', 'ajna'] },
                { gates: [61, 24], centers: ['head', 'ajna'] },
                { gates: [63, 4],  centers: ['head', 'ajna'] },

                // Ajna (2) ↔ Throat (3)
                { gates: [17, 62], centers: ['ajna', 'throat'] },
                { gates: [43, 23], centers: ['ajna', 'throat'] },
                { gates: [11, 56], centers: ['ajna', 'throat'] },

                // Throat (3) ↔ Spleen (6)
                { gates: [16, 48], centers: ['throat', 'spleen'] },
                { gates: [20, 57], centers: ['throat', 'spleen'] },

                // Throat (3) ↔ G Center (4)
                { gates: [31, 7],  centers: ['throat', 'gcenter'] },
                { gates: [8, 1],   centers: ['throat', 'gcenter'] },
                { gates: [33, 13], centers: ['throat', 'gcenter'] },
                { gates: [20, 10], centers: ['throat', 'gcenter'] },

                // Throat (3) ↔ Sacral (7)
                { gates: [20, 34], centers: ['throat', 'sacral'] },

                // Throat (3) ↔ Heart (5)
                { gates: [45, 21], centers: ['throat', 'heart'] },

                // Throat (3) ↔ Solar Plexus (8)
                { gates: [35, 36], centers: ['throat', 'solar'] },
                { gates: [12, 22], centers: ['throat', 'solar'] },

                // G Center (4) ↔ Spleen (6)
                { gates: [10, 57], centers: ['gcenter', 'spleen'] },

                // G Center (4) ↔ Sacral (7)
                { gates: [2, 14],  centers: ['gcenter', 'sacral'] },
                { gates: [15, 5],  centers: ['gcenter', 'sacral'] },
                { gates: [46, 29], centers: ['gcenter', 'sacral'] },
                { gates: [10, 34], centers: ['gcenter', 'sacral'] },

                // G Center (4) ↔ Heart (5)
                { gates: [25, 51], centers: ['gcenter', 'heart'] },

                // Heart (5) ↔ Spleen (6)
                { gates: [44, 26], centers: ['heart', 'spleen'] },

                // Heart (5) ↔ Solar Plexus (8)
                { gates: [40, 37], centers: ['heart', 'solar'] },

                // Spleen (6) ↔ Sacral (7)
                { gates: [50, 27], centers: ['spleen', 'sacral'] },
                { gates: [34, 57], centers: ['spleen', 'sacral'] },

                // Spleen (6) ↔ Root (9)
                { gates: [32, 54], centers: ['spleen', 'root'] },
                { gates: [28, 38], centers: ['spleen', 'root'] },
                { gates: [18, 58], centers: ['spleen', 'root'] },

                // Sacral (7) ↔ Solar Plexus (8)
                { gates: [59, 6],  centers: ['sacral', 'solar'] },

                // Sacral (7) ↔ Root (9)
                { gates: [3, 60],  centers: ['sacral', 'root'] },
                { gates: [9, 52],  centers: ['sacral', 'root'] },
                { gates: [42, 53], centers: ['sacral', 'root'] },

                // Solar Plexus (8) ↔ Root (9)
                { gates: [19, 49], centers: ['solar', 'root'] },
                { gates: [39, 55], centers: ['solar', 'root'] },
                { gates: [41, 30], centers: ['solar', 'root'] }
            ];

            // Map each center to its corresponding SVG .block__N element
            const centerBlockMap = {
                'head':    { blockNum: 1 },
                'ajna':    { blockNum: 2 },
                'throat':  { blockNum: 3 },
                'gcenter': { blockNum: 4 }, // Was missing
                'heart':   { blockNum: 5 },
                'spleen':  { blockNum: 6 },
                'sacral':  { blockNum: 7 }, // Was wrongly mapped to 4
                'solar':   { blockNum: 8 },
                'root':    { blockNum: 9 }
            };

            const definedCenters = new Set();
            const allActive = new Set([
                ...Object.keys(activePersGates).map(Number),
                ...Object.keys(activeDesignGates).map(Number)
            ]);

            CHANNELS.forEach(ch => {
                if (allActive.has(ch.gates[0]) && allActive.has(ch.gates[1])) {
                    definedCenters.add(ch.centers[0]);
                    definedCenters.add(ch.centers[1]);
                }
            });

            // Apply active center blocks
            Object.entries(centerBlockMap).forEach(([center, info]) => {
                const blockEl = svgWrap.querySelector('.block__' + info.blockNum);
                if (blockEl) {
                    if (definedCenters.has(center)) {
                        blockEl.classList.add('block__' + info.blockNum + '-active');
                    } else {
                        blockEl.classList.remove('block__' + info.blockNum + '-active');
                    }
                }
            });
        }

        // ── Planet symbols map ─────────────────────────────────────────
        function getPlanetSym(name) {
            const key = name === 'Северный Узел' ? 'Истинный Северный Узел' : (name === 'Южный Узел' ? 'Истинный Южный Узел' : name);
            if (key === 'Юпитер' || name === 'Юпитер') return SVG_JUPITER;
            if (key === 'Плутон' || name === 'Плутон') return SVG_PLUTO;
            const meta = PLANET_META[key] || PLANET_META[name];
            return meta ? meta.sym : name.substring(0,2);
        }

        // ── Build hexagram bars SVG icon ───────────────────────────────
        function hexIcon(gate, colorCss) {
            const [upperName, lowerName] = HEX_MAP[gate];
            if (!upperName || !lowerName) return '';
            const lower = TRIGRAMS[lowerName];
            const upper = TRIGRAMS[upperName];
            const lines = [...lower, ...upper]; // bottom-to-top (lines 1 to 6)
            
            const bars = [];
            // Draw from top (line 6) to bottom (line 1)
            for (let i = 5; i >= 0; i--) {
                const solid = (lines[i] === 1);
                bars.push(`<div class="hex-bar${solid ? '' : ' broken'}" style="color:${colorCss}"></div>`);
            }
            return `<div class="bg-hex-icon" style="color:${colorCss}">${bars.join('')}</div>`;
        }

        // Helper to compute fixation symbol (▲, ▽, ☆, →) for a planet in a gate/line
        function getPlanetFixationBadgeHtml(planetName, gate, line, isRetro) {
            if (!gate || !line) return '';
            const rulerKey = `${gate}.${line}`;
            const entry = (typeof RULERS_NIDANA !== 'undefined') ? RULERS_NIDANA[rulerKey] : null;
            
            const pLower = (planetName || '').toLowerCase().trim();

            let isUp = false;
            let isDown = false;

            if (entry) {
                const matchName = (list) => (list || []).some(n => {
                    const l = (n || '').toLowerCase().trim();
                    if (l === pLower) return true;
                    if (pLower.includes('узел') && l.includes('узел')) return true;
                    if (pLower.includes('солнце') && l.includes('солнце')) return true;
                    if (pLower.includes('земля') && l.includes('земля')) return true;
                    return false;
                });

                isUp = matchName(entry.up);
                isDown = matchName(entry.down);
            }

            let sym = '';
            let title = '';
            if (isUp && isDown) {
                sym = '☆'; title = 'Юкста-позиция';
            } else if (isUp) {
                sym = '▲'; title = 'Экзальтация';
            } else if (isDown) {
                sym = '▽'; title = 'Падение';
            } else {
                const outerPlanets = ['сатурн', 'уран', 'нептун', 'плутон', 'юпитер'];
                if (outerPlanets.some(op => pLower.includes(op)) || isRetro) {
                    sym = '→'; title = 'Направление';
                }
            }

            if (!sym) return '';
            return `<span class="bg-fix-badge" title="${title}">${sym}</span>`;
        }

        // ── Build a planet row ─────────────────────────────────────────
        function buildPlanetRow(p, isDesign) {
            const colorCss  = isDesign ? '#fe0000' : '#2E2A20';
            const sym       = getPlanetSym(p.name);
            const gate      = p.hexagram ? p.hexagram.gate : '—';
            const line      = p.hexagram ? p.hexagram.line : '';
            const isRetro   = p.is_retrograde;
            const targetSet = isDesign ? activeBgDesign : activeBgPers;
            const isActive  = !targetSet || targetSet.has(p.name);

            let zodiacSym = '';
            if (p.longitude !== undefined) {
                const signIdx = Math.floor(p.longitude / 30) % 12;
                if (ZODIAC_META[signIdx]) zodiacSym = ZODIAC_META[signIdx].sym;
            }

            const row = document.createElement('div');
            row.className = 'bg-planet-row' + (isActive ? '' : ' bg-row-inactive');
            row.dataset.planetName = p.name;
            row.dataset.gate       = gate;
            row.dataset.isDesign   = isDesign ? '1' : '0';
            row.title              = `${p.displayName || p.name}: ворота ${gate}.${line}`;

            const key = p.name === 'Северный Узел' ? 'Истинный Северный Узел' : (p.name === 'Южный Узел' ? 'Истинный Южный Узел' : p.name);
            const pMeta = PLANET_META[key] || PLANET_META[p.name] || {};
            const glyphCls = pMeta.cls || '';

            const fixBadge = getPlanetFixationBadgeHtml(p.name, gate, line, isRetro);

            const gateCellHtml = `
                <div class="bg-gate-cell" style="color:${colorCss}" title="1-й цифербат (Основной Рейв): ворота ${gate}.${line}">
                    <span class="bg-gate-main">${gate}</span>
                    <div class="bg-line-stack">
                        ${fixBadge}
                        <span class="bg-line-sub">${line || ''}</span>
                    </div>
                </div>
            `;

            // Compute 2nd dial (Зеркало Жизни) program for this planet if houses data exists
            let mirrorGateCellHtml = '';
            if (p.longitude != null && data && data.houses && data.houses.length >= 1) {
                const AS = data.houses[0].longitude;
                // Clockwise from AS: mirror offset = (AS - lon + 360) % 360
                const relLon = (AS - p.longitude + 360) % 360;
                const mIdx = Math.floor(relLon / 5.625) % 64;
                const mGate = MIRROR_GATE_ORDER[mIdx];
                const mLine = Math.floor((relLon % 5.625) / (5.625 / 6)) + 1;

                const mirrorFixBadge = getPlanetFixationBadgeHtml(p.name, mGate, mLine, isRetro);

                mirrorGateCellHtml = `
                    <div class="bg-gate-cell bg-mirror-cell" title="2-й цифербат (Зеркало Жизни): ворота ${mGate}.${mLine}">
                        <span class="bg-gate-main">${mGate}</span>
                        <div class="bg-line-stack">
                            ${mirrorFixBadge}
                            <span class="bg-line-sub">${mLine}</span>
                        </div>
                    </div>
                `;
            }

            if (isDesign) {
                // Left column: Planet | 1st Dial Gate | 2nd Dial Mirror Gate | Zodiac
                row.innerHTML = `
                    <div class="bg-planet-wrap">
                        <span class="bg-planet-sym ${glyphCls}" style="color:${colorCss}">${sym}</span>
                        ${isRetro ? '<span class="bg-retro-badge">R</span>' : ''}
                    </div>
                    ${gateCellHtml}
                    ${mirrorGateCellHtml}
                    <span class="bg-zodiac-sym">${zodiacSym}</span>
                `;
            } else {
                // Right column: Zodiac | 2nd Dial Mirror Gate | 1st Dial Gate | Planet
                row.innerHTML = `
                    <span class="bg-zodiac-sym">${zodiacSym}</span>
                    ${mirrorGateCellHtml}
                    ${gateCellHtml}
                    <div class="bg-planet-wrap">
                        <span class="bg-planet-sym ${glyphCls}" style="color:${colorCss}">${sym}</span>
                        ${isRetro ? '<span class="bg-retro-badge">R</span>' : ''}
                    </div>
                `;
            }

            // Toggle on click: dim/undim the row
            row.addEventListener('click', () => {
                const name = row.dataset.planetName;
                const isDes = row.dataset.isDesign === '1';
                
                if (isDes) {
                    if (activeBgDesign.has(name)) {
                        activeBgDesign.delete(name);
                        row.classList.add('bg-row-inactive');
                        row.classList.remove('bg-row-highlighted');
                    } else {
                        activeBgDesign.add(name);
                        row.classList.remove('bg-row-inactive');
                    }
                } else {
                    if (activeBgPers.has(name)) {
                        activeBgPers.delete(name);
                        row.classList.add('bg-row-inactive');
                        row.classList.remove('bg-row-highlighted');
                    } else {
                        activeBgPers.add(name);
                        row.classList.remove('bg-row-inactive');
                    }
                }
                
                applyGatesToSvg();
            });

            return row;
        }

        // ── Populate left column (Design / red) ────────────────────────
        designList.innerHTML = '';
        designPlanets.forEach(p => {
            if (!p.hexagram) return;
            designList.appendChild(buildPlanetRow(p, true));
        });

        // ── Populate right column (Personality / black) ────────────────
        persList.innerHTML = '';
        personalityPlanets.forEach(p => {
            if (!p.hexagram) return;
            persList.appendChild(buildPlanetRow(p, false));
        });

        // ── Apply initial gate state ───────────────────────────────────
        applyGatesToSvg();

        // ── Bodygraph interactivity ────────────────────────────────────
        function initBodygraphInteractivity() {

            // ─ 64 gate names in Russian (I-Ching Human Design names) ──
            const GATE_NAMES = {
                1:'Самовыражение',       2:'Направление Я',        3:'Упорядочивание',
                4:'Формулирование',      5:'Фиксированные ритмы',  6:'Трение',
                7:'Роль Я в Социуме',   8:'Вклад',                9:'Сосредоточенность',
                10:'Поведение Я',       11:'Идеи',                12:'Осторожность',
                13:'Слушатель',         14:'Мощная Сила',         15:'Крайности',
                16:'Энтузиазм',         17:'Мнения',              18:'Исправление',
                19:'Хотение',           20:'Созерцание',          21:'Охотник',
                22:'Изящество',         23:'Ассимиляция',         24:'Рационализация',
                25:'Дух Я',             26:'Эгоист',              27:'Забота',
                28:'Игрок',             29:'Да',                  30:'Огни Судьбы',
                31:'Влияние',           32:'Непрерывность',       33:'Укрытие',
                34:'Сила',              35:'Прогресс',            36:'Сумерки',
                37:'Дружба',            38:'Оппозиция',           39:'Провокация',
                40:'Одиночество',       41:'Убывание',            42:'Рост',
                43:'Прозрение',         44:'Бдительность',        45:'Собиратель',
                46:'Удача Я',           47:'Угнетение',           48:'Глубина',
                49:'Принципы',          50:'Ценности',            51:'Потрясение',
                52:'Неподвижность',     53:'Начало',              54:'Честолюбие',
                55:'Дух',               56:'Рассказчик',          57:'Интуиция',
                58:'Жизнеспособность',  59:'Сексуальность',       60:'Ограничение',
                61:'Тайное Знание',     62:'Детали',              63:'Сомнение',
                64:'Смятение'
            };

            // ─ Center metadata ─────────────────────────────────────────
            const CENTER_META = {
                head:    { name: 'Голова',                    subtitle: 'Центр вдохновения и сомнения',                            blockNum: 1 },
                ajna:    { name: 'Аджна',                     subtitle: 'Центр ума и концептуализации',                            blockNum: 2 },
                throat:  { name: 'Горло',                     subtitle: 'Центр коммуникации и манифестации',                       blockNum: 3 },
                gcenter: { name: 'G-Центр · Солнечное Сплетение', subtitle: 'Центр Бога · Магнитный монополь · Любовь и Направление',  blockNum: 4 },
                heart:   { name: 'Сердце / Эго',              subtitle: 'Центр воли и материального мира',                         blockNum: 5 },
                spleen:  { name: 'Селезёнка',                 subtitle: 'Центр интуиции, инстинкта и здоровья',                    blockNum: 6 },
                sacral:  { name: 'Сакральный',                subtitle: 'Центр истинных творцов · Жизненная сила',                 blockNum: 7 },
                solar:   { name: 'Эмоциональный центр',        subtitle: 'Центр чувств и духовного дыхания',                       blockNum: 8 },
                root:    { name: 'Корень',                    subtitle: 'Центр давления и адреналина',                            blockNum: 9 },
            };

            // ─ Build gate → planets lookup ─────────────────────────────
            const gateLookup = {};
            personalityPlanets.forEach(p => {
                if (!p.hexagram) return;
                const g = p.hexagram.gate;
                if (!gateLookup[g]) gateLookup[g] = { design: [], personality: [] };
                gateLookup[g].personality.push(p.displayName || p.name);
            });
            designPlanets.forEach(p => {
                if (!p.hexagram) return;
                const g = p.hexagram.gate;
                if (!gateLookup[g]) gateLookup[g] = { design: [], personality: [] };
                gateLookup[g].design.push(p.displayName || p.name);
            });

            // ─ Create tooltip DOM elements (once) ─────────────────────
            let gateTooltip = document.getElementById('bg-gate-tt');
            if (!gateTooltip) {
                gateTooltip = document.createElement('div');
                gateTooltip.id = 'bg-gate-tt';
                gateTooltip.className = 'bg-gate-tooltip';
                document.body.appendChild(gateTooltip);
            }

            let centerTooltip = document.getElementById('bg-center-tt');
            if (!centerTooltip) {
                centerTooltip = document.createElement('div');
                centerTooltip.id = 'bg-center-tt';
                centerTooltip.className = 'bg-center-tooltip';
                document.body.appendChild(centerTooltip);
            }

            // ─ Tooltip positioning ─────────────────────────────────────
            function positionEl(el, x, y) {
                const margin = 12;
                const w = el.offsetWidth  || 200;
                const h = el.offsetHeight || 80;
                let tx = x + 16;
                let ty = y - 8;
                if (tx + w + margin > window.innerWidth)   tx = x - w - 16;
                if (ty + h + margin > window.innerHeight)  ty = y - h - 8;
                if (ty < margin) ty = margin;
                if (tx < margin) tx = margin;
                el.style.left = tx + 'px';
                el.style.top  = ty + 'px';
            }

            // ─ Gate tooltip show/hide ──────────────────────────────────
            function showGateTT(gateNum, x, y) {
                const name   = GATE_NAMES[gateNum] || '';
                const act    = gateLookup[gateNum] || { design: [], personality: [] };
                const hasDes = act.design.length > 0;
                const hasPer = act.personality.length > 0;

                const typeLabel = hasDes && hasPer ? 'Дизайн + Личность'
                                : hasDes           ? 'Бессознательное'
                                : hasPer           ? 'Сознательное'
                                :                    'Не активировано';

                let gateCenterName = '';
                for (const [cName, c] of Object.entries(BG_CENTERS)) {
                    if (Object.keys(c.gates).map(Number).includes(gateNum)) {
                        const ruNames = {
                            'Head': 'Теменной центр',
                            'Ajna': 'Аджна центр',
                            'Throat': 'Горловой центр',
                            'G-Center': 'Джи центр',
                            'Heart': 'Эго центр (Сердце)',
                            'Spleen': 'Селезёночный центр',
                            'Sacral': 'Сакральный центр',
                            'SolarPlexus': 'Солнечное Сплетение',
                            'Root': 'Корневой центр'
                        };
                        gateCenterName = ruNames[cName] || cName;
                        break;
                    }
                }

                let rows = '';
                if (hasDes && hasPer) {
                    const uniq = [...new Set([...act.design, ...act.personality])];
                    rows = uniq.map(p =>
                        `<div class="tt-planet-row"><div class="tt-dot-both"></div><span>${p}</span></div>`
                    ).join('');
                } else if (hasDes) {
                    rows = act.design.map(p =>
                        `<div class="tt-planet-row"><div class="tt-dot-design"></div><span>${p}</span></div>`
                    ).join('');
                } else if (hasPer) {
                    rows = act.personality.map(p =>
                        `<div class="tt-planet-row"><div class="tt-dot-personality"></div><span>${p}</span></div>`
                    ).join('');
                }

                gateTooltip.innerHTML = `
                    <span class="tt-gate-num">Ворота ${gateNum}</span>
                    ${name ? `<span class="tt-gate-name">${name}</span>` : ''}
                    ${gateCenterName ? `<div style="font-size:11px;color:#E5C87A;margin-top:2px;margin-bottom:4px;font-weight:500;">${gateCenterName}</div>` : ''}
                    <div style="font-size:10px;color:rgba(200,180,130,0.65);margin-bottom:${rows?'5px':'0'}">${typeLabel}</div>
                    ${rows ? `<div class="tt-planets">${rows}</div>` : ''}
                `;
                gateTooltip.style.left = '-9999px';
                gateTooltip.style.top  = '-9999px';
                gateTooltip.classList.add('visible');
                requestAnimationFrame(() => positionEl(gateTooltip, x, y));
            }
            function hideGateTT() { gateTooltip.classList.remove('visible'); }

            // ─ Index gate SVG elements by gate number ─────────────────
            const gateEls = {}; // gateNum → [element, …]
            svgWrap.querySelectorAll('[class]').forEach(el => {
                (el.getAttribute('class') || '').split(/\s+/).forEach(cls => {
                    const m = cls.match(/^cls__(\d+)$/);
                    if (m) {
                        const g = Number(m[1]);
                        if (!gateEls[g]) gateEls[g] = [];
                        gateEls[g].push(el);
                    }
                });
            });

            // Hover on SVG gate shapes
            Object.entries(gateEls).forEach(([gNum, els]) => {
                els.forEach(el => {
                    el.style.cursor = 'pointer';
                    el.addEventListener('mouseenter', e => showGateTT(Number(gNum), e.clientX, e.clientY));
                    el.addEventListener('mousemove',  e => positionEl(gateTooltip, e.clientX, e.clientY));
                    el.addEventListener('mouseleave', hideGateTT);
                });
            });

            // Hover on SVG text numbers
            svgWrap.querySelectorAll('text').forEach(el => {
                const n = parseInt(el.textContent.trim(), 10);
                if (n >= 1 && n <= 64 && el.textContent.trim() === String(n)) {
                    el.style.cursor = 'pointer';
                    el.addEventListener('mouseenter', e => showGateTT(n, e.clientX, e.clientY));
                    el.addEventListener('mousemove',  e => positionEl(gateTooltip, e.clientX, e.clientY));
                    el.addEventListener('mouseleave', hideGateTT);
                }
            });

            // ─ Cross-highlight: planet row ↔ SVG gate glow ────────────
            let glowing = [];
            function applyGlow(gateNum, color) {
                (gateEls[gateNum] || []).forEach(el => {
                    el.style.filter     = `drop-shadow(0 0 5px ${color}) drop-shadow(0 0 2px ${color})`;
                    el.style.transition = 'filter 0.18s ease';
                    glowing.push(el);
                });
            }
            function clearGlow() {
                glowing.forEach(el => { el.style.filter = ''; });
                glowing = [];
            }

            document.querySelectorAll('.bg-planet-row').forEach(row => {
                const gate    = Number(row.dataset.gate);
                const isDes   = row.dataset.isDesign === '1';
                const glowClr = isDes ? '#ff4444' : '#555555';

                row.addEventListener('mouseenter', () => {
                    // Don't apply cross-highlight to inactive (dimmed) rows
                    if (row.classList.contains('bg-row-inactive')) return;
                    clearGlow();
                    if (gate) applyGlow(gate, glowClr);
                    row.classList.add('bg-row-highlighted');
                });
                row.addEventListener('mouseleave', () => {
                    clearGlow();
                    row.classList.remove('bg-row-highlighted');
                });
            });

            // ─ Center tooltips ─────────────────────────────────────────
            function showCenterTT(info, isDefined, x, y) {
                const statusCls  = isDefined ? 'defined' : 'undefined';
                const statusText = isDefined ? '● Определён' : '○ Не определён';
                centerTooltip.innerHTML = `
                    <span class="tt-center-name">${info.name}</span>
                    ${info.subtitle ? `<span class="tt-center-subtitle">${info.subtitle}</span>` : ''}
                    <span class="tt-center-status ${statusCls}">${statusText}</span>
                `;
                centerTooltip.style.left = '-9999px';
                centerTooltip.style.top  = '-9999px';
                centerTooltip.classList.add('visible');
                requestAnimationFrame(() => positionEl(centerTooltip, x, y));
            }

            Object.entries(CENTER_META).forEach(([key, info]) => {
                const blockEl = svgWrap.querySelector('.block__' + info.blockNum);
                if (!blockEl) return;
                blockEl.style.cursor = 'pointer';
                blockEl.addEventListener('mouseenter', e => {
                    const isDefined = blockEl.classList.contains('block__' + info.blockNum + '-active');
                    showCenterTT(info, isDefined, e.clientX, e.clientY);
                });
                blockEl.addEventListener('mousemove',  e => positionEl(centerTooltip, e.clientX, e.clientY));
                blockEl.addEventListener('mouseleave', () => centerTooltip.classList.remove('visible'));
            });

            // ─ Staggered entrance animation ───────────────────────────
            document.querySelectorAll('.bg-col-design .bg-planet-row').forEach((row, i) => {
                row.style.animationDelay = (i * 35 + 50) + 'ms';
            });
            document.querySelectorAll('.bg-col-personality .bg-planet-row').forEach((row, i) => {
                row.style.animationDelay = (i * 35 + 50) + 'ms';
            });
        }

        initBodygraphInteractivity();

        // ── Mandala Canvas Interactivity (Hover effects & tooltips) ──
        function initMandalaInteractivity() {
            const canvasEl = document.getElementById('mandala-canvas');
            if (!canvasEl) return;

            const btnToggleAll = document.getElementById('mandala-toggle-all');

            function updateToggleAllBtnState() {
                if (!btnToggleAll) return;
                const allKeys = Object.keys(mandalaSettings);
                const areAllOn = allKeys.every(k => mandalaSettings[k]);
                btnToggleAll.innerHTML = areAllOn ? '↺ Сбросить' : 'Всё';
            }

            if (btnToggleAll) {
                btnToggleAll.addEventListener('click', () => {
                    const allKeys = Object.keys(mandalaSettings);
                    const areAllOn = allKeys.every(k => mandalaSettings[k]);

                    const newState = !areAllOn;
                    allKeys.forEach(k => {
                        mandalaSettings[k] = newState;
                    });

                    document.querySelectorAll('.mandala-chip').forEach(chip => {
                        const ring = chip.getAttribute('data-ring');
                        chip.classList.toggle('active', mandalaSettings[ring]);
                    });

                    updateToggleAllBtnState();

                    const wrap = document.getElementById('mandala-bodygraph-wrap');
                    if (wrap) {
                        wrap.style.opacity = mandalaSettings.bodygraph ? '1' : '0';
                        wrap.style.transform = mandalaSettings.bodygraph ? 'scale(1)' : 'scale(0.93)';
                    }

                    animateMandala();
                });
            }

            // Bind click listeners to Mandala ring toggle chips
            document.querySelectorAll('.mandala-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    const ring = chip.getAttribute('data-ring');
                    if (ring in mandalaSettings) {
                        mandalaSettings[ring] = !mandalaSettings[ring];
                        chip.classList.toggle('active', mandalaSettings[ring]);
                        
                        updateToggleAllBtnState();

                        // Update bodygraph CSS overlay transition immediately
                        const wrap = document.getElementById('mandala-bodygraph-wrap');
                        if (wrap) {
                            wrap.style.opacity = mandalaSettings.bodygraph ? '1' : '0';
                            wrap.style.transform = mandalaSettings.bodygraph ? 'scale(1)' : 'scale(0.93)';
                        }

                        // Trigger smooth rotation & fade animation loop for rings on canvas
                        animateMandala();
                    }
                });
            });
            
            let mandalaHoverState = { type: null, target: null, mx: 0, my: 0, cx: 0, cy: 0, gateIdx: -1 };
            
            // Point-in-polygon helper
            function isPointInPoly(pt, poly) {
                const x = pt[0], y = pt[1];
                let inside = false;
                for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
                    const xi = poly[i][0], yi = poly[i][1];
                    const xj = poly[j][0], yj = poly[j][1];
                    const intersect = ((yi > y) !== (yj > y))
                        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                    if (intersect) inside = !inside;
                }
                return inside;
            }

            // Get quarter name based on gate index
            function getQuarterNameForIdx(idx) {
                if (idx >= 56 || idx <= 7) return "Инициация";
                if (idx >= 8 && idx <= 23) return "Цивилизация";
                if (idx >= 24 && idx <= 39) return "Дуальность";
                if (idx >= 40 && idx <= 55) return "Мутация";
                return "";
            }

            const GODHEADS = [
                "Михаил", "Янус", "Майя", "Лакшми", 
                "Парвати", "Маат", "Тот", "Гармония", 
                "Христос", "Минерва", "Аид", "Прометей", 
                "Вишну", "Хранители Колеса", "Кали", "Митра"
            ];

            const GATE_ORDER = [
                25, 36, 22, 63, 37, 55, 30, 49, 13, 19, 41, 60, 61, 54, 38, 58,
                10, 11, 26,  5,  9, 34, 14, 43,  1, 44, 28, 50, 32, 57, 48, 18,
                46,  6, 47, 64, 40, 59, 29,  4,  7, 33, 31, 56, 62, 53, 39, 52,
                15, 12, 45, 35, 16, 20,  8, 23,  2, 24, 27,  3, 42, 51, 21, 17
            ];
            
            const WHEEL_START = 358.0 + 15.0 / 60.0 + 1.0 / 3600.0;
            const GATE_INTERVAL = 5.625;

            // Tooltip elements
            let gateTooltip = document.getElementById('bg-gate-tt');
            let centerTooltip = document.getElementById('bg-center-tt');

            canvasEl.addEventListener('mousemove', (e) => {
                if (!lastChart) return;
                
                const rect = canvasEl.getBoundingClientRect();
                const mx = e.clientX - rect.left;
                const my = e.clientY - rect.top;
                
                // Current display width of the canvas
                const displayW = rect.width;
                const cx = displayW / 2;
                const cy = displayW / 2;
                const R = displayW / 2 - 8;
                
                const rHousesOuter = R * 0.720;
                const rHousesInner = R * 0.630;
                const rInnerBorder = rHousesInner;

                const dx = mx - cx;
                const dy = my - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                let type = null;
                let target = null;
                let gateIdx = -1;

                if (dist < rInnerBorder) {
                    // Inside bodygraph
                    const bgScale = (rInnerBorder * 2 * 0.88) / 650; // BG_H = 650
                    const bgOffX = cx - (400 * bgScale) / 2 + (10 * bgScale);       // BG_W = 400
                    const bgOffY = cy - (650 * bgScale) / 2;
                    const lx = (mx - bgOffX) / bgScale;
                    const ly = (my - bgOffY) / bgScale;
                    
                    const s = 400 / 330.55;
                    const yOffset = (650 - 476.35 * s) / 2;
                    const sx = lx / s;
                    const sy = (ly - yOffset) / s;

                    for (const [name, c] of Object.entries(BG_CENTERS)) {
                        if (c.poly && isPointInPoly([sx, sy], c.poly)) {
                            type = 'center';
                            target = name;
                            break;
                        }
                    }
                } else if (dist <= R) {
                    // On the wheel
                    let angle = Math.atan2(dy, dx);
                    let deg = angle * (180 / Math.PI) + 180;
                    if (deg < 0) deg += 360;

                    // Check if hovering the Houses Ring (rHousesInner <= dist <= rHousesOuter)
                    if (dist >= rHousesInner && dist <= rHousesOuter && lastChart && lastChart.houses) {
                        const cursorLon = deg;
                        let houseIdx = -1;
                        for (let i = 0; i < 12; i++) {
                            const h = lastChart.houses[i];
                            const hNext = lastChart.houses[(i + 1) % 12];
                            const getProgramBoundary = (houseData) => {
                                if (!houseData || !houseData.hexagram) return houseData ? houseData.longitude : 0;
                                const gateIdx = GATE_ORDER.indexOf(houseData.hexagram.gate);
                                if (gateIdx === -1) return houseData.longitude;
                                const lineIdx = (houseData.hexagram.line || 1) - 1;
                                return (WHEEL_START + gateIdx * GATE_INTERVAL + lineIdx * (GATE_INTERVAL / 6)) % 360;
                            };
                            const s = getProgramBoundary(hNext);
                            const e = getProgramBoundary(h);
                            let inHouse;
                            if (e < s) {
                                inHouse = (cursorLon >= s || cursorLon < e);
                            } else {
                                inHouse = (cursorLon >= s && cursorLon < e);
                            }
                            if (inHouse) { houseIdx = i; break; }
                        }
                        if (houseIdx >= 0 && houseIdx < 12) {
                            type = 'house';
                            target = houseIdx + 1;
                        }
                    }

                    if (!type) {
                        // On the Gates/Zodiac Ring
                        let offset = (deg - WHEEL_START) % 360;
                        if (offset < 0) offset += 360;
                        gateIdx = Math.floor(offset / GATE_INTERVAL) % 64;
                        const gateNum = GATE_ORDER[gateIdx];

                        type = 'gate';
                        target = gateNum;
                    }
                }

                const changed = (type !== mandalaHoverState.type || target !== mandalaHoverState.target);
                
                mandalaHoverState = { type, target, mx, my, cx: e.clientX, cy: e.clientY, gateIdx };

                if (changed) {
                    drawMandala(lastChart, canvasEl, mandalaHoverState);
                    updateTooltip();
                } else if (type) {
                    // Just update tooltip position
                    if (type === 'center') {
                        if (centerTooltip) positionEl(centerTooltip, e.clientX, e.clientY);
                    } else if (type === 'gate') {
                        if (gateTooltip) positionEl(gateTooltip, e.clientX, e.clientY);
                    }
                }
            });

            canvasEl.addEventListener('mouseleave', () => {
                if (!lastChart) return;
                if (mandalaHoverState.type) {
                    mandalaHoverState = { type: null, target: null, mx: 0, my: 0, cx: 0, cy: 0, gateIdx: -1 };
                    drawMandala(lastChart, canvasEl, mandalaHoverState);
                    if (gateTooltip) gateTooltip.classList.remove('visible');
                    if (centerTooltip) centerTooltip.classList.remove('visible');
                }
            });

            function positionEl(el, x, y) {
                const margin = 12;
                const w = el.offsetWidth  || 200;
                const h = el.offsetHeight || 80;
                let tx = x + 16;
                let ty = y - 8;
                if (tx + w + margin > window.innerWidth)   tx = x - w - 16;
                if (ty + h + margin > window.innerHeight)  ty = y - h - 8;
                if (ty < margin) ty = margin;
                if (tx < margin) tx = margin;
                el.style.left = tx + 'px';
                el.style.top  = ty + 'px';
            }

            // Russian names of centers and info for tooltips
            const CENTER_META = {
                'Head': { name: 'Голова', subtitle: 'Центр вдохновения и сомнения' },
                'Ajna': { name: 'Аджна', subtitle: 'Центр ума и концептуализации' },
                'Throat': { name: 'Горло', subtitle: 'Центр коммуникации и манифестации' },
                'G-Center': { name: 'G-Центр', subtitle: 'Центр любви, направления и самоидентификации' },
                'Heart': { name: 'Сердце / Эго', subtitle: 'Центр воли и материального мира' },
                'Spleen': { name: 'Селезёнка', subtitle: 'Центр интуиции, инстинкта и здоровья' },
                'Sacral': { name: 'Сакральный', subtitle: 'Центр жизненной силы и работоспособности' },
                'SolarPlexus': { name: 'Эмоциональный центр', subtitle: 'Центр чувств и эмоциональной ясности' },
                'Root': { name: 'Корень', subtitle: 'Центр давления и стрессоустойчивости' }
            };

            const GATE_NAMES = {
                1:'Самовыражение',       2:'Направление Я',        3:'Упорядочивание',
                4:'Формулирование',      5:'Фиксированные ритмы',  6:'Трение',
                7:'Роль Я в Социуме',   8:'Вклад',                9:'Сосредоточенность',
                10:'Поведение Я',       11:'Идеи',                12:'Осторожность',
                13:'Слушатель',         14:'Мощная Сила',         15:'Крайности',
                16:'Энтузиазм',         17:'Мнения',              18:'Исправление',
                19:'Хотение',           20:'Созерцание',          21:'Охотник',
                22:'Изящество',         23:'Ассимиляция',         24:'Рационализация',
                25:'Дух Я',             26:'Эгоист',              27:'Забота',
                28:'Игрок',             29:'Да',                  30:'Огни Судьбы',
                31:'Влияние',           32:'Непрерывность',       33:'Укрытие',
                34:'Сила',              35:'Прогресс',            36:'Сумерки',
                37:'Дружба',            38:'Оппозиция',           39:'Провокация',
                40:'Одиночество',       41:'Убывание',            42:'Рост',
                43:'Прозрение',         44:'Бдительность',        45:'Собиратель',
                46:'Удача Я',           47:'Угнетение',           48:'Глубина',
                49:'Принципы',          50:'Ценности',            51:'Потрясение',
                52:'Неподвижность',     53:'Начало',              54:'Честолюбие',
                55:'Дух',               56:'Рассказчик',          57:'Интуиция',
                58:'Жизнеспособность',  59:'Сексуальность',       60:'Ограничение',
                61:'Тайное Знание',     62:'Детали',              63:'Сомнение',
                64:'Смятение'
            };

            function updateTooltip() {
                if (!gateTooltip || !centerTooltip) return;
                
                const { type, target, cx, cy, gateIdx } = mandalaHoverState;
                
                // Hide all first
                gateTooltip.classList.remove('visible');
                centerTooltip.classList.remove('visible');

                if (!type) return;

                if (type === 'center') {
                    const info = CENTER_META[target];
                    if (!info) return;

                    // Determine if defined
                    const activeGatesPersonality = new Set(lastChart.planets.filter(p => p.hexagram && (!activePlanets || activePlanets.has(p.name))).map(p => p.hexagram.gate));
                    const activeGatesDesign = new Set((lastChart.design_planets || []).filter(p => p.hexagram && (!activePlanets || activePlanets.has(p.name))).map(p => p.hexagram.gate));
                    const activeGatesCombined = new Set([...activeGatesPersonality, ...activeGatesDesign]);
                    
                    const definedCenters = new Set();
                    CHANNELS_DATA.forEach(ch => {
                        if (activeGatesCombined.has(ch.gateA) && activeGatesCombined.has(ch.gateB)) {
                            definedCenters.add(ch.centerA);
                            definedCenters.add(ch.centerB);
                        }
                    });

                    const isDefined = definedCenters.has(target);
                    const statusCls = isDefined ? 'defined' : 'undefined';
                    const statusText = isDefined ? '● Определён' : '○ Не определён';

                    centerTooltip.innerHTML = `
                        <span class="tt-center-name">${info.name}</span>
                        ${info.subtitle ? `<span class="tt-center-subtitle">${info.subtitle}</span>` : ''}
                        <span class="tt-center-status ${statusCls}">${statusText}</span>
                    `;
                    centerTooltip.style.left = '-9999px';
                    centerTooltip.style.top  = '-9999px';
                    centerTooltip.classList.add('visible');
                    requestAnimationFrame(() => positionEl(centerTooltip, cx, cy));
                } else if (type === 'gate') {
                    const gateNum = target;
                    const name = GATE_NAMES[gateNum] || '';

                    const HD_COLORS = {
                        1: "1. Страх",
                        2: "2. Надежда",
                        3: "3. Желание",
                        4: "4. Нужда",
                        5: "5. Вина",
                        6: "6. Невинность"
                    };

                    const HD_TONES = {
                        1: "1. Запах",
                        2: "2. Вкус",
                        3: "3. Внешнее видение",
                        4: "4. Внутреннее видение",
                        5: "5. Чувство",
                        6: "6. Прикосновение"
                    };

                    const HD_BASES = {
                        1: "1. Активная",
                        2: "2. Реактивная",
                        3: "3. Интегративная",
                        4: "4. Объективная",
                        5: "5. Субъективная"
                    };

                    const HD_THEOSES = {
                        1: "1. Теос",
                        2: "2. Хаос",
                        3: "3. Космос"
                    };
                    
                    // Collect activations
                    const activePers = [];
                    const activeDes = [];
                    lastChart.planets.forEach(p => {
                        if (p.hexagram && p.hexagram.gate === gateNum && (!activePlanets || activePlanets.has(p.name))) {
                            activePers.push(p);
                        }
                    });
                    (lastChart.design_planets || []).forEach(p => {
                        if (p.hexagram && p.hexagram.gate === gateNum && (!activePlanets || activePlanets.has(p.name))) {
                            activeDes.push(p);
                        }
                    });

                    const hasDes = activeDes.length > 0;
                    const hasPer = activePers.length > 0;
                    const typeLabel = hasDes && hasPer ? 'Дизайн + Личность'
                                    : hasDes           ? 'Бессознательное (Дизайн)'
                                    : hasPer           ? 'Сознательное (Личность)'
                                    :                    'Не активировано';

                    let rows = '';
                    const renderActivationRow = (p, isDesign) => {
                        const hx = p.hexagram;
                        const dotClass = isDesign ? 'tt-dot-design' : 'tt-dot-personality';
                        const labelType = isDesign ? 'Дизайн' : 'Личность';
                        
                        const colorName = HD_COLORS[hx.color] || hx.color;
                        const toneName = HD_TONES[hx.tone] || hx.tone;
                        const baseName = HD_BASES[hx.base] || hx.base;
                        const theosName = HD_THEOSES[hx.theos] || hx.theos;
                        const dispName = p.displayName || p.name;
                        
                        return `
                            <div class="tt-planet-row-detail">
                                <div class="tt-planet-header">
                                    <div class="${dotClass}"></div>
                                    <span class="tt-planet-name-spec">${dispName} (${labelType})</span>
                                    <span class="tt-planet-line-badge">Линия ${hx.line}</span>
                                </div>
                                <div class="tt-planet-metrics">
                                    <span>Цвет: <strong>${colorName}</strong></span>
                                    <span>Тон: <strong>${toneName}</strong></span>
                                    <span>База: <strong>${baseName}</strong></span>
                                    <span>Теос: <strong>${theosName}</strong></span>
                                </div>
                            </div>
                        `;
                    };

                    const allRows = [];
                    activePers.forEach(p => allRows.push(renderActivationRow(p, false)));
                    activeDes.forEach(p => allRows.push(renderActivationRow(p, true)));
                    rows = allRows.join('');

                    gateTooltip.innerHTML = `
                        <span class="tt-gate-num">Ворота ${gateNum}</span>
                        ${name ? `<span class="tt-gate-name">${name}</span>` : ''}
                        <div style="font-size:10px;color:rgba(200,180,130,0.65);margin-bottom:${rows?'5px':'0'}">${typeLabel}</div>
                        ${rows ? `<div class="tt-planets">${rows}</div>` : ''}
                    `;
                    gateTooltip.style.left = '-9999px';
                    gateTooltip.style.top  = '-9999px';
                    gateTooltip.classList.add('visible');
                    requestAnimationFrame(() => positionEl(gateTooltip, cx, cy));
                } else if (type === 'quarter') {
                    centerTooltip.innerHTML = `
                        <span class="tt-center-name">Четверть: ${target}</span>
                        <span class="tt-center-subtitle" style="margin-bottom:0;">Сектор из 16 ворот на внешнем колесе.</span>
                    `;
                    centerTooltip.style.left = '-9999px';
                    centerTooltip.style.top  = '-9999px';
                    centerTooltip.classList.add('visible');
                    requestAnimationFrame(() => positionEl(centerTooltip, cx, cy));
                } else if (type === 'godhead') {
                    centerTooltip.innerHTML = `
                        <span class="tt-center-name">Божество: ${target}</span>
                        <span class="tt-center-subtitle" style="margin-bottom:0;">Сектор из 4 ворот под влиянием этого архетипа.</span>
                    `;
                    centerTooltip.style.left = '-9999px';
                    centerTooltip.style.top  = '-9999px';
                    centerTooltip.classList.add('visible');
                    requestAnimationFrame(() => positionEl(centerTooltip, cx, cy));
                }
            }
        }

        initMandalaInteractivity();
    }

});

