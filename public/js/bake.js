// "Bake" heavy SVG garments into bitmaps once, so the 3D boutique only moves cheap textures.
// Live SVGs with turbulence/displacement/blur filters must be re-rasterised whenever the camera
// moves or zooms; on real GPUs that shows up as blank or half-drawn tiles. A canvas is drawn once.
//
// SVG rendered as an image can't see the page's web fonts, so the fonts the artwork uses are
// fetched once and embedded as data: URLs.

const FONT_CSS =
  'https://fonts.googleapis.com/css2?family=Anton&family=Fraunces:ital,wght@0,300;0,700;0,900;1,300&family=Manrope:wght@700&family=Space+Grotesk:wght@400;700&family=Tiro+Devanagari+Hindi&display=swap';
const SUBSETS = new Set(['latin', 'devanagari']);

const toDataURL = (blob) =>
  new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });

let facesP;
function fontFaces() {
  facesP ??= (async () => {
    const css = await fetch(FONT_CSS).then((r) => r.text());
    const jobs = [];
    const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const [, subset, body] = m;
      if (!SUBSETS.has(subset)) continue;
      const fam = /font-family:\s*'([^']+)'/.exec(body)?.[1];
      const url = /url\((https:[^)]+)\)/.exec(body)?.[1];
      if (!fam || !url) continue;
      jobs.push(
        fetch(url)
          .then((r) => r.blob())
          .then(toDataURL)
          .then((data) => ({ fam, css: `@font-face{${body.split(url).join(data)}}` })),
      );
    }
    return Promise.all(jobs);
  })().catch(() => []);
  return facesP;
}

async function bakeSVG(svg, w, h, scale) {
  const faces = (await fontFaces()).filter((f) => svg.includes(f.fam)).map((f) => f.css).join('');
  const W = Math.round(w * scale), H = Math.round(h * scale);
  const src = svg.replace('<svg ', `<svg width="${W}" height="${H}" `).replace(/(<svg[^>]*>)/, `$1<style>${faces}</style>`);
  const url = URL.createObjectURL(new Blob([src], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    c.getContext('2d').drawImage(img, 0, 0, W, H);
    return c;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// one bake at a time, with a frame between each, so the page stays responsive
let chain = Promise.resolve();
export function queueBake(svg, w, h, scale) {
  const job = chain.then(() => new Promise((r) => setTimeout(r, 16))).then(() => bakeSVG(svg, w, h, scale));
  chain = job.catch(() => {});
  return job;
}
