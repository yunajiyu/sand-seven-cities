import Phaser from 'phaser';
import hailMap from '../data/hail-map.json';
import dialogue from '../data/dialogue/hail.json';
import { flags } from '../systems/flags.js';

const TS = hailMap.tilewidth;
const MAP_W = hailMap.width * TS, MAP_H = hailMap.height * TS;
const ZOOM = 3;
const SPEED = 70;
const TALK_RANGE = 26;
const FEET_Y = 41; // 프레임(48px) 안에서 발바닥 높이
const GID_MASK = 0x1fffffff; // 뒤집기 비트 제거
const DEBUG = new URLSearchParams(location.search).has('debug');

const SPAWN = { x: 330, y: 238 };
// 하일 마을 NPC: 스프라이트 색(palettes.json의 인물 이름), 위치, 보는 방향
const NPCS = [
  { id: 'hamid', x: 372, y: 222, face: 'down' },
  { id: 'laila', x: 236, y: 336, face: 'down' },
  { id: 'tariq', x: 330, y: 190, face: 'down' },
];

// gid → { tileset, id }. 타일셋은 firstgid 오름차순.
const tilesets = hailMap.tilesets;
function resolve(gid) {
  gid &= GID_MASK;
  for (let i = tilesets.length - 1; i >= 0; i--) if (gid >= tilesets[i].firstgid) return { ts: tilesets[i], id: gid - tilesets[i].firstgid };
  return null;
}

export class TownScene extends Phaser.Scene {
  constructor() { super('Town'); }

