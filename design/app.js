/* ─── Helpers ────────────────────────────────────────────────────────────────── */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const STORAGE_KEY = 'drinktracker_local_v2';

const fmt = new Intl.NumberFormat('de-DE');

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function byDateRange(entries, start, end) {
  const s = start.getTime();
  const e = end.getTime();
  return entries
    .filter(x => {
      const t = new Date(x.ts).getTime();
      return t >= s && t <= e;
    })
    .sort((a, b) => new Date(a.ts) - new Date(b.ts));
}

function totalByDrink(entries) {
  const map = {};
  for (const en of entries) {
    map[en.drinkId] = (map[en.drinkId] || 0) + (+en.ml || 0);
  }
  return map;
}

function isTimeStr(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

/* ─── State ──────────────────────────────────────────────────────────────────── */
const state = {
  drinks:  [],  // { id, name, color, notes }
  entries: [],  // { id, ts (ISO), ml, drinkId }
  settings: { dailyGoalMl: 2000 },
  weekOffset:    0,
  monthOffset:   0,
  selectedDate:  new Date(),
  editDrinkId:   null,
  reminders: {
    enabled:             false,
    intervalMin:         60,
    snoozeMin:           15,
    start:               '08:00',
    end:                 '21:00',
    pauseAfterDrinkMin:  30,
    msg:                 'Zeit für einen Schluck! 💧',
    sound:               true,
    fixedTimes:          [],  // e.g. ["10:30","12:00"]
  },
  _reminderTimer: null,
  _lastDrinkAt:   null,
  _snoozeUntil:   0,
};

/* ─── Storage ────────────────────────────────────────────────────────────────── */
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(state, data);
      state.selectedDate = new Date(state.selectedDate || new Date());
    } else {
      state.drinks = [
        { id: uid(), name: 'Wasser', color: '#22c55e', notes: 'still' },
        { id: uid(), name: 'Saft',   color: '#f59e0b', notes: 'Apfel' },
        { id: uid(), name: 'Tee',    color: '#3b82f6', notes: 'ohne Zucker' },
      ];
      persist();
    }
  } catch (e) {
    console.error(e);
  }
}

function persist() {
  const data = JSON.stringify({
    drinks:       state.drinks,
    entries:      state.entries,
    settings:     state.settings,
    weekOffset:   state.weekOffset,
    monthOffset:  state.monthOffset,
    selectedDate: state.selectedDate.toISOString(),
    reminders:    state.reminders,
  });
  localStorage.setItem(STORAGE_KEY, data);
}

/* ─── DOM References ─────────────────────────────────────────────────────────── */
const goalInput         = $('#goal');
const datePicker        = $('#datePicker');
const drinkSelect       = $('#drinkSelect');
const amountInput       = $('#amount');
const addEntryBtn       = $('#addEntryBtn');
const entriesList       = $('#entriesList');
const todayStats        = $('#todayStats');
const todayRing         = $('#todayRing');
const todayLegend       = $('#todayLegend');
const breakdown         = $('#breakdown');
const deleteDayBtn      = $('#deleteDayBtn');
const weekCanvas        = $('#weekChart');
const monthCanvas       = $('#monthChart');
const weekLabel         = $('#weekLabel');
const monthLabel        = $('#monthLabel');
const prevWeek          = $('#prevWeek');
const nextWeek          = $('#nextWeek');
const prevMonth         = $('#prevMonth');
const nextMonth         = $('#nextMonth');
const manageDrinksBtn   = $('#manageDrinksBtn');
const drinksDialog      = $('#drinksDialog');
const dName             = $('#dName');
const dColorText        = $('#dColorText');
const dColorPick        = $('#dColorPick');
const dNotes            = $('#dNotes');
const saveDrinkBtn      = $('#saveDrinkBtn');
const drinksList        = $('#drinksList');
const fsDialog          = $('#fsDialog');
const fsCanvas          = $('#fsCanvas');
const fsTitle           = $('#fsTitle');
const exportBtn         = $('#exportBtn');
const importBtn         = $('#importBtn');
const importFile        = $('#importFile');
const remindersBtn      = $('#remindersBtn');
const remDialog         = $('#remindersDialog');
const remEnable         = $('#remEnable');
const remInterval       = $('#remInterval');
const remSnooze         = $('#remSnooze');
const remStart          = $('#remStart');
const remEnd            = $('#remEnd');
const remPauseAfterDrink = $('#remPauseAfterDrink');
const remMsg            = $('#remMsg');
const remSound          = $('#remSound');
const remSaveBtn        = $('#remSaveBtn');
const remTestBtn        = $('#remTestBtn');
const remStatus         = $('#remStatus');
const remTimesInput     = $('#remTimesInput');
const remApplyTimes     = $('#remApplyTimes');
const remTimesList      = $('#remTimesList');

