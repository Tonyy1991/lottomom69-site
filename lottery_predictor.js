/* =====================================================
   🔮 LottoMoM69 Galaxy Predictor — JavaScript
   WebGL 3D Blackhole + AI Prediction Engine
   ระบบสะสมข้อมูล + ทำนายเลขเดียวฟันธง
   ===================================================== */

// ═══════════════════════════════════
// 0) CONSTANTS
// ═══════════════════════════════════
const STORAGE_KEY = 'lottoMoM69_draws';
const MAX_DRAWS = 100000;
const MAX_DRAWS_PER_REQUEST = 1000;   // เท่ากับ MAX_USER_DRAWS ฝั่งเซิร์ฟเวอร์ (ผลทางการตั้งแต่ปี 2553 ฝังอยู่ในระบบแล้ว)

const escapeHtml = v => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad2 = n => String(n).padStart(2, '0');

// ═══════════════════════════════════
// 1) INITIALIZATION
// ═══════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  initWebGL();
  initParallaxStars();
  initCosmicParticles();
  initMoneyRain();
  initGoldSparkles();
  initClickBurst();
  initKineticTypography();
  initScrollytelling();
  initMicroInteractions();
  initInputHandlers();
  initConfidenceSVG();
  loadAndDisplayHistory();
  updateNextDrawDate();
  loadOfficialHistory();
  initPwa();
});

// ═══════════════════════════════════
// 1.5) PWA — ติดตั้งเป็นแอปบนมือถือ + ใช้ออฟไลน์
// ═══════════════════════════════════
const INSTALL_DISMISS_KEY = 'lottoMoM69_install_dismissed';
let _installPrompt = null;

function initPwa() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('service worker:', err.message));
  }
  const banner = document.getElementById('installBanner');
  const btn = document.getElementById('installBtn');
  const close = document.getElementById('installClose');
  if (!banner || !btn || !close) return;

  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let dismissedAt = 0;
  try { dismissedAt = Number(localStorage.getItem(INSTALL_DISMISS_KEY) || 0); } catch { /* ไม่มี storage ก็ไม่เป็นไร */ }
  const recentlyDismissed = Date.now() - dismissedAt < 7 * 24 * 3600 * 1000;
  if (standalone || recentlyDismissed) return;

  const hide = () => { banner.hidden = true; };
  close.addEventListener('click', () => {
    hide();
    try { localStorage.setItem(INSTALL_DISMISS_KEY, String(Date.now())); } catch { /* ข้าม */ }
  });

  // Android / Chrome / Edge: เบราว์เซอร์บอกเองว่าติดตั้งได้
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    _installPrompt = e;
    banner.hidden = false;
  });
  btn.addEventListener('click', async () => {
    if (!_installPrompt) return;
    _installPrompt.prompt();
    const choice = await _installPrompt.userChoice.catch(() => null);
    _installPrompt = null;
    if (choice && choice.outcome === 'accepted') hide();
  });
  window.addEventListener('appinstalled', () => {
    hide();
    showNotification('✅ ติดตั้งแอป LottoMOM บนมือถือแล้ว — เปิดจากไอคอนบนหน้าจอได้เลยค่ะ', 'success', 6000);
  });

  // iPhone/iPad: Safari ไม่มีปุ่มติดตั้ง ต้องกดแชร์เอง
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIos) {
    document.getElementById('installText').textContent = '📲 ติดตั้งเป็นแอป: กดปุ่มแชร์ (สี่เหลี่ยมมีลูกศร) แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"';
    btn.hidden = true;
    banner.hidden = false;
  }
}

// ═══════════════════════════════════
// 2) LOCALSTORAGE — Cumulative Data
// ═══════════════════════════════════
function loadDraws() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

function saveDraws(draws) {
  // ถ้าเกิน 100,000 งวด → ลบทั้งหมดแล้วเริ่มใหม่
  if (draws.length >= MAX_DRAWS) {
    draws = [];
    showNotification('🔄 ครบ 100,000 งวดแล้ว — ลบข้อมูลทั้งหมดเริ่มสะสมใหม่!', 'info');
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(draws));
}

function addDraw(date, first, last2) {
  const draws = loadDraws();
  // ตรวจสอบซ้ำ
  const exists = draws.some(d => d.date === date && d.first === first);
  if (exists) {
    showError('งวดนี้มีอยู่แล้ว!');
    return false;
  }
  draws.unshift({ date, first, last2, addedAt: new Date().toISOString() }); // เพิ่มข้างหน้า (ล่าสุดก่อน)
  saveDraws(draws);
  return true;
}

function deleteDraw(index) {
  const draws = loadDraws();
  if (index >= 0 && index < draws.length) {
    draws.splice(index, 1);
    saveDraws(draws);
  }
}

function clearAllDraws() {
  if (confirm('⚠️ ต้องการลบข้อมูลทั้งหมดจริงหรือ?')) {
    localStorage.removeItem(STORAGE_KEY);
    loadAndDisplayHistory();
    showNotification('🗑️ ลบข้อมูลทั้งหมดแล้ว', 'info');
  }
}

// ═══════════════════════════════════
// 2.5) DYNAMIC NEXT DRAW DATE
// ═══════════════════════════════════
function updateNextDrawDate() {
  const el = document.getElementById('nextDrawDate');
  if (!el) return;

  const now = new Date();
  const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

  // Thai lottery draws on 1st and 16th of each month
  let year = now.getFullYear();
  let month = now.getMonth(); // 0-indexed
  let day = now.getDate();

  let nextDay, nextMonth, nextYear;
  if (day < 1) {
    nextDay = 1; nextMonth = month; nextYear = year;
  } else if (day < 16) {
    nextDay = 16; nextMonth = month; nextYear = year;
  } else {
    // Next month 1st
    nextDay = 1;
    nextMonth = month + 1;
    nextYear = year;
    if (nextMonth > 11) { nextMonth = 0; nextYear++; }
  }

  const thaiYear = nextYear + 543;
  el.textContent = `${nextDay} ${thaiMonths[nextMonth]} ${thaiYear}`;
}

