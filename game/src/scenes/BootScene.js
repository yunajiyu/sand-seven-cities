import Phaser from 'phaser';
import hailMap from '../data/hail-map.json';
import palettes from '../data/palettes.json';
import { recolorSheet } from '../systems/recolor.js';

// 에셋 폴더 안의 PNG를 전부 URL로 가져온다. (묶기 빌드에서는 data URI로 파일 안에 들어간다)
const IMAGE_URLS = import.meta.glob('/assets/fantasy-tileset/**/Art/**/*.png', { query: '?url', import: 'default', eager: true });
const CHAR_DIR = '/assets/fantasy-tileset/The Fan-tasy Tileset (Free)/Art/Characters/Main Character/';
export const FRAME_W = 40, FRAME_H = 48;
export const DIRS = ['left', 'right', 'up', 'down']; // 시트의 행 순서

const loadImage = (path) => new Promise((resolve, reject) => {
  const url = IMAGE_URLS[path.startsWith('/') ? path : `/${path}`];
  if (!url) return reject(new Error(`이미지를 찾을 수 없음: ${path}`));
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error(`이미지를 불러오지 못함: ${path}`));
  img.src = url;
});

export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, '불러오는 중...', { fontFamily: 'Galmuri11', fontSize: '22px', color: '#e8d9a8' }).setOrigin(0.5);
    this.load_().then(() => this.scene.start('Town')).catch((e) => {
      console.error(e);
      this.add.text(width / 2, height / 2 + 40, String(e.message), { fontFamily: 'Galmuri11', fontSize: '16px', color: '#ff8080' }).setOrigin(0.5);
    });
  }

  async load_() {
    // 한글 폰트를 먼저 읽어 둔다. 안 그러면 첫 글자가 기본 폰트로 그려진다.
    await Promise.all(['400 22px Galmuri11', '700 22px Galmuri11'].map((f) => document.fonts.load(f, '가')));

    // 1) 타일셋
    const jobs = [];
    const seen = new Set();
    for (const ts of hailMap.tilesets) {
      if (ts.image) {
        jobs.push(loadImage(ts.image).then((img) => {
          const tex = this.textures.addImage(`ts:${ts.name}`, img);
          for (let id = 0; id < ts.tilecount; id++) {
            tex.add(id, 0, (id % ts.columns) * ts.tilewidth, Math.floor(id / ts.columns) * ts.tileheight, ts.tilewidth, ts.tileheight);
          }
        }));
      }
      for (const info of Object.values(ts.tiles)) {
        if (info.image && !seen.has(info.image)) {
          seen.add(info.image);
          jobs.push(loadImage(info.image).then((img) => this.textures.addImage(`img:${info.image}`, img)));
        }
      }
    }

    // 2) 캐릭터: 기본 주인공 시트를 인물마다 색 치환해서 새 텍스처로 등록
    const sheets = {
      walk: await loadImage(`${CHAR_DIR}Character_Walk.png`),
      idle: await loadImage(`${CHAR_DIR}Character_Idle.png`),
    };
    for (const id of Object.keys(palettes.characters)) {
      for (const [kind, img] of Object.entries(sheets)) {
        const tex = this.textures.addCanvas(`${id}:${kind}`, recolorSheet(img, id, FRAME_H));
        const cols = img.width / FRAME_W;
        for (let i = 0; i < cols * (img.height / FRAME_H); i++) {
          tex.add(i, 0, (i % cols) * FRAME_W, Math.floor(i / cols) * FRAME_H, FRAME_W, FRAME_H);
        }
      }
      for (const [d, row] of DIRS.entries()) {
        const frames = (kind) => [0, 1, 2, 3].map((c) => ({ key: `${id}:${kind}`, frame: row * 4 + c }));
        this.anims.create({ key: `${id}:walk:${DIRS[d]}`, frames: frames('walk'), frameRate: 8, repeat: -1 });
        this.anims.create({ key: `${id}:idle:${DIRS[d]}`, frames: frames('idle'), frameRate: 4, repeat: -1 });
      }
    }
    await Promise.all(jobs);
  }
}