/* ─── Init ───────────────────────────────────────────────────────────────────── */
function init() {
  load();
  goalInput.value        = state.settings.dailyGoalMl;
  datePicker.valueAsDate = new Date(state.selectedDate);
  renderDrinksSelect();
  renderToday();
  renderEntries();
  drawWeek();
  drawMonth();
  bind();
  applyReminderUI();
  scheduleReminders();
}

/* ─── Event Bindings ─────────────────────────────────────────────────────────── */
function bind() {
  goalInput.onchange = () => {
    state.settings.dailyGoalMl = Math.max(100, parseInt(goalInput.value || 0, 10));
    persist();
    renderToday();
    drawWeek();
    drawMonth();
  };

  datePicker.onchange = () => {
    state.selectedDate = datePicker.valueAsDate || new Date();
    persist();
    renderToday();
    renderEntries();
  };

  addEntryBtn.onclick = addEntry;

  amountInput.onkeydown = e => {
    if (e.key === 'Enter') addEntry();
  };

  document.addEventListener('keydown', e => {
    if (e.key.toLowerCase() === 'n') addEntry();
  });

  deleteDayBtn.onclick = () => {
    const d0 = startOfDay(state.selectedDate);
    const d1 = endOfDay(state.selectedDate);
    state.entries = state.entries.filter(e => {
      const t = new Date(e.ts);
      return !(t >= d0 && t <= d1);
    });
    persist();
    renderToday();
    renderEntries();
    drawWeek();
    drawMonth();
  };

  prevWeek.onclick  = () => { state.weekOffset--;  persist(); drawWeek(); };
  nextWeek.onclick  = () => { state.weekOffset++;  persist(); drawWeek(); };
  prevMonth.onclick = () => { state.monthOffset--; persist(); drawMonth(); };
  nextMonth.onclick = () => { state.monthOffset++; persist(); drawMonth(); };

  manageDrinksBtn.onclick = () => openDrinksDialog();

  dColorPick.oninput = () => { dColorText.value = dColorPick.value; };
  dColorText.oninput = () => {
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(dColorText.value)) {
      dColorPick.value = dColorText.value;
    }
  };

  saveDrinkBtn.onclick = saveDrink;

  $('[data-fs="week"]').onclick  = () => openFS('Woche');
  $('[data-fs="month"]').onclick = () => openFS('Monat');

  exportBtn.onclick = () => {
    const blob = new Blob([localStorage.getItem(STORAGE_KEY) || '{}'], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'drinkenough_export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  importBtn.onclick = () => importFile.click();

  importFile.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const r    = new FileReader();
    r.onload   = () => {
      try {
        const data = JSON.parse(r.result);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        load();
        init();
      } catch (err) {
        alert('Ungültige Datei.');
      }
    };
    r.readAsText(file);
  };

  remindersBtn.onclick = () => { applyReminderUI(); remDialog.showModal(); };
  remSaveBtn.onclick   = saveReminderSettings;
  remTestBtn.onclick   = () => fireReminder(true);

  remApplyTimes.onclick = () => {
    const list  = remTimesInput.value.split(',').map(s => s.trim()).filter(Boolean);
    const valid = list.filter(isTimeStr);
    state.reminders.fixedTimes = valid;
    persist();
    renderRemTimes();
  };

  weekCanvas.addEventListener('click',  ev => onChartClick(ev, weekCanvas));
  monthCanvas.addEventListener('click', ev => onChartClick(ev, monthCanvas));
}