// ═══════════════════════════════════
// 2.6) GLO AUTO-FETCH
// ═══════════════════════════════════
async function fetchFromGLO() {
  showNotification('🌐 กำลังดึงข้อมูลจากสำนักงานสลากกินแบ่งรัฐบาล...', 'info');

  // Generate draw dates from 2025 (BE 2568) to current
  // ⭐ กลับลำดับเป็น "ใหม่สุด → เก่าสุด" — งวดใหม่ที่ยังไม่มีจะถูกดึงก่อนภายในไม่กี่วินาที
  const official = await loadOfficialHistory();
  const scanFrom = official.length ? new Date(official[official.length - 1].iso + 'T00:00:00') : new Date(2025, 0, 1);
  if (official.length) scanFrom.setDate(scanFrom.getDate() + 1);   // ผลทางการถึงงวดนี้ฝังอยู่ในระบบแล้ว ไม่ต้องดึงซ้ำ
  const drawDates = generateDrawDates(scanFrom, new Date()).reverse();
  const existing = loadDraws();

  let added = 0;
  let failed = 0;
  let lastError = '';
  let skipped = 0;
  let consecutiveSkips = 0;
  const total = drawDates.length;

  for (let i = 0; i < drawDates.length; i++) {
    const dd = drawDates[i];

    // Convert CE year to Thai BE date string: DD/MM/YY (BE)
    const beYear = parseInt(dd.year) + 543;
    const beYY = (beYear % 100).toString().padStart(2, '0');
    const dateStr = `${dd.date.padStart(2,'0')}/${dd.month.padStart(2,'0')}/${beYY}`;

    // Check if already exists with GLO data
    const existingIdx = existing.findIndex(d => d.date === dateStr);
    if (existingIdx !== -1 && existing[existingIdx].source === 'GLO') {
      skipped++;
      consecutiveSkips++;
      // ⭐ เจอของเก่าติดกัน 10 งวด = ที่เหลือ (เก่ากว่า) มีครบหมดแล้ว → หยุดเลย ไม่ต้องรอ 5 นาที
      if (consecutiveSkips >= 10) {
        skipped += drawDates.length - i - 1;
        break;
      }
      continue;
    }
    // (วันที่ไม่มีหวยออก เช่น 2/17 ของเดือนทั่วไป จะไม่รีเซ็ตตัวนับข้าม —
    //  รีเซ็ตเฉพาะตอน "เจองวดใหม่จริง" เท่านั้น ใน added++ ด้านล่าง)

    // Show progress every 3 requests
    if (i > 0 && i % 3 === 0) {
      showNotification(`🔄 กำลังเช็คงวด ${dateStr}... (${i}/${total}) เพิ่มแล้ว ${added} งวด`, 'info');
    }

    try {
      const res = await fetch('/api/glo/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dd),
      });
      const result = await res.json();

      if (!res.ok || !result.success) {
        // เซิร์ฟเวอร์ตอบว่าติดต่อ GLO ไม่ได้ (เช่นโฮสต์ฟรีบล็อกเว็บภายนอก) — ไม่ใช่ "ไม่มีงวดใหม่"
        failed++;
        lastError = result.error || `HTTP ${res.status}`;
        if (failed >= 4 && added === 0) break;
      } else if (result.data) {
        const gloData = result.data;
        let firstPrize = null;
        let last2 = null;
        let last3f = [];
        let last3b = [];

        // ====================================
        // GLO API structure (confirmed):
        //   gloData.response.result.data.first.number[0].value
        //   gloData.response.result.data.last2.number[0].value
        // ====================================
        if (gloData.response && gloData.response.result && gloData.response.result.data) {
          const prizes = gloData.response.result.data;

          // First prize
          if (prizes.first && prizes.first.number && prizes.first.number.length > 0) {
            firstPrize = prizes.first.number[0].value;
          }

          // Last 2 digits
          if (prizes.last2 && prizes.last2.number && prizes.last2.number.length > 0) {
            last2 = prizes.last2.number[0].value;
          }

          // เลขหน้า/เลขท้าย 3 ตัว — เป็นรางวัลแยก (งวดละ 2 เลข) ใช้ฝึกสูตรเลขท้าย 3 ตัว
          const threeDigit = key => ((prizes[key] && prizes[key].number) || [])
            .map(x => String(x.value || '').replace(/\D/g, '')).filter(v => v.length === 3);
          last3f = threeDigit('last3f');
          last3b = threeDigit('last3b');
        }

        // Fallback: try gloData.response.data (older API structure)
        if (!firstPrize && gloData.response && gloData.response.data) {
          const prizes = gloData.response.data;
          if (prizes.first && prizes.first.number) {
            firstPrize = prizes.first.number[0]?.value || prizes.first.number;
          }
          if (prizes.last2 && prizes.last2.number) {
            last2 = prizes.last2.number?.[0]?.value || prizes.last2.number;
          }
        }

        if (firstPrize && last2) {
          // Clean the values
          firstPrize = firstPrize.toString().replace(/\D/g, '').padStart(6, '0').slice(0, 6);
          last2 = last2.toString().replace(/\D/g, '').padStart(2, '0').slice(0, 2);
          if (firstPrize.length === 6 && last2.length === 2) {
            const newRecord = { date: dateStr, first: firstPrize, last2: last2, last3f, last3b, addedAt: new Date().toISOString(), source: 'GLO' };
            // If record exists but without GLO source, replace it
            if (existingIdx !== -1) {
              console.log(`🔄 GLO: replacing ${dateStr} (old: ${existing[existingIdx].first} → new: ${firstPrize})`);
              existing[existingIdx] = newRecord;
            } else {
              existing.unshift(newRecord);
            }
            added++;
            consecutiveSkips = 0;
            // ⭐ บันทึกทันทีทุกงวดที่เจอ — ปิดจอ/สลับแอปกลางคันข้อมูลก็ไม่หาย
            sortDrawsNewestFirst(existing);
            saveDraws(existing);
            loadAndDisplayHistory();
            showNotification(`✅ เพิ่มงวด ${dateStr} แล้ว! (${firstPrize} / ${last2})`, 'success');
            console.log(`✅ GLO: ${dateStr} → first=${firstPrize}, last2=${last2}`);
          }
        } else {
          // API returned success but no data for this date (draw might not exist)
          console.log(`⏭️ GLO: ${dateStr} → no draw data (may not be a valid draw date)`);
        }
      }
    } catch (e) {
      failed++;
      console.warn(`❌ GLO fetch error for ${dateStr}:`, e.message);
    }
    // Small delay to avoid rate limiting
    await new Promise(r => setTimeout(r, 500));
  }

  if (added > 0) {
    showNotification(`✅ ดึงข้อมูลจาก GLO สำเร็จ — เพิ่ม ${added} งวดใหม่!`, 'success', 6000);
  } else if (failed > 0) {
    showNotification(`⚠️ ดึงข้อมูลจาก GLO ไม่ได้${lastError ? ` (${lastError})` : ''} — กรอกผลงวดล่าสุดเองได้เลยค่ะ`, 'error', 7000);
  } else {
    const last = official.length ? official[official.length - 1] : null;
    const latestUser = existing.find(d => LottoEngine.thaiDateToIso(d.date));
    const lastDate = latestUser && (!last || LottoEngine.thaiDateToIso(latestUser.date) > last.iso) ? latestUser.date : (last ? last.date : '-');
    const lastIso = latestUser && (!last || LottoEngine.thaiDateToIso(latestUser.date) > last.iso) ? LottoEngine.thaiDateToIso(latestUser.date) : (last ? last.iso : null);
    showNotification(`📗 ผลรางวัลมีครบถึงงวด ${lastDate} แล้ว (${(official.length + existing.length).toLocaleString()} งวดในระบบ)` +
      (lastIso ? ` — งวดถัดไป ${nextDrawDateThai(lastIso)} ยังไม่ออก กดดึงอีกครั้งหลังหวยออกนะคะ` : ''), 'info', 8000);
  }

  loadAndDisplayHistory();
}

