// FIER — Drop 01: RAMAYANA · PART 1
// Every design is original vector artwork generated in code (viewBox 0 0 400 480),
// so it renders crisp on screen and exports straight to a DTF print file.

export const SIZES = ['S', 'M', 'L', 'XL'];
export const FITS = {
  men: { label: 'Men', sub: 'Regular fit' },
  women: { label: 'Women', sub: 'Fitted cut' },
};
export const SIZE_CHART = {
  men: { S: [38, 27], M: [40, 28], L: [42, 29], XL: [44, 30] },
  women: { S: [34, 24.5], M: [36, 25.5], L: [38, 26.5], XL: [40, 27.5] },
};
export const TEE_COLORS = {
  black: { name: 'Jet Black', hex: '#151515', dark: true },
  white: { name: 'Bone White', hex: '#f1ede4', dark: false },
  maroon: { name: 'Sindoor Maroon', hex: '#6a1022', dark: true },
  navy: { name: 'Midnight Navy', hex: '#16224a', dark: true },
};

const DISPLAY = "Anton, 'Bebas Neue', Impact, sans-serif";
const DEVA = "'Tiro Devanagari Hindi', 'Noto Serif Devanagari', serif";
const BODY = "'Space Grotesk', system-ui, sans-serif";

const f = (n) => Math.round(n * 10) / 10;
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const text = (x, y, size, fill, str, extra = '') =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${DISPLAY}" font-size="${size}" fill="${fill}" ${extra}>${str}</text>`;
const deva = (y, fill, str, size = 30) =>
  `<text x="200" y="${y}" text-anchor="middle" font-family="${DEVA}" font-size="${size}" fill="${fill}">${str}</text>`;
const foot = (ink, n) =>
  `<text x="200" y="470" text-anchor="middle" font-family="${BODY}" font-size="10.5" letter-spacing="3" fill="${ink}" opacity=".65">FIER × RAMAYANA PT.1 · ${String(n).padStart(2, '0')}</text>`;

// Flame with rounded base. (x, base) = bottom centre, w = half width, h = height, l = tip lean
function flamePath(x, b, w, h, l = 0) {
  return `M${f(x - w * 0.6)},${f(b)} C${f(x - w * 1.05)},${f(b - h * 0.35)} ${f(x - w * 0.25 + l * 0.4)},${f(b - h * 0.6)} ${f(x + l)},${f(b - h)} C${f(x + w * 0.25 + l * 0.4)},${f(b - h * 0.62)} ${f(x + w * 1.05)},${f(b - h * 0.35)} ${f(x + w * 0.6)},${f(b)} Q${f(x)},${f(b + w * 0.45)} ${f(x - w * 0.6)},${f(b)}Z`;
}
function fire(x, b, w, h, l = 0, outer = '#ff2a3d') {
  return (
    `<path d="${flamePath(x, b, w, h, l)}" fill="${outer}"/>` +
    `<path d="${flamePath(x, b, w * 0.68, h * 0.72, l * 0.7)}" fill="#ff8a00"/>` +
    `<path d="${flamePath(x, b, w * 0.38, h * 0.44, l * 0.4)}" fill="#ffe94d"/>`
  );
}