/* ─── Entry Management ───────────────────────────────────────────────────────── */
function addEntry() {
  const drinkId = drinkSelect.value;
  const ml      = parseInt(amountInput.value, 10);
  if (!drinkId || !ml || ml <= 0) {
    alert('Bitte Getränk und Menge angeben.');
    return;
  }
  const d   = new Date(state.selectedDate);
  const now = new Date();
  d.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  state.entries.push({ id: uid(), ts: d.toISOString(), ml, drinkId });
  state._lastDrinkAt = Date.now();
  persist();
  amountInput.select();
  renderToday();
  renderEntries();
  drawWeek();
  drawMonth();
}

/* ─── Rendering ──────────────────────────────────────────────────────────────── */
function renderDrinksSelect() {
  drinkSelect.innerHTML = '';
  for (const d of state.drinks) {
    const opt           = document.createElement('option');
    opt.value           = d.id;
    opt.textContent     = d.name;
    opt.style.background = d.color;
    drinkSelect.appendChild(opt);
  }
}

function renderEntries() {
  const dayEntries = byDateRange(state.entries, startOfDay(state.selectedDate), endOfDay(state.selectedDate));
  entriesList.innerHTML = '';
  for (const en of dayEntries.slice().reverse()) {
    const drink = state.drinks.find(d => d.id === en.drinkId) || { name: '?', color: '#999' };
    const row   = document.createElement('div');
    row.className = 'entry';
    row.innerHTML = `
      <div class="swatch" style="background:${drink.color}"></div>
      <div class="grow">
        <div class="name">${drink.name} <span class="inline-badge">${fmt.format(en.ml)} ml</span></div>
        <div class="info">${new Date(en.ts).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} • ${drink.notes || ''}</div>
      </div>
      <button class="btn-danger" title="Löschen">🗑</button>
    `;
    row.querySelector('button').onclick = () => {
      state.entries = state.entries.filter(x => x.id !== en.id);
      persist();
      renderToday();
      renderEntries();
      drawWeek();
      drawMonth();
    };
    entriesList.appendChild(row);
  }
}

function renderToday() {
  goalInput.value = state.settings.dailyGoalMl;
  const dayEntries = byDateRange(state.entries, startOfDay(state.selectedDate), endOfDay(state.selectedDate));
  const total      = dayEntries.reduce((s, e) => s + e.ml, 0);
  const pct        = Math.min(100, Math.round((total / state.settings.dailyGoalMl) * 100)) || 0;
  todayStats.textContent = `${fmt.format(total)} / ${fmt.format(state.settings.dailyGoalMl)} ml • ${pct}%`;

  const byDrink = totalByDrink(dayEntries);
  drawRing(todayRing, byDrink, total);

  todayLegend.innerHTML = '';
  const items = Object.entries(byDrink).sort((a, b) => b[1] - a[1]);
  for (const [drinkId, ml] of items) {
    const d = state.drinks.find(x => x.id === drinkId);
    if (!d) continue;
    const p  = total ? Math.round((ml / total) * 100) : 0;
    const el = document.createElement('div');
    el.className = 'legend-item';
    el.innerHTML = `
      <div class="swatch" style="background:${d.color}"></div>
      <div>${d.name}</div>
      <div class="muted">${fmt.format(ml)} ml • ${p}%</div>
    `;
    todayLegend.appendChild(el);
  }

  breakdown.innerHTML = items.length ? '' : '<div class="muted">Noch keine Einträge für diesen Tag.</div>';
  for (const [drinkId, ml] of items) {
    const d = state.drinks.find(x => x.id === drinkId);
    if (!d) continue;
    const p   = total ? Math.round((ml / total) * 100) : 0;
    const row = document.createElement('div');
    row.className    = 'row';
    row.style.margin = '6px 0';
    row.innerHTML = `
      <div class="swatch" style="background:${d.color}"></div>
      <div class="grow">
        <strong>${d.name}</strong>
        <div class="tiny muted">${d.notes || ''}</div>
      </div>
      <div class="pill">${fmt.format(ml)} ml</div>
      <div class="pill">${p}%</div>
    `;
    breakdown.appendChild(row);
  }
}