  create() {
    this.scene.launch('UI');
    this.walls = this.physics.add.staticGroup();
    this.animated = [];
    this.buildMap();
    this.buildPlayer();
    this.buildNpcs();

    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.player, this.npcGroup);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H).startFollow(this.player, true);
    this.fitCamera();
    this.scale.on('resize', this.fitCamera, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitCamera, this));

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,ENTER,E');
    this.hint = this.add.text(0, 0, 'Space', { fontFamily: 'Galmuri11', fontSize: '11px', color: '#f4d98a', stroke: '#15121f', strokeThickness: 3 })
      .setOrigin(0.5, 1).setVisible(false).setDepth(99999);
    if (DEBUG) this.debugOverlay();
  }

  // 게임 화면은 1000×1000 고정. 정수 3배로 확대해 약 333×333 픽셀 범위를 보여 준다.
  fitCamera() {
    this.cameras.main.setZoom(ZOOM);
  }

  // ---------- 맵 ----------
  buildMap() {
    hailMap.layers.forEach((layer, order) => {
      if (layer.type === 'tile') this.buildTileLayer(layer, order);
      else this.buildObjectLayer(layer, order);
    });
  }

  addWall(x, y, w, h) {
    const r = this.add.rectangle(x + w / 2, y + h / 2, w, h).setVisible(false);
    this.physics.add.existing(r, true);
    this.walls.add(r);
  }

  place(img, tile, ts) {
    if (tile.animation) {
      const frames = tile.animation, total = frames.reduce((a, f) => a + f.duration, 0);
      this.animated.push({ img, frames, total, offset: 0 });
    }
  }

  buildTileLayer(layer, order) {
    layer.data.forEach((gid, i) => {
      if (!gid) return;
      const r = resolve(gid);
      if (!r) return;
      const x = (i % hailMap.width) * TS, y = Math.floor(i / hailMap.width) * TS;
      const img = this.add.image(x, y, `ts:${r.ts.name}`, r.id).setOrigin(0).setDepth(order).setAlpha(layer.opacity);
      const tile = r.ts.tiles[r.id];
      if (!tile) return;
      this.place(img, tile, r.ts);
      tile.colliders?.forEach((c) => this.addWall(x + c.x, y + c.y, c.w, c.h));
    });
  }

  buildObjectLayer(layer, order) {
    for (const o of layer.objects) {
      const r = resolve(o.gid);
      if (!r) continue;
      const tile = r.ts.tiles[r.id];
      const top = o.y - o.height; // Tiled 타일 오브젝트는 (x, y)가 왼쪽 아래
      const key = tile?.image ? `img:${tile.image}` : `ts:${r.ts.name}`;
      const frame = tile?.image ? undefined : r.id;
      const isShadow = r.ts.name.toLowerCase().includes('shadow');
      const img = this.add.image(o.x, o.y, key, frame).setOrigin(0, 1).setAlpha(layer.opacity)
        .setDepth(isShadow ? order : 100 + o.y);
      if (!tile) continue;
      this.place(img, tile, r.ts);
      tile.colliders?.forEach((c) => this.addWall(o.x + c.x, top + c.y, c.w, c.h));
    }
  }

  update(time) {
    for (const a of this.animated) {
      let t = time % a.total;
      for (const f of a.frames) { if (t < f.duration) { a.img.setFrame(f.tileid); break; } t -= f.duration; }
    }
    this.updatePlayer();
  }

  // ---------- 캐릭터 ----------
  makeActor(id, x, y, depth = true) {
    const s = this.physics.add.sprite(x, y, `${id}:idle`, 0).setOrigin(0.5, FEET_Y / 48);
    s.body.setSize(10, 8).setOffset(15, FEET_Y - 8);
    s.actorId = id;
    return s;
  }

  buildPlayer() {
    this.player = this.makeActor('player', SPAWN.x, SPAWN.y);
    this.player.facing = 'down';
    this.player.play('player:idle:down');
  }

  buildNpcs() {
    this.npcGroup = this.physics.add.staticGroup();
    this.npcs = NPCS.map((n) => {
      const s = this.makeActor(n.id, n.x, n.y);
      s.play(`${n.id}:idle:${n.face}`);
      this.npcGroup.add(s);
      s.body.updateFromGameObject();
      return s;
    });
  }

  updatePlayer() {
    const p = this.player, ui = this.scene.get('UI');
    this.npcs.forEach((n) => n.setDepth(100 + n.y));
    p.setDepth(100 + p.y);

    const k = this.keys;
    const talking = ui.isOpen;
    const dx = talking ? 0 : (k.RIGHT.isDown || k.D.isDown) - (k.LEFT.isDown || k.A.isDown);
    const dy = talking ? 0 : (k.DOWN.isDown || k.S.isDown) - (k.UP.isDown || k.W.isDown);
    p.body.setVelocity(dx, dy);
    if (dx || dy) {
      p.body.velocity.normalize().scale(SPEED);
      p.facing = dx ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down';
    }
    p.play(`player:${dx || dy ? 'walk' : 'idle'}:${p.facing}`, true);

    // 가까운 NPC 찾기
    let near = null, best = TALK_RANGE;
    for (const n of this.npcs) {
      const d = Phaser.Math.Distance.Between(p.x, p.y, n.x, n.y);
      if (d < best) { best = d; near = n; }
    }
    this.hint.setVisible(!!near && !talking);
    if (near) this.hint.setPosition(near.x, near.y - 50);

    const pressed = [k.SPACE, k.ENTER, k.E].some((key) => Phaser.Input.Keyboard.JustDown(key));
    if (pressed) {
      if (talking) ui.advance();
      else if (near) this.talk(near);
    }
  }

  // ---------- 대화 ----------
  talk(npc) {
    const data = dialogue[npc.actorId];
    const talk = data.talks.find((t) => (t.if ?? []).every((f) => flags.get(f)) && (t.ifNot ?? []).every((f) => !flags.get(f)));
    if (!talk) return;
    this.scene.get('UI').open(data.name, talk.lines, () => {
      (talk.set ?? []).forEach((f) => flags.set(f, true));
    });
  }

  debugOverlay() {
    window.__game = { scene: this, flags };
  }
}