// เรียงงวด ใหม่สุด → เก่าสุด ตามวันที่ไทย (วว/ดด/ปป พ.ศ.)
function sortDrawsNewestFirst(draws) {
  const parseDate = d => {
    const parts = (d.date || '').split('/');
    if (parts.length !== 3) return 0;
    const [dd, mm, yy] = parts;
    return parseInt(yy) * 10000 + parseInt(mm) * 100 + parseInt(dd);
  };
  draws.sort((a, b) => parseDate(b) - parseDate(a));
  return draws;
}

function generateDrawDates(startDate, endDate) {
  const dates = [];
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);

  while (current <= endDate) {
    const year = current.getFullYear();
    const month = current.getMonth() + 1; // 1-indexed

    // Thai lottery draws on 1st and 16th of each month
    // Special cases: some months have adjusted dates (e.g., 2 Jan, 17 Jan, 2 May)
    const drawDays = [1, 2, 16, 17]; // Include adjusted dates

    drawDays.forEach(day => {
      const drawDate = new Date(year, month - 1, day);
      if (drawDate >= startDate && drawDate <= endDate) {
        dates.push({
          date: day.toString().padStart(2, '0'),
          month: month.toString().padStart(2, '0'),
          year: year.toString(),
        });
      }
    });

    // Move to next month
    current.setMonth(current.getMonth() + 1);
  }
  return dates;
}

// ═══════════════════════════════════
// 3) HISTORY TABLE
// ═══════════════════════════════════
// งวดหวยถัดไปหลังวันที่ iso (วันที่ 1 / 16 โดยประมาณ — งวดเลื่อน เช่น 17 ม.ค. / 2 พ.ค. ถือว่าใกล้เคียง)
function nextDrawDateThai(iso) {
  const d = new Date(iso + 'T00:00:00');
  let day = 16, month = d.getMonth(), year = d.getFullYear();
  if (d.getDate() >= 16) { day = 1; month += 1; if (month > 11) { month = 0; year += 1; } }
  return `${pad2(day)}/${pad2(month + 1)}/${pad2((year + 543) % 100)}`;
}

async function loadAndDisplayHistory() {
  const user = loadDraws();
  const official = await loadOfficialHistory();
  // รวมผลทางการ (ฝังในระบบ) กับที่กรอกเอง — งวดซ้ำกันใช้ของทางการ, เรียงใหม่สุดก่อน
  const merged = (window.LottoEngine ? LottoEngine.mergeDraws(official, user) : user.slice().reverse()).slice().reverse();
  const officialIso = new Set(official.map(d => d.iso));
  const count = merged.length;

  const countEl = document.getElementById('drawCount');
  if (countEl) countEl.textContent = count.toLocaleString();
  const histCount = document.getElementById('historyCount');
  if (histCount) histCount.textContent = `แสดง ${Math.min(count, 30)} จาก ${count} งวด (ทางการ ${official.length} · กรอกเอง ${count - official.length})`;

  const tbody = document.getElementById('historyBody');
  if (!tbody) return;
  if (count === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">ยังไม่มีข้อมูล — กรอกผลรางวัลเพื่อเริ่มสะสม</td></tr>';
    return;
  }
  tbody.innerHTML = merged.slice(0, 30).map((d, i) => {
    const isOfficial = d.iso && officialIso.has(d.iso);
    const userIdx = isOfficial ? -1 : user.findIndex(u => u.first === d.first && u.last2 === d.last2);
    const action = isOfficial
      ? '<span class="official-tag" title="ผลทางการจากสำนักงานสลากฯ ฝังอยู่ในระบบ">GLO</span>'
      : `<button class="btn-delete-row" onclick="handleDeleteDraw(${userIdx})" title="ลบ">✕</button>`;
    return `
    <tr class="history-row" style="animation-delay: ${i * 0.03}s">
      <td class="row-num">${i + 1}</td>
      <td class="row-date">${escapeHtml(d.date || '-')}</td>
      <td class="row-first"><span class="first-num">${escapeHtml(d.first)}</span></td>
      <td class="row-last2"><span class="last2-num">${escapeHtml(d.last2)}</span></td>
      <td class="row-action">${action}</td>
    </tr>`;
  }).join('');
}

function handleDeleteDraw(index) {
  deleteDraw(index);
  loadAndDisplayHistory();
}

// ═══════════════════════════════════
// 3.5) 🌌 BLACK HOLE — กาลจักรวาล: ดาวหมุนวนถูกดูดกลืน + บิ๊กแบงระเบิด
// ═══════════════════════════════════
let _bigBangTrigger = null; // ให้ปุ่ม/คลิก เรียกบิ๊กแบงได้

// 🚀 WARP STARFIELD — ดาววิ่งพุ่งผ่านจากกลางจอ = เหมือนบินทะลุอวกาศ
// วาดบน canvas โปร่งใส (เห็นรูป galaxy-bg ด้านหลัง) + บิ๊กแบงแฟลช
function initWebGL() {
  const canvas = document.getElementById('webglCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  // บิ๊กแบง = วาบแสงกลางจอ
  _bigBangTrigger = () => {
    const el = document.getElementById('bigbangFlash');
    if (!el) return;
    el.classList.remove('boom');
    void el.offsetWidth;
    el.classList.add('boom');
    _warp = 1; // เร่งความเร็วดาวตอนบิ๊กแบง (warp speed!)
  };
  setInterval(() => _bigBangTrigger && _bigBangTrigger(), 12000);
  document.getElementById('hero')?.addEventListener('click', (e) => {
    if (e.target.closest('button, a, input, select, textarea, label')) return;
    _bigBangTrigger && _bigBangTrigger();
  });

  if (!ctx) return;
  let W, H, cx, cy, _warp = 0;
  const STAR_COLORS = ['#ffffff', '#ffe6a8', '#cfe0ff', '#ffd1f0', '#c7b6ff'];
  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; cx = W / 2; cy = H * 0.44; }
  resize();
  window.addEventListener('resize', resize);

  const N = Math.max(90, Math.min(240, Math.floor(window.innerWidth * window.innerHeight / 9000)));
  const stars = [];
  function spawn(reset) {
    const ang = Math.random() * Math.PI * 2;
    const r = reset ? (Math.random() * 30 + 2) : (Math.random() * Math.max(W, H) * 0.6 + 2);
    return { ang, r, z: Math.random() * 0.9 + 0.25, c: STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)] };
  }
  for (let i = 0; i < N; i++) stars.push(spawn(false));

  function frame() {
    ctx.clearRect(0, 0, W, H);              // โปร่งใส → เห็นรูปพื้นหลัง
    const boost = 1 + _warp * 6;            // บิ๊กแบง = พุ่งเร็ว
    for (const s of stars) {
      const prevR = s.r;
      s.r += s.z * (1 + s.r * 0.013) * boost;
      const cosA = Math.cos(s.ang), sinA = Math.sin(s.ang);
      const x = cx + cosA * s.r, y = cy + sinA * s.r;
      const px = cx + cosA * prevR, py = cy + sinA * prevR;
      const alpha = Math.min(0.9, 0.12 + s.r / (Math.max(W, H) * 0.55));
      ctx.strokeStyle = s.c;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = s.z * 1.6;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y); ctx.stroke();
      if (x < -30 || x > W + 30 || y < -30 || y > H + 30) Object.assign(s, spawn(true));
    }
    ctx.globalAlpha = 1;
    if (_warp > 0) _warp = Math.max(0, _warp - 0.012);  // ค่อยๆ กลับสู่ความเร็วปกติ
    requestAnimationFrame(frame);
  }
  frame();
}