/* ─── SVG Ring Chart ─────────────────────────────────────────────────────────── */
function polarToCartesian(cx, cy, r, angle) {
  const rad = (angle - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(x, y, r, startAngle, endAngle) {
  const start    = polarToCartesian(x, y, r, endAngle);
  const end      = polarToCartesian(x, y, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArc, 0, end.x, end.y].join(' ');
}

function drawRing(svg, byDrink, total) {
  svg.innerHTML = '';

  const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bg.setAttribute('cx', '50');
  bg.setAttribute('cy', '50');
  bg.setAttribute('r', '46');
  bg.setAttribute('fill', 'none');
  bg.setAttribute('stroke', '#0b1227');
  bg.setAttribute('stroke-width', '8');
  svg.appendChild(bg);

  let startAngle = -90;
  for (const [drinkId, ml] of Object.entries(byDrink)) {
    const d    = state.drinks.find(x => x.id === drinkId);
    if (!d) continue;
    const frac = total ? ml / total : 0;
    const sweep = 360 * frac;
    const endAngle = startAngle + sweep;
    const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    seg.setAttribute('d', describeArc(50, 50, 46, startAngle, endAngle));
    seg.setAttribute('stroke', d.color);
    seg.setAttribute('stroke-width', '8');
    seg.setAttribute('fill', 'none');
    svg.appendChild(seg);
    startAngle = endAngle;
  }

  const pct = Math.min(100, Math.round((total / state.settings.dailyGoalMl) * 100)) || 0;

  const center = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  center.setAttribute('x', '50');
  center.setAttribute('y', '47');
  center.setAttribute('text-anchor', 'middle');
  center.setAttribute('font-size', '10');
  center.setAttribute('fill', '#9ca3af');
  center.textContent = `${pct}%`;
  svg.appendChild(center);

  const mlText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  mlText.setAttribute('x', '50');
  mlText.setAttribute('y', '60');
  mlText.setAttribute('text-anchor', 'middle');
  mlText.setAttribute('font-size', '6');
  mlText.setAttribute('fill', '#e5e7eb');
  mlText.textContent = `${fmt.format(total)} / ${fmt.format(state.settings.dailyGoalMl)} ml`;
  svg.appendChild(mlText);
}

/* ─── Canvas Bar Charts ──────────────────────────────────────────────────────── */
function drawStackedBars(canvas, dayList) {
  const ctx   = canvas.getContext('2d');
  const W     = canvas.clientWidth;
  const H     = canvas.clientHeight;
  const DPR   = window.devicePixelRatio || 1;
  canvas.width  = W * DPR;
  canvas.height = H * DPR;
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, W, H);

  const pad    = 28;
  const baseY  = H - pad;
  const chartH = H - 2 * pad;
  const chartW = W - 2 * pad;

  const totals = dayList.map(d => d.entries.reduce((s, e) => s + e.ml, 0));
  const max    = Math.max(1000, ...totals, state.settings.dailyGoalMl);

  // Horizontal guide lines
  ctx.lineWidth   = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i <= 4; i++) {
    const y = baseY - i * (chartH / 4);
    ctx.beginPath();
    ctx.moveTo(pad, y);
    ctx.lineTo(W - pad, y);
    ctx.stroke();
    const val = Math.round((max * i / 4) / 50) * 50;
    ctx.fillStyle = '#9ca3af';
    ctx.font      = '11px system-ui';
    ctx.fillText(val + ' ml', 4, y - 2);
  }

  // Goal line
  const gy = baseY - (state.settings.dailyGoalMl / max) * chartH;
  ctx.strokeStyle = 'rgba(34,197,94,0.8)';
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(pad, gy);
  ctx.lineTo(W - pad, gy);
  ctx.stroke();
  ctx.setLineDash([]);

  const n    = dayList.length;
  const gap  = 10;
  const barW = Math.max(14, (chartW - gap * (n - 1)) / n);
  let x      = pad;

  const colorOf = id => (state.drinks.find(d => d.id === id) || { color: '#888' }).color;
  const barRects = [];

  dayList.forEach((d, idx) => {
    let y          = baseY;
    const dayTotal = totals[idx];
    const by       = totalByDrink(d.entries);
    const items    = Object.entries(by).sort((a, b) => b[1] - a[1]);

    for (const [drinkId, ml] of items) {
      const h        = (ml / max) * chartH;
      ctx.fillStyle  = colorOf(drinkId);
      ctx.fillRect(x, y - h, barW, h);
      y -= h;
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.strokeRect(x, baseY - (dayTotal / max) * chartH, barW, (dayTotal / max) * chartH);

    ctx.fillStyle  = '#9ca3af';
    ctx.font       = '11px system-ui';
    const s        = d.date.toLocaleDateString('de-DE', { weekday: 'short' });
    ctx.textAlign  = 'center';
    ctx.fillText(s, x + barW / 2, H - 6);

    barRects.push({
      x,
      y:    baseY - (dayTotal / max) * chartH,
      w:    barW,
      h:    dayTotal > 0 ? (dayTotal / max) * chartH : 8,
      date: d.date,
    });
    x += barW + gap;
  });

  canvas.onmousemove = ev => {
    const rect = canvas.getBoundingClientRect();
    const mx   = ev.clientX - rect.left;
    const my   = ev.clientY - rect.top;
    const hit  = (canvas._bars || []).find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
    canvas.style.cursor = hit ? 'pointer' : 'default';
  };

  return barRects;
}

function getWeekRange(offset) {
  const now  = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset * 7);
  const day  = (base.getDay() + 6) % 7;
  const start = new Date(base);
  start.setDate(base.getDate() - day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function getMonthRange(offset) {
  const now   = new Date();
  const base  = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const start = new Date(base.getFullYear(), base.getMonth(), 1);
  const end   = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function drawWeek() {
  const { start, end } = getWeekRange(state.weekOffset);
  weekLabel.textContent = `${start.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} – ${end.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}`;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    days.push({ date: d, entries: byDateRange(state.entries, startOfDay(d), endOfDay(d)) });
  }
  weekCanvas._bars = drawStackedBars(weekCanvas, days);
}

function drawMonth() {
  const { start, end } = getMonthRange(state.monthOffset);
  monthLabel.textContent = `${start.toLocaleDateString('de-DE', { month: 'long' })} ${start.getFullYear()}`;
  const days  = [];
  const count = end.getDate();
  for (let i = 1; i <= count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), i);
    days.push({ date: d, entries: byDateRange(state.entries, startOfDay(d), endOfDay(d)) });
  }
  monthCanvas._bars = drawStackedBars(monthCanvas, days);
}

