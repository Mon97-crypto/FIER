// Rare Collections by Sathish — Drop 01: RAMAYANA · PART 1
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
  forest: { name: 'Deep Forest', hex: '#1f3a2e', dark: true },
  rust: { name: 'Burnt Rust', hex: '#8a3a1e', dark: true },
  sand: { name: 'Desert Sand', hex: '#e3d5bc', dark: false },
  sky: { name: 'Monsoon Sky', hex: '#b8cce2', dark: false },
};
export const BRAND = { name: 'Rare Collections', by: 'by Sathish', ethos: 'Fear None. Burn Bright.', edition: 150 };

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
  `<text x="200" y="470" text-anchor="middle" font-family="${BODY}" font-size="10.5" letter-spacing="3" fill="${ink}" opacity=".65">RARE COLLECTIONS · RAMAYANA PT.1 · ${String(n).padStart(2, '0')}</text>`;

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

/* ================= THE LANKESHWAR CAPSULE =================
   Original artwork inspired by Raavana of the Ramayana epic (public-domain mythology).
   Gold-foil look: metallic gradients with a hard specular band. */
const ROYAL = "Fraunces, 'Playfair Display', Georgia, serif";
const footL = (ink, n) =>
  `<text x="200" y="470" text-anchor="middle" font-family="${BODY}" font-size="10.5" letter-spacing="3" fill="${ink}" opacity=".65">RARE COLLECTIONS · LANKESHWAR CAPSULE · ${String(n).padStart(2, '0')}</text>`;
const goldDefs = (u) => `
<linearGradient id="${u}au" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff4c2"/><stop offset=".28" stop-color="#e8c25a"/><stop offset=".5" stop-color="#a87a24"/><stop offset=".6" stop-color="#f6dc8a"/><stop offset="1" stop-color="#8a5e18"/></linearGradient>
<linearGradient id="${u}ad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#d9ac45"/><stop offset=".55" stop-color="#8f6519"/><stop offset=".7" stop-color="#f3d27c"/><stop offset="1" stop-color="#9c6d1f"/></linearGradient>`;