// ═══════════════════════════════════
// 4) PARALLAX STAR LAYERS
// ═══════════════════════════════════
function initParallaxStars() {
  const animalsFar = ['⭐', '✨', '·', '˚', '⋆', '💫', '✦', '⋆'];
  const animalsMid = ['🌟', '✨', '💫', '⭐', '🪐', '✦', '🌠', '⋆'];
  const animalsNear = ['🪐', '🌌', '🌟', '💫', '🌠', '☄️', '✦', '⭐'];

  const layers = [
    { id: 'starsFar', count: 25, emojis: animalsFar, speed: 0.05 },
    { id: 'starsMid', count: 18, emojis: animalsMid, speed: 0.15 },
    { id: 'starsNear', count: 12, emojis: animalsNear, speed: 0.3 },
  ];

  layers.forEach(layer => {
    const el = document.getElementById(layer.id);
    if (!el) return;
    for (let i = 0; i < layer.count; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      const emoji = layer.emojis[Math.floor(Math.random() * layer.emojis.length)];
      star.textContent = emoji;
      star.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        --dur: ${Math.random() * 4 + 3}s;
        animation-delay: ${Math.random() * 5}s;
      `;
      el.appendChild(star);
    }
    el._speed = layer.speed;
  });

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrollY = window.scrollY;
        layers.forEach(layer => {
          const el = document.getElementById(layer.id);
          if (el) el.style.transform = `translateY(${scrollY * el._speed}px)`;
        });
        const indicator = document.getElementById('scrollIndicator');
        if (indicator) indicator.style.opacity = Math.max(0, 1 - scrollY / 300);
        ticking = false;
      });
      ticking = true;
    }
  });
}

// ═══════════════════════════════════
// 5) COSMIC PARTICLES
// ═══════════════════════════════════
function initCosmicParticles() {
  const container = document.getElementById('cosmicParticles');
  if (!container) return;
  const emojis = ['✨', '💫', '⭐', '🌟', '🪐', '🌠', '✦', '☄️', '🌌', '💫', '✨'];
  for (let i = 0; i < 15; i++) {
    const p = document.createElement('div');
    p.className = 'p';
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    p.textContent = emoji;
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      font-size: ${Math.random() * 16 + 14}px;
      --fd: ${Math.random() * 22 + 10}s;
      animation-delay: ${Math.random() * 15}s;
    `;
    container.appendChild(p);
  }
}

// ═══════════════════════════════════
// 5.5) 💰 MONEY RAIN
// ═══════════════════════════════════
function initMoneyRain() {
  const container = document.getElementById('moneyRain');
  if (!container) return;
  const bills = ['💵', '💰', '💴', '💶', '💷', '🤑', '💸', '💵', '💰', '💴'];
  for (let i = 0; i < 12; i++) {
    const bill = document.createElement('div');
    bill.className = 'bill';
    bill.textContent = bills[Math.floor(Math.random() * bills.length)];
    const size = Math.random() * 14 + 22;
    bill.style.cssText = `
      left: ${Math.random() * 100}%;
      font-size: ${size}px;
      --fall-dur: ${Math.random() * 10 + 8}s;
      animation-delay: ${Math.random() * 12}s;
    `;
    container.appendChild(bill);
  }
}

// ═══════════════════════════════════
// 5.6) ✨ GOLD SPARKLES
// ═══════════════════════════════════
function initGoldSparkles() {
  const container = document.getElementById('goldSparkles');
  if (!container) return;

  const coins = ['🪙', '💎', '🥇', '🪙', '💎'];
  for (let i = 0; i < 8; i++) {
    const coin = document.createElement('div');
    coin.className = 'sparkle gold-coin';
    coin.textContent = coins[Math.floor(Math.random() * coins.length)];
    coin.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      --sparkle-dur: ${Math.random() * 5 + 4}s;
      animation-delay: ${Math.random() * 8}s;
    `;
    container.appendChild(coin);
  }

  const sparkles = ['✨', '💫', '⭐', '🌟', '✨', '💫'];
  for (let i = 0; i < 15; i++) {
    const sp = document.createElement('div');
    sp.className = 'sparkle';
    sp.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
    sp.style.cssText = `
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      font-size: ${Math.random() * 10 + 10}px;
      --sparkle-dur: ${Math.random() * 4 + 3}s;
      animation-delay: ${Math.random() * 6}s;
    `;
    container.appendChild(sp);
  }
}

// ═══════════════════════════════════
// 5.7) 💥 CLICK BURST
// ═══════════════════════════════════
function initClickBurst() {
  const burstEmojis = ['✨', '💫', '⭐', '🌟', '🪙', '💎', '🌠', '☄️', '🪐', '💰'];

  document.addEventListener('click', (e) => {
    const tag = e.target.tagName.toLowerCase();
    if (['input', 'button', 'a', 'select', 'textarea', 'label'].includes(tag)) return;
    if (e.target.closest('button, a, input, .input-row, .action-buttons, .history-table')) return;
    createBurst(e.clientX, e.clientY);
  });

  document.addEventListener('touchstart', (e) => {
    const tag = e.target.tagName.toLowerCase();
    if (['input', 'button', 'a', 'select', 'textarea', 'label'].includes(tag)) return;
    if (e.target.closest('button, a, input, .input-row, .action-buttons, .history-table')) return;
    const touch = e.touches[0];
    createBurst(touch.clientX, touch.clientY);
  }, { passive: true });

  function createBurst(x, y) {
    const count = 10;
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.className = 'click-burst-particle';
      el.textContent = burstEmojis[Math.floor(Math.random() * burstEmojis.length)];
      const angle = (Math.PI * 2 / count) * i + (Math.random() * 0.5 - 0.25);
      const dist = Math.random() * 80 + 50;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.fontSize = (Math.random() * 12 + 16) + 'px';
      el.style.setProperty('--tx', tx + 'px');
      el.style.setProperty('--ty', (ty + 30) + 'px');
      el.style.setProperty('--tx60', (tx * 0.6) + 'px');
      el.style.setProperty('--ty60', (ty * 0.6) + 'px');
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove());
    }
  }
}

// ═══════════════════════════════════
// 6) KINETIC TYPOGRAPHY
// ═══════════════════════════════════
function initKineticTypography() {
  const h1 = document.querySelector('.kinetic-h1');
  if (!h1) return;
  const text = h1.textContent;
  h1.innerHTML = '';
  // \u0E08\u0E31\u0E14\u0E01\u0E25\u0E38\u0E48\u0E21\u0E15\u0E31\u0E27\u0E2D\u0E31\u0E01\u0E29\u0E23\u0E40\u0E1B\u0E47\u0E19 "\u0E04\u0E33" \u2014 \u0E01\u0E31\u0E19\u0E01\u0E32\u0E23\u0E15\u0E31\u0E14\u0E1A\u0E23\u0E23\u0E17\u0E31\u0E14\u0E01\u0E25\u0E32\u0E07\u0E04\u0E33 (LOTT / ERY)
  let charIndex = 0;
  const words = text.split(' ');
  words.forEach((word, wi) => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'kinetic-word';
    for (const char of word) {
      const span = document.createElement('span');
      span.className = 'char';
      span.textContent = char;
      span.style.animationDelay = `${charIndex * 0.05}s, 0s`;
      wordSpan.appendChild(span);
      charIndex++;
    }
    h1.appendChild(wordSpan);
    if (wi < words.length - 1) {
      const gap = document.createElement('span');
      gap.className = 'char kinetic-gap';
      gap.textContent = '\u00A0';
      gap.style.animationDelay = `${charIndex * 0.05}s, 0s`;
      h1.appendChild(gap);
      charIndex++;
    }
  });
  document.querySelectorAll('.tagline-word').forEach((word, i) => {
    word.style.animationDelay = `${0.8 + i * 0.12}s`;
  });
}

// ═══════════════════════════════════
// 7) SCROLLYTELLING
// ═══════════════════════════════════
function initScrollytelling() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('visible');
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.scroll-step, .scroll-reveal').forEach(el => observer.observe(el));
}

// ═══════════════════════════════════
// 8) MICRO-INTERACTIONS
// ═══════════════════════════════════
function initMicroInteractions() {
  document.querySelectorAll('.micro-tilt').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) translateY(-3px)`;
      card.style.setProperty('--mouse-x', `${(e.clientX - rect.left) / rect.width * 100}%`);
      card.style.setProperty('--mouse-y', `${(e.clientY - rect.top) / rect.height * 100}%`);
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });

  const cosmicBtn = document.getElementById('predictBtn');
  if (cosmicBtn) {
    cosmicBtn.addEventListener('click', (e) => {
      const rect = cosmicBtn.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.left = `${e.clientX - rect.left}px`;
      ripple.style.top = `${e.clientY - rect.top}px`;
      ripple.style.width = ripple.style.height = `${Math.max(rect.width, rect.height)}px`;
      cosmicBtn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);
    });
  }

  document.querySelectorAll('.cosmic-input').forEach(input => {
    input.addEventListener('focus', () => {
      input.classList.add('input-ripple');
      setTimeout(() => input.classList.remove('input-ripple'), 400);
    });
  });
}

