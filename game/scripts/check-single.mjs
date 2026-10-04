// 묶기 결과 확인: dist/index.html → dist/game.html 로 이름을 바꾸고,
// 인터넷 주소 참조가 없는지, 그리고 file://로 열었을 때 실제로 게임이 시작되는지 확인한다.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const dist = path.resolve(import.meta.dirname, '../dist');
const out = path.join(dist, 'game.html');
fs.renameSync(path.join(dist, 'index.html'), out);
const html = fs.readFileSync(out, 'utf8');
console.log(`dist/game.html 생성 (${(html.length / 1024 / 1024).toFixed(1)} MB)`);

const external = [...html.matchAll(/(?:src|href)=["'](?!data:|#)([^"']+)["']/g)].map((m) => m[1]);
if (external.length) { console.error('외부 파일 참조가 남아 있음:', external); process.exit(1); }

let playwright;
try {
  const require = createRequire(import.meta.url);
  const root = process.env.PLAYWRIGHT_MODULE ?? require.resolve('playwright', { paths: [process.cwd(), '/opt/node22/lib/node_modules'] });
  playwright = await import(pathToFileURL(root).href);
} catch { console.log('(playwright가 없어 file:// 실행 확인은 건너뜀 — 직접 game.html을 더블클릭해서 확인해 주세요)'); process.exit(0); }

const chromium = playwright.chromium ?? playwright.default.chromium;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
const errors = [], requests = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('request', (r) => { if (!r.url().startsWith('data:') && !r.url().startsWith('file:')) requests.push(r.url()); });
await page.goto(pathToFileURL(out).href + '?debug');
await page.waitForTimeout(3000);
const ok = await page.evaluate(() => !!window.__game?.scene?.player);
await browser.close();
if (errors.length) console.error('페이지 오류:', errors);
if (requests.length) console.error('인터넷 요청 발생:', requests);
if (!ok || errors.length || requests.length) { console.error('file:// 실행 확인 실패'); process.exit(1); }
console.log('file:// 실행 확인 완료: 인터넷 요청 없이 하일 마을이 시작됨');