/* ---------- L1 LANKESHWAR (royal crest) ---------- */
function lankeshwar(u, ink) {
  let flames = '';
  for (let k = 0; k < 10; k++) flames += `<g transform="rotate(${k * 36} 200 230)">${fire(200, 98, 9, 30, k % 2 ? 3 : -3, '#c4102c')}</g>`;
  const towers = [[158, 14, 26, 'd'], [175, 12, 40, 's'], [192, 16, 52, 'd'], [211, 12, 40, 's'], [226, 14, 26, 'd']]
    .map(([x, w, h, t]) => {
      const top = 304 - h;
      return `<rect x="${x}" y="${top}" width="${w}" height="${h}" fill="url(#${u}au)"/>` +
        (t === 'd' ? `<path d="M${x},${top} A${w / 2},${w / 2} 0 0 1 ${x + w},${top}Z" fill="url(#${u}au)"/>` : `<path d="M${x},${top} L${x + w / 2},${top - 16} L${x + w},${top}Z" fill="url(#${u}au)"/>`);
    }).join('');
  return `<defs>${goldDefs(u)}
<radialGradient id="${u}v" cx=".5" cy=".4"><stop offset="0" stop-color="#7a0f1d"/><stop offset="1" stop-color="#1a0306"/></radialGradient></defs>
<text x="200" y="58" text-anchor="middle" font-family="${ROYAL}" font-weight="900" font-size="46" letter-spacing="5" fill="url(#${u}au)">LANKESHWAR</text>
${flames}
<circle cx="200" cy="230" r="128" fill="url(#${u}v)" stroke="url(#${u}ad)" stroke-width="5"/>
<circle cx="200" cy="230" r="116" fill="none" stroke="#e8c25a" stroke-width="1.4" stroke-dasharray="2 5"/>
<path d="M118,330 Q200,292 282,330 L282,346 L118,346Z" fill="#3a0710"/>
${towers}
<rect x="150" y="302" width="100" height="6" fill="url(#${u}au)"/>
<path d="M140,250 L144,198 L164,222 L178,178 L192,210 L200,140 L208,210 L222,178 L236,222 L256,198 L260,250 Z" fill="url(#${u}ad)" stroke="#5a3a08" stroke-width="1.5" stroke-linejoin="round"/>
<rect x="138" y="248" width="124" height="22" rx="3" fill="url(#${u}au)" stroke="#5a3a08" stroke-width="1.5"/>
${[150, 170, 190, 210, 230, 250].map((x, k) => `<circle cx="${x}" cy="259" r="4" fill="${k % 2 ? '#1f7a4a' : '#c4102c'}" stroke="#fff4c2" stroke-width=".8"/>`).join('')}
${[[144, 198], [178, 178], [200, 140], [222, 178], [256, 198]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.5" fill="url(#${u}au)"/><circle cx="${x}" cy="${y}" r="2.6" fill="#c4102c"/>`).join('')}
<ellipse cx="200" cy="228" rx="9" ry="12" fill="#c4102c" stroke="#fff4c2" stroke-width="1.2"/><ellipse cx="197" cy="223" rx="2.5" ry="4" fill="#fff" opacity=".7"/>
<path d="M88,354 L312,354 L300,370 L312,386 L88,386 L100,370Z" fill="#7a0f1d" stroke="url(#${u}ad)" stroke-width="2"/>
<text x="200" y="376" text-anchor="middle" font-family="${ROYAL}" font-weight="700" font-size="14" letter-spacing="3" fill="url(#${u}au)">KING OF GOLDEN LANKA</text>
<text x="200" y="430" text-anchor="middle" font-family="${DEVA}" font-size="34" fill="url(#${u}au)">लंकेश्वर</text>
${footL(ink, 1)}`;
}

/* ---------- L2 TEN CROWNS (minimal line art) ---------- */
function crownLine(cx, cy, s, stroke) {
  const w = 22 * s, h = 18 * s;
  return `<path d="M${cx - w},${cy} L${cx - w},${cy - h * 0.6} L${cx - w / 2},${cy - h * 0.25} L${cx},${cy - h} L${cx + w / 2},${cy - h * 0.25} L${cx + w},${cy - h * 0.6} L${cx + w},${cy} Z" fill="${stroke}" fill-opacity=".18" stroke="${stroke}" stroke-width="2.6" stroke-linejoin="round"/>
<line x1="${cx - w}" y1="${cy + 4 * s}" x2="${cx + w}" y2="${cy + 4 * s}" stroke="${stroke}" stroke-width="2"/>
<circle cx="${cx}" cy="${cy - h}" r="${2.4 * s}" fill="${stroke}"/><circle cx="${cx - w}" cy="${cy - h * 0.6}" r="${1.8 * s}" fill="${stroke}"/><circle cx="${cx + w}" cy="${cy - h * 0.6}" r="${1.8 * s}" fill="${stroke}"/>`;
}
function tenCrowns(u, ink) {
  let crowns = '';
  for (let k = 0; k < 10; k++) {
    const a = ((196 + k * (148 / 9)) * Math.PI) / 180;
    crowns += crownLine(f(200 + 160 * Math.cos(a)), f(300 + 160 * Math.sin(a)), k === 4 || k === 5 ? 1.45 : 1.2, `url(#${u}au)`);
  }
  return `<defs>${goldDefs(u)}</defs>
<text x="200" y="56" text-anchor="middle" font-family="${DEVA}" font-size="30" fill="url(#${u}au)">दशानन</text>
<text x="200" y="80" text-anchor="middle" font-family="${BODY}" font-size="11" letter-spacing="7" fill="${ink}" opacity=".75">DASHANAN</text>
${crowns}
<circle cx="200" cy="300" r="112" fill="none" stroke="${ink}" stroke-width="1" stroke-dasharray="1 6" opacity=".55"/>
<g transform="translate(-40 -20) scale(1.2)" fill="none" stroke="url(#${u}ad)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
  <path d="M172,334 L172,250 Q172,222 200,214 Q228,222 228,250 L228,334"/>
  <path d="M184,320 L184,256 Q184,236 200,230 Q216,236 216,256 L216,320"/>
  <path d="M156,316 L244,316 M160,316 L160,346 M240,316 L240,346 M150,304 L250,304"/>
  <path d="M200,214 C192,200 194,188 200,180 C206,188 208,200 200,214Z M200,214 C186,206 180,196 182,186 C192,192 198,202 200,214Z M200,214 C214,206 220,196 218,186 C208,192 202,202 200,214Z"/>
</g>
<text x="200" y="398" text-anchor="middle" font-family="${ROYAL}" font-weight="900" font-size="40" letter-spacing="1" fill="${ink}">TEN CROWNS.</text>
<text x="200" y="438" text-anchor="middle" font-family="${ROYAL}" font-style="italic" font-weight="300" font-size="34" fill="url(#${u}au)">One throne.</text>
${footL(ink, 2)}`;
}