// ═══════════════════════════════════
// 9) INPUT HANDLERS
// ═══════════════════════════════════
function initInputHandlers() {
  // Numeric-only for first prize
  document.getElementById('firstPrizeInput')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
    if (e.target.value.length === 6) {
      document.getElementById('last2Input')?.focus();
    }
  });

  // Numeric-only for last 2
  document.getElementById('last2Input')?.addEventListener('input', (e) => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 2);
  });

  // Save draw button
  document.getElementById('saveDrawBtn')?.addEventListener('click', handleSaveDraw);

  // Predict button
  document.getElementById('predictBtn')?.addEventListener('click', handlePredict);

  // Example button
  document.getElementById('exampleBtn')?.addEventListener('click', fillExampleData);

  // GLO auto-fetch button
  document.getElementById('gloFetchBtn')?.addEventListener('click', fetchFromGLO);

  // Clear data button
  document.getElementById('clearDataBtn')?.addEventListener('click', clearAllDraws);
}

function initConfidenceSVG() {
  const svg = document.querySelector('.confidence-ring');
  if (!svg) return;
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
  grad.id = 'confGrad';
  grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
  grad.setAttribute('x2', '100%'); grad.setAttribute('y2', '100%');
  const stops = [
    { offset: '0%', color: '#ec4899' },
    { offset: '33%', color: '#7c3aed' },
    { offset: '66%', color: '#22d3ee' },
    { offset: '100%', color: '#34d399' },
  ];
  stops.forEach(s => {
    const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop.setAttribute('offset', s.offset);
    stop.setAttribute('stop-color', s.color);
    grad.appendChild(stop);
  });
  defs.appendChild(grad);
  svg.insertBefore(defs, svg.firstChild);
}

// ═══════════════════════════════════
// 10) SAVE DRAW
// ═══════════════════════════════════
// งวดล่าสุดตามปฏิทิน (วันที่ 1 / 16) ในรูป วว/ดด/ปป พ.ศ.
function latestDrawDateThai(now) {
  const day = now.getDate() >= 16 ? 16 : 1;
  return `${pad2(day)}/${pad2(now.getMonth() + 1)}/${pad2((now.getFullYear() + 543) % 100)}`;
}

function handleSaveDraw() {
  const date = document.getElementById('drawDate')?.value.trim() || '';
  const first = document.getElementById('firstPrizeInput')?.value.trim() || '';
  const last2 = document.getElementById('last2Input')?.value.trim() || '';

  if (first.length !== 6 || !/^\d{6}$/.test(first)) {
    showError('กรุณากรอกเลขรางวัลที่ 1 ให้ครบ 6 หลัก');
    return;
  }
  if (last2.length !== 2 || !/^\d{2}$/.test(last2)) {
    showError('กรุณากรอกเลขท้าย 2 ตัว ให้ครบ 2 หลัก');
    return;
  }

  const dateStr = date || latestDrawDateThai(new Date());

  if (addDraw(dateStr, first, last2)) {
    showNotification(`✅ บันทึกงวด ${dateStr} สำเร็จ!`, 'success');
    // Clear form
    document.getElementById('drawDate').value = '';
    document.getElementById('firstPrizeInput').value = '';
    document.getElementById('last2Input').value = '';
    document.getElementById('drawDate')?.focus();
    loadAndDisplayHistory();
  }
}

