import Phaser from 'phaser';
import './fonts.css';
import { BootScene } from './scenes/BootScene.js';
import { TownScene } from './scenes/TownScene.js';
import { UIScene } from './scenes/UIScene.js';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d0b14',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1000, height: 1000 }, // 1000×1000 고정, 창이 더 작으면 같은 비율로 줄어듦
  physics: { default: 'arcade', arcade: { debug: new URLSearchParams(location.search).has('debug') } },
  scene: [BootScene, TownScene, UIScene],
});