/* ---------- L3 THE SCHOLAR KING (rudra veena) ---------- */
function scholarKing(u, ink) {
  const A = [78, 352], B = [322, 108];
  const P = (t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  const n = [0.707, 0.707];
  const gourd = (t) => {
    const [x, y] = P(t);
    const gx = x + n[0] * 46, gy = y + n[1] * 46;
    return `<line x1="${f(x)}" y1="${f(y)}" x2="${f(gx)}" y2="${f(gy)}" stroke="#6b3410" stroke-width="7"/>
<circle cx="${f(gx)}" cy="${f(gy)}" r="40" fill="url(#${u}g)" stroke="url(#${u}ad)" stroke-width="3"/>
<ellipse cx="${f(gx - 12)}" cy="${f(gy - 14)}" rx="10" ry="6" fill="#fff" opacity=".35" transform="rotate(-35 ${f(gx - 12)} ${f(gy - 14)})"/>`;
  };
  let frets = '';
  for (let t = 0.3; t <= 0.66; t += 0.03) {
    const [x, y] = P(t);
    frets += `<line x1="${f(x - n[0] * 11)}" y1="${f(y - n[1] * 11)}" x2="${f(x + n[0] * 11)}" y2="${f(y + n[1] * 11)}" stroke="url(#${u}au)" stroke-width="2.2"/>`;
  }
  let strings = '';
  for (const o of [-6, -2, 2, 6]) strings += `<line x1="${f(A[0] + n[0] * o)}" y1="${f(A[1] + n[1] * o)}" x2="${f(B[0] + n[0] * o)}" y2="${f(B[1] + n[1] * o)}" stroke="#fff6dc" stroke-width=".8" opacity=".9"/>`;
  let notes = '';
  [[0.42, -1], [0.52, 1], [0.6, -1]].forEach(([t, l]) => {
    const [x, y] = P(t);
    notes += fire(f(x - n[0] * 16), f(y - n[1] * 16), 8, 34, l * 4, '#c4102c');
  });
  return `<defs>${goldDefs(u)}
<radialGradient id="${u}halo" cx=".5" cy=".5"><stop offset="0" stop-color="#3b1a6b" stop-opacity=".95"/><stop offset=".7" stop-color="#1c0b33" stop-opacity=".6"/><stop offset="1" stop-color="#1c0b33" stop-opacity="0"/></radialGradient>
<radialGradient id="${u}g" cx=".35" cy=".3"><stop offset="0" stop-color="#ffd38a"/><stop offset=".6" stop-color="#c7782b"/><stop offset="1" stop-color="#6b3410"/></radialGradient>
<linearGradient id="${u}wood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#c47a35"/><stop offset=".5" stop-color="#7a3b12"/><stop offset="1" stop-color="#b56a2a"/></linearGradient></defs>
<text x="200" y="52" text-anchor="middle" font-family="${ROYAL}" font-weight="700" font-size="21" letter-spacing="4" fill="${ink}">SCHOLAR · WARRIOR · KING</text>
<circle cx="200" cy="232" r="150" fill="url(#${u}halo)"/>
<path d="M304,80 A52,52 0 1 0 352,150 A40,40 0 1 1 304,80Z" fill="url(#${u}au)" opacity=".95"/>
${gourd(0.2)}${gourd(0.72)}
<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="#3a1a06" stroke-width="22" stroke-linecap="round"/>
<line x1="${A[0]}" y1="${A[1]}" x2="${B[0]}" y2="${B[1]}" stroke="url(#${u}wood)" stroke-width="17" stroke-linecap="round"/>
${frets}${strings}
<path d="M${B[0]},${B[1]} c10,-10 26,-8 26,4 c0,12 -16,14 -18,4 c-2,-6 6,-8 8,-4" fill="none" stroke="url(#${u}au)" stroke-width="4" stroke-linecap="round"/>
<circle cx="${A[0]}" cy="${A[1]}" r="9" fill="url(#${u}au)"/>
${notes}
<text x="200" y="420" text-anchor="middle" font-family="${DEVA}" font-size="42" fill="url(#${u}au)">रावण</text>
<text x="200" y="446" text-anchor="middle" font-family="${BODY}" font-size="12" letter-spacing="6" fill="${ink}" opacity=".85">MASTER OF THE VEENA</text>
${footL(ink, 3)}`;
}

/* ---------- L4 PUSHPAKA (the flying chariot) ---------- */
function pushpaka(u, ink) {
  const feather = (L, W) => `M0,0 C${f(L * 0.3)},${-W} ${f(L * 0.8)},${f(-W * 0.6)} ${L},0 C${f(L * 0.8)},${f(W * 0.6)} ${f(L * 0.3)},${W} 0,0Z`;
  let wings = '';
  for (const side of [-1, 1]) {
    let g = '';
    for (let i = 0; i < 6; i++) g += `<path transform="rotate(${-62 + i * 11})" d="${feather(120 - i * 10, 11)}" fill="url(#${u}w)" stroke="#5a3a08" stroke-width="1"/>`;
    wings += `<g transform="translate(${200 + side * 78} 288) scale(${side} 1)">${g}</g>`;
  }
  let petals = '';
  for (let i = -3; i <= 3; i++) petals += `<path d="M${200 + i * 20},312 C${190 + i * 20},300 ${192 + i * 20},288 ${200 + i * 20},282 C${208 + i * 20},288 ${210 + i * 20},300 ${200 + i * 20},312Z" fill="${i % 2 ? '#e86a8a' : '#f6b8c8'}" stroke="#fff4c2" stroke-width="1"/>`;
  return `<defs>${goldDefs(u)}
<radialGradient id="${u}sun" cx=".5" cy=".45"><stop offset="0" stop-color="#ffcf6b"/><stop offset=".55" stop-color="#ff7a2e"/><stop offset="1" stop-color="#7a0f1d"/></radialGradient>
<linearGradient id="${u}w" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fffaf0"/><stop offset=".6" stop-color="#f3e2b8"/><stop offset="1" stop-color="#d9ac45"/></linearGradient></defs>
<text x="200" y="62" text-anchor="middle" font-family="${ROYAL}" font-weight="900" font-size="52" letter-spacing="4" fill="url(#${u}au)">PUSHPAKA</text>
<circle cx="200" cy="222" r="122" fill="url(#${u}sun)"/>
<g stroke="${ink}" stroke-width="3" stroke-linecap="round" opacity=".6"><line x1="20" y1="250" x2="80" y2="250"/><line x1="34" y1="276" x2="96" y2="276"/><line x1="16" y1="302" x2="70" y2="302"/></g>
${wings}
<rect x="120" y="270" width="160" height="14" rx="3" fill="url(#${u}au)" stroke="#5a3a08" stroke-width="1"/>
${[136, 170, 230, 264].map((x) => `<rect x="${x - 3}" y="222" width="6" height="48" fill="url(#${u}au)"/>`).join('')}
<rect x="128" y="208" width="144" height="14" rx="2" fill="url(#${u}ad)"/>
<rect x="142" y="194" width="116" height="14" rx="2" fill="url(#${u}au)"/>
<rect x="156" y="180" width="88" height="14" rx="2" fill="url(#${u}ad)"/>
<path d="M168,180 Q200,118 232,180Z" fill="url(#${u}au)" stroke="#5a3a08" stroke-width="1"/>
<circle cx="200" cy="120" r="7" fill="url(#${u}au)"/><line x1="200" y1="113" x2="200" y2="92" stroke="url(#${u}au)" stroke-width="2.5"/>
<path d="M200,92 L222,99 L200,106Z" fill="#c4102c"/>
${petals}
<g fill="#f6efe2" opacity=".95"><ellipse cx="110" cy="338" rx="46" ry="15"/><ellipse cx="166" cy="346" rx="54" ry="17"/><ellipse cx="240" cy="344" rx="60" ry="18"/><ellipse cx="304" cy="336" rx="44" ry="14"/></g>
<text x="200" y="408" text-anchor="middle" font-family="${DEVA}" font-size="30" fill="url(#${u}au)">पुष्पक विमान</text>
<text x="200" y="442" text-anchor="middle" font-family="${BODY}" font-size="13" font-weight="700" letter-spacing="7" fill="${ink}">RULE THE SKIES</text>
${footL(ink, 4)}`;
}

export const PRODUCTS = [
  {
    id: 'kodanda', name: 'Kodanda', deva: 'कोदण्ड', tagline: 'One Arrow · One Promise', tag: 'Bestseller',
    palette: ['#ff7a00', '#e0115f', '#ffd23f'], colors: ['maroon', 'black', 'navy', 'sand'], art: kodanda,
    story: 'The bow that never missed — because the archer never doubted. A flaming arrow drawn across a blazing sun for everyone who keeps their word.',
  },
  {
    id: 'lanka-dahan', name: 'Lanka Dahan', deva: 'लंका दहन', tagline: 'Set It Ablaze', tag: 'Viral',
    palette: ['#ff1e56', '#ff7a00', '#ffe94d'], colors: ['black', 'rust', 'maroon'], art: lanka,
    story: 'They set his tail on fire to humiliate him. He used it to light up an entire golden city. Turn every insult into ignition.',
  },
  {
    id: 'dashamukha', name: 'Dashamukha', deva: 'दशमुख', tagline: 'Ten Heads. Zero Fear.', tag: 'Villain Arc',
    palette: ['#b0002f', '#ffc21a', '#ff3d6e'], colors: ['forest', 'black', 'navy'], art: dashamukha,
    story: 'Ten heads, ten crowns, one unstoppable ego. For the ones who love a villain arc — and know exactly how the story ends.',
  },
  {
    id: 'rama-setu', name: 'Rama Setu', deva: 'राम सेतु', tagline: 'Build The Impossible', tag: 'New',
    palette: ['#00e5c7', '#3d5afe', '#7b2ff7'], colors: ['navy', 'black', 'forest'], art: setu,
    story: 'An army of believers threw stones into the ocean and they floated. A bridge built on one name, under a moonlit sky.',
  },
  {
    id: 'jatayu', name: 'Jatayu', deva: 'जटायु', tagline: 'Fight Till The Last Feather', tag: 'Limited',
    palette: ['#ff2e88', '#7b2ff7', '#ffd23f'], colors: ['white', 'black', 'sky'], art: jatayu,
    story: 'Old, outmatched, and still the first to fight. Rainbow-fire wings for the protectors who never ask if the odds are fair.',
  },
  {
    id: 'sanjeevani', name: 'Sanjeevani', deva: 'संजीवनी', tagline: 'Carry The Mountain', tag: 'New',
    palette: ['#00e5c7', '#b6ff3b', '#ff9a00'], colors: ['rust', 'black', 'navy'], art: sanjeevani,
    story: 'Couldn’t find the one herb? Bring the whole mountain. A flying peak of glowing life for the over-deliverers.',
  },
  {
    id: 'lakshman-rekha', name: 'Lakshman Rekha', deva: 'लक्ष्मण रेखा', tagline: 'Draw Your Line', tag: 'Minimal',
    palette: ['#ff2e88', '#ff7a00', '#ffd23f'], colors: ['sand', 'white', 'black', 'maroon'], art: rekha,
    story: 'Bold type, a line of fire, and a reminder: know your limits, guard your values. The cleanest flex in the drop.',
  },
  {
    id: 'suryavanshi', name: 'Suryavanshi', deva: 'सूर्यवंशी', tagline: 'Born Of The Sun', tag: 'Hero',
    palette: ['#ffb300', '#ff2e88', '#7b2ff7'], colors: ['sky', 'black', 'white', 'maroon'], art: surya,
    story: 'Descendants of the Sun don’t dim for anyone. A 32-ray sunburst and a lotus mandala in full festival colour.',
  },
  // ---- The Lankeshwar Capsule (Raavana of the epic) ----
  {
    id: 'lankeshwar', collection: 'lankeshwar', name: 'Lankeshwar', deva: 'लंकेश्वर', tagline: 'King Of Golden Lanka', tag: 'Capsule',
    palette: ['#e8c25a', '#c4102c', '#f6dc8a'], colors: ['black', 'maroon', 'navy'], art: lankeshwar, edition: 99, distress: true,
    story: 'The crest of a king whose city was built of gold. Ten flames ring a jewelled crown above the towers of Lanka, in a worn gold-foil finish.',
  },
  {
    id: 'ten-crowns', collection: 'lankeshwar', name: 'Ten Crowns', deva: 'दशानन', tagline: 'Ten Crowns. One Throne.', tag: 'Capsule',
    palette: ['#e8c25a', '#f6dc8a', '#c4102c'], colors: ['black', 'forest', 'maroon'], art: tenCrowns, edition: 99, distress: true,
    story: 'Ten crowns orbit a single throne in fine gold line-art. For the ones with many sides who still sit tall. Quiet, minimal, unmistakably royal.',
  },
  {
    id: 'scholar-king', collection: 'lankeshwar', name: 'The Scholar King', deva: 'रावण', tagline: 'Scholar · Warrior · King', tag: 'Capsule',
    palette: ['#e8c25a', '#3b1a6b', '#c47a35'], colors: ['navy', 'black', 'sand'], art: scholarKing, edition: 99, distress: true,
    story: 'Before the war, Raavana was a scholar, a poet and a master of the veena. A rudra veena burning with music under a golden moon: the side of the legend people forget.',
  },
  {
    id: 'pushpaka', collection: 'lankeshwar', name: 'Pushpaka', deva: 'पुष्पक विमान', tagline: 'Rule The Skies', tag: 'Capsule',
    palette: ['#e8c25a', '#ff7a2e', '#7a0f1d'], colors: ['black', 'navy', 'sand'], art: pushpaka, edition: 99, distress: true,
    story: 'The legendary flying chariot of Lanka: a golden vimana on swan wings, sailing above the clouds into a burning sunset. For anyone who refuses to stay grounded.',
  },
];

export const COLLECTIONS = [
  { id: 'epic', name: 'Drop 01 · The Epic', short: 'The Epic', wall: 'Drop 01 · Ramayana: Part 1', edition: 150 },
  { id: 'lankeshwar', name: 'The Lankeshwar Capsule', short: 'Lankeshwar', wall: 'The Lankeshwar Capsule · Ten crowns. One throne.', edition: 99, isNew: true },
];
PRODUCTS.forEach((p) => {
  p.collection ??= 'epic';
  p.edition ??= 150;
});
for (const c of COLLECTIONS) PRODUCTS.filter((p) => p.collection === c.id).forEach((p, i) => (p.no = i + 1));
export const productsIn = (collectionId) => PRODUCTS.filter((p) => p.collection === collectionId);

export const getProduct = (id) => PRODUCTS.find((p) => p.id === id);

/** Standalone, print-ready SVG for DTF production (transparent background, 12" × 14.4"). */
export function printFileSVG(productId, colorKey) {
  const p = getProduct(productId);
  if (!p) return null;
  const c = TEE_COLORS[colorKey] || TEE_COLORS.black;
  const ink = c.dark ? '#ffffff' : '#141414';
  return `<?xml version="1.0" encoding="UTF-8"?>
<!-- Rare Collections by Sathish · DTF print file · ${p.name} · for ${c.name} tees · print at 100% (12in x 14.4in). Convert text to outlines before RIP. -->
<svg xmlns="http://www.w3.org/2000/svg" width="12in" height="14.4in" viewBox="0 0 400 480">
<style>@import url('https://fonts.googleapis.com/css2?family=Anton&amp;family=Fraunces:ital,wght@0,300;0,700;0,900;1,300&amp;family=Space+Grotesk:wght@400;700&amp;family=Tiro+Devanagari+Hindi&amp;display=swap');</style>
${p.art('p', ink)}
</svg>`;
}