/* ---------- 01 KODANDA ---------- */
function kodanda(u, ink) {
  const rays = Array.from({ length: 24 }, (_, i) => {
    const a = (i * 15 * Math.PI) / 180;
    const r1 = 134, r2 = i % 2 ? 150 : 168, w = 0.05;
    return `<path d="M${f(200 + r1 * Math.cos(a - w))},${f(230 + r1 * Math.sin(a - w))} L${f(200 + r2 * Math.cos(a))},${f(230 + r2 * Math.sin(a))} L${f(200 + r1 * Math.cos(a + w))},${f(230 + r1 * Math.sin(a + w))}Z" fill="url(#${u}g)"/>`;
  }).join('');
  return `<defs>
<radialGradient id="${u}s"><stop offset="0" stop-color="#fff1a8"/><stop offset=".45" stop-color="#ff9a00"/><stop offset="1" stop-color="#e0115f"/></radialGradient>
<linearGradient id="${u}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff2b0"/><stop offset=".5" stop-color="#ffb300"/><stop offset="1" stop-color="#c45a00"/></linearGradient></defs>
${text(200, 64, 60, ink, 'KODANDA', 'letter-spacing="6"')}
${rays}
<circle cx="200" cy="230" r="118" fill="url(#${u}s)"/>
<circle cx="200" cy="230" r="126" fill="none" stroke="#ffb300" stroke-width="2" stroke-dasharray="4 6"/>
<polyline points="262,104 150,230 262,356" fill="none" stroke="#2a0800" stroke-width="4.5"/>
<polyline points="262,104 150,230 262,356" fill="none" stroke="#fff4d6" stroke-width="1.6"/>
<path d="M262,104 Q352,230 262,356" fill="none" stroke="#5a1a00" stroke-width="15" stroke-linecap="round"/>
<path d="M262,104 Q352,230 262,356" fill="none" stroke="url(#${u}g)" stroke-width="10" stroke-linecap="round"/>
<rect x="299" y="210" width="16" height="40" rx="5" fill="#9b0f2e" stroke="#ffd23f" stroke-width="2"/>
<circle cx="262" cy="104" r="7" fill="#ffd23f"/><circle cx="262" cy="356" r="7" fill="#ffd23f"/>
<line x1="150" y1="230" x2="360" y2="230" stroke="#2a0800" stroke-width="7" stroke-linecap="round"/>
<line x1="150" y1="230" x2="360" y2="230" stroke="#ffd23f" stroke-width="3.5"/>
<path d="M150,230 L172,230 L162,214 L140,214Z M150,230 L172,230 L162,246 L140,246Z" fill="#ff2e88" stroke="#2a0800" stroke-width="2"/>
<g transform="rotate(-90 352 230)">${fire(352, 230, 15, 62, 4)}${fire(346, 230, 10, 40, -6)}</g>
<path d="M384,230 L356,214 L362,230 L356,246Z" fill="#fff1a8" stroke="#2a0800" stroke-width="2"/>
${deva(408, '#ffb300', 'कोदण्ड')}
${text(200, 446, 25, ink, 'ONE ARROW · ONE PROMISE', 'letter-spacing="3"')}
${foot(ink, 1)}`;
}

