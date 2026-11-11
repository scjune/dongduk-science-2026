(function () {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const MESSAGES = (window.MESSAGES || []).map((s) => String(s).trim()).filter(Boolean);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const svg = $("plant");

  function mk(tag, attrs, parent) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs || {}) el.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(el);
    return el;
  }
  const pt = (p) => p[0].toFixed(1) + " " + p[1].toFixed(1);

  // quadratic bezier helpers
  function qPoint(b, t) {
    const u = 1 - t;
    return [
      u * u * b.s[0] + 2 * u * t * b.c[0] + t * t * b.e[0],
      u * u * b.s[1] + 2 * u * t * b.c[1] + t * t * b.e[1],
    ];
  }
  function qTan(b, t) {
    const u = 1 - t;
    const dx = 2 * u * (b.c[0] - b.s[0]) + 2 * t * (b.e[0] - b.c[0]);
    const dy = 2 * u * (b.c[1] - b.s[1]) + 2 * t * (b.e[1] - b.c[1]);
    const l = Math.hypot(dx, dy);
    return [dx / l, dy / l];
  }

  /* ---------------- shapes ---------------- */
  const LEAF_D =
    "M0 0 C -6 -10 -24 -12 -30 -28 C -20 -29 -14 -34 -13 -44 C -6 -40 -3 -50 0 -62 " +
    "C 3 -50 6 -40 13 -44 C 14 -34 20 -29 30 -28 C 24 -12 6 -10 0 0 Z";

  function star(n, ro, ri, rotDeg, cy) {
    let d = "";
    for (let k = 0; k < n * 2; k++) {
      const r = k % 2 ? ri : ro;
      const a = ((rotDeg + (k * 180) / n) * Math.PI) / 180;
      d += (k ? "L" : "M") + (Math.cos(a) * r).toFixed(1) + " " + (Math.sin(a) * r + cy).toFixed(1);
    }
    return d + "Z";
  }

  const cottonMarkup = (n, puffs) =>
    '<path class="calyx" d="' + star(n, 38, 14, n === 5 ? -54 : -45, 4) + '"/>' +
    '<g class="puffs" filter="url(#fuzz)">' +
    puffs.map((p) => '<circle class="puff" cx="' + p[0] + '" cy="' + p[1] + '" r="' + p[2] + '"/>').join("") +
    "</g>";
  // a real boll splits into 4–5 locks; mix both for a natural look
  const COTTON_MARKUP = cottonMarkup(5, [[0, -14, 16], [-16, -3, 15], [16, -3, 15], [-10, 12, 14], [10, 12, 14], [0, 0, 15]]);
  const COTTON_MARKUP_4 = cottonMarkup(4, [[-10, -9, 15], [10, -9, 15], [-10, 9, 15], [10, 9, 15], [0, 0, 13]]);

  // a ripe boll just before it bursts: dried brown sepals, a tan pod
  // cracking along its seams with white cotton peeking through
  const CAPSULE_MARKUP =
    '<g transform="scale(.72)">' +
    '<path class="calyx" d="' + star(5, 30, 12, -54, 10) + '"/>' +
    '<path class="pod" d="M0 -20 C 14 -20 19 -6 18 5 C 17 16 9 21 0 21 C -9 21 -17 16 -18 5 C -19 -6 -14 -20 0 -20 Z"/>' +
    '<path class="seam" d="M0 -18 Q 2 0 0 18"/>' +
    '<ellipse class="shine" cx="-7" cy="-5" rx="3.5" ry="6"/>' +
    '<g class="tuft" filter="url(#fuzz)">' +
    '<circle cx="-7" cy="-19" r="7"/><circle cx="7" cy="-19" r="7"/><circle cx="0" cy="-24" r="8.5"/>' +
    "</g>" +
    "</g>";
  const BRACT_D ="M-3 22 C -18 26 -34 14 -33 -4 L -27 1 L -29 -11 L -21 -4 L -20 -16 L -13 -3 C -10 8 -6 16 -3 22 Z";
  const IMG_COTTON5 = '<image href="assets/cotton5.png" x="-48" y="-48" width="96" height="96"/>';
  const IMG_COTTON4 = '<image href="assets/cotton4.png" x="-48" y="-48" width="96" height="96"/>';
  const IMG_CAPSULE = '<image href="assets/capsule.png" x="-28" y="-28" width="56" height="56"/>';
  const BOLL_MARKUP =
    '<circle class="hit" r="46"/>' +
    '<circle class="halo" r="32" fill="url(#gHalo)"/>' +
    // pre-rendered pictures (assets/) instead of live blur filters: much lighter on phones
    '<g class="capsule">' + IMG_CAPSULE + "</g>" +
    '<g class="cotton">' + IMG_COTTON5 + "</g>";

  /* ---------------- plant geometry (portrait, mobile-first) ---------------- */
  // A cotton plant at harvest time: a sturdy trunk, branches forking outward into
  // a rounded crown, most leaves dropped, and white cotton bursting along the branches.
  const FORK = [258, 612];
  const SEG = {
    A:   { s: [252, 668], c: [200, 640], e: [130, 560], w: 11 },
    A1:  { s: "A",  c: [90, 540],  e: [58, 480],  w: 6 },
    A2:  { s: "A",  c: [120, 500], e: [104, 430], w: 6 },
    A2a: { s: "A2", c: [86, 390],  e: [76, 345],  w: 4 },
    A2b: { s: "A2", c: [124, 392], e: [146, 360], w: 4 },
    B:   { s: FORK, c: [232, 520], e: [205, 410], w: 10 },
    B1:  { s: "B",  c: [185, 340], e: [150, 262], w: 5 },
    B1a: { s: "B1", c: [135, 235], e: [118, 205], w: 3.5 },
    B2:  { s: "B",  c: [220, 340], e: [212, 262], w: 5 },
    B2a: { s: "B2", c: [205, 215], e: [192, 170], w: 3.5 },
    C:   { s: FORK, c: [265, 480], e: [260, 330], w: 10 },
    C1:  { s: "C",  c: [258, 240], e: [260, 152], w: 6 },
    C2:  { s: "C",  c: [290, 280], e: [318, 232], w: 5 },
    C2a: { s: "C2", c: [325, 190], e: [338, 150], w: 3.5 },
    D:   { s: FORK, c: [300, 520], e: [318, 420], w: 10 },
    D1:  { s: "D",  c: [345, 360], e: [372, 300], w: 5 },
    D1a: { s: "D1", c: [390, 260], e: [410, 222], w: 3.5 },
    E:   { s: [266, 656], c: [330, 630], e: [395, 555], w: 11 },
    E1:  { s: "E",  c: [438, 530], e: [466, 470], w: 6 },
    E2:  { s: "E",  c: [405, 495], e: [420, 430], w: 6 },
    E2a: { s: "E2", c: [445, 390], e: [456, 350], w: 4 },
  };
  const parents = new Set();
  Object.keys(SEG).forEach((k) => {
    const b = SEG[k];
    if (typeof b.s === "string") {
      parents.add(b.s);
      b.parent = b.s;
      b.s = SEG[b.s].e;
    }
  });
  // width where each branch ends = width of its thickest child (or a thin tip)
  Object.keys(SEG).forEach((k) => {
    const kids = Object.values(SEG).filter((b) => b.parent === k);
    SEG[k].wEnd = kids.length ? Math.max(...kids.map((b) => b.w)) * 1.05 : SEG[k].w * 0.38;
  });

  svg.innerHTML =
    "<defs>" +
    '<radialGradient id="gBoll" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#e2c194"/><stop offset=".55" stop-color="#b0804f"/><stop offset="1" stop-color="#77502f"/></radialGradient>' +
    '<radialGradient id="gCotton" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#ffffff"/><stop offset=".7" stop-color="#fbf8f2"/><stop offset="1" stop-color="#e2d9c9"/></radialGradient>' +
    '<radialGradient id="gSun" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffcf8f" stop-opacity=".55"/><stop offset=".5" stop-color="#f0a46a" stop-opacity=".22"/><stop offset="1" stop-color="#e8955e" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="gLight" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fffbe8"/><stop offset=".3" stop-color="#ffd78a" stop-opacity=".95"/><stop offset="1" stop-color="#ffb35c" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="gGroundFade" gradientUnits="userSpaceOnUse" cx="260" cy="826" r="280" gradientTransform="translate(260 826) scale(1 .32) translate(-260 -826)"><stop offset=".42" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient>' +
    '<mask id="mGround" maskUnits="userSpaceOnUse" x="-20" y="700" width="560" height="240"><rect x="-20" y="700" width="560" height="240" fill="url(#gGroundFade)"/></mask>' +
    '<mask id="mMoon"><rect x="380" y="0" width="140" height="180" fill="#fff"/><circle cx="469" cy="70" r="20" fill="#000"/></mask>' +
    '<radialGradient id="gHalo" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffd9a0" stop-opacity=".75"/><stop offset=".55" stop-color="#ffc47e" stop-opacity=".25"/><stop offset="1" stop-color="#ffc47e" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="gSnow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffaf3"/><stop offset="1" stop-color="#e9dccb"/></linearGradient>' +
    '<linearGradient id="gBark" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4b3223"/><stop offset=".45" stop-color="#8d6243"/><stop offset="1" stop-color="#55392a"/></linearGradient>' +
    '<filter id="fuzz" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>' +
    "</defs>";

  // small icon of the closed boll inside the hint text
  const hintIcon = document.querySelector(".hint-icon");
  if (hintIcon) hintIcon.innerHTML = CAPSULE_MARKUP;

  const L = {};
  ["back", "trunk", "branches", "leaves", "lights", "decor", "bolls"].forEach((n) => (L[n] = mk("g", { class: "layer-" + n }, svg)));

  // background glow + snowy ground
  mk("circle", { cx: 260, cy: 400, r: 340, fill: "url(#gSun)" }, L.back);
  mk("circle", { cx: 260, cy: 380, r: 330, fill: "url(#gSun)", class: "cele-glow" }, L.back);
  // a warm crescent moon
  mk("circle", { cx: 458, cy: 78, r: 48, fill: "url(#gHalo)", opacity: ".55" }, L.back);
  mk("circle", { cx: 458, cy: 78, r: 21, fill: "#fff1d0", mask: "url(#mMoon)" }, L.back);
  // snowy ground with distant hills, fading softly at the edges (no hard box)
  const ground = mk("g", { mask: "url(#mGround)" }, L.back);
  mk("path", { d: "M-20 812 Q 70 752 170 784 Q 250 806 330 774 Q 430 736 540 792 L 540 930 L -20 930 Z", fill: "#3b2a3e" }, ground);
  mk("path", { d: "M-20 812 Q 70 752 170 784 Q 250 806 330 774 Q 430 736 540 792", fill: "none", stroke: "#f3e6d6", "stroke-width": "2.5", opacity: ".35" }, ground);
  mk("path", { d: "M-20 830 Q 110 792 220 812 Q 340 830 430 804 Q 500 790 540 806 L 540 930 L -20 930 Z", fill: "#4a3343" }, ground);
  mk("path", { d: "M-20 846 Q 120 800 260 806 Q 400 800 540 846 L 540 930 L -20 930 Z", fill: "url(#gSnow)" }, ground);
  mk("path", { d: "M60 838 Q 160 822 230 830 Q 170 842 60 838 Z M300 832 Q 380 820 470 840 Q 380 842 300 832 Z", fill: "#d9c6b0", opacity: ".55" }, ground);

  // trunk (filled, tapered, with root flare) — the snow mound covers its base
  mk("ellipse", { cx: 262, cy: 850, rx: 120, ry: 9, fill: "#b49b86", opacity: ".45" }, L.trunk);
  mk("path", {
    d: "M222 860 Q 242 846 245 806 C 247 730 248 668 249 612 L 268 612 C 269 668 271 730 273 806 Q 276 846 298 860 Z",
    fill: "url(#gBark)",
  }, L.trunk);
  mk("path", { d: "M253 826 C 255 760 253 700 256 640 M264 808 C 262 750 265 694 262 652", class: "bark" }, L.trunk);
  mk("path", { d: "M257 830 C 258 760 256 690 258 618", class: "bark-light" }, L.trunk);
  mk("ellipse", { cx: 261, cy: 712, rx: 3.2, ry: 5, class: "knot" }, L.trunk);
  mk("path", { d: "M216 852 Q 260 836 304 852 Q 260 846 216 852 Z", fill: "#fffaf3", opacity: ".95" }, L.trunk);

  // branches with taper + snow resting on top
  const segD = (b) => "M" + pt(b.s) + " Q" + pt(b.c) + " " + pt(b.e);
  // a filled outline that narrows smoothly from w0 to w1 along the curve
  function taperD(b, w0, w1) {
    const N = 16, left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const p = qPoint(b, t);
      const u = qTan(b, t);
      const hw = (w0 + (w1 - w0) * t) / 2;
      left.push([p[0] - u[1] * hw, p[1] + u[0] * hw]);
      right.push([p[0] + u[1] * hw, p[1] - u[0] * hw]);
    }
    return "M" + left.map(pt).join(" L") + " L" + right.reverse().map(pt).join(" L") + " Z";
  }
  Object.values(SEG).forEach((b) => {
    const d = segD(b);
    const w0 = b.parent ? b.w : b.w * 1.15;
    mk("path", { d: taperD(b, w0, b.wEnd), class: "limb" }, L.branches);
    mk("circle", { cx: b.s[0], cy: b.s[1], r: (w0 / 2).toFixed(1), class: "limb" }, L.branches);
    mk("circle", { cx: b.e[0], cy: b.e[1], r: (b.wEnd / 2).toFixed(1), class: "limb" }, L.branches);
    // soft highlight on the lit (upper-left) side
    mk("path", { d, class: "limb-light", "stroke-width": (b.w * 0.22).toFixed(1), transform: "translate(" + (-b.w * 0.16).toFixed(1) + " " + (-b.w * 0.2).toFixed(1) + ")", pathLength: 100, "stroke-dasharray": "72 200" }, L.branches);
  });

  // seeded random so the plant looks the same on every visit
  let seed = 20261111;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const deg = (v) => (Math.atan2(v[1], v[0]) * 180) / Math.PI;

  // a few dried leaves still hanging on
  function leaf(x, y, dirDeg, sc, color) {
    const g = mk("g", { transform: "translate(" + x.toFixed(1) + " " + y.toFixed(1) + ") rotate(" + (dirDeg + 90).toFixed(1) + ") scale(" + sc.toFixed(2) + ")" }, L.leaves);
    mk("path", { d: LEAF_D, class: "leaf", fill: color }, g);
    mk("path", { d: "M0 0 L0 -54 M0 -8 L-22 -29 M0 -8 L22 -29", class: "vein" }, g);
  }
  [["A", 0.45, 1, "#a5643c"], ["E", 0.4, -1, "#8f7a42"], ["B1", 0.45, -1, "#b5794a"], ["D1", 0.4, 1, "#a5643c"], ["C", 0.75, 1, "#7d8a48"], ["E2", 0.5, 1, "#b5794a"], ["A1", 0.5, -1, "#8f7a42"]]
    .forEach(([k, t, side, color]) => {
      const b = SEG[k];
      const p = qPoint(b, t);
      leaf(p[0], p[1], deg(qTan(b, t)) + side * 70, 0.5 + rnd() * 0.12, color);
    });

  /* ---------------- cotton placement ---------------- */
  const R_BOLL = 36;  // clickable boll footprint (radius, viewBox units)
  const placed = [];
  const fits = (c, r) =>
    c[0] - r > 6 && c[0] + r < 514 && c[1] - r > 60 && c[1] + r < 690 &&
    placed.every((p) => Math.hypot(p.c[0] - c[0], p.c[1] - c[1]) >= (p.r + r) * 0.82);

  const clampTilt = (v, m) => Math.max(-m, Math.min(m, v));
  const inBounds = (c, r) => c[0] - r > 6 && c[0] + r < 514 && c[1] - r > 60 && c[1] + r < 690;

  // 1) candidate spots: every branch tip + spurs along every branch
  const cands = [];
  Object.keys(SEG).forEach((k) => {
    if (parents.has(k)) return;
    const b = SEG[k];
    const u = qTan(b, 1);
    cands.push({ c: [b.e[0] + u[0] * 24, b.e[1] + u[1] * 24], a: null, tilt: clampTilt(deg(u) + 90, 35), tip: true });
  });
  Object.keys(SEG).forEach((k) => {
    const b = SEG[k];
    const ts = b.w >= 10 ? [0.42, 0.7, 0.92] : b.w >= 5 ? [0.35, 0.7] : [0.5];
    ts.forEach((t, j) => {
      const p = qPoint(b, t);
      const u = qTan(b, t);
      let n = [u[1], -u[0]];
      if (j % 2) n = [-n[0], -n[1]];
      const dist = b.w >= 10 ? 30 : 24;
      cands.push({ c: [p[0] + n[0] * dist, p[1] + n[1] * dist], a: p, tilt: clampTilt(deg(n) + 90, 40), tip: false });
    });
  });

  // 2) clickable (green) bolls spread evenly over the whole crown:
  //    start at the top, then repeatedly take the spot farthest from all chosen ones
  const slots = [];
  const pool = cands.filter((s) => inBounds(s.c, R_BOLL));
  if (pool.length && MESSAGES.length) {
    const first = pool.reduce((m, s) => (s.c[1] < m.c[1] ? s : m));
    first.used = true;
    slots.push(first);
    while (slots.length < MESSAGES.length) {
      let best = null, bestD = -1;
      pool.forEach((s) => {
        if (s.used) return;
        const d = Math.min(...slots.map((q) => Math.hypot(q.c[0] - s.c[0], q.c[1] - s.c[1])));
        if (d > bestD) { bestD = d; best = s; }
      });
      if (!best || bestD < R_BOLL * 1.6) break;
      best.used = true;
      slots.push(best);
    }
  }
  slots.forEach((s) => placed.push({ c: s.c, r: R_BOLL }));

  // 3) white open cotton in all the remaining spots
  function decorCotton(c, sc, rot, from) {
    if (from) mk("line", { x1: from[0].toFixed(1), y1: from[1].toFixed(1), x2: c[0].toFixed(1), y2: c[1].toFixed(1), class: "stalk thin" }, L.branches);
    const g = mk("g", { class: "decor-cotton", transform: "translate(" + pt(c) + ") rotate(" + rot.toFixed(1) + ") scale(" + sc.toFixed(2) + ")" }, L.decor);
    const cj = mk("g", { class: "cj", "data-y": c[1].toFixed(0) }, g);
    cj.innerHTML = rnd() < 0.45 ? IMG_COTTON4 : IMG_COTTON5;
  }
  cands.forEach((s) => {
    if (s.used) return;
    const sizes = s.tip ? [0.8, 0.62] : [0.6 + rnd() * 0.18];
    const sc = sizes.find((v) => fits(s.c, 38 * v));
    if (!sc) return;
    placed.push({ c: s.c, r: 38 * sc });
    decorCotton(s.c, sc, s.tip ? s.tilt : s.tilt * 0.6 + (rnd() - 0.5) * 30, s.a);
  });

  if (MESSAGES.length > slots.length) {
    console.warn("메시지(" + MESSAGES.length + ")가 목화 자리(" + slots.length + ")보다 많습니다. 초과분은 '모아 보기'에서만 보입니다.");
  }

  // clickable bolls, ordered top → bottom so "다음 목화" moves naturally
  slots.sort((p, q) => p.c[1] - q.c[1]);
  const bolls = [];
  slots.forEach((s, i) => {
    if (s.a) mk("line", { x1: s.a[0].toFixed(1), y1: s.a[1].toFixed(1), x2: s.c[0].toFixed(1), y2: s.c[1].toFixed(1), class: "stalk" }, L.branches);
    const outer = mk("g", { transform: "translate(" + pt(s.c) + ") rotate(" + s.tilt.toFixed(1) + ")" }, L.bolls);
    const cj = mk("g", { class: "cj", "data-y": s.c[1].toFixed(0) }, outer);
    const g = mk("g", {
      class: "boll",
      tabindex: "0",
      role: "button",
      "aria-label": (i + 1) + "번째 목화 열기",
      "data-i": i,
      style: "--sway-delay:" + (-Math.random() * 4).toFixed(2) + "s;--sway-dur:" + (4 + Math.random() * 1.5).toFixed(2) + "s",
    }, cj);
    g.innerHTML = BOLL_MARKUP;
    bolls.push(g);
  });

  /* ---------------- state ---------------- */
  const opened = new Set();
  // which message hides in which boll is shuffled on every visit,
  // and each popup is numbered by the order the student opened it (01, 02, …)
  const shuffled = (n) => {
    const a = [...Array(n).keys()];
    for (let k = a.length - 1; k > 0; k--) {
      const j = Math.floor(Math.random() * (k + 1));
      [a[k], a[j]] = [a[j], a[k]];
    }
    return a;
  };
  let msgOf = shuffled(MESSAGES.length);   // boll index → message index
  const openOrder = new Map();               // boll index → 1, 2, 3 … (order opened)
  let busy = false;
  let finaleShown = false;
  let lastFocus = null;
  let usingKeyboard = false;
  document.addEventListener("keydown", (e) => {
    if (e.key === "Tab" || e.key === "Enter" || e.key === " ") usingKeyboard = true;
  });
  document.addEventListener("pointerdown", () => (usingKeyboard = false));

  $("totalCount").textContent = MESSAGES.length;

  function updateProgress() {
    $("openedCount").textContent = opened.size;
    $("bar").style.width = (MESSAGES.length ? (opened.size / MESSAGES.length) * 100 : 0) + "%";
    const done = opened.size === MESSAGES.length && MESSAGES.length > 0;
    $("showAll").classList.toggle("primary", done);
    $("showAll").classList.toggle("celebrate", done);
    $("lead").innerHTML = done
      ? "모든 목화가 활짝 피었어요.<br> 1년 동안 가꾼 탐구가 이렇게 따뜻한 결실을 맺었습니다."
      : LEAD_DEFAULT;
  }
  const LEAD_DEFAULT = $("lead").innerHTML;

  /* ---------------- burst effect ---------------- */
  function burst(el) {
    if (reduceMotion) return;
    const r = el.querySelector(".hit").getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;

    const ring = document.createElement("div");
    ring.className = "pop-ring";
    const rs = r.width * 0.6;
    Object.assign(ring.style, { left: cx - rs / 2 + "px", top: cy - rs / 2 + "px", width: rs + "px", height: rs + "px" });
    document.body.appendChild(ring);
    ring.animate([{ transform: "scale(.4)", opacity: 1 }, { transform: "scale(2.6)", opacity: 0 }], { duration: 600, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => ring.remove();

    const n = 22;
    for (let i = 0; i < n; i++) {
      const f = document.createElement("div");
      f.className = "fluff";
      const size = 7 + Math.random() * 13;
      Object.assign(f.style, { left: cx - size / 2 + "px", top: cy - size / 2 + "px", width: size + "px", height: size + "px" });
      document.body.appendChild(f);
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 40 + Math.random() * 70;
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist;
      f.animate(
        [
          { transform: "translate(0,0) scale(.4)", opacity: 1 },
          { transform: "translate(" + dx * 0.8 + "px," + dy * 0.8 + "px) scale(1)", opacity: 1, offset: 0.45 },
          { transform: "translate(" + dx + "px," + (dy + 30) + "px) scale(.8)", opacity: 0 },
        ],
        { duration: 900 + Math.random() * 500, easing: "cubic-bezier(.2,.7,.3,1)" }
      ).onfinish = () => f.remove();
    }
  }

  /* ---------------- modal ---------------- */
  const modal = $("modal");
  const nextBtn = $("nextBtn");
  $("cardIcon").innerHTML = '<svg viewBox="-46 -46 92 92">' + COTTON_MARKUP + "</svg>";

  function fontSizeFor(text) {
    const n = text.length;
    if (n <= 12) return "1.9rem";
    if (n <= 40) return "1.45rem";
    if (n <= 90) return "1.2rem";
    return "1.05rem";
  }

  let currentIndex = -1;
  function showCard(i) {
    const m = msgOf[i];               // the message hidden in this boll
    currentIndex = m;                 // used by "카드로 저장하기"
    modal.classList.remove("finale");
    $("saveBtn").querySelector("span").textContent = "이 응원을 카드로 저장하기";
    const text = MESSAGES[m];
    const nth = openOrder.get(i) || opened.size;
    $("cardNo").textContent = "응원 메시지 " + String(nth).padStart(2, "0") + " / " + String(MESSAGES.length).padStart(2, "0");
    $("cardText").textContent = text;
    $("cardText").style.setProperty("--fs", fontSizeFor(text));
    $("cardFrom").hidden = true;
    const allDone = opened.size === MESSAGES.length;
    nextBtn.textContent = allDone ? (finaleShown ? "메시지 모아 보기" : "마지막 이야기 보기") : "다음 목화 피우기";
    openModal();
  }

  function showFinale() {
    finaleShown = true;
    currentIndex = -1;
    modal.classList.add("finale");
    $("saveBtn").querySelector("span").textContent = "이 카드를 사진으로 저장하기";
    $("cardNo").textContent = "모든 목화가 피었어요";
    $("cardText").textContent = "";
    $("cardFrom").textContent = "2026 과학심화진탐아 학술제";
    $("cardFrom").hidden = false;
    nextBtn.textContent = "메시지 모아 보기";
    openModal();
  }

  function openModal() {
    if (modal.hidden) {
      lastFocus = document.activeElement;
      modal.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => modal.classList.add("show")));
    }
    nextBtn.focus({ preventScroll: true });
  }

  function closeModal(cb) {
    if (modal.hidden) return cb && cb();
    modal.classList.remove("show");
    setTimeout(() => {
      modal.hidden = true;
      // return focus only for keyboard users; after a tap/click the boll
      // must not keep a focus ring around it
      if (usingKeyboard && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
      else if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
      if (cb) cb();
    }, reduceMotion ? 0 : 260);
  }

  modal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeModal(maybeFinale);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal(maybeFinale);
  });

  function maybeFinale() {
    if (!finaleShown && opened.size === MESSAGES.length && MESSAGES.length > 0) {
      celebrateThenFinale();
    }
  }

  /* ---------------- celebration when every boll has bloomed ---------------- */
  let celebrated = false;
  const LIGHT_COLORS = ["#ffd98f", "#ffbf73", "#fff3cf", "#ffcf9e"];

  function buildLights() {
    L.lights.textContent = "";
    const add = (x, y) => {
      const d = Math.max(0, (840 - y) / 760) * 1.6;           // bottom → top wave
      const c = mk("circle", { class: "light", cx: x.toFixed(1), cy: y.toFixed(1), r: (5 + rnd() * 2.5).toFixed(1), fill: "url(#gLight)" }, L.lights);
      c.style.setProperty("--ld", d.toFixed(2) + "s");
      c.style.setProperty("--td", (1.6 + rnd() * 1.6).toFixed(2) + "s");
      mk("circle", { class: "light", cx: x.toFixed(1), cy: y.toFixed(1), r: "1.6", fill: LIGHT_COLORS[Math.floor(rnd() * LIGHT_COLORS.length)] }, L.lights)
        .style.setProperty("--ld", d.toFixed(2) + "s");
    };
    // spiral of lights around the trunk
    for (let y = 800, k = 0; y > 620; y -= 22, k++) add(k % 2 ? 268 : 249, y);
    // lights strung along every branch
    Object.values(SEG).forEach((b) => {
      const len = Math.hypot(b.e[0] - b.s[0], b.e[1] - b.s[1]);
      const n = Math.max(1, Math.round(len / 26));
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 0.5);
        const p = qPoint(b, t);
        const u = qTan(b, t);
        const side = i % 2 ? 1 : -1;
        add(p[0] + u[1] * 5 * side, p[1] - u[0] * 5 * side);
      }
    });
  }

  function fountain() {
    if (reduceMotion) return;
    const cottons = [...document.querySelectorAll(".decor-cotton, .boll.open")];
    cottons.forEach((el, i) => {
      if (i % 2) return;
      const r = el.getBoundingClientRect();
      const delay = 400 + Math.random() * 1400;
      setTimeout(() => {
        for (let k = 0; k < 2; k++) {
          const f = document.createElement("div");
          f.className = "fluff";
          const size = 5 + Math.random() * 9;
          Object.assign(f.style, { left: r.left + r.width / 2 - size / 2 + "px", top: r.top + r.height / 2 - size / 2 + "px", width: size + "px", height: size + "px" });
          document.body.appendChild(f);
          const dx = (Math.random() - 0.5) * 120;
          const dy = -(140 + Math.random() * 220);
          f.animate(
            [
              { transform: "translate(0,0) scale(.3)", opacity: 0 },
              { transform: "translate(" + dx * 0.3 + "px," + dy * 0.3 + "px) scale(1)", opacity: 1, offset: 0.25 },
              { transform: "translate(" + dx + "px," + dy + "px) scale(.7)", opacity: 0 },
            ],
            { duration: 2200 + Math.random() * 1200, easing: "cubic-bezier(.2,.6,.3,1)" }
          ).onfinish = () => f.remove();
        }
      }, delay);
    });
  }

  function celebrate() {
    buildLights();
    document.querySelectorAll(".cj").forEach((el) => {
      const y = +el.dataset.y || 400;
      el.style.setProperty("--jd", (Math.max(0, (640 - y) / 560) * 1.2).toFixed(2) + "s");
    });
    svg.classList.remove("celebrate");
    void svg.getBoundingClientRect(); // restart animations
    svg.classList.add("celebrate");
    fountain();
  }

  function celebrateThenFinale() {
    if (celebrated) return setTimeout(showFinale, 150);
    celebrated = true;
    svg.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    setTimeout(celebrate, reduceMotion ? 0 : 450);
    setTimeout(showFinale, reduceMotion ? 300 : 4200);
  }

  nextBtn.addEventListener("click", () => {
    if (opened.size < MESSAGES.length) {
      const closed = bolls.filter((b) => !b.classList.contains("open"));
      const next = closed[Math.floor(Math.random() * closed.length)];
      closeModal(() => {
        next.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
        setTimeout(() => openBoll(next), reduceMotion ? 0 : 350);
      });
    } else if (!finaleShown) {
      closeModal(celebrateThenFinale);
    } else {
      closeModal(showAll);
    }
  });

  /* ---------------- save a message as a card image ---------------- */
  const CARD_W = 1080, CARD_H = 1350;
  const loadImg = (src) => new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
  function cottonImageURL() {
    // the same cotton drawing, made standalone (inline colours) so it can be drawn on a canvas
    const markup = COTTON_MARKUP
      .replace('class="calyx"', 'fill="#8a5b37" stroke="#5c3b22" stroke-width="1.2" stroke-linejoin="round"')
      .replace(/class="puff"/g, 'fill="url(#c)"')
      .replace('filter="url(#fuzz)"', 'filter="url(#f)"');
    const svgStr =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-48 -48 96 96" width="384" height="384"><defs>' +
      '<radialGradient id="c" cx="40%" cy="35%" r="70%"><stop offset="0" stop-color="#fff"/><stop offset=".7" stop-color="#fbf8f2"/><stop offset="1" stop-color="#e2d9c9"/></radialGradient>' +
      '<filter id="f" x="-30%" y="-30%" width="160%" height="160%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter>' +
      "</defs>" + markup + "</svg>";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgStr);
  }
  function wrapText(ctx, text, maxW) {
    const lines = [];
    let line = "";
    text.split(/\s+/).forEach((word) => {
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width <= maxW) { line = test; return; }
      if (line) lines.push(line);
      if (ctx.measureText(word).width <= maxW) { line = word; return; }
      let part = "";
      for (const ch of word) {
        if (ctx.measureText(part + ch).width > maxW) { lines.push(part); part = ch; } else part += ch;
      }
      line = part;
    });
    if (line) lines.push(line);
    return lines;
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  async function makeCardBlob(text) {
    await Promise.all([
      document.fonts.load('700 64px "Gowun Batang"'),
      document.fonts.load('400 48px "Gowun Batang"'),
      document.fonts.load('28px "Gowun Dodum"'),
    ]).catch(() => {});
    const [logo, cotton] = await Promise.all([loadImg("logo.png").catch(() => null), loadImg(cottonImageURL()).catch(() => null)]);

    const cv = document.createElement("canvas");
    cv.width = CARD_W;
    cv.height = CARD_H;
    const ctx = cv.getContext("2d");

    // winter night background with a warm glow
    const bg = ctx.createLinearGradient(0, 0, 0, CARD_H);
    bg.addColorStop(0, "#221c33");
    bg.addColorStop(0.5, "#3a2a3f");
    bg.addColorStop(1, "#5e3c36");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    const glow = ctx.createRadialGradient(540, 420, 0, 540, 420, 560);
    glow.addColorStop(0, "rgba(255,207,143,.35)");
    glow.addColorStop(1, "rgba(255,207,143,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
    // snow
    for (let i = 0; i < 70; i++) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.6;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(Math.random() * CARD_W, Math.random() * CARD_H, 1.5 + Math.random() * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    // logo
    if (logo) {
      ctx.fillStyle = "#fffaf2";
      ctx.beginPath();
      ctx.arc(540, 110, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(logo, 540 - 46, 110 - 46, 92, 92);
    }
    ctx.fillStyle = "#f4b47a";
    ctx.font = '28px "Gowun Dodum", sans-serif';
    ctx.fillText("2026 동덕여자고등학교 · 1학년 과학심화진탐아 학술제", 540, 205);
    ctx.fillStyle = "#f7ecdc";
    ctx.font = '700 66px "Gowun Batang", serif';
    ctx.shadowColor = "rgba(244,180,122,.45)";
    ctx.shadowBlur = 24;
    ctx.fillText("응원 한 송이", 540, 282);
    ctx.shadowBlur = 0;

    // cotton
    if (cotton) ctx.drawImage(cotton, 540 - 95, 330, 190, 190);

    // paper card
    const px = 90, py = 540, pw = 900, ph = 600;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#fffaf2";
    roundRect(ctx, px, py, pw, ph, 36);
    ctx.fill();
    ctx.restore();

    // message, as large as fits
    const maxW = pw - 150, maxH = ph - 170;
    let size = 64, lines, lh;
    for (; size >= 30; size -= 2) {
      ctx.font = '400 ' + size + 'px "Gowun Batang", serif';
      lines = wrapText(ctx, text, maxW);
      lh = size * 1.6;
      if (lines.length * lh <= maxH) break;
    }
    const cy = py + ph / 2 - 10;
    const top = cy - ((lines.length - 1) * lh) / 2;
    ctx.fillStyle = "#3a2c20";
    lines.forEach((ln, i) => ctx.fillText(ln, 540, top + i * lh));
    // quote marks
    ctx.fillStyle = "rgba(143,44,69,.35)";
    ctx.font = '700 120px "Gowun Batang", serif';
    ctx.fillText("“", px + 70, py + 80);
    ctx.fillText("”", px + pw - 70, py + ph - 50);

    ctx.fillStyle = "#cfb9a0";
    ctx.font = '26px "Gowun Dodum", sans-serif';
    ctx.fillText("동덕여자고등학교 과학과", 540, 1250);

    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    return { blob, dataUrl: cv.toDataURL("image/png") };
  }


  // the "모든 목화가 피었어요" card as an image: photo, the year's story, and the closing words
  async function makeFinaleBlob() {
    const W = 1080, H = 1560;
    await Promise.all([
      document.fonts.load('700 60px "Gowun Batang"'),
      document.fonts.load('400 34px "Gowun Batang"'),
      document.fonts.load('28px "Gowun Dodum"'),
    ]).catch(() => {});
    const [logo, photo] = await Promise.all([loadImg("logo.png").catch(() => null), loadImg("memory.jpg").catch(() => null)]);

    const cv = document.createElement("canvas");
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#221c33");
    bg.addColorStop(0.5, "#3a2a3f");
    bg.addColorStop(1, "#5e3c36");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(540, 600, 0, 540, 600, 700);
    glow.addColorStop(0, "rgba(255,207,143,.32)");
    glow.addColorStop(1, "rgba(255,207,143,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 80; i++) {
      ctx.globalAlpha = 0.3 + Math.random() * 0.6;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(Math.random() * W, Math.random() * H, 1.5 + Math.random() * 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    if (logo) {
      ctx.fillStyle = "#fffaf2";
      ctx.beginPath();
      ctx.arc(540, 92, 48, 0, Math.PI * 2);
      ctx.fill();
      ctx.drawImage(logo, 540 - 42, 92 - 42, 84, 84);
    }
    ctx.fillStyle = "#f4b47a";
    ctx.font = '28px "Gowun Dodum", sans-serif';
    ctx.fillText("2026 동덕여자고등학교 · 1학년 과학심화진탐아 학술제", 540, 180);
    ctx.fillStyle = "#f7ecdc";
    ctx.font = '700 60px "Gowun Batang", serif';
    ctx.shadowColor = "rgba(244,180,122,.45)";
    ctx.shadowBlur = 24;
    ctx.fillText("모든 목화가 피었어요", 540, 252);
    ctx.shadowBlur = 0;

    // polaroid photo, slightly tilted
    const pw = 840, ph = pw * 670 / 1200, frameW = pw + 36, frameH = ph + 104;
    ctx.save();
    ctx.translate(540, 318 + frameH / 2);
    ctx.rotate(-1.6 * Math.PI / 180);
    ctx.shadowColor = "rgba(0,0,0,.4)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-frameW / 2, -frameH / 2, frameW, frameH);
    ctx.shadowColor = "transparent";
    if (photo) ctx.drawImage(photo, -pw / 2, -frameH / 2 + 18, pw, ph);
    ctx.fillStyle = "#806b56";
    ctx.font = '400 32px "Gowun Batang", serif';
    ctx.fillText("2026. 11. 11. 우리의 학술제", 0, frameH / 2 - 46);
    ctx.restore();

    // paper with the year's story
    const qx = 90, qy = 930, qw = 900, qh = 530;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,.35)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 16;
    ctx.fillStyle = "#fffaf2";
    roundRect(ctx, qx, qy, qw, qh, 36);
    ctx.fill();
    ctx.restore();

    // spring · summer · autumn
    const seasons = [["봄", "주제를 심고"], ["여름", "실험으로 키우고"], ["가을", "결실을 맺다"]];
    const sx = [330, 540, 750], sy = 995;
    ctx.strokeStyle = "#e3d2b8";
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(sx[0], sy);
    ctx.lineTo(sx[2], sy);
    ctx.stroke();
    ctx.setLineDash([]);
    seasons.forEach(([name, sub], k) => {
      ctx.fillStyle = "#efe3cc";
      ctx.beginPath();
      ctx.arc(sx[k], sy, 22, 0, Math.PI * 2);
      ctx.fill();
      if (k === 0) { ctx.fillStyle = "#6f4b31"; ctx.beginPath(); ctx.arc(sx[k], sy, 8, 0, Math.PI * 2); ctx.fill(); }
      if (k === 1) {
        ctx.fillStyle = "#fbf1cf"; ctx.beginPath(); ctx.arc(sx[k], sy, 16, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#b24f6a"; ctx.beginPath(); ctx.arc(sx[k], sy, 6, 0, Math.PI * 2); ctx.fill();
      }
      if (k === 2) {
        ctx.fillStyle = "#8a5b37"; ctx.beginPath(); ctx.arc(sx[k], sy, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(sx[k], sy, 14, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#3a2c20";
      ctx.font = '700 30px "Gowun Batang", serif';
      ctx.fillText(name, sx[k], sy + 48);
      ctx.fillStyle = "#806b56";
      ctx.font = '22px "Gowun Dodum", sans-serif';
      ctx.fillText(sub, sx[k], sy + 82);
    });

    ctx.fillStyle = "#5a4636";
    ctx.font = '400 31px "Gowun Batang", serif';
    [["목화는 봄에 씨를 심어 여름 내내 자라고,", 1140], ["가을이 되어서야 하얀 솜을 피워요.", 1186],
     ["주제를 고민하고, 실험하고, 고쳐 쓰고,", 1250], ["마침내 무대에 선 여러분의 한 해도 그랬어요.", 1296]]
      .forEach(([t, y]) => ctx.fillText(t, 540, y));
    ctx.fillStyle = "#3a2c20";
    ctx.font = '700 36px "Gowun Batang", serif';
    ctx.fillText("오늘 피어난 목화솜 한 송이 한 송이가", 540, 1370);
    ctx.fillText("여러분이 1년 동안 노력한 결실입니다.", 540, 1420);

    ctx.fillStyle = "#cfb9a0";
    ctx.font = '26px "Gowun Dodum", sans-serif';
    ctx.fillText("동덕여자고등학교 과학과", 540, 1512);

    const blob = await new Promise((res) => cv.toBlob(res, "image/png"));
    return { blob, dataUrl: cv.toDataURL("image/png") };
  }

  // a card is either a message number (0, 1, …) or "finale"
  const cardSlug = (k) => (k === "finale" ? "finale" : String(k + 1).padStart(2, "0"));
  const slugToKey = (s) => (s === "finale" ? "finale" : parseInt(s, 10) - 1);
  const cardPath = (k) => "cards/" + cardSlug(k) + ".jpg";
  const cardName = (k) => "eungwon-" + cardSlug(k) + ".jpg";
  const drawCard = (k) => (k === "finale" ? makeFinaleBlob() : makeCardBlob(MESSAGES[k]));

  // local preview only: lets the card images in cards/ be (re)generated from the browser
  if (location.hostname === "localhost") window.__makeCard = (k) => drawCard(k);

  const saveBtn = $("saveBtn");
  const UA = navigator.userAgent || "";
  const IN_KAKAO = /KAKAOTALK/i.test(UA);
  // in-app browsers (KakaoTalk, Instagram, Naver, Facebook, Line, Android WebView) can't save
  // images made on the fly, so they get the ready-made card file from cards/NN.png instead
  const IN_APP = IN_KAKAO || /Instagram|NAVER|FBAN|FBAV|Line\/|; wv\)/i.test(UA);
  const IS_PHONE = window.matchMedia("(pointer: coarse)").matches;
  const IS_IOS = /iPhone|iPad|iPod/i.test(UA) || (/Macintosh/i.test(UA) && navigator.maxTouchPoints > 1);
  const IS_ANDROID = /Android/i.test(UA);

  // sheet showing the finished card: long-press the picture, or use the download button
  const sheet = document.createElement("div");
  sheet.className = "save-sheet";
  sheet.hidden = true;
  sheet.innerHTML =
    '<div class="save-sheet-box" role="dialog" aria-modal="true" aria-label="응원 카드 저장">' +
    '<img alt="응원 카드 이미지">' +
    '<p class="save-sheet-tip"></p>' +
    '<div class="save-sheet-actions">' +
    '<button type="button" class="btn ghost" data-act="close">닫기</button>' +
    '<a class="btn primary" data-act="download">이미지 저장</a>' +
    '<button type="button" class="btn primary" data-act="share" hidden>사진 앱에 저장</button>' +
    "</div>" +
    '<button type="button" class="save-sheet-ext" data-act="external">저장이 안 되면 다른 브라우저로 열기</button>' +
    "</div>";
  document.body.appendChild(sheet);
  const sheetImg = sheet.querySelector("img");
  const sheetTip = sheet.querySelector(".save-sheet-tip");
  const sheetDl = sheet.querySelector('[data-act="download"]');
  const sheetExt = sheet.querySelector('[data-act="external"]');
  const sheetShare = sheet.querySelector('[data-act="share"]');
  let sheetFile = null;

  // iPhone: the share menu's "이미지 저장" is the only button-based way into the Photos app.
  // The file is fetched as soon as the sheet opens, so the tap itself can open the menu at once
  // (iOS only allows the share menu straight from a tap).
  async function prepareIosShare(src) {
    sheetFile = null;
    sheetShare.hidden = true;
    try {
      if (!navigator.share || !navigator.canShare || typeof File !== "function") return;
      const r = await fetch(src);
      if (!r.ok) return;
      const file = new File([await r.blob()], "eungwon-" + src.split("/").pop(), { type: "image/jpeg" });
      if (navigator.canShare({ files: [file] }) && sheetImg.getAttribute("src") === src) {
        sheetFile = file;
        sheetShare.hidden = false;
        sheetTip.innerHTML = "<b>사진 앱에 저장</b> → <b>‘이미지 저장’</b>을 누르거나,<br>이미지를 길게 눌러 <b>‘사진 앱에 저장’</b>을 눌러 주세요.";
      }
    } catch (_) { /* long-press still works */ }
  }

  function openSheet(src, name) {
    sheetImg.src = src;
    sheetDl.href = src;
    sheetDl.setAttribute("download", name);
    if (IS_IOS) {
      // on iPhone a download goes to the Files app, so long-press → Photos is the way
      sheetTip.innerHTML = "<b>이미지를 길게 눌러 ‘사진 앱에 저장’</b>을 누르면<br>사진첩에 바로 저장돼요.";
      sheetDl.hidden = true;
      prepareIosShare(src);
    } else {
      sheetTip.innerHTML = "<b>이미지 저장</b> 버튼을 누르거나,<br>이미지를 길게 눌러 ‘이미지 저장’을 눌러 주세요.";
      sheetDl.hidden = false;
    }
    sheetExt.hidden = !IN_APP;
    sheet.hidden = false;
  }
  function directDownload(i) {
    const a = document.createElement("a");
    a.href = cardPath(i);
    a.download = cardName(i);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  sheet.addEventListener("click", (e) => {
    const act = e.target.closest("[data-act]");
    if (e.target === sheet || (act && act.dataset.act === "close")) {
      sheet.hidden = true;
    } else if (act && act.dataset.act === "share") {
      if (sheetFile) navigator.share({ files: [sheetFile] }).catch(() => {});
    } else if (act && act.dataset.act === "external") {
      // reopen this page in the phone's own browser, already showing this card
      const target = location.origin + location.pathname + "?save=" + sheetImg.dataset.slug;
      if (IN_KAKAO) location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(target);
      else sheetTip.innerHTML = "오른쪽 위 메뉴(⋮ 또는 ···)에서 <b>‘다른 브라우저로 열기’</b>를 눌러 주세요.";
    }
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !sheet.hidden) sheet.hidden = true; });

  saveBtn.addEventListener("click", () => {
    if (modal.classList.contains("finale")) saveCard("finale", saveBtn);
    else if (currentIndex >= 0) saveCard(currentIndex, saveBtn);
  });

  // if the ready-made card file can't be loaded, draw the card here instead
  sheetImg.addEventListener("error", async () => {
    if (sheetImg.dataset.fallback === "1" || !sheetImg.dataset.slug) return;
    sheetImg.dataset.fallback = "1";
    try {
      const { dataUrl } = await drawCard(slugToKey(sheetImg.dataset.slug));
      sheetImg.src = dataUrl;
      sheetDl.href = dataUrl;
    } catch (err) {
      console.error(err);
    }
  });

  function showCardSheet(k) {
    sheetImg.dataset.slug = cardSlug(k);
    sheetImg.dataset.fallback = "0";
    openSheet(cardPath(k), cardName(k));
  }

  // shared by the message popup, the final card, and every card in "메시지 모아 보기"
  function saveCard(k, btn) {
    // in-app browsers (KakaoTalk etc.) and iPhone: show the card picture to long-press / save
    if (IN_APP || IS_IOS || (IS_PHONE && !IS_ANDROID)) return showCardSheet(k);

    // Android browsers and computers: save the file straight away (no share sheet)
    directDownload(k);
    const label = btn.querySelector("span");
    const original = label.textContent;
    label.textContent = IS_ANDROID ? "저장했어요 · 갤러리/다운로드 폴더" : "저장했어요";
    setTimeout(() => (label.textContent = original), 2200);
  }

  // opened from KakaoTalk via "다른 브라우저로 열기": go straight to that card
  (function handleSaveLink() {
    const v = new URLSearchParams(location.search).get("save");
    if (!v) return;
    const k = slugToKey(v);
    if (k !== "finale" && !(k >= 0 && k < MESSAGES.length)) return;
    history.replaceState(null, "", location.pathname);
    setTimeout(() => {
      showCardSheet(k);
      if (!IN_APP && !IS_IOS) directDownload(k);
    }, 600);
  })();

  /* ---------------- boll interaction ---------------- */
  function openBoll(el) {
    const i = +el.dataset.i;
    if (el.classList.contains("open")) return showCard(i);
    if (busy) return;
    busy = true;
    const finish = () => {
      el.classList.remove("shaking");
      el.classList.add("open");
      opened.add(i);
      openOrder.set(i, opened.size);
      el.setAttribute("aria-label", opened.size + "번째로 연 응원 메시지 다시 보기");
      updateProgress();
      burst(el);
      setTimeout(() => {
        busy = false;
        showCard(i);
      }, reduceMotion ? 0 : 560);
    };
    if (reduceMotion) return finish();
    el.classList.add("shaking");
    setTimeout(finish, 380);
  }

  bolls.forEach((el) => {
    el.addEventListener("click", () => openBoll(el));
    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openBoll(el);
      }
    });
  });

  /* ---------------- all messages ---------------- */
  function renderAll() {
    const grid = $("grid");
    grid.textContent = "";
    MESSAGES.forEach((m, i) => {
      const card = document.createElement("article");
      card.className = "note";
      card.style.animationDelay = i * 60 + "ms";
      const no = document.createElement("span");
      no.className = "note-no";
      no.textContent = "NO. " + String(i + 1).padStart(2, "0");
      const p = document.createElement("p");
      p.textContent = m;
      const foot = document.createElement("div");
      foot.className = "note-foot";
      const from = document.createElement("span");
      from.className = "note-from";
      from.textContent = "부모님";
      const save = saveBtn.cloneNode(true);
      save.removeAttribute("id");
      save.classList.add("small");
      save.querySelector("span").textContent = "카드로 저장";
      save.setAttribute("aria-label", "응원 메시지 " + (i + 1) + " 카드로 저장");
      save.addEventListener("click", () => saveCard(i, save));
      foot.append(from, save);
      card.append(no, p, foot);
      grid.appendChild(card);
    });
  }
  function showAll() {
    const sec = $("allMessages");
    if (sec.hidden) {
      renderAll();
      sec.hidden = false;
    }
    sec.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }
  $("showAll").addEventListener("click", showAll);

  $("reset").addEventListener("click", () => {
    bolls.forEach((b, i) => {
      b.classList.remove("open", "shaking");
      b.setAttribute("aria-label", (i + 1) + "번째 목화 열기");
    });
    opened.clear();
    openOrder.clear();
    msgOf = shuffled(MESSAGES.length);
    finaleShown = false;
    celebrated = false;
    svg.classList.remove("celebrate");
    L.lights.textContent = "";
    $("allMessages").hidden = true;
    updateProgress();
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  });

  updateProgress();

  /* ---------------- pause the tree when nobody can see it ---------------- */
  // Every moving part of the tree (swaying bolls, glow, fairy lights) makes the phone redraw the
  // whole tree each frame — even while scrolling the message list below. Freeze it when it is
  // off screen or covered by a popup, and let it move again when it comes back into view.
  let plantVisible = true;
  function updatePause() {
    svg.classList.toggle("paused", !plantVisible || !modal.hidden || !sheet.hidden);
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      plantVisible = entries[0].isIntersecting;
      updatePause();
    }).observe(svg);
  }
  const hiddenWatcher = new MutationObserver(updatePause);
  hiddenWatcher.observe(modal, { attributes: true, attributeFilter: ["hidden"] });
  hiddenWatcher.observe(sheet, { attributes: true, attributeFilter: ["hidden"] });

  /* ---------------- drifting cotton ---------------- */
  if (!reduceMotion) {
    const layer = $("drift");
    const count = window.innerWidth < 600 ? 14 : 28;
    for (let i = 0; i < count; i++) {
      const d = document.createElement("div");
      d.className = "drift";
      const big = Math.random() < 0.15; // a few drifting cotton fluffs among the snow
      const size = big ? 9 + Math.random() * 7 : 2.5 + Math.random() * 5;
      Object.assign(d.style, {
        left: Math.random() * 100 + "%",
        width: size + "px",
        height: size + "px",
        opacity: (0.45 + Math.random() * 0.5).toFixed(2),
        animationDuration: (big ? 22 : 11) + Math.random() * 14 + "s",
        animationDelay: -Math.random() * 30 + "s",
      });
      d.style.setProperty("--dx", (Math.random() * 120 - 60).toFixed(0) + "px");
      layer.appendChild(d);
    }
  }
})();
