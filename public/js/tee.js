// Renders a realistic-ish T-shirt mockup (men's regular / women's fitted) with a design printed on it.
import { TEE_COLORS } from './catalog.js';

let uid = 0;

const SHAPES = {
  men: {
    body: 'M180,40 Q250,95 320,40 L400,68 Q445,100 478,160 L418,200 L392,172 L396,528 Q250,540 104,528 L108,172 L82,200 L22,160 Q55,100 100,68 Z',
    neckFront: 'M180,40 Q250,95 320,40 Q250,58 180,40Z',
    neckBack: 'M180,40 Q250,62 320,40 Q250,50 180,40Z',
    collarFront: 'M180,40 Q250,95 320,40',
    collarBack: 'M180,40 Q250,62 320,40',
    print: { x: 143, y: 108, w: 214, h: 257 },
    back: { x: 160, y: 86, w: 180, h: 300 },
    folds: ['M150,470 Q190,450 210,525', 'M360,430 Q330,470 350,520', 'M108,200 Q130,215 128,250', 'M392,200 Q370,215 372,250'],
  },
  women: {
    body: 'M190,48 Q250,100 310,48 L385,72 Q422,102 446,150 L400,180 L378,162 Q352,300 394,528 Q250,544 106,528 Q148,300 122,162 L100,180 L54,150 Q78,102 115,72 Z',
    neckFront: 'M190,48 Q250,100 310,48 Q250,64 190,48Z',
    neckBack: 'M190,48 Q250,70 310,48 Q250,58 190,48Z',
    collarFront: 'M190,48 Q250,100 310,48',
    collarBack: 'M190,48 Q250,70 310,48',
    print: { x: 163, y: 120, w: 174, h: 209 },
    back: { x: 170, y: 92, w: 160, h: 270 },
    folds: ['M170,470 Q200,450 215,525', 'M352,300 Q340,330 352,360', 'M148,300 Q160,330 148,360'],
  },
};

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return '#' + [ch(n >> 16), ch((n >> 8) & 255), ch(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function backArt(u, ink, product) {
  const [c1, c2, c3] = product.palette;
  return `<defs><linearGradient id="${u}bg" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${c1}"/><stop offset=".5" stop-color="${c2}"/><stop offset="1" stop-color="${c3}"/></linearGradient></defs>
<path d="M90,8 C76,30 104,40 90,62 C114,50 112,26 96,20 C100,30 92,32 90,8Z" transform="translate(110 0)" fill="url(#${u}bg)"/>
<text x="200" y="98" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="30" letter-spacing="10" fill="${ink}">FIER</text>
<text x="200" y="120" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-size="11" letter-spacing="4" fill="${ink}" opacity=".7">FEAR NONE · BURN BRIGHT</text>
<text x="200" y="330" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="74" letter-spacing="2" fill="none" stroke="${ink}" stroke-width="1.6">FEAR</text>
<text x="200" y="404" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="74" letter-spacing="2" fill="url(#${u}bg)">NONE.</text>
<text x="200" y="440" text-anchor="middle" font-family="'Tiro Devanagari Hindi', serif" font-size="24" fill="${c1}">${product.deva}</text>
<text x="200" y="470" text-anchor="middle" font-family="'Space Grotesk', sans-serif" font-size="11" letter-spacing="3" fill="${ink}" opacity=".7">DROP 01 · RAMAYANA PART 1</text>`;
}

export function teeSVG({ product, color, fit = 'men', view = 'front', className = '' }) {
  const u = `t${++uid}_`;
  const s = SHAPES[fit] || SHAPES.men;
  const c = TEE_COLORS[color] || TEE_COLORS[product.colors[0]];
  const ink = c.dark ? '#ffffff' : '#141414';
  const front = view === 'front';
  const pa = front ? s.print : s.back;
  const art = front ? product.art(u + 'a', ink) : backArt(u + 'b', ink, product);
  const lineCol = c.dark ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.14)';
  return `<svg class="tee ${className}" viewBox="0 0 500 560" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${product.name} tee, ${c.name}, ${fit === 'women' ? "women's" : "men's"} ${view}">
<defs>
<clipPath id="${u}clip"><path d="${s.body}"/></clipPath>
<linearGradient id="${u}h" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".38"/><stop offset=".2" stop-color="#000" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".07"/><stop offset=".8" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>
<linearGradient id="${u}v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".1"/><stop offset=".25" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>
</defs>
<ellipse cx="250" cy="545" rx="170" ry="12" fill="#000" opacity=".28"/>
<path d="${s.body}" fill="${c.hex}"/>
<path d="${front ? s.neckFront : s.neckBack}" fill="${shade(c.hex, -0.12)}"/>
<g clip-path="url(#${u}clip)">
<svg x="${pa.x}" y="${pa.y}" width="${pa.w}" height="${pa.h}" viewBox="0 0 400 480" opacity=".97">${art}</svg>
<g fill="none" stroke="${lineCol}" stroke-width="3" stroke-linecap="round">${s.folds.map((d) => `<path d="${d}"/>`).join('')}</g>
<rect width="500" height="560" fill="url(#${u}h)"/><rect width="500" height="560" fill="url(#${u}v)"/>
</g>
<path d="${front ? s.collarFront : s.collarBack}" fill="none" stroke="${shade(c.hex, c.dark ? 0.08 : -0.1)}" stroke-width="9" stroke-linecap="round"/>
<path d="${s.body}" fill="none" stroke="${c.dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.12)'}" stroke-width="2"/>
</svg>`;
}
