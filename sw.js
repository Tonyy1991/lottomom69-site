/* LottoMoM69 — Service Worker (ติดตั้งเป็นแอป + ใช้ออฟไลน์ได้)
   เปลี่ยนเลข VERSION ทุกครั้งที่ deploy → เบราว์เซอร์จะทิ้งแคชเก่าและโหลดไฟล์ใหม่เอง */
const VERSION = 'lottomom-v7.1';
const CORE = [
  './', './lottery_predictor.css?v=7.0', './lottery_predictor.js?v=7.0', './lotto_engine.js?v=7.0',
  './lotto_history.json', './manifest.webmanifest',
  './images/galaxy-bg.jpg', './images/logo-wizard.jpg', './images/logo-aerothai.jpg', './images/blackhole-spin.png',
  './images/icon-192.png', './images/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(VERSION)
      .then(cache => Promise.allSettled(CORE.map(url => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return;                 // API: ผ่านเน็ตเสมอ (ออฟไลน์ → หน้าเว็บคำนวณเองอยู่แล้ว)

  // หน้าเว็บ: เอาจากเน็ตก่อน (ได้เวอร์ชันใหม่ทันที) ถ้าออฟไลน์ค่อยใช้ที่แคชไว้
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(res => res || caches.match('./')))
    );
    return;
  }

  // ไฟล์ประกอบ (css/js/รูป/ข้อมูล/ฟอนต์): ใช้แคชก่อนแล้วอัปเดตเบื้องหลัง
  const cacheable = url.origin === self.location.origin ||
    url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com');
  if (!cacheable) return;
  event.respondWith(
    caches.match(req).then(cached => {
      const fresh = fetch(req).then(res => {
        if (res && (res.ok || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(VERSION).then(cache => cache.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