function onChartClick(ev, canvas) {
  const rect = canvas.getBoundingClientRect();
  const mx   = ev.clientX - rect.left;
  const my   = ev.clientY - rect.top;
  const bars = canvas._bars || [];
  const hit  = bars.find(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h);
  if (hit) {
    state.selectedDate     = hit.date;
    datePicker.valueAsDate = hit.date;
    persist();
    renderToday();
    renderEntries();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/* ─── Drink Management ───────────────────────────────────────────────────────── */
function openDrinksDialog() {
  state.editDrinkId = null;
  dName.value       = '';
  dColorText.value  = '#22c55e';
  dColorPick.value  = '#22c55e';
  dNotes.value      = '';
  renderDrinksList();
  drinksDialog.showModal();
}

function renderDrinksList() {
  drinksList.innerHTML = '';
  for (const d of state.drinks) {
    const row   = document.createElement('div');
    row.className = 'entry clickable';
    row.innerHTML = `
      <div class="swatch" style="background:${d.color}"></div>
      <div class="grow">
        <div class="name">${d.name}</div>
        <div class="info">${d.color} • ${d.notes || ''}</div>
      </div>
      <button class="btn-danger" title="Löschen">🗑</button>
    `;
    row.onclick = e => {
      if (e.target.tagName === 'BUTTON') return;
      state.editDrinkId = d.id;
      dName.value       = d.name;
      dColorText.value  = d.color;
      dColorPick.value  = d.color;
      dNotes.value      = d.notes || '';
    };
    row.querySelector('button').onclick = () => {
      if (!confirm('Dieses Getränk wirklich löschen? (Einträge bleiben erhalten)')) return;
      state.drinks = state.drinks.filter(x => x.id !== d.id);
      persist();
      renderDrinksList();
      renderDrinksSelect();
      renderToday();
      drawWeek();
      drawMonth();
    };
    drinksList.appendChild(row);
  }
}

function saveDrink() {
  const name  = dName.value.trim();
  const color = (dColorText.value || '').trim();
  if (!name || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color)) {
    alert('Bitte gültigen Namen und Farbcode (#RRGGBB) angeben.');
    return;
  }
  if (state.editDrinkId) {
    const d = state.drinks.find(x => x.id === state.editDrinkId);
    if (d) { d.name = name; d.color = color; d.notes = dNotes.value || ''; }
  } else {
    state.drinks.push({ id: uid(), name, color, notes: dNotes.value || '' });
  }
  state.editDrinkId = null;
  dName.value       = '';
  dColorText.value  = '#22c55e';
  dColorPick.value  = '#22c55e';
  dNotes.value      = '';
  persist();
  renderDrinksList();
  renderDrinksSelect();
  renderToday();
  drawWeek();
  drawMonth();
}

/* ─── Fullscreen Chart ───────────────────────────────────────────────────────── */
function openFS(title) {
  fsTitle.textContent = title;
  fsDialog.showModal();
  setTimeout(() => redrawFS(title), 0);
}

function redrawFS(title) {
  const ctx = fsCanvas.getContext('2d');
  const W   = fsCanvas.clientWidth;
  const H   = fsCanvas.clientHeight;
  const DPR = window.devicePixelRatio || 1;
  fsCanvas.width  = W * DPR;
  fsCanvas.height = H * DPR;
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, W, H);

  if (title === 'Woche') {
    const { start } = getWeekRange(state.weekOffset);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      days.push({ date: d, entries: byDateRange(state.entries, startOfDay(d), endOfDay(d)) });
    }
    drawStackedBars(fsCanvas, days);
  } else {
    const { start, end } = getMonthRange(state.monthOffset);
    const days  = [];
    const count = end.getDate();
    for (let i = 1; i <= count; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), i);
      days.push({ date: d, entries: byDateRange(state.entries, startOfDay(d), endOfDay(d)) });
    }
    drawStackedBars(fsCanvas, days);
  }
}

