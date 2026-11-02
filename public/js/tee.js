// Photoreal-ish garment renderer: hanging tees on wooden hangers with cotton grain,
// drape folds and prints that warp with the fabric. Also folded tees and framed prints.
import { TEE_COLORS } from './catalog.js';

let uid = 0;

const SHAPES = {
  // boxy streetwear cut: dropped shoulders, elbow-length wide sleeves, longer body
  oversized: {
    body: 'M196,84 Q250,76 304,84 L430,122 C454,152 474,222 486,300 L410,324 C404,302 398,284 392,270 C398,360 400,480 401,606 C300,616 200,616 99,606 C100,480 102,360 108,270 C102,284 96,302 90,324 L14,300 C26,222 46,152 70,122 Z',
    neckIn: 'M196,84 Q250,76 304,84 Q250,130 196,84Z',
    collar: 'M196,84 Q250,130 304,84',
    collarBack: 'M196,84 Q250,96 304,84',
    print: { x: 146, y: 150, w: 208, h: 250 },
    back: { x: 140, y: 118, w: 220, h: 264 },
    hems: ['M86,312 L20,290', 'M414,312 L480,290', 'M103,595 C200,605 300,605 397,595'],
    folds: {
      dark: ['M108,276 C150,300 196,306 226,292', 'M392,276 C350,300 304,306 274,292', 'M340,190 C352,330 344,470 356,606', 'M170,320 C160,430 168,520 150,606', 'M210,104 C180,126 140,136 100,140', 'M290,104 C320,126 360,136 400,140', 'M70,170 C82,220 88,262 90,300'],
      light: ['M250,140 C246,300 252,460 246,606', 'M140,190 C134,320 140,450 130,590', 'M300,320 C308,420 302,520 310,604', 'M430,170 C420,220 414,262 412,300'],
    },
  },
  men: {
    body: 'M202,86 Q250,78 298,86 L410,138 C432,160 452,210 464,258 L402,286 C394,266 384,250 372,238 C376,330 377,470 373,592 C300,603 200,603 127,592 C123,470 124,330 128,238 C116,250 106,266 98,286 L36,258 C48,210 68,160 90,138 Z',
    neckIn: 'M202,86 Q250,78 298,86 Q250,134 202,86Z',
    collar: 'M202,86 Q250,134 298,86',
    collarBack: 'M202,86 Q250,98 298,86',
    print: { x: 163, y: 152, w: 174, h: 209 },
    back: { x: 170, y: 120, w: 160, h: 192 },
    hems: ['M95,275 L42,251', 'M405,275 L458,251', 'M131,581 C200,591 300,591 369,581'],
    folds: {
      dark: ['M128,242 C160,262 196,266 222,252', 'M372,242 C340,262 304,266 278,252', 'M332,170 C340,320 334,450 344,592', 'M178,300 C170,400 176,500 160,592', 'M214,104 C196,124 172,136 150,146', 'M286,104 C304,124 328,136 350,146'],
      light: ['M250,140 C246,300 252,450 246,592', 'M150,180 C146,300 150,420 142,560', 'M300,300 C306,400 300,500 306,590', 'M70,180 C66,210 60,236 54,252', 'M430,180 C434,210 440,236 446,252'],
    },
  },
  women: {
    body: 'M208,90 Q250,82 292,90 L392,134 C410,152 424,186 432,214 L384,232 C378,220 370,210 362,204 C350,300 344,380 368,592 C300,604 200,604 132,592 C156,380 150,300 138,204 C130,210 122,220 116,232 L68,214 C76,186 90,152 108,134 Z',
    neckIn: 'M208,90 Q250,82 292,90 Q250,136 208,90Z',
    collar: 'M208,90 Q250,136 292,90',
    collarBack: 'M208,90 Q250,102 292,90',
    print: { x: 172, y: 154, w: 156, h: 187 },
    back: { x: 178, y: 124, w: 144, h: 173 },
    hems: ['M112,224 L74,206', 'M388,224 L426,206', 'M136,582 C200,592 300,592 364,582'],
    folds: {
      dark: ['M138,210 C166,228 196,232 220,222', 'M362,210 C334,228 304,232 280,222', 'M330,250 C320,360 338,470 350,592', 'M186,330 C176,420 168,500 156,592', 'M226,98 C206,122 176,132 150,142'],
      light: ['M250,140 C246,300 252,450 246,592', 'M164,220 C170,300 160,420 150,560', 'M300,320 C312,420 306,500 316,590'],
    },
  },
};

