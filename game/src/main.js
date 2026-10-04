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
  scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
  physics: { default: 'arcade', arcade: { debug: new URLSearchParams(location.search).has('debug') } },
  scene: [BootScene, TownScene, UIScene],
});