/* ─── Reminders ──────────────────────────────────────────────────────────────── */
function applyReminderUI() {
  const r             = state.reminders;
  remEnable.checked   = r.enabled;
  remInterval.value   = r.intervalMin;
  remSnooze.value     = r.snoozeMin;
  remStart.value      = r.start;
  remEnd.value        = r.end;
  remPauseAfterDrink.value = r.pauseAfterDrinkMin;
  remMsg.value        = r.msg;
  remSound.checked    = r.sound;
  renderRemTimes();
  updateRemStatus();
}

function renderRemTimes() {
  remTimesList.innerHTML = '';
  const ul = document.createElement('div');
  for (const t of state.reminders.fixedTimes) {
    const chip         = document.createElement('span');
    chip.className     = 'pill';
    chip.style.marginRight = '6px';
    chip.textContent   = t;
    const del          = document.createElement('button');
    del.className      = 'btn-ghost';
    del.textContent    = '✖';
    del.style.marginLeft = '6px';
    del.onclick        = () => {
      state.reminders.fixedTimes = state.reminders.fixedTimes.filter(x => x !== t);
      persist();
      renderRemTimes();
      scheduleReminders();
    };
    const wrap = document.createElement('span');
    wrap.appendChild(chip);
    wrap.appendChild(del);
    ul.appendChild(wrap);
  }
  remTimesList.appendChild(ul);
}

function saveReminderSettings() {
  const r              = state.reminders;
  r.enabled            = remEnable.checked;
  r.intervalMin        = Math.max(5, parseInt(remInterval.value || 60, 10));
  r.snoozeMin          = Math.max(5, parseInt(remSnooze.value || 15, 10));
  r.start              = remStart.value || '08:00';
  r.end                = remEnd.value   || '21:00';
  r.pauseAfterDrinkMin = Math.max(0, parseInt(remPauseAfterDrink.value || 30, 10));
  r.msg                = remMsg.value   || 'Zeit für einen Schluck! 💧';
  r.sound              = remSound.checked;
  persist();
  scheduleReminders();
  updateRemStatus('Gespeichert');
  requestNotifPermissionIfNeeded();
}

function updateRemStatus(extra) {
  const r      = state.reminders;
  const active = r.enabled ? `aktiv • alle ${r.intervalMin} min` : 'aus';
  remStatus.textContent = extra ? `${active} • ${extra}` : active;
}