/* ---------- 02 LANKA DAHAN ---------- */
function lanka(u, ink) {
  const r = rng(7);
  const B = [
    [16, 42, 112, 'dome'], [56, 34, 156, 'spire'], [88, 46, 98, 'flat'], [130, 50, 196, 'dome'],
    [178, 32, 136, 'spire'], [208, 58, 218, 'dome'], [264, 38, 146, 'spire'], [300, 48, 176, 'dome'], [346, 38, 104, 'flat'],
  ];
  let bld = '', win = '', flames = '';
  for (const [x, w, h, t] of B) {
    const top = 360 - h;
    bld += `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="url(#${u}gold)"/>`;
    if (t === 'dome') bld += `<path d="M${x},${top} A${w / 2},${f(w * 0.48)} 0 0 1 ${x + w},${top}Z" fill="url(#${u}gold)"/><line x1="${x + w / 2}" y1="${f(top - w * 0.48)}" x2="${x + w / 2}" y2="${f(top - w * 0.48 - 16)}" stroke="#ffd23f" stroke-width="3"/>`;
    if (t === 'spire') bld += `<path d="M${x},${top} L${x + w / 2},${f(top - w * 1.1)} L${x + w},${top}Z" fill="url(#${u}gold)"/>`;
    for (let yy = top + 12; yy < 345; yy += 24)
      for (let xx = x + 7; xx < x + w - 8; xx += 13)
        win += `<rect x="${xx}" y="${yy}" width="7" height="12" rx="3.5" fill="${r() > 0.55 ? '#ffe94d' : '#3a0d00'}"/>`;
    if (r() > 0.25) flames += fire(x + w / 2 + (r() - 0.5) * 10, top - (t === 'flat' ? 0 : 10), w * 0.42, 40 + r() * 55, (r() - 0.5) * 18);
  }
  return `<defs>
<linearGradient id="${u}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe94d"/><stop offset=".5" stop-color="#ff7a00"/><stop offset="1" stop-color="#ff1e56"/></linearGradient>
<linearGradient id="${u}gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd84a"/><stop offset="1" stop-color="#a35200"/></linearGradient>
<radialGradient id="${u}glow" cx=".5" cy=".75"><stop offset="0" stop-color="#ff5a00" stop-opacity=".85"/><stop offset="1" stop-color="#ff1e56" stop-opacity="0"/></radialGradient></defs>
${text(200, 62, 54, `url(#${u}f)`, 'LANKA DAHAN', 'letter-spacing="3"')}
<ellipse cx="200" cy="300" rx="200" ry="170" fill="url(#${u}glow)"/>
<path d="M22,148 C110,86 150,212 232,150 S338,112 372,170" fill="none" stroke="url(#${u}f)" stroke-width="9" stroke-linecap="round"/>
<g transform="rotate(35 372 170)">${fire(372, 172, 16, 58, 6)}</g>
${flames}${bld}${win}
<rect x="6" y="358" width="388" height="8" rx="4" fill="#ffd23f"/>
${deva(408, '#ffe94d', 'लंका दहन')}
${text(200, 446, 27, ink, 'SET IT ABLAZE', 'letter-spacing="5"')}
${foot(ink, 2)}`;
}

/* ---------- 03 DASHAMUKHA ---------- */
function head(cx, cy, s) {
  const cw = 34 * s, cTop = cy - 34 * s;
  let crown = `M${f(cx - cw)},${f(cTop + 10 * s)}`;
  for (let i = 0; i <= 8; i++) {
    const x = cx - cw + (i * cw) / 4;
    const y = i % 2 ? cTop + 10 * s : cTop - (i === 4 ? 30 : 18) * s;
    crown += ` L${f(x)},${f(y)}`;
  }
  crown += ` L${f(cx + cw)},${f(cTop + 14 * s)} L${f(cx - cw)},${f(cTop + 14 * s)}Z`;
  const ey = cy - 4 * s;
  const eye = (d) =>
    `<path d="M${f(cx + d * 6 * s)},${f(ey + 2 * s)} Q${f(cx + d * 14 * s)},${f(ey - 7 * s)} ${f(cx + d * 24 * s)},${f(ey - 8 * s)} Q${f(cx + d * 17 * s)},${f(ey + 4 * s)} ${f(cx + d * 6 * s)},${f(ey + 2 * s)}Z" fill="#ffe94d"/>`;
  return `<g>
<path d="${crown}" fill="#ffc21a" stroke="#7a3b00" stroke-width="${f(1.5 * s)}"/>
<ellipse cx="${cx}" cy="${f(cy + 4 * s)}" rx="${f(29 * s)}" ry="${f(36 * s)}" fill="#2b0010" stroke="#ffc21a" stroke-width="${f(2.5 * s)}"/>
${eye(-1)}${eye(1)}
<line x1="${cx}" y1="${f(cTop + 18 * s)}" x2="${cx}" y2="${f(ey - 6 * s)}" stroke="#ff1e56" stroke-width="${f(3 * s)}" stroke-linecap="round"/>
<path d="M${f(cx - 20 * s)},${f(cy + 22 * s)} Q${f(cx)},${f(cy + 10 * s)} ${f(cx + 20 * s)},${f(cy + 22 * s)}" fill="none" stroke="#ffc21a" stroke-width="${f(3.5 * s)}" stroke-linecap="round"/>
<circle cx="${f(cx - 31 * s)}" cy="${f(cy + 14 * s)}" r="${f(4 * s)}" fill="#ffc21a"/><circle cx="${f(cx + 31 * s)}" cy="${f(cy + 14 * s)}" r="${f(4 * s)}" fill="#ffc21a"/></g>`;
}
function dashamukha(u, ink) {
  let heads = '';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i * Math.PI) / 8;
    heads += head(200 + 142 * Math.cos(a), 262 + 128 * Math.sin(a), 0.62);
  }
  return `<defs>
<radialGradient id="${u}h"><stop offset="0" stop-color="#ff3d6e"/><stop offset=".6" stop-color="#b0002f"/><stop offset="1" stop-color="#4a0014" stop-opacity="0"/></radialGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff1e56"/><stop offset=".5" stop-color="#ffc21a"/><stop offset="1" stop-color="#ff1e56"/></linearGradient></defs>
${text(200, 62, 54, `url(#${u}t)`, 'DASHAMUKHA', 'letter-spacing="3"')}
<circle cx="200" cy="262" r="168" fill="url(#${u}h)"/>
<circle cx="200" cy="262" r="96" fill="none" stroke="#ffc21a" stroke-width="2" stroke-dasharray="2 7"/>
${heads}
${head(200, 272, 1.55)}
${deva(408, '#ff3d6e', 'दशमुख')}
${text(200, 446, 27, ink, 'TEN HEADS. ZERO FEAR.', 'letter-spacing="3"')}
${foot(ink, 3)}`;
}

/* ---------- 04 RAMA SETU ---------- */
function setu(u, ink) {
  const r = rng(11);
  let stars = '';
  for (let i = 0; i < 26; i++) stars += `<circle cx="${f(20 + r() * 360)}" cy="${f(90 + r() * 130)}" r="${f(0.8 + r() * 1.8)}" fill="#fff6c8" opacity="${f(0.5 + r() * 0.5)}"/>`;
  let stones = '';
  const n = 11;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const x = 32 + t * 336, y = 300 - 78 * Math.sin(Math.PI * t);
    const ang = (Math.atan(-78 * Math.PI * Math.cos(Math.PI * t) / 336) * 180) / Math.PI;
    stones += `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(ang)})"><path d="M-19,-9 Q-21,-15 -10,-15 L12,-14 Q21,-13 20,-3 L19,9 Q17,15 6,14 L-12,14 Q-21,13 -20,3Z" fill="url(#${u}st)" stroke="#0b1430" stroke-width="2"/><text y="5" text-anchor="middle" font-family="${DEVA}" font-size="13" fill="#ffb300">राम</text></g>`;
  }
  const wave = (y, amp, col, op) => {
    let d = `M0,${y}`;
    for (let x = 0; x < 400; x += 40) d += ` q10,${-amp} 20,0 t20,0`;
    return `<path d="${d} L400,380 L0,380Z" fill="${col}" opacity="${op}"/>`;
  };
  return `<defs>
<linearGradient id="${u}st" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9d8ea"/><stop offset="1" stop-color="#5b7190"/></linearGradient>
<radialGradient id="${u}m"><stop offset="0" stop-color="#fffbe6"/><stop offset=".6" stop-color="#ffe08a"/><stop offset="1" stop-color="#ffb300" stop-opacity="0"/></radialGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#00e5c7"/><stop offset="1" stop-color="#3d8bff"/></linearGradient></defs>
${text(200, 64, 60, `url(#${u}t)`, 'RAMA SETU', 'letter-spacing="5"')}
${stars}
<circle cx="306" cy="128" r="54" fill="url(#${u}m)"/><circle cx="306" cy="128" r="26" fill="#fff6d0" stroke="#ffb300" stroke-width="2"/>
${wave(310, 10, '#7b2ff7', 0.85)}${wave(326, 9, '#3d5afe', 0.9)}${wave(342, 8, '#00a3ff', 0.9)}${wave(358, 7, '#00e5c7', 0.95)}
${stones}
${deva(408, '#00e5c7', 'राम सेतु')}
${text(200, 446, 26, ink, 'BUILD THE IMPOSSIBLE', 'letter-spacing="3"')}
${foot(ink, 4)}`;
}

/* ---------- 05 JATAYU ---------- */
function jatayu(u, ink) {
  const feather = (L, W) => `M0,0 C${f(L * 0.3)},${-W} ${f(L * 0.8)},${f(-W * 0.6)} ${L},0 C${f(L * 0.8)},${f(W * 0.6)} ${f(L * 0.3)},${W} 0,0Z`;
  let wings = '';
  for (const side of [-1, 1]) {
    let g = '';
    for (let i = 0; i < 9; i++) {
      const ang = -38 + i * 8.5, L = 178 - i * 9;
      g += `<path transform="rotate(${f(ang)})" d="${feather(L, 13)}" fill="url(#${u}w)" stroke="#2a0a20" stroke-width="1.5"/><line transform="rotate(${f(ang)})" x1="6" y1="0" x2="${L - 10}" y2="0" stroke="#2a0a20" stroke-width="1" opacity=".5"/>`;
    }
    for (let i = 0; i < 6; i++) {
      const ang = -26 + i * 9, L = 92 - i * 4;
      g += `<path transform="rotate(${f(ang)})" d="${feather(L, 11)}" fill="url(#${u}s)" stroke="#2a0a20" stroke-width="1.5"/>`;
    }
    wings += `<g transform="translate(${200 + side * 14} 238) scale(${side} 1)">${g}</g>`;
  }
  return `<defs>
<linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd23f"/><stop offset=".35" stop-color="#ff7a00"/><stop offset=".7" stop-color="#ff2e88"/><stop offset="1" stop-color="#7b2ff7"/></linearGradient>
<linearGradient id="${u}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff2b0"/><stop offset="1" stop-color="#ffb300"/></linearGradient>
<radialGradient id="${u}g"><stop offset="0" stop-color="#ff7a00" stop-opacity=".55"/><stop offset="1" stop-color="#7b2ff7" stop-opacity="0"/></radialGradient></defs>
${text(200, 66, 66, ink, 'JATAYU', 'letter-spacing="10"')}
<circle cx="200" cy="245" r="150" fill="url(#${u}g)"/>
${wings}
<path d="M186,300 L200,368 L214,300Z M176,296 L186,356 L200,300Z M224,296 L214,356 L200,300Z" fill="url(#${u}w)" stroke="#2a0a20" stroke-width="1.5"/>
<ellipse cx="200" cy="252" rx="22" ry="56" fill="#3b1200" stroke="#ffd23f" stroke-width="3"/>
<circle cx="200" cy="190" r="19" fill="#3b1200" stroke="#ffd23f" stroke-width="3"/>
<path d="M192,196 L200,222 L208,196Z" fill="#ffd23f"/>
<circle cx="193" cy="186" r="3.5" fill="#ffe94d"/><circle cx="207" cy="186" r="3.5" fill="#ffe94d"/>
${deva(408, '#ff2e88', 'जटायु')}
${text(200, 446, 23, ink, 'FIGHT TILL THE LAST FEATHER', 'letter-spacing="2"')}
${foot(ink, 5)}`;
}

/* ---------- 06 SANJEEVANI ---------- */
function sanjeevani(u, ink) {
  const r = rng(23);
  let herbs = '';
  for (let i = 0; i < 18; i++) {
    const x = 110 + r() * 180, y = 210 + r() * 80;
    herbs += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(5 + r() * 5)}" fill="#b6ff3b" opacity=".35"/><circle cx="${f(x)}" cy="${f(y)}" r="${f(1.8 + r() * 1.5)}" fill="#f4ffb0"/>`;
  }
  let rays = '';
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (i * Math.PI) / 13;
    rays += `<line x1="${f(200 + 112 * Math.cos(a))}" y1="${f(226 + 112 * Math.sin(a))}" x2="${f(200 + 160 * Math.cos(a))}" y2="${f(226 + 160 * Math.sin(a))}" stroke="#b6ff3b" stroke-width="3" stroke-linecap="round" opacity=".8"/>`;
  }
  return `<defs>
<radialGradient id="${u}s"><stop offset="0" stop-color="#fff1a8"/><stop offset=".5" stop-color="#ff9a00"/><stop offset="1" stop-color="#ff2e88"/></radialGradient>
<linearGradient id="${u}m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5dffb0"/><stop offset="1" stop-color="#008a63"/></linearGradient>
<linearGradient id="${u}m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#00e5c7"/><stop offset="1" stop-color="#05514a"/></linearGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#b6ff3b"/><stop offset="1" stop-color="#00e5c7"/></linearGradient></defs>
${text(200, 62, 54, `url(#${u}t)`, 'SANJEEVANI', 'letter-spacing="4"')}
${rays}
<circle cx="200" cy="226" r="100" fill="url(#${u}s)"/>
<g stroke="${ink}" stroke-width="4" stroke-linecap="round" opacity=".7"><line x1="18" y1="232" x2="80" y2="232"/><line x1="34" y1="262" x2="92" y2="262"/><line x1="10" y1="292" x2="76" y2="292"/></g>
<path d="M82,318 L150,190 L182,236 L222,150 L266,226 L290,200 L330,318Z" fill="url(#${u}m2)" stroke="#022a26" stroke-width="3" stroke-linejoin="round"/>
<path d="M110,318 L170,224 L204,270 L240,196 L300,318Z" fill="url(#${u}m1)" stroke="#022a26" stroke-width="3" stroke-linejoin="round"/>
<path d="M210,160 L222,150 L234,170Z M140,208 L150,190 L160,206Z" fill="#ffffff"/>
${herbs}
<g fill="#ffffff" opacity=".92"><ellipse cx="110" cy="324" rx="44" ry="16"/><ellipse cx="160" cy="332" rx="52" ry="18"/><ellipse cx="236" cy="330" rx="60" ry="19"/><ellipse cx="300" cy="324" rx="44" ry="15"/></g>
${deva(408, '#b6ff3b', 'संजीवनी')}
${text(200, 446, 26, ink, 'CARRY THE MOUNTAIN', 'letter-spacing="4"')}
${foot(ink, 6)}`;
}

/* ---------- 07 LAKSHMAN REKHA ---------- */
function rekha(u, ink) {
  let flames = '';
  for (let x = 40; x <= 360; x += 20) flames += `<path d="${flamePath(x, 300, 6, 14 + ((x / 20) % 3) * 6, ((x / 20) % 2 ? 2 : -2))}" fill="#ffb300"/>`;
  return `<defs>
<linearGradient id="${u}g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff2e88"/><stop offset=".5" stop-color="#ff7a00"/><stop offset="1" stop-color="#ffd23f"/></linearGradient>
<filter id="${u}b" x="-10%" y="-200%" width="120%" height="500%"><feGaussianBlur stdDeviation="6"/></filter></defs>
${text(200, 150, 80, 'none', 'LAKSHMAN', `stroke="${ink}" stroke-width="2.2" letter-spacing="4"`)}
${text(200, 268, 122, `url(#${u}g)`, 'REKHA', 'letter-spacing="8"')}
<rect x="24" y="296" width="352" height="10" rx="5" fill="#ff7a00" filter="url(#${u}b)"/>
${flames}
<rect x="24" y="298" width="352" height="6" rx="3" fill="url(#${u}g)"/>
${deva(356, '#ff7a00', 'लक्ष्मण रेखा', 34)}
${text(200, 406, 38, ink, 'DRAW YOUR LINE.', 'letter-spacing="3"')}
<text x="200" y="436" text-anchor="middle" font-family="${BODY}" font-size="15" font-style="italic" fill="${ink}" opacity=".8">know your limits · never cross your values</text>
${foot(ink, 7)}`;
}

/* ---------- 08 SURYAVANSHI ---------- */
function surya(u, ink) {
  let rays = '';
  for (let i = 0; i < 32; i++) {
    const a = (i * Math.PI * 2) / 32, w = 0.07, r1 = 92, r2 = i % 2 ? 132 : 162;
    rays += `<path d="M${f(200 + r1 * Math.cos(a - w))},${f(236 + r1 * Math.sin(a - w))} L${f(200 + r2 * Math.cos(a))},${f(236 + r2 * Math.sin(a))} L${f(200 + r1 * Math.cos(a + w))},${f(236 + r1 * Math.sin(a + w))}Z" fill="${i % 2 ? '#ff2e88' : `url(#${u}r)`}"/>`;
  }
  let petals = '';
  for (let i = 0; i < 12; i++) petals += `<path transform="rotate(${i * 30} 200 236)" d="M200,236 C186,212 190,184 200,168 C210,184 214,212 200,236Z" fill="${i % 2 ? '#7b2ff7' : '#ff2e88'}" stroke="#ffd23f" stroke-width="1.5"/>`;
  return `<defs>
<linearGradient id="${u}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe94d"/><stop offset="1" stop-color="#ff7a00"/></linearGradient>
<radialGradient id="${u}c"><stop offset="0" stop-color="#fff6c8"/><stop offset=".7" stop-color="#ffb300"/><stop offset="1" stop-color="#ff5a00"/></radialGradient>
<linearGradient id="${u}t" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffd23f"/><stop offset=".5" stop-color="#ff7a00"/><stop offset="1" stop-color="#ff2e88"/></linearGradient></defs>
${text(200, 60, 48, `url(#${u}t)`, 'SURYAVANSHI', 'letter-spacing="4"')}
${rays}
<circle cx="200" cy="236" r="94" fill="url(#${u}c)" stroke="#ffd23f" stroke-width="3"/>
${petals}
<circle cx="200" cy="236" r="20" fill="#ffd23f" stroke="#ff2e88" stroke-width="3"/>
<circle cx="200" cy="236" r="104" fill="none" stroke="${ink}" stroke-width="1.5" stroke-dasharray="3 5" opacity=".6"/>
${deva(410, '#ffb300', 'सूर्यवंशी')}
${text(200, 446, 27, ink, 'BORN OF THE SUN', 'letter-spacing="5"')}
${foot(ink, 8)}`;
}

export const PRODUCTS = [
  {
    id: 'kodanda', name: 'Kodanda', deva: 'कोदण्ड', tagline: 'One Arrow · One Promise', tag: 'Bestseller',
    palette: ['#ff7a00', '#e0115f', '#ffd23f'], colors: ['black', 'maroon', 'navy'], art: kodanda,
    story: 'The bow that never missed — because the archer never doubted. A flaming arrow drawn across a blazing sun for everyone who keeps their word.',
  },
  {
    id: 'lanka-dahan', name: 'Lanka Dahan', deva: 'लंका दहन', tagline: 'Set It Ablaze', tag: 'Viral',
    palette: ['#ff1e56', '#ff7a00', '#ffe94d'], colors: ['black', 'maroon'], art: lanka,
    story: 'They set his tail on fire to humiliate him. He used it to light up an entire golden city. Turn every insult into ignition.',
  },
  {
    id: 'dashamukha', name: 'Dashamukha', deva: 'दशमुख', tagline: 'Ten Heads. Zero Fear.', tag: 'Villain Arc',
    palette: ['#b0002f', '#ffc21a', '#ff3d6e'], colors: ['black', 'navy'], art: dashamukha,
    story: 'Ten heads, ten crowns, one unstoppable ego. For the ones who love a villain arc — and know exactly how the story ends.',
  },
  {
    id: 'rama-setu', name: 'Rama Setu', deva: 'राम सेतु', tagline: 'Build The Impossible', tag: 'New',
    palette: ['#00e5c7', '#3d5afe', '#7b2ff7'], colors: ['navy', 'black'], art: setu,
    story: 'An army of believers threw stones into the ocean and they floated. A bridge built on one name, under a moonlit sky.',
  },
  {
    id: 'jatayu', name: 'Jatayu', deva: 'जटायु', tagline: 'Fight Till The Last Feather', tag: 'Limited',
    palette: ['#ff2e88', '#7b2ff7', '#ffd23f'], colors: ['black', 'white'], art: jatayu,
    story: 'Old, outmatched, and still the first to fight. Rainbow-fire wings for the protectors who never ask if the odds are fair.',
  },
  {
    id: 'sanjeevani', name: 'Sanjeevani', deva: 'संजीवनी', tagline: 'Carry The Mountain', tag: 'New',
    palette: ['#00e5c7', '#b6ff3b', '#ff9a00'], colors: ['black', 'navy'], art: sanjeevani,
    story: 'Couldn’t find the one herb? Bring the whole mountain. A flying peak of glowing life for the over-deliverers.',
  },
  {
    id: 'lakshman-rekha', name: 'Lakshman Rekha', deva: 'लक्ष्मण रेखा', tagline: 'Draw Your Line', tag: 'Minimal',
    palette: ['#ff2e88', '#ff7a00', '#ffd23f'], colors: ['white', 'black', 'maroon'], art: rekha,
    story: 'Bold type, a line of fire, and a reminder: know your limits, guard your values. The cleanest flex in the drop.',
  },
  {
    id: 'suryavanshi', name: 'Suryavanshi', deva: 'सूर्यवंशी', tagline: 'Born Of The Sun', tag: 'Hero',
    palette: ['#ffb300', '#ff2e88', '#7b2ff7'], colors: ['black', 'white', 'maroon'], art: surya,
    story: 'Descendants of the Sun don’t dim for anyone. A 32-ray sunburst and a lotus mandala in full festival colour.',
  },
];

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id);

/** Standalone, print-ready SVG for DTF production (transparent background, 12" × 14.4"). */
export function printFileSVG(productId, colorKey) {
  const p = getProduct(productId);
  if (!p) return null;
  const c = TEE_COLORS[colorKey] || TEE_COLORS.black;
  const ink = c.dark ? '#ffffff' : '#141414';
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- FIER DTF print file · ${p.name} · for ${c.name} tees · print at 100% (12in x 14.4in). Convert text to outlines before RIP. -->
<svg xmlns="http://www.w3.org/2000/svg" width="12in" height="14.4in" viewBox="0 0 400 480">
<style>@import url('https://fonts.googleapis.com/css2?family=Anton&amp;family=Space+Grotesk:wght@400;700&amp;family=Tiro+Devanagari+Hindi&amp;display=swap');</style>
${p.art('p', ink)}
</svg>`;
}
