// Tiled(.tmx/.tsx) -> 게임용 JSON 변환기. 외부 타일셋을 전부 풀어서 한 파일로 만든다.
// 충돌 도형(폴리곤)은 사각형(바운딩 박스)으로 단순화한다.
import fs from 'node:fs';
import path from 'node:path';
import { XMLParser } from 'fast-xml-parser';

const ROOT = path.resolve(import.meta.dirname, '..');
const PACK = path.join(ROOT, 'assets/fantasy-tileset/The Fan-tasy Tileset (Free)');
const TMX = path.join(PACK, 'Tiled/Tilemaps/Beginning Fields.tmx');
const OUT = path.join(ROOT, 'src/data/hail-map.json');

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: true });
const arr = (v) => (v === undefined ? [] : Array.isArray(v) ? v : [v]);
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

function bbox(obj) {
  const ox = +obj.x || 0, oy = +obj.y || 0;
  let pts;
  if (obj.polygon) pts = String(obj.polygon.points).split(' ').map((s) => s.split(',').map(Number));
  else if (obj.width) pts = [[0, 0], [obj.width, 0], [obj.width, obj.height], [0, obj.height]];
  else return null;
  const xs = pts.map((p) => ox + p[0]), ys = pts.map((p) => oy + p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}

function readTileset(tmxEntry) {
  const tsxPath = path.resolve(path.dirname(TMX), tmxEntry.source);
  const ts = parser.parse(fs.readFileSync(tsxPath, 'utf8')).tileset;
  const dir = path.dirname(tsxPath);
  const out = {
    firstgid: tmxEntry.firstgid, name: ts.name,
    tilewidth: ts.tilewidth, tileheight: ts.tileheight, tilecount: ts.tilecount, columns: ts.columns,
    tiles: {},
  };
  if (ts.image) out.image = rel(path.resolve(dir, ts.image.source));
  for (const t of arr(ts.tile)) {
    const info = {};
    if (t.image) { info.image = rel(path.resolve(dir, t.image.source)); info.w = t.image.width; info.h = t.image.height; }
    const boxes = arr(t.objectgroup?.object).map(bbox).filter(Boolean);
    if (boxes.length) info.colliders = boxes;
    if (t.animation) info.animation = arr(t.animation.frame).map((f) => ({ tileid: f.tileid, duration: f.duration }));
    if (Object.keys(info).length) out.tiles[t.id] = info;
  }
  return out;
}

const map = parser.parse(fs.readFileSync(TMX, 'utf8')).map;
const result = {
  width: map.width, height: map.height, tilewidth: map.tilewidth, tileheight: map.tileheight,
  tilesets: arr(map.tileset).map(readTileset),
  layers: [],
};

const tileLayer = (l, opacity = 1) => ({
  type: 'tile', name: l.name, opacity: (l.opacity ?? 1) * opacity,
  data: String(l.data['#text']).split(',').map((s) => Number(s.trim())),
});
const objLayer = (g, opacity = 1) => ({
  type: 'objects', name: g.name, opacity: (g.opacity ?? 1) * opacity,
  objects: arr(g.object).map((o) => ({ id: o.id, gid: o.gid, x: o.x, y: o.y, width: o.width, height: o.height })),
});

// Tiled 파일의 레이어 순서(아래→위)를 그대로 유지한다. 숨김 레이어는 건너뛴다.
const nodes = [];
const walk = (obj, opacity) => {
  for (const key of Object.keys(obj)) {
    if (!['layer', 'objectgroup', 'group'].includes(key)) continue;
    for (const n of arr(obj[key])) nodes.push({ kind: key, n, opacity });
  }
};
// fast-xml-parser는 종류별로 묶기 때문에 id 순서로 다시 정렬한다. (id는 Tiled 생성 순서이지 그리기 순서가 아님)
// 그리기 순서는 파일에 나온 순서이므로 원문에서 직접 위치를 구한다.
const raw = fs.readFileSync(TMX, 'utf8');
const order = [...raw.matchAll(/<(layer|objectgroup|group) id="(\d+)"/g)].map((m) => `${m[1]}:${m[2]}`);
const byKey = new Map();
const collect = (obj, opacity) => {
  for (const kind of ['layer', 'objectgroup', 'group']) {
    for (const n of arr(obj[kind])) {
      byKey.set(`${kind}:${n.id}`, { kind, n, opacity });
      if (kind === 'group') collect(n, opacity * (n.opacity ?? 1));
    }
  }
};
collect(map, 1);
for (const key of order) {
  const { kind, n, opacity } = byKey.get(key);
  if (n.visible === 0) continue;
  if (kind === 'layer') result.layers.push(tileLayer(n, opacity));
  else if (kind === 'objectgroup') result.layers.push(objLayer(n, opacity));
}

fs.writeFileSync(OUT, JSON.stringify(result));
console.log(`변환 완료: ${rel(OUT)} (타일셋 ${result.tilesets.length}개, 레이어 ${result.layers.length}개)`);
console.log(result.layers.map((l) => `  - ${l.type} ${l.name} (${l.data?.length ?? l.objects.length})`).join('\n'));
