import palettes from '../data/palettes.json';

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const rgbKey = (r, g, b) => (r << 16) | (g << 8) | b;

function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  let h = 0, s = 0;
  if (d) {
    s = d / (1 - Math.abs(2 * l - 1));
    h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h, s, l];
}

function hslToRgb([h, s, l]) {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h * 6) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h * 6) % 6];
  return [r, g, b].map((v) => Math.round((v + m) * 255));
}

// 기준 색 목록(hexes)을 target 색 계열로 옮긴다. 배열이면 1:1 치환, 문자열이면 명암을 유지한 채 색조만 바꾼다.
function mapGroup(hexes, target) {
  if (Array.isArray(target)) return hexes.map((h, i) => [hexToRgb(h), hexToRgb(target[i] ?? h)]);
  const [th, ts, tl] = rgbToHsl(hexToRgb(target));
  const ls = hexes.map((h) => rgbToHsl(hexToRgb(h))[2]);
  const mean = ls.reduce((a, b) => a + b, 0) / ls.length;
  return hexes.map((h, i) => [hexToRgb(h), hslToRgb([th, ts, Math.min(0.96, Math.max(0.05, tl + (ls[i] - mean)))])]);
}

function buildTables(charId) {
  const spec = palettes.characters[charId] ?? {};
  const main = new Map(), shoes = new Map();
  for (const [group, hexes] of Object.entries(palettes.groups)) {
    if (spec[group]) for (const [from, to] of mapGroup(hexes, spec[group])) main.set(rgbKey(...from), to);
  }
  const { from, minY } = palettes.shoes;
  const shoesTarget = spec.shoes ?? spec[from];
  if (shoesTarget) for (const [f, t] of mapGroup(palettes.groups[from], shoesTarget)) shoes.set(rgbKey(...f), t);
  return { main, shoes, shoesFrom: new Set(palettes.groups[from].map((h) => rgbKey(...hexToRgb(h)))), minY };
}

/** 캐릭터 시트(이미지)를 인물 팔레트로 바꿔 canvas로 돌려준다. 프레임 높이는 48px. */
export function recolorSheet(img, charId, frameH = 48) {
  const canvas = document.createElement('canvas');
  canvas.width = img.width; canvas.height = img.height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const { main, shoes, shoesFrom, minY } = buildTables(charId);
  if (!main.size && !shoes.size) return canvas;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const key = rgbKey(px[i], px[i + 1], px[i + 2]);
    const y = Math.floor(i / 4 / canvas.width) % frameH;
    const to = shoesFrom.has(key) && y >= minY ? shoes.get(key) ?? main.get(key) : main.get(key);
    if (to) { px[i] = to[0]; px[i + 1] = to[1]; px[i + 2] = to[2]; }
  }
  ctx.putImageData(data, 0, 0);
  return canvas;
}
