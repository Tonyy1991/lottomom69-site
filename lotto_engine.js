/* =====================================================
   LottoMoM69 — Fusion Engine v7 "Honest Ensemble" (ฝั่งเบราว์เซอร์)
   คู่แฝดของ lotto_engine.py — ลำดับการคำนวณต้องตรงกันทุกบรรทัดเพื่อให้ได้เลขเดียวกันเป๊ะ
   ใช้แต่ + - * / กับการเปรียบเทียบ (ไม่มี log/exp/pow) → ผลตรงกันทุกบิตตามมาตรฐาน IEEE-754
   ถ้าแก้ที่นี่ต้องแก้ที่ lotto_engine.py ด้วย (ตรวจด้วย tests/test_parity.py)
   ===================================================== */
(function (root) {
  'use strict';

  const ENGINE_VERSION = '7.0';
  const BURN_IN = 60;
  const SHARE = 0.02;
  const NEAR_BEST = 0.85;
  const TIER_LAST2 = 10;
  const TIER_DIGIT = 4;
  const NO_REPEAT_NUMBER = 24;
  const DIGIT_COOLDOWN = [0.0, 0.0, 0.80, 0.88, 0.94];
  const LAST3_RETRIES = 12;
  const MIN_LIKELIHOOD = 1e-12;
  const TIE_GT = 1.0 + 1e-9;   // a ชนะ b เมื่อ a > b * TIE_GT เท่านั้น (ต่างกันน้อยกว่านี้ = เสมอ)
  const DECAY = { 0: 1.0, 6: 0.8908987181403393, 24: 0.9715319411536059, 100: 0.9930924954370359 };
  const PHI = 1.6180339887;
  const PHO_LUANG_PAIRS = [5, 50, 9, 90, 12, 21, 13, 31, 59, 95, 70, 7, 89, 98, 88];

  const digits = s => s.split('').map(Number);
  const sumInt = a => a.reduce((x, y) => x + y, 0);

  // ───────── สูตรโบราณ (เลขท้าย 2 ตัว) ─────────
  function formulaCross8(six, two) {
    const d = digits(six), t = digits(two);
    const p8 = n => (n + 8) % 10;
    const e5p = p8(d[4]), e6p = p8(d[5]), t1p = p8(t[0]), t2p = p8(t[1]);
    const s1 = (d[0] + d[1]) % 10, s2 = (d[2] + d[3]) % 10, s3 = (d[4] + d[5]) % 10, sT = (t[0] + t[1]) % 10;
    return [
      e5p * 10 + t1p, t1p * 10 + e5p, e6p * 10 + t2p, t2p * 10 + e6p,
      d[4] * 10 + t[0], t[0] * 10 + d[4], d[5] * 10 + t[1], t[1] * 10 + d[5],
      s2 * 10 + s3, s3 * 10 + s2, s3 * 10 + sT, sT * 10 + s3, s1 * 10 + sT, sT * 10 + s1,
      p8(s2) * 10 + p8(s3), p8(s3) * 10 + p8(sT),
      p8(d[0]) * 10 + t1p, p8(d[1]) * 10 + t2p,
      p8(d[2]) * 10 + p8(d[3]), p8(d[3]) * 10 + p8(d[2]),
    ];
  }

  function formulaSwapChain(six, two) {
    const d = digits(six), t = digits(two);
    const lastSum = (d[4] + d[5] + t[0] + t[1]) % 10;
    const midSum = (d[2] + d[3]) % 10;
    const firstSum = (d[0] + d[1]) % 10;
    const ch = [(d[0] + t[0]) % 10, (d[2] + t[1]) % 10, (d[4] + t[0]) % 10, (d[1] + t[1]) % 10];
    const df = [Math.abs(d[0] - t[0]) % 10, Math.abs(d[2] - t[1]) % 10, Math.abs(d[4] - t[0]) % 10, Math.abs(d[5] - t[1]) % 10];
    const m1 = (d[0] + d[3] + t[0]) % 10, m2 = (d[1] + d[4] + t[1]) % 10, m3 = (d[2] + d[5] + t[0]) % 10;
    const rootD = (sumInt(d) % 9) || 9;
    return [
      midSum * 10 + lastSum, lastSum * 10 + midSum, firstSum * 10 + lastSum, lastSum * 10 + firstSum,
      ch[0] * 10 + ch[1], ch[1] * 10 + ch[0], ch[2] * 10 + ch[3], ch[3] * 10 + ch[2],
      df[0] * 10 + df[1], df[2] * 10 + df[3], df[1] * 10 + df[0], df[3] * 10 + df[2],
      m1 * 10 + m2, m2 * 10 + m3, m3 * 10 + m1,
      rootD * 10 + t[0], t[1] * 10 + rootD,
    ];
  }

  function formulaPhoLuang(six, two) {
    const d = digits(six), t = digits(two);
    const p9 = n => (n + 9) % 10;
    const e5p = p9(d[4]), e6p = p9(d[5]), t1p = p9(t[0]), t2p = p9(t[1]);
    const sFirst = (d[0] + d[1] + 9) % 10, sMid = (d[2] + d[3] + 9) % 10, sLast = (d[4] + d[5] + 9) % 10;
    const rootD = ((sumInt(d) + sumInt(t)) % 9) || 9;
    const out = [
      e5p * 10 + t1p, t1p * 10 + e5p, e6p * 10 + t2p, t2p * 10 + e6p,
      sFirst * 10 + sLast, sLast * 10 + sFirst, sMid * 10 + sLast, sLast * 10 + sMid,
      rootD * 10 + d[5], d[5] * 10 + rootD, rootD * 10 + t[1], t[1] * 10 + rootD,
    ];
    for (const pair of PHO_LUANG_PAIRS) {
      const a = Math.floor(pair / 10), b = pair % 10;
      if (t.includes(a) || t.includes(b)) out.push(pair);
    }
    return out;
  }

  function formulaGoldenPhi(six, two) {
    const d = digits(six), t = digits(two);
    const fibs = [1, 1, 2, 3, 5, 8];
    const fib = d.map((x, i) => (x + fibs[i]) % 10);
    const twoVal = t[0] * 10 + t[1];
    const tailVal = d[4] * 10 + d[5];
    const phiT = t.map(x => Math.floor(x * PHI) % 10);
    return [
      fib[4] * 10 + fib[5], fib[5] * 10 + fib[4], fib[0] * 10 + fib[5], fib[2] * 10 + fib[3],
      Math.floor(twoVal * PHI) % 100, Math.floor(twoVal / PHI) % 100,
      Math.floor(tailVal * PHI) % 100,
      phiT[0] * 10 + phiT[1], phiT[1] * 10 + phiT[0],
    ];
  }

  function formulaMirror(six, two) {
    const d = digits(six), t = digits(two);
    return [
      t[1] * 10 + t[0], (9 - t[0]) * 10 + (9 - t[1]), (9 - t[1]) * 10 + (9 - t[0]),
      ((t[0] + 5) % 10) * 10 + (t[1] + 5) % 10,
      (9 - d[4]) * 10 + (9 - d[5]), d[5] * 10 + d[4],
    ];
  }

  const FOLK_FORMULAS = [
    ['cross8', 'สูตรไขว้+8', formulaCross8],
    ['swapchain', 'สูตรอักท้าย-สลับ-สร้อย', formulaSwapChain],
    ['pholuang', 'สูตรมงคลพ่อหลวง', formulaPhoLuang],
    ['goldenphi', 'สูตรอัตราส่วนทองคำ φ', formulaGoldenPhi],
    ['mirror', 'สูตรควอนตัมกระจกเงา', formulaMirror],
  ];

  // ───────── EXPERTS ─────────
  class Uniform {
    constructor(size) {
      this.key = 'uniform'; this.label = 'สุ่มเท่ากันทุกเลข (ตัวเทียบ)';
      this.p = Array(size).fill(1.0 / size);
    }
    predict() { return this.p; }
    update() {}
  }

  class EWFreq {
    constructor(size, halfLife, alpha) {
      this.key = halfLife ? `freq_hl${halfLife}` : 'freq_all';
      this.label = halfLife ? `เลขร้อน ครึ่งชีวิต ${halfLife} งวด` : 'ความถี่สะสมทุกงวด';
      this.size = size; this.alpha = alpha;
      this.decay = DECAY[halfLife];
      this.c = Array(size).fill(0.0);
      this.tot = 0.0;
    }
    predict() {
      const den = this.tot + this.size * this.alpha, a = this.alpha;
      return this.c.map(x => (x + a) / den);
    }
    update(obs) {
      if (!obs.length) return;
      if (this.decay !== 1.0) {
        const dk = this.decay;
        this.c = this.c.map(x => x * dk);
        this.tot *= dk;
      }
      const w = 1.0 / obs.length;
      for (const o of obs) { this.c[o] += w; this.tot += w; }
    }
  }

  class Gap {
    constructor(size, strength) {
      this.key = 'gap'; this.label = 'เลขค้าง (Gap Analysis)';
      this.size = size; this.strength = strength;
      this.cap = 3 * size;
      this.last = Array(size).fill(-1);
      this.t = 0;
    }
    predict() {
      const cap = this.cap, st = this.strength;
      const raw = [];
      for (let i = 0; i < this.size; i++) {
        let g = this.last[i] >= 0 ? this.t - this.last[i] : cap;
        if (g > cap) g = cap;
        raw.push(1.0 + st * g / cap);
      }
      let tot = 0.0;
      for (const x of raw) tot += x;
      return raw.map(x => x / tot);
    }
    update(obs) {
      if (!obs.length) return;
      for (const o of obs) this.last[o] = this.t;
      this.t += 1;
    }
  }

  class Markov {
    constructor(size, alpha) {
      this.key = 'markov'; this.label = 'Markov Chain (จังหวะเปลี่ยนผ่าน)';
      this.size = size; this.alpha = alpha;
      this.n = Array.from({ length: size }, () => Array(size).fill(0.0));
      this.rows = Array(size).fill(0.0);
      this.prev = [];
    }
    predict() {
      const size = this.size, a = this.alpha;
      if (!this.prev.length) return Array(size).fill(1.0 / size);
      const out = Array(size).fill(0.0);
      const w = 1.0 / this.prev.length;
      for (const s of this.prev) {
        const den = this.rows[s] + size * a;
        const row = this.n[s];
        for (let i = 0; i < size; i++) out[i] += w * (row[i] + a) / den;
      }
      return out;
    }
    update(obs) {
      if (!obs.length) return;
      const w = 1.0 / obs.length;
      for (const s of this.prev) {
        for (const o of obs) this.n[s][o] += w;
        this.rows[s] += 1.0;
      }
      this.prev = obs.slice();
    }
  }

  class PhaseFreq {
    constructor(size, alpha) {
      this.key = 'phase'; this.label = 'จังหวะงวด 1/16 (จันทรคติ)';
      this.tables = [new EWFreq(size, 0, alpha), new EWFreq(size, 0, alpha)];
    }
    predict(ctx) { return this.tables[ctx.phase].predict(ctx); }
    update(obs, ctx) { this.tables[ctx.phase].update(obs, ctx); }
  }

  class Factorized {
    constructor(tens, units) {
      this.key = 'digit_' + tens.key; this.label = tens.label + ' (รายหลัก)';
      this.tens = tens; this.units = units;
    }
    predict(ctx) {
      const pt = this.tens.predict(ctx), pu = this.units.predict(ctx);
      const out = [];
      for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) out.push(pt[a] * pu[b]);
      return out;
    }
    update(obs, ctx) {
      this.tens.update(obs.map(o => Math.floor(o / 10)), ctx);
      this.units.update(obs.map(o => o % 10), ctx);
    }
  }

  const FOLK_PRIOR = 20.0;
  class FolkSet {
    constructor(key, label, fn) {
      this.key = key; this.label = label; this.fn = fn; this.isFolk = true;
      this.hits = 0.0; this.expected = 0.0; this.cur = null;
    }
    predict(ctx) {
      const prev = ctx.prev;
      if (prev === null) { this.cur = null; return Array(100).fill(0.01); }
      const members = [...new Set(this.fn(prev.first, prev.last2))].sort((a, b) => a - b);
      this.cur = members;
      const s = members.length;
      const lift = (this.hits + FOLK_PRIOR) / (this.expected + FOLK_PRIOR);
      let mass = lift * s / 100.0;
      if (mass > 0.9) mass = 0.9;
      const pIn = mass / s, pOut = (1.0 - mass) / (100 - s);
      const out = Array(100).fill(pOut);
      for (const m of members) out[m] = pIn;
      return out;
    }
    update(obs) {
      if (this.cur === null || !obs.length) return;
      this.expected += this.cur.length / 100.0;
      if (this.cur.includes(obs[0])) this.hits += 1.0;
    }
  }

  // ───────── HEDGE — ค่าเฉลี่ยถ่วงน้ำหนักตามผลงานจริง ─────────
  class Hedge {
    constructor(experts) {
      this.experts = experts;
      this.w = Array(experts.length).fill(1.0 / experts.length);
      this.last = null;
    }
    predict(ctx) {
      this.last = this.experts.map(e => e.predict(ctx));
      const size = this.last[0].length;
      const mix = Array(size).fill(0.0);
      for (let k = 0; k < this.w.length; k++) {
        const wk = this.w[k], pk = this.last[k];
        for (let i = 0; i < size; i++) mix[i] += wk * pk[i];
      }
      return mix;
    }
    update(obs, ctx) {
      if (obs.length) {
        const k = this.experts.length;
        const inv = 1.0 / obs.length;
        const raw = [];
        for (let j = 0; j < k; j++) {
          const pk = this.last[j];
          let like = 0.0;
          for (const o of obs) like += pk[o];
          like *= inv;
          if (like < MIN_LIKELIHOOD) like = MIN_LIKELIHOOD;
          raw.push(this.w[j] * like);
        }
        let tot = 0.0;
        for (const x of raw) tot += x;
        this.w = raw.map(x => (1.0 - SHARE) * (x / tot) + SHARE / k);
      }
      for (const e of this.experts) e.update(obs, ctx);
    }
  }

  function digitExperts() {
    return [new Uniform(10), new EWFreq(10, 6, 1.0), new EWFreq(10, 24, 1.0), new EWFreq(10, 100, 1.0),
      new EWFreq(10, 0, 1.0), new Gap(10, 0.5), new Markov(10, 1.0), new PhaseFreq(10, 1.0)];
  }

  function last2Experts() {
    const ex = [new Uniform(100), new EWFreq(100, 24, 0.5), new EWFreq(100, 100, 0.5), new EWFreq(100, 0, 0.5), new Gap(100, 0.5)];
    const makers = [() => new EWFreq(10, 6, 1.0), () => new EWFreq(10, 24, 1.0), () => new EWFreq(10, 100, 1.0),
      () => new Gap(10, 0.5), () => new Markov(10, 1.0), () => new PhaseFreq(10, 1.0)];
    for (const make of makers) ex.push(new Factorized(make(), make()));
    for (const [key, label, fn] of FOLK_FORMULAS) ex.push(new FolkSet(key, label, fn));
    return ex;
  }

  // ฟันธง 1 เลขจาก "กลุ่มตัวเต็ง": เลขที่คะแนน (หลังคูณ cooldown; 0 = ห้าม) >= NEAR_BEST ของอันดับ 1
  // และติดไม่เกิน tier อันดับแรก แล้วให้ seed (มาจากผลงวดล่าสุด) ชี้ว่าเอาตัวไหน — deterministic แต่ไม่วนซ้ำเป็นรอบ
  function pick(p, cooldown, seed, tier) {
    let score = p.map((v, i) => v * (cooldown.has(i) ? cooldown.get(i) : 1.0));
    let best = 0.0;
    for (const x of score) if (x > best) best = x;
    if (best <= 0.0) {                 // ถูกห้ามหมดทุกเลข → เลิกห้าม
      score = p;
      for (const x of score) if (x > best) best = x;
    }
    const floor = best * NEAR_BEST;
    let cands = [];
    for (let i = 0; i < p.length; i++) if (score[i] > 0.0 && score[i] >= floor) cands.push(i);
    cands.sort((a, b) => (score[a] > score[b] ? -1 : score[a] < score[b] ? 1 : a - b));
    cands = cands.slice(0, tier);
    return cands[seed % cands.length];
  }

  // ตัวคูณ cooldown ของหลัก 0-9 ในตำแหน่ง pos จากคำทำนายล่าสุดของตัวเอง (ใหม่สุดมีผลแรงสุด)
  function digitCooldown(picks, pos) {
    const out = new Map();
    for (let back = Math.min(DIGIT_COOLDOWN.length, picks.length); back > 0; back--) {
      out.set(Number(picks[picks.length - back][pos]), DIGIT_COOLDOWN[back - 1]);
    }
    return out;
  }

  // สูตรนี้ "เชียร์" เลข idx จริงไหม: ให้โอกาสสูงกว่าเดาสุ่ม และมีเลขที่ให้สูงกว่านี้ไม่ถึง topK ตัว
  // (สูตรโบราณ: ต้องเป็นเลขที่สูตรเสนอจริงๆ ด้วย)
  function supports(expert, p, idx, topK) {
    if (expert.isFolk && (expert.cur === null || !expert.cur.includes(idx))) return false;
    const v = p[idx];
    if (!(v > (1.0 / p.length) * TIE_GT)) return false;
    let above = 0;
    for (const x of p) if (x > v * TIE_GT) above += 1;
    return above < topK;
  }

  function roundHalfUp(x, nd) {
    const m = Math.pow(10, nd || 0);
    return Math.floor(x * m + 0.5) / m;
  }

  function drawPhase(draw, prevPhase) {
    if (draw.iso) {
      const day = parseInt(draw.iso.slice(8, 10), 10);
      return (day <= 8 || day >= 28) ? 0 : 1;
    }
    return 1 - prevPhase;
  }

  const pad2 = n => (n < 10 ? '0' : '') + n;
  const lastN = (arr, n) => arr.slice(Math.max(0, arr.length - n));

  class FusionEngineV7 {
    constructor(drawsOldestFirst) {
      this.h2 = new Hedge(last2Experts());
      this.hpos = Array.from({ length: 6 }, () => new Hedge(digitExperts()));
      this.h3 = Array.from({ length: 3 }, () => new Hedge(digitExperts()));
      this.prev = null;
      this.prevPhase = 1;
      this.t = 0;
      this.picks2 = []; this.picks3 = []; this.picks6 = [];
      this.track = { n: 0, last2Hits: 0, last3Hits: 0, last3N: 0, last3Expected: 0.0, digitHits: 0, digitTrials: 0, firstPrizeHits: 0 };
      this.recent = [];
      for (const d of (drawsOldestFirst || [])) this.feed(d);
    }

    _makePicks(ctx) {
      const prev = ctx.prev;
      const seed = prev ? Number(prev.first) * 31 + Number(prev.last2) * 7 : 0;

      const p2 = this.h2.predict(ctx);
      const pick2 = pick(p2, new Map(lastN(this.picks2, NO_REPEAT_NUMBER).map(n => [n, 0.0])), seed + 3, TIER_LAST2);

      const ppos = this.hpos.map(h => h.predict(ctx));
      const six = [];
      for (let pos = 0; pos < 6; pos++) six.push(pick(ppos[pos], digitCooldown(this.picks6, pos), seed + 101 * (pos + 1), TIER_DIGIT));
      const first = six.join('');

      // เลขท้าย 3 ตัวเป็นคนละรางวัลกับรางวัลที่ 1 → ไม่ให้หน้าตาเหมือนหางรางวัลที่ 1 และไม่ซ้ำเลขที่เพิ่งฟันธง
      const p3 = this.h3.map(h => h.predict(ctx));
      const cool3 = [0, 1, 2].map(j => digitCooldown(this.picks3, j));
      const taken = new Set(lastN(this.picks3, NO_REPEAT_NUMBER));
      taken.add(first.slice(3));
      let last3 = '';
      for (let attempt = 0; attempt < LAST3_RETRIES; attempt++) {
        last3 = [0, 1, 2].map(j => pick(p3[j], cool3[j], seed + 211 * (j + 1) + 17 * attempt, TIER_DIGIT)).join('');
        if (!taken.has(last3)) break;
      }
      return { last2: pad2(pick2), first, last3 };
    }

    feed(draw) {
      // ฟันธงแบบเดียวกับที่ predict() จะโชว์ก่อนงวดนี้ออก (ยังไม่รู้วันที่จริง → เฟสสลับจากงวดก่อน)
      const picks = this._makePicks({ prev: this.prev, phase: 1 - this.prevPhase });
      const phase = drawPhase(draw, this.prevPhase);
      const ctx = { prev: this.prev, phase };
      const winners3 = threeDigitList(draw.last3b);
      if (this.t >= BURN_IN) {
        const tr = this.track;
        tr.n += 1;
        const hit2 = picks.last2 === draw.last2;
        tr.last2Hits += hit2 ? 1 : 0;
        let k = 0;
        for (let i = 0; i < 6; i++) if (picks.first[i] === draw.first[i]) k++;
        tr.digitHits += k;
        tr.digitTrials += 6;
        tr.firstPrizeHits += (k === 6) ? 1 : 0;
        let hit3 = null;
        if (winners3.length) {
          hit3 = winners3.includes(picks.last3);
          tr.last3N += 1;
          tr.last3Hits += hit3 ? 1 : 0;
          tr.last3Expected += new Set(winners3).size / 1000.0;
        }
        this.recent.push({
          date: draw.date || draw.iso || '',
          predLast2: picks.last2, realLast2: draw.last2, hitLast2: hit2,
          predLast3: picks.last3, realLast3: winners3, hitLast3: hit3,
          predFirst: picks.first, realFirst: draw.first, digitsMatched: k,
        });
        if (this.recent.length > 12) this.recent.shift();
      }
      this.picks2.push(Number(picks.last2));
      this.picks6.push(picks.first);
      this.picks3.push(picks.last3);

      this.h2.update([Number(draw.last2)], ctx);
      for (let pos = 0; pos < 6; pos++) this.hpos[pos].update([Number(draw.first[pos])], ctx);
      for (let j = 0; j < 3; j++) this.h3[j].update(winners3.map(w => Number(w[j])), ctx);
      this.prev = draw;
      this.prevPhase = phase;
      this.t += 1;
    }

    static _consensus(hedge, idx, topK) {
      let agree = 0, total = 0;
      hedge.experts.forEach((e, k) => {
        if (e.key === 'uniform') return;
        total += 1;
        if (supports(e, hedge.last[k], idx, topK)) agree += 1;
      });
      return [agree, total];
    }

    static _weights(hedge) {
      const rows = hedge.experts.map((e, k) => ({ key: e.key, label: e.label, weight: roundHalfUp(hedge.w[k] * 100, 1) }));
      rows.sort((a, b) => (b.weight - a.weight) || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
      return rows;
    }

    predict() {
      if (this.prev === null) throw new Error('ต้องมีข้อมูลอย่างน้อย 1 งวด');
      const ctx = { prev: this.prev, phase: 1 - this.prevPhase };
      const picks = this._makePicks(ctx);
      const [a2, n2] = FusionEngineV7._consensus(this.h2, Number(picks.last2), 10);

      const tr = Object.assign({}, this.track);
      tr.last2Expected = roundHalfUp(tr.n * 0.01, 2);
      tr.last3Expected = roundHalfUp(tr.last3Expected, 2);
      tr.digitRatePct = tr.digitTrials ? roundHalfUp(100.0 * tr.digitHits / tr.digitTrials, 1) : 0.0;
      tr.recent = this.recent.slice().reverse();

      const folkSets = {};
      for (const e of this.h2.experts) if (e.isFolk) folkSets[e.key] = (e.cur || []).map(pad2);

      return {
        firstPrize: picks.first,
        last3: picks.last3,
        last2: picks.last2,
        engineVersion: ENGINE_VERSION,
        drawsUsed: this.t,
        lastDraw: { date: this.prev.date || '', iso: this.prev.iso || '', first: this.prev.first, last2: this.prev.last2 },
        consensus: { last2: [a2, n2] },
        confidence: tr.n ? roundHalfUp(100.0 * a2 / n2) : 0,
        trackRecord: tr,
        weights: { last2: FusionEngineV7._weights(this.h2).slice(0, 6) },
        folkSets,
      };
    }
  }

  // ───────── HISTORY MERGE ─────────
  // ไวยากรณ์ ASCII ล้วน เขียนเหมือนกันทุกตัวอักษรกับฝั่ง Python
  const THAI_DATE = /^[ \t]*([0-9]{1,2})[ \t]*\/[ \t]*([0-9]{1,2})[ \t]*\/[ \t]*([0-9]{1,2})[ \t]*$/;
  const THREE_DIGITS = /^[0-9]{3}$/;

  function thaiDateToIso(dateStr) {
    const m = typeof dateStr === 'string' ? THAI_DATE.exec(dateStr) : null;
    if (!m) return null;
    const dd = Number(m[1]), mm = Number(m[2]), yy = Number(m[3]);
    if (!(dd >= 1 && dd <= 31 && mm >= 1 && mm <= 12)) return null;
    return `${2500 + yy - 543}-${pad2(mm)}-${pad2(dd)}`;
  }

  // เลข 3 ตัว (สตริง ASCII) สูงสุด 4 เลขต่องวด — ของแปลกปลอมทิ้งหมด
  function threeDigitList(values) {
    if (!Array.isArray(values)) return [];
    return values.filter(w => typeof w === 'string' && THREE_DIGITS.test(w)).slice(0, 4);
  }

  function mergeDraws(history, userDrawsNewestFirst) {
    const byIso = new Set(history.map(d => d.iso));
    const seenPairs = new Set(history.map(d => d.first + '|' + d.last2));
    const lastIso = history.length ? history[history.length - 1].iso : '';
    const dated = new Map();
    const undated = [];
    const stamped = userDrawsNewestFirst.slice().reverse().map(u => [thaiDateToIso(u.date), u]);   // เก่า→ใหม่
    // รอบแรกเฉพาะงวดที่มีวันที่ — งวดเดียวกันที่พิมพ์ไว้แบบไม่มีวันที่จะได้ไม่ไปบังงวดที่มีวันที่ (และมี last3b)
    for (const wantDated of [true, false]) {
      for (const [iso, u] of stamped) {
        if ((iso !== null) !== wantDated) continue;
        if (iso && byIso.has(iso)) continue;
        const pair = u.first + '|' + u.last2;
        if (seenPairs.has(pair)) continue;
        seenPairs.add(pair);
        const rec = {
          first: u.first, last2: u.last2,
          date: iso ? u.date.replace(/^[ \t]+|[ \t]+$/g, '') : '',   // ข้อความอิสระในช่องวันที่ไม่เก็บ
          last3b: threeDigitList(u.last3b), last3f: threeDigitList(u.last3f),
        };
        if (iso) { rec.iso = iso; dated.set(iso, rec); } else undated.push(rec);
      }
    }
    const isos = [...dated.keys()].sort();
    const older = isos.filter(iso => iso < lastIso).map(iso => dated.get(iso));
    const newer = isos.filter(iso => iso > lastIso).map(iso => dated.get(iso)).concat(undated);
    if (older.length) {
      const base = history.concat(older).sort((a, b) => (a.iso < b.iso ? -1 : a.iso > b.iso ? 1 : 0));
      return base.concat(newer);
    }
    return history.concat(newer);
  }

  function predictFor(history, userDrawsNewestFirst) {
    const merged = mergeDraws(history || [], userDrawsNewestFirst || []);
    const engine = new FusionEngineV7(merged);
    return { prediction: engine.predict(), merged };
  }

  const api = { ENGINE_VERSION, FusionEngineV7, mergeDraws, predictFor, thaiDateToIso };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.LottoEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