// ═══════════════════════════════════
// 11) EXAMPLE DATA
// ═══════════════════════════════════
async function fillExampleData() {
  const official = await loadOfficialHistory();
  const last = official.length ? official[official.length - 1] : null;
  showNotification(official.length
    ? `📗 ผลรางวัลจริงจากสำนักงานสลากฯ ${official.length} งวด (ปี 2553 – งวด ${last.date}) อยู่ในระบบแล้ว ไม่ต้องกรอกเอง`
    : '⚠️ ยังโหลดผลรางวัลย้อนหลังไม่ได้ — ต่อเน็ตแล้วรีเฟรชหน้านี้', official.length ? 'info' : 'error', 6000);
  loadAndDisplayHistory();
  document.getElementById('historyBody')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ═══════════════════════════════════
// 12) FUSION ENGINE v7 — อยู่ในไฟล์ lotto_engine.js (คู่แฝดของ lotto_engine.py ฝั่งเซิร์ฟเวอร์)
//     ใช้เป็นสมองสำรองเมื่อเรียก Python AI Brain ไม่ได้ — ได้เลขเดียวกันเป๊ะกับฝั่งเซิร์ฟเวอร์
// ═══════════════════════════════════
const HISTORY_CACHE_KEY = 'lottoMoM69_history_v7';
let _officialHistory = null;

// ผลรางวัลจริงย้อนหลังจาก GLO ที่ฝังมากับแอป (เก่า→ใหม่) — โหลดครั้งเดียว เก็บสำรองไว้ใช้ตอนออฟไลน์
async function loadOfficialHistory() {
  if (_officialHistory) return _officialHistory;
  let history = [];
  try {
    const res = await fetch('lotto_history.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    history = await res.json();
    try { localStorage.setItem(HISTORY_CACHE_KEY, JSON.stringify(history)); } catch { /* เต็มก็ข้าม */ }
  } catch {
    try { history = JSON.parse(localStorage.getItem(HISTORY_CACHE_KEY) || '[]'); } catch { history = []; }
  }
  if (Array.isArray(history) && history.length) _officialHistory = history;   // โหลดไม่ได้ = ไม่จำ จะได้ลองใหม่รอบหน้า
  return _officialHistory || [];
}

// draws: ใหม่→เก่า (รูปแบบเดียวกับที่ส่งให้ /api/predict)
async function fusionPredict(draws) {
  const history = await loadOfficialHistory();
  // ไม่มีผลรางวัลทางการ = ฟันธงได้เลขคนละตัวกับเซิร์ฟเวอร์ → บอกตรงๆ ดีกว่าโชว์เลขที่ไม่ตรงกัน
  if (!history.length) throw new Error('ออฟไลน์อยู่และยังไม่เคยโหลดผลรางวัลย้อนหลัง — ต่อเน็ตแล้วลองใหม่นะคะ');
  const { prediction, merged } = LottoEngine.predictFor(history, draws);
  prediction.stats = analyzeStatistics(merged);
  return prediction;
}

// ═══════════════════════════════════
// 13) STATISTICAL ANALYSIS
// ═══════════════════════════════════
function analyzeStatistics(draws) {
  const stats = {
    digitFrequency: Array(10).fill(0),
    positionFrequency: Array(6).fill(null).map(() => Array(10).fill(0)),
    last2Frequency: {},
    digitSums: [],
    trends: [],
    hotDigits: [],
    coldDigits: [],
    pairFrequency: {},
  };

  draws.forEach((draw, idx) => {
    const digits = draw.first.split('').map(Number);
    digits.forEach((d, pos) => {
      stats.digitFrequency[d]++;
      stats.positionFrequency[pos][d]++;
    });
    stats.last2Frequency[draw.last2] = (stats.last2Frequency[draw.last2] || 0) + 1;
    stats.digitSums.push(digits.reduce((a, b) => a + b, 0));
    for (let i = 0; i < digits.length - 1; i++) {
      const pair = `${digits[i]}${digits[i + 1]}`;
      stats.pairFrequency[pair] = (stats.pairFrequency[pair] || 0) + 1;
    }
    if (idx > 0) {
      const prevDigits = draws[idx - 1].first.split('').map(Number);
      stats.trends.push(digits.map((d, i) => d - prevDigits[i]));
    }
  });

  const maxF = Math.max(...stats.digitFrequency);
  const minF = Math.min(...stats.digitFrequency.filter(f => f > 0));
  for (let i = 0; i <= 9; i++) {
    if (stats.digitFrequency[i] >= maxF - 1) stats.hotDigits.push(i);
    if (stats.digitFrequency[i] <= minF) stats.coldDigits.push(i);
  }
  return stats;
}

// ═══════════════════════════════════
// 15) PREDICT HANDLER
// ═══════════════════════════════════
function handlePredict() {
  const draws = loadDraws();

  // 💥 จุดบิ๊กแบงตอนเริ่มทำนาย — กาลจักรวาลระเบิด!
  if (typeof _bigBangTrigger === 'function') _bigBangTrigger();

  // Show loading
  document.getElementById('loadingOverlay')?.classList.add('active');

  // ส่งครบทุกช่อง — วันที่ใช้กันงวดซ้ำกับข้อมูลทางการ, last3b ใช้ฝึกสูตรเลขท้าย 3 ตัว (เป็นคนละรางวัลกับรางวัลที่ 1)
  const drawsForAPI = draws.slice(0, MAX_DRAWS_PER_REQUEST).map(d => ({
    date: d.date || '', first: d.first, last2: d.last2,
    last3b: d.last3b || [], last3f: d.last3f || [],
  }));

  // Try Python AI Brain first, fallback to JS engine (เอนจินเดียวกัน → ได้เลขเดียวกัน)
  predictWithPythonBrain(drawsForAPI)
    .catch(err => {
      console.log('🧠 Python AI Brain not available, using JS engine:', err?.message);
      return fusionPredict(drawsForAPI).then(prediction => ({ prediction, offline: true }));
    })
    .then(data => {
      document.getElementById('loadingOverlay')?.classList.remove('active');
      displayResults(data.prediction);
      if (data.offline) displayGeminiAnalysis(null);
      else requestGeminiAnalysis(drawsForAPI);
    })
    .catch(err => {
      document.getElementById('loadingOverlay')?.classList.remove('active');
      showError('คำนวณไม่สำเร็จ: ' + (err?.message || err));
    });
}

async function predictWithPythonBrain(draws) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draws }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    if (data.success && data.prediction) {
      if (!data.prediction.trackRecord || data.prediction.engineVersion !== LottoEngine.ENGINE_VERSION) {
        throw new Error('server engine outdated');
      }
      console.log('🧠 Python AI Brain responded:', data.engine);
      return data;
    }
    throw new Error('Invalid response');
  } finally {
    clearTimeout(timeout);
  }
}