function withinActiveHours() {
  const now              = new Date();
  const [sh, sm]         = state.reminders.start.split(':').map(Number);
  const [eh, em]         = state.reminders.end.split(':').map(Number);
  const start            = new Date(now); start.setHours(sh, sm, 0, 0);
  const end              = new Date(now); end.setHours(eh, em, 59, 999);
  return now >= start && now <= end;
}

function scheduleReminders() {
  if (state._reminderTimer) {
    clearInterval(state._reminderTimer);
    state._reminderTimer = null;
  }
  if (!state.reminders.enabled) return;
  state._reminderTimer = setInterval(tickReminder, 60 * 1000);
  tickReminder();
}

function tickReminder() {
  if (!state.reminders.enabled) return;
  if (!withinActiveHours()) return;
  const now = Date.now();
  if (state._snoozeUntil && now < state._snoozeUntil) return;
  if (state._lastDrinkAt && (now - state._lastDrinkAt) < state.reminders.pauseAfterDrinkMin * 60 * 1000) return;

  const lastFired  = +(localStorage.getItem('rem_lastFired') || 0);
  const dueInterval = now - lastFired >= state.reminders.intervalMin * 60 * 1000;
  const nowStr     = new Date().toTimeString().slice(0, 5);
  const dueFixed   = state.reminders.fixedTimes.includes(nowStr) && new Date().getSeconds() < 5;

  if (dueInterval || dueFixed) fireReminder();
}

function fireReminder(manual = false) {
  requestNotifPermissionIfNeeded().then(granted => {
    const text = state.reminders.msg || 'Zeit für einen Schluck! 💧';
    if (granted && 'Notification' in window) {
      const n    = new Notification('DrinkEnough', { body: text });
      n.onclick  = () => window.focus();
    } else {
      const oldTitle    = document.title;
      document.title    = '🔔 ' + text;
      setTimeout(() => document.title = oldTitle, 5000);
      if (document.hidden) alert(text); else toast(text);
    }
    if (state.reminders.sound) { try { playPing(); } catch (_) {} }
    localStorage.setItem('rem_lastFired', Date.now().toString());
    updateRemStatus(manual ? 'Test' : 'Erinnert');
  });
}

function toast(msg) {
  const t              = document.createElement('div');
  t.textContent        = msg;
  t.style.position     = 'fixed';
  t.style.right        = '16px';
  t.style.bottom       = '16px';
  t.style.padding      = '10px 14px';
  t.style.background   = '#111827';
  t.style.border       = '1px solid #334155';
  t.style.borderRadius = '10px';
  t.style.zIndex       = '9999';
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* ─── Audio ──────────────────────────────────────────────────────────────────── */
function playPing() {
  const a   = new Audio();
  a.src     = URL.createObjectURL(new Blob([beepWav()], { type: 'audio/wav' }));
  a.play().catch(() => {});
  setTimeout(() => URL.revokeObjectURL(a.src), 5000);
}

function beepWav() {
  const sr  = 8000;
  const dur = 0.12;
  const len = (sr * dur) | 0;

  const data = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / sr;
    data[i] = Math.sin(2 * Math.PI * 880 * t) > 0 ? 255 : 0;
  }

  const size = 36 + len;
  const u8   = new Uint8Array(44 + len);
  const dv   = new DataView(u8.buffer);
  const enc  = (i, s) => { for (let j = 0; j < s.length; j++) u8[i + j] = s.charCodeAt(j); };

  enc(0,  'RIFF'); dv.setUint32(4, size, true);
  enc(8,  'WAVE');
  enc(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sr, true); dv.setUint32(28, sr, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
  enc(36, 'data'); dv.setUint32(40, len, true);
  u8.set(data, 44);

  return u8;
}

function requestNotifPermissionIfNeeded() {
  return new Promise(res => {
    if (!('Notification' in window)) return res(false);
    if (Notification.permission === 'granted') return res(true);
    if (Notification.permission === 'denied')  return res(false);
    Notification.requestPermission().then(p => res(p === 'granted')).catch(() => res(false));
  });
}

// Snooze via keyboard "S"
document.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 's' && state.reminders.enabled) {
    state._snoozeUntil = Date.now() + state.reminders.snoozeMin * 60 * 1000;
    updateRemStatus('Snooze');
  }
});

/* ─── Start ──────────────────────────────────────────────────────────────────── */
init();