export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return '#' + [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function backArt(u, ink, product) {
  const [c1, c2, c3] = product.palette;
  return `<defs><linearGradient id="${u}bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>
<text x="200" y="70" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="46" letter-spacing="6" fill="${ink}">RARE</text>
<text x="200" y="94" text-anchor="middle" font-family="Manrope, sans-serif" font-weight="700" font-size="11" letter-spacing="6" fill="${ink}" opacity=".75">COLLECTIONS · BY SATHISH</text>
<text x="200" y="300" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-style="italic" font-size="62" fill="none" stroke="${ink}" stroke-width="1.4">Fear none.</text>
<text x="200" y="372" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="900" font-size="60" fill="url(#${u}bg)">Burn bright.</text>
<text x="200" y="420" text-anchor="middle" font-family="'Tiro Devanagari Hindi', serif" font-size="24" fill="${c1}">${product.deva}</text>
<text x="200" y="460" text-anchor="middle" font-family="Manrope, sans-serif" font-size="11" letter-spacing="3" fill="${ink}" opacity=".7">NO. ${String(product.no).padStart(2, '0')} · LIMITED TO ${product.edition || 150} PIECES</text>`;
}

function hangerParts(u) {
  return {
    defs: `<linearGradient id="${u}wd" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e2b688"/><stop offset=".45" stop-color="#b9834f"/><stop offset="1" stop-color="#7d5130"/></linearGradient>
<linearGradient id="${u}mt" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6f6a63"/><stop offset=".4" stop-color="#f4f1ea"/><stop offset=".6" stop-color="#b8b2a8"/><stop offset="1" stop-color="#5d5852"/></linearGradient>`,
    hook: `<path d="M250,84 L250,50 C250,32 276,28 276,10 C276,-8 252,-14 242,0" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="7" stroke-linecap="round" transform="translate(4 5)"/>
<path d="M250,84 L250,50 C250,32 276,28 276,10 C276,-8 252,-14 242,0" fill="none" stroke="url(#${u}mt)" stroke-width="5.5" stroke-linecap="round"/>
<rect x="243" y="70" width="14" height="14" rx="3" fill="url(#${u}mt)"/>`,
    wood: `<path d="M66,140 Q160,100 240,78 L260,78 Q340,100 434,140 Q442,150 430,154 Q340,120 260,98 L240,98 Q160,120 70,154 Q58,150 66,140Z" fill="url(#${u}wd)"/>
<path d="M80,141 Q160,108 240,86" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="2"/>`,
  };
}

/**
 * Hanging tee. Options: product, color, fit ('men'|'women'), view ('front'|'back'),
 * hanger (bool), detail ('high'|'low' — low skips the expensive filters for thumbnails).
 */
export function teeSVG({ product, color, fit = 'men', view = 'front', className = '', hanger = true, detail = 'high' }) {
  const u = `g${++uid}_`;
  const s = SHAPES[fit] || SHAPES.men;
  const c = TEE_COLORS[color] || TEE_COLORS[product.colors[0]];
  const ink = c.dark ? '#ffffff' : '#141414';
  const front = view === 'front';
  const pa = front ? s.print : s.back;
  const art = front ? product.art(u + 'a', ink) : product.back ? product.back(u + 'b', ink) : backArt(u + 'b', ink, product);
  const hi = detail === 'high';
  const n = parseInt(c.hex.slice(1), 16);
  const lum = ((n >> 16) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255;
  const darkFold = c.dark ? 0.42 : 0.2;
  const lightFold = c.dark ? 0.1 : 0.35;
  const h = hangerParts(u);
  return `<svg class="tee ${className}" viewBox="0 -20 500 640" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${product.name} tee, ${c.name}, ${fit === 'women' ? "women's" : "men's"} ${view}">
<defs>${h.defs}
<clipPath id="${u}clip"><path d="${s.body}"/></clipPath>
<clipPath id="${u}neck"><path d="${s.neckIn}"/></clipPath>
<linearGradient id="${u}side" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".42"/><stop offset=".18" stop-color="#000" stop-opacity="0"/><stop offset=".45" stop-color="#fff" stop-opacity=".06"/><stop offset=".82" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></linearGradient>
<radialGradient id="${u}top" cx=".45" cy="0" r="1"><stop offset="0" stop-color="#fff" stop-opacity="${c.dark ? 0.12 : 0.3}"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${c.dark ? 0.25 : 0.12}"/></radialGradient>
${hi ? `<filter id="${u}blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="${u}warp" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency="0.008 0.02" numOctaves="2" seed="${product.no || 3}"/><feDisplacementMap in="SourceGraphic" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
${product.distress ? `<filter id="${u}wear" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="3" seed="${(product.no || 1) * 7}"/><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -14 5.05"/></filter>
<mask id="${u}worn" maskUnits="userSpaceOnUse" x="0" y="-20" width="500" height="640"><rect x="0" y="-20" width="500" height="640" fill="#fff"/><rect x="0" y="-20" width="500" height="640" filter="url(#${u}wear)"/></mask>` : ''}
<filter id="${u}grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="table" tableValues="0 ${lum > 0.5 ? 0.14 : 0.2}"/></feComponentTransfer></filter>` : ''}
</defs>
${hanger ? h.hook : ''}
<path d="${s.body}" fill="${c.hex}"/>
<path d="${s.neckIn}" fill="${shade(c.hex, -0.2)}"/>
${hanger ? `<g clip-path="url(#${u}neck)">${h.wood}</g>` : ''}
<g clip-path="url(#${u}clip)">
  <g ${hi ? `filter="url(#${u}warp)"` : ''} ${hi && product.distress ? `mask="url(#${u}worn)"` : ''}><svg x="${pa.x}" y="${pa.y}" width="${pa.w}" height="${pa.h}" viewBox="0 0 400 480" opacity=".95">${art}</svg></g>
  <g fill="none" stroke-linecap="round" ${hi ? `filter="url(#${u}blur)"` : 'opacity=".6"'}>
    ${s.folds.dark.map((d) => `<path d="${d}" stroke="#000" stroke-opacity="${darkFold}" stroke-width="22"/>`).join('')}
    ${s.folds.light.map((d) => `<path d="${d}" stroke="#fff" stroke-opacity="${lightFold}" stroke-width="18"/>`).join('')}
  </g>
  <rect x="0" y="-20" width="500" height="640" fill="url(#${u}side)"/>
  <rect x="0" y="-20" width="500" height="640" fill="url(#${u}top)"/>
  ${hi ? `<rect x="0" y="-20" width="500" height="640" filter="url(#${u}grain)"/>` : ''}
  <g fill="none" stroke="${shade(c.hex, c.dark ? 0.12 : -0.18)}" stroke-width="1.6" stroke-dasharray="5 3" opacity=".8">${s.hems.map((d) => `<path d="${d}"/>`).join('')}</g>
</g>
<path d="${front ? s.collar : s.collarBack}" fill="none" stroke="${shade(c.hex, c.dark ? 0.07 : -0.08)}" stroke-width="10" stroke-linecap="round"/>
<path d="${front ? s.collar : s.collarBack}" fill="none" stroke="${shade(c.hex, c.dark ? -0.15 : -0.22)}" stroke-width="1.4" stroke-dasharray="4 3" transform="translate(0 6)" opacity=".7"/>
<path d="${s.body}" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="1.4"/>
</svg>`;
}

/** Neatly folded tee (for shelves & bundle cards). */
export function foldedSVG({ product, color, className = '' }) {
  const u = `f${++uid}_`;
  const c = TEE_COLORS[color] || TEE_COLORS[product.colors[0]];
  const ink = c.dark ? '#ffffff' : '#141414';
  return `<svg class="folded ${className}" viewBox="0 0 300 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><clipPath id="${u}c"><rect x="10" y="10" width="280" height="132" rx="12"/></clipPath>
<linearGradient id="${u}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="${c.dark ? 0.12 : 0.35}"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>
<linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".3"/><stop offset=".12" stop-color="#000" stop-opacity="0"/><stop offset=".88" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient></defs>
<rect x="10" y="10" width="280" height="132" rx="12" fill="${c.hex}"/>
<g clip-path="url(#${u}c)">
<svg x="95" y="22" width="110" height="132" viewBox="0 0 400 480" opacity=".95">${product.art(u + 'a', ink)}</svg>
<path d="M112,10 Q150,40 188,10" fill="${shade(c.hex, -0.2)}"/>
<path d="M112,10 Q150,40 188,10" fill="none" stroke="${shade(c.hex, c.dark ? 0.08 : -0.1)}" stroke-width="7"/>
<path d="M40,10 L40,142 M260,10 L260,142" stroke="#000" stroke-opacity=".18" stroke-width="2"/>
<rect x="10" y="10" width="280" height="132" fill="url(#${u}s)"/><rect x="10" y="10" width="280" height="132" fill="url(#${u}h)"/>
</g></svg>`;
}

/** Design printed on archival paper (gallery wall frames). */
export function printArtSVG(product, paper = '#141414') {
  const u = `p${++uid}_`;
  const ink = paper === '#141414' ? '#ffffff' : '#141414';
  return `<svg viewBox="0 0 400 480" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="400" height="480" fill="${paper}"/>${product.art(u, ink)}</svg>`;
}