// Gemini แยกออกจากการฟันธง — เลขขึ้นทันทีไม่ต้องรอ AI พิมพ์
// (เดิม Gemini ช้า → หมดเวลา 15 วิ → หน้าเว็บสลับไปใช้เอนจินสำรองคนละสูตร → เลขเพี้ยนไปมา)
let _geminiRequestId = 0;
async function requestGeminiAnalysis(draws) {
  const requestId = ++_geminiRequestId;
  const content = document.getElementById('geminiContent');
  document.getElementById('geminiSection')?.classList.add('show');
  if (content) content.innerHTML = '<p class="gemini-placeholder">✨ Gemini กำลังเขียนคำวิเคราะห์ให้คุณแม่...</p>';
  let analysis = null;
  try {
    const res = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draws }),
    });
    if (res.ok) analysis = (await res.json()).gemini_analysis || null;
  } catch { /* ไม่มี Gemini ก็แสดงข้อความสำรอง */ }
  if (requestId === _geminiRequestId) displayGeminiAnalysis(analysis);
}

// ═══════════════════════════════════
// 16) DISPLAY RESULTS — ฟันธง เลขเดียว
// ═══════════════════════════════════
function displayResults(results) {
  const sec = document.getElementById('resultsSection');
  const anal = document.getElementById('analyticsSection');
  sec?.classList.add('show');
  anal?.classList.add('show');

  // Update draw count in results header
  const countEl = document.getElementById('resultDrawCount');
  if (countEl) countEl.textContent = results.drawsUsed || '?';

  sec?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Display single definitive numbers (ฟันธง)
  const fp = typeof results.firstPrize === 'string' ? results.firstPrize : results.firstPrize[0];
  const l3 = typeof results.last3 === 'string' ? results.last3 : results.last3[0];
  const l2 = typeof results.last2 === 'string' ? results.last2 : results.last2[0];

  displayNumberSet('firstPrize1', fp, 'gold');
  displayNumberSet('last3_1', l3, 'pink');
  displayNumberSet('result_last2_1', l2, 'cyan');

  // คำบรรยายใต้เลข — มีแต่ "สถิติทาย-ตรวจย้อนหลังจริง" (ไม่มีตัวเลขที่โมเดลประเมินตัวเอง)
  const tr = results.trackRecord;
  const cheer = (results.consensus && results.consensus.last2) || null;
  const setProb = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  if (tr && tr.n) {
    const avgDigits = (tr.digitHits / tr.n).toFixed(1);
    setProb('firstPrizeProb', `📊 ย้อนหลังถูกรางวัลที่ 1 <b>${tr.firstPrizeHits}</b>/${tr.n} งวด · ตรงเฉลี่ย ${avgDigits} จาก 6 หลัก (เดาสุ่มก็ได้ 0.6)`);
    setProb('last3Prob', `📊 ย้อนหลังถูก <b>${tr.last3Hits}</b>/${tr.last3N} งวด (เดาสุ่มจะถูก ≈ ${tr.last3Expected})`);
    setProb('last2Prob', `📊 ย้อนหลังถูก <b>${tr.last2Hits}</b>/${tr.n} งวด (เดาสุ่มจะถูก ≈ ${tr.last2Expected})`);
  } else {
    setProb('firstPrizeProb', '');
    setProb('last3Prob', '');
    setProb('last2Prob', '');
  }
  displayTrackRecord(tr);
  displayDataFreshness(results.lastDraw);

  // วงแหวน "กี่สูตรเชียร์เลขท้าย 2 ตัวนี้" — แสดงเป็นจำนวนสูตร ไม่ใช่ % (กันเข้าใจผิดว่าเป็นโอกาสถูกรางวัล)
  setTimeout(() => {
    const ring = document.getElementById('confRing');
    const pct = document.getElementById('confPercent');
    const share = cheer && cheer[1] ? cheer[0] / cheer[1] : 0;
    if (ring) ring.style.strokeDashoffset = 2 * Math.PI * 52 * (1 - share);
    if (pct) pct.textContent = cheer ? `${cheer[0]}/${cheer[1]}` : '—';
  }, 600);

  // Formula badges — จำนวนเลขที่แต่ละสูตรโบราณเสนอจากงวดล่าสุด
  const folk = results.folkSets || {};
  const setCount = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n; };
  setCount('cross8Count', (folk.cross8 || []).length);
  setCount('swapCount', (folk.swapchain || []).length);
  setCount('statsCount', cheer ? cheer[1] : 0);

  // Analytics
  displayAnalytics(results.stats);
}

// เลขฟันธงเปลี่ยนเมื่อมีผลงวดใหม่เข้ามาเท่านั้น → ถ้ายังไม่มีผลงวดล่าสุด ต้องบอกให้ชัดว่าเลขที่เห็นคือชุดเดิม
function displayDataFreshness(lastDraw) {
  const el = document.getElementById('dataFreshness');
  if (!el) return;
  if (!lastDraw) { el.textContent = ''; return; }
  let html = `ข้อมูลถึงงวด <b>${escapeHtml(lastDraw.date || 'ล่าสุดที่กรอกไว้')}</b> (${escapeHtml(lastDraw.first)} / ${escapeHtml(lastDraw.last2)})`;
  if (lastDraw.iso) {
    const ref = new Date(Date.now() - 24 * 3600 * 1000);             // ผลออกช่วงบ่าย → เผื่อ 1 วัน
    const expected = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() >= 16 ? 16 : 1);
    const missingDays = (expected - new Date(lastDraw.iso + 'T00:00:00')) / (24 * 3600 * 1000);
    if (missingDays > 3) {                                           // เผื่องวดเลื่อน (30 ธ.ค., 2 ม.ค., 17 ม.ค., 2 พ.ค.)
      html += `<br>⚠️ ยังไม่มีผลงวดวันที่ ${expected.getDate()}/${expected.getMonth() + 1} — เลขที่เห็นจึงยังเป็นชุดเดิม ` +
        'กด "ดึงข้อมูลจาก GLO" หรือกรอกผลงวดล่าสุดก่อนนะคะ';
    }
  }
  el.innerHTML = html;
}

