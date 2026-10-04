import Phaser from 'phaser';

// 화면 고정 UI(대사창). 월드 카메라와 달리 확대하지 않고, 창 크기에 맞춰 11px 폰트의 정수 배수를 쓴다.
export class UIScene extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.isOpen = false;
    this.parts = [];
    this.hint = null;
  }

  get unit() { return Math.max(1, Math.floor(this.scale.height / 300)); }

  /** 대화 시작. lines: 문자열 배열, onDone: 마지막 줄을 넘긴 뒤 호출 */
  open(name, lines, onDone) {
    this.close();
    this.isOpen = true;
    this.lines = lines;
    this.index = 0;
    this.onDone = onDone;

    const u = this.unit, { width, height } = this.scale;
    const margin = 8 * u, boxH = 76 * u, boxW = Math.min(width - margin * 2, 380 * u);
    const x = Math.round((width - boxW) / 2), y = height - boxH - margin;
    const pad = 8 * u, font = `${11 * u}px`;

    const g = this.add.graphics();
    g.fillStyle(0x15121f, 0.94).fillRect(x, y, boxW, boxH);
    g.lineStyle(u, 0xe8d9a8, 1).strokeRect(x + u / 2, y + u / 2, boxW - u, boxH - u);
    g.lineStyle(u, 0x6b5c3a, 1).strokeRect(x + 3 * u + u / 2, y + 3 * u + u / 2, boxW - 7 * u, boxH - 7 * u);

    const tagW = (name.length * 11 + 16) * u, tagH = 17 * u;
    g.fillStyle(0x15121f, 1).fillRect(x + 6 * u, y - tagH + u, tagW, tagH);
    g.lineStyle(u, 0xe8d9a8, 1).strokeRect(x + 6 * u + u / 2, y - tagH + u + u / 2, tagW - u, tagH - u);
    const nameText = this.add.text(x + 6 * u + tagW / 2, y - tagH / 2 + u, name, { fontFamily: 'Galmuri11', fontSize: font, fontStyle: 'bold', color: '#f4d98a' }).setOrigin(0.5);

    this.body = this.add.text(x + pad + 3 * u, y + pad + 2 * u, '', {
      fontFamily: 'Galmuri11', fontSize: font, color: '#f2ecdc', lineSpacing: 4 * u,
      wordWrap: { width: boxW - (pad + 3 * u) * 2, useAdvancedWrap: true },
    });
    this.arrow = this.add.text(x + boxW - pad - 3 * u, y + boxH - pad - 2 * u, '▼', { fontFamily: 'Galmuri11', fontSize: font, color: '#f4d98a' }).setOrigin(1, 1).setVisible(false);
    this.tweens.add({ targets: this.arrow, alpha: { from: 1, to: 0.2 }, duration: 450, yoyo: true, repeat: -1 });

    this.parts = [g, nameText, this.body, this.arrow];
    this.showLine();
  }

  showLine() {
    const text = this.lines[this.index];
    this.full = text;
    this.typed = 0;
    this.arrow.setVisible(false);
    this.body.setText('');
    this.typer?.remove();
    this.typer = this.time.addEvent({
      delay: 28, repeat: text.length - 1,
      callback: () => { this.typed++; this.body.setText(text.slice(0, this.typed)); if (this.typed >= text.length) this.arrow.setVisible(true); },
    });
  }

  /** 확인 키: 글자가 나오는 중이면 한 번에 보여 주고, 다 나왔으면 다음 줄/닫기 */
  advance() {
    if (!this.isOpen) return;
    if (this.typed < this.full.length) {
      this.typer.remove();
      this.typed = this.full.length;
      this.body.setText(this.full);
      this.arrow.setVisible(true);
      return;
    }
    if (++this.index < this.lines.length) return this.showLine();
    const done = this.onDone;
    this.close();
    done?.();
  }

  close() {
    this.typer?.remove();
    this.parts.forEach((p) => p.destroy());
    this.parts = [];
    this.isOpen = false;
  }
}
