(() => {
  'use strict';

  const root = document.documentElement;
  root.classList.add('main-ok');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* Split text into word spans, keeping nested elements (like <em>) intact. */
  function splitWords(el, make) {
    let idx = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === 3) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) frag.appendChild(document.createTextNode(part));
            else frag.appendChild(make(part, idx++, node));
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          walk(child);
        }
      });
    };
    walk(el);
    return idx;
  }

  /* ---- Hero headline: each word ignites, then settles ---- */
  const title = $('#hero-title');
  if (title) {
    splitWords(title, (word, i) => {
      const outer = document.createElement('span');
      outer.className = 'word';
      const inner = document.createElement('span');
      inner.className = 'word-in';
      inner.style.setProperty('--i', i);
      inner.textContent = word;
      outer.appendChild(inner);
      return outer;
    });
  }

  /* ---- The central question: words light up as you scroll ---- */
  const statement = $('#statement');
  let qWords = [];
  if (statement) {
    splitWords(statement, (word, i, parent) => {
      const s = document.createElement('span');
      s.className = 'qw' + (parent.closest && parent.closest('.key') ? ' key' : '');
      s.textContent = word;
      return s;
    });
    qWords = $$('.qw', statement);
  }

  requestAnimationFrame(() => root.classList.add('ready'));

  /* ---- "What it is not": strike lines draw when each row is seen ---- */
  const rows = $$('.nots li');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.6 });
    rows.forEach((r) => io.observe(r));
  } else {
    rows.forEach((r) => r.classList.add('in'));
  }

  /* ---- Scroll-linked: progress bar, nav, question, method rail ---- */
  const nav = $('#nav');
  const bar = $('.progress');
  const rail = $('#rail');
  const stations = $$('.station');
  let queued = false;

  function update() {
    queued = false;
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = root.scrollHeight - vh;

    if (bar) bar.style.setProperty('--sp', max > 0 ? clamp(y / max, 0, 1).toFixed(4) : '0');
    if (nav) nav.classList.toggle('solid', y > 24);

    if (statement && qWords.length) {
      const r = statement.getBoundingClientRect();
      const p = reduce ? 1 : clamp((vh * 0.88 - r.top) / (r.height + vh * 0.3), 0, 1);
      const n = Math.round(p * qWords.length);
      qWords.forEach((w, i) => w.classList.toggle('lit', i < n));
    }

    if (rail) {
      const r = rail.getBoundingClientRect();
      const line = vh * 0.62;
      const p = reduce ? 1 : clamp((line - r.top) / r.height, 0, 1);
      rail.style.setProperty('--p', p.toFixed(4));
      stations.forEach((s) => {
        s.classList.toggle('on', reduce || s.getBoundingClientRect().top < line);
      });
    }
  }
  function queue() {
    if (!queued) {
      queued = true;
      requestAnimationFrame(update);
    }
  }
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();

  /* ---- Hero network: scattered points of light connect into a network ---- */
  function network() {
    const canvas = $('#net');
    if (!canvas || !canvas.getContext) return;
    const hero = canvas.parentElement;
    const ctx = canvas.getContext('2d');

    const STEEL = [111, 134, 179];
    const LAMP = [255, 194, 71];
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
    const rand = (a, b) => a + Math.random() * (b - a);
    const TAU = Math.PI * 2;

    let w = 0, h = 0, nodes = [], packets = [], raf = 0, running = false;
    const t0 = performance.now();
    const ptr = { x: 0, y: 0, on: false };

    function build() {
      const r = hero.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((w * h) / (w < 700 ? 10500 : 12500)), 36, 110);
      nodes = Array.from({ length: count }, (_, i) => {
        const hub = i % 14 === 0;
        return {
          x: rand(0, w), y: rand(0, h),
          vx: rand(-0.14, 0.14), vy: rand(-0.1, 0.1),
          r: hub ? rand(3, 4.2) : rand(1.1, 2.2),
          hub, ph: rand(0, TAU)
        };
      });
      packets = [];
    }

    function frame(now) {
      raf = 0;
      if (!running) return;
      const t = (now - t0) / 1000;
      const x = clamp((t - 0.5) / 3.8, 0, 1);
      const ramp = reduce ? 1 : 1 - Math.pow(1 - x, 3);

      ctx.clearRect(0, 0, w, h);
      const LD = clamp(w / 8.5, 92, 150);
      const LD2 = LD * LD;
      const deg = new Array(nodes.length).fill(0);

      if (!reduce) {
        nodes.forEach((n) => {
          n.x += n.vx; n.y += n.vy;
          if (n.x < -20) n.x = w + 20; else if (n.x > w + 20) n.x = -20;
          if (n.y < -20) n.y = h + 20; else if (n.y > h + 20) n.y = -20;
        });
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < LD2) {
            const k = 1 - Math.sqrt(d2) / LD;
            deg[i]++; deg[j]++;
            ctx.strokeStyle = rgba(LAMP, k * 0.5 * ramp);
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            if (!reduce && (a.hub || b.hub) && packets.length < 36 && Math.random() < 0.004 * ramp) {
              packets.push({ i, j, p: 0, s: rand(0.006, 0.014) });
            }
          }
        }
      }

      if (ptr.on) {
        const PR = 170;
        nodes.forEach((n, i) => {
          const d = Math.hypot(n.x - ptr.x, n.y - ptr.y);
          if (d < PR) {
            const k = 1 - d / PR;
            deg[i] += 3;
            ctx.strokeStyle = rgba([255, 236, 190], k * 0.8);
            ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.moveTo(ptr.x, ptr.y); ctx.lineTo(n.x, n.y); ctx.stroke();
          }
        });
        ctx.lineWidth = 1;
        ctx.fillStyle = rgba([255, 236, 190], 0.9);
        ctx.beginPath(); ctx.arc(ptr.x, ptr.y, 3, 0, TAU); ctx.fill();
        ctx.strokeStyle = rgba(LAMP, 0.35);
        ctx.beginPath(); ctx.arc(ptr.x, ptr.y, 14, 0, TAU); ctx.stroke();
      }

      nodes.forEach((n, i) => {
        const k = clamp(deg[i] / 3, 0, 1) * ramp;
        const c = mix(STEEL, LAMP, k);
        const pulse = n.hub ? Math.sin(t * 1.5 + n.ph) * 0.5 + 0.5 : 0;
        if (k > 0.2) {
          ctx.fillStyle = rgba(c, 0.1 * k + pulse * 0.06);
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r * 4 + pulse * 6, 0, TAU); ctx.fill();
        }
        ctx.fillStyle = rgba(c, 0.5 + 0.5 * k);
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, TAU); ctx.fill();
      });

      for (let q = packets.length - 1; q >= 0; q--) {
        const p = packets[q];
        p.p += p.s;
        if (p.p >= 1) { packets.splice(q, 1); continue; }
        const a = nodes[p.i], b = nodes[p.j];
        const px = a.x + (b.x - a.x) * p.p, py = a.y + (b.y - a.y) * p.p;
        ctx.fillStyle = 'rgba(255,246,222,0.95)';
        ctx.beginPath(); ctx.arc(px, py, 2, 0, TAU); ctx.fill();
        ctx.fillStyle = 'rgba(255,194,71,0.25)';
        ctx.beginPath(); ctx.arc(px, py, 6, 0, TAU); ctx.fill();
      }

      if (!reduce && running) raf = requestAnimationFrame(frame);
    }

    build();

    if ('IntersectionObserver' in window) {
      new IntersectionObserver((entries) => {
        const visible = entries[0].isIntersecting;
        if (visible && !running) {
          running = true;
          raf = requestAnimationFrame(frame);
        } else if (!visible) {
          running = false;
          cancelAnimationFrame(raf);
        }
      }).observe(hero);
    } else {
      running = true;
      raf = requestAnimationFrame(frame);
    }

    hero.addEventListener('pointermove', (e) => {
      const r = hero.getBoundingClientRect();
      ptr.x = e.clientX - r.left;
      ptr.y = e.clientY - r.top;
      ptr.on = true;
    }, { passive: true });
    hero.addEventListener('pointerleave', () => { ptr.on = false; });
    hero.addEventListener('pointercancel', () => { ptr.on = false; });
    hero.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') setTimeout(() => { ptr.on = false; }, 700);
    });

    let lastW = w, lastH = h, timer;
    window.addEventListener('resize', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const r = hero.getBoundingClientRect();
        if (Math.abs(r.width - lastW) > 1 || Math.abs(r.height - lastH) > 120) {
          build();
          lastW = w; lastH = h;
          if (reduce && running) requestAnimationFrame(frame);
        }
      }, 200);
    });
  }
  network();

  /* ---- Contact form: builds an email in the visitor's own mail app ---- */
  const form = $('#contact-form');
  const typeSel = $('#f-type');
  const status = $('#form-status');
  if (form && typeSel) {
    $$('[data-audience]').forEach((a) => {
      a.addEventListener('click', () => { typeSel.value = a.dataset.audience; });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const d = new FormData(form);
      const type = typeSel.options[typeSel.selectedIndex].text;
      const subject = 'FEC enquiry: ' + type;
      const body = 'Name: ' + d.get('name') + '\nOrganisation: ' + (d.get('org') || '-') + '\nI am: ' + type + '\n\n' + d.get('message');
      window.location.href = 'mailto:ceo@lexconv.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      if (status) status.textContent = 'Your email app should now open with your message ready. Nothing is sent until you press send there. If it does not open, write to ceo@lexconv.com.';
    });
  }

  /* ---- Caption wording for touch screens ---- */
  const caption = $('#net-caption');
  if (caption && window.matchMedia('(hover: none)').matches) {
    caption.textContent = 'Each point of light is a worker, an enterprise or an employer. Touch and drag to connect them.';
  }

  const yr = $('#yr');
  if (yr) yr.textContent = new Date().getFullYear();
})();