// ตารางผลงานจริง: เลขที่เอนจินนี้ "จะฟันธง" ในแต่ละงวดที่ผ่านมา (ใช้ข้อมูลก่อนงวดนั้นเท่านั้น) เทียบกับผลที่ออกจริง
function displayTrackRecord(tr) {
  const summary = document.getElementById('trackSummary');
  const body = document.getElementById('trackBody');
  if (!summary || !body) return;
  if (!tr || !tr.n) {
    summary.textContent = 'ข้อมูลยังไม่พอสำหรับทดสอบย้อนหลัง';
    body.innerHTML = '';
    return;
  }
  summary.innerHTML =
    `ทดสอบแบบ "ทายก่อน-ตรวจทีหลัง" กับผลจริง <b>${tr.n}</b> งวด — ` +
    `ท้าย 2 ตัวถูก <b>${tr.last2Hits}</b> ครั้ง (เดาสุ่มจะถูก ≈ ${tr.last2Expected}) · ` +
    `ท้าย 3 ตัวถูก <b>${tr.last3Hits}</b> ครั้งจาก ${tr.last3N} งวด (เดาสุ่ม ≈ ${tr.last3Expected}) · ` +
    `รางวัลที่ 1 ถูก <b>${tr.firstPrizeHits}</b> ครั้ง ตรง ${tr.digitHits.toLocaleString()} จาก ${tr.digitTrials.toLocaleString()} หลัก ` +
    `(เดาสุ่ม ≈ ${Math.round(tr.digitTrials / 10).toLocaleString()})` +
    `<br>จำนวนครั้งน้อยขนาดนี้ขึ้นลงตามดวงได้มาก — มากหรือน้อยกว่าเดาสุ่มนิดหน่อย ไม่ได้แปลว่าสูตรแม่นขึ้นหรือแย่ลง`;
  const mark = hit => (hit ? '✅' : '·');
  const esc = escapeHtml;
  body.innerHTML = (tr.recent || []).map(r => `
    <tr class="history-row">
      <td class="row-date">${esc(r.date || '-')}</td>
      <td><span class="last2-num">${esc(r.predLast2)}</span> → ${esc(r.realLast2)} ${mark(r.hitLast2)}</td>
      <td>${esc(r.predLast3)} → ${esc((r.realLast3 || []).join(' ') || '-')} ${mark(r.hitLast3)}</td>
      <td>${esc(r.predFirst)} → <span class="first-num">${esc(r.realFirst)}</span> (ตรง ${esc(r.digitsMatched)}/6)</td>
    </tr>`).join('');
}

function displayNumberSet(containerId, number, colorClass) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const digits = number.split('');
  digits.forEach((digit, i) => {
    const div = document.createElement('div');
    div.className = `number-digit ${colorClass}`;
    div.textContent = digit;
    div.style.animationDelay = `${i * 0.12}s`;
    container.appendChild(div);
  });
}

function displayGeminiAnalysis(analysis) {
  const section = document.getElementById('geminiSection');
  const content = document.getElementById('geminiContent');
  if (!section || !content) return;

  if (analysis) {
    section.classList.add('show');
    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    // แปลง **ตัวหนา** ของ markdown ให้เป็นตัวหนาจริง (ไม่โชว์ ** ดิบๆ)
    const fmt = line => esc(line).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const paragraphs = analysis.split('\n').filter(l => l.trim()).map(line =>
      `<p>${fmt(line)}</p>`
    ).join('');
    content.innerHTML = paragraphs;
    content.classList.add('gemini-loaded');
  } else {
    section.classList.add('show');
    content.innerHTML = `
      <div class="gemini-fallback">
        <p class="gemini-fallback-title">🧠 Fusion AI วิเคราะห์ให้คุณแม่แล้วจ้า</p>
        <p class="gemini-fallback-text">ใช้สูตรมงคลพ่อหลวง × สูตรไขว้+8 × อักท้าย-สลับ-สร้อย × AI/ML Statistical Analysis<br>ถ่วงน้ำหนักทุกสูตรตามผลงานจริงย้อนหลัง — วิเคราะห์ครบทุกมิติแล้วค่ะ 💕</p>
        <p class="gemini-fallback-note">⚠️ เป็นการวิเคราะห์ทางสถิติเพื่อความสนุก ไม่รับประกันถูกรางวัลนะคะ</p>
      </div>
    `;
  }
}

function displayAnalytics(stats) {
  const freqEl = document.getElementById('digitFrequency');
  if (freqEl) {
    freqEl.innerHTML = '';
    const maxF = Math.max(...stats.digitFrequency);
    
    // Find the indices of the top 3 highest frequencies
    const freqWithIndex = stats.digitFrequency.map((freq, idx) => ({ idx, freq }));
    freqWithIndex.sort((a, b) => b.freq - a.freq);
    const top3Indices = freqWithIndex.slice(0, 3).map(item => item.idx);

    for (let i = 0; i <= 9; i++) {
      const pct = maxF > 0 ? (stats.digitFrequency[i] / maxF * 100) : 0;
      const row = document.createElement('div');
      row.className = 'freq-row';
      
      const rankIdx = top3Indices.indexOf(i);
      let rankClass = '';
      let rankBadge = '';
      if (rankIdx === 0) {
        rankClass = 'rank-1';
        rankBadge = '🥇 ';
      } else if (rankIdx === 1) {
        rankClass = 'rank-2';
        rankBadge = '🥈 ';
      } else if (rankIdx === 2) {
        rankClass = 'rank-3';
        rankBadge = '🥉 ';
      }

      row.innerHTML = `
        <span class="digit-label ${rankClass}">${rankBadge}${i}</span>
        <div class="bar-track"><div class="bar-fill ${rankClass}" style="width:0%"></div></div>
        <span class="count ${rankClass}">${stats.digitFrequency[i]}</span>
      `;
      freqEl.appendChild(row);
      setTimeout(() => { 
        const fill = row.querySelector('.bar-fill');
        if (fill) fill.style.width = `${pct}%`; 
      }, 100 + i * 80);
    }
  }
  const hotEl = document.getElementById('hotNumbers');
  if (hotEl) hotEl.innerHTML = stats.hotDigits.map(d => `<span class="pill hot">🔥 ${d}</span>`).join('');
  const coldEl = document.getElementById('coldNumbers');
  if (coldEl) coldEl.innerHTML = stats.coldDigits.map(d => `<span class="pill cold">❄️ ${d}</span>`).join('');
  const sumEl = document.getElementById('digitSums');
  if (sumEl) {
    const recent = stats.digitSums.slice(-20);
    sumEl.innerHTML = recent.map((s, i) =>
      `<div class="sum-item"><span>งวด ${i + 1}:</span> <strong>${s}</strong></div>`
    ).join('');
  }
}

// ═══════════════════════════════════
// 17) NOTIFICATIONS
// ═══════════════════════════════════
function showError(msg) {
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed; top: 24px; right: 24px; z-index: 99999;
    background: rgba(236, 72, 153, 0.92); color: white;
    padding: 14px 28px; border-radius: 14px;
    font-size: 0.88rem; font-weight: 500;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 30px rgba(236, 72, 153, 0.3);
    animation: fadeUp 0.3s ease;
  `;
  div.textContent = `⚠️ ${msg}`;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 3500);
}

function showNotification(msg, type = 'info', ms = 3500) {
  const colors = {
    success: 'rgba(52, 211, 153, 0.92)',
    info: 'rgba(124, 58, 237, 0.92)',
    error: 'rgba(236, 72, 153, 0.92)',
  };
  const div = document.createElement('div');
  div.style.cssText = `
    position: fixed; top: 24px; right: 24px; z-index: 99999;
    background: ${colors[type] || colors.info}; color: white;
    padding: 14px 28px; border-radius: 14px;
    font-size: 0.88rem; font-weight: 500;
    backdrop-filter: blur(10px);
    box-shadow: 0 4px 30px rgba(0,0,0,0.2);
    animation: fadeUp 0.3s ease;
  `;
  div.textContent = msg;
  document.body.appendChild(div);
  setTimeout(() => div.remove(), ms);
}
