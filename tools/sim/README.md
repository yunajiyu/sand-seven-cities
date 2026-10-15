# hanbit.html 난이도 시뮬레이터

실제 게임 스크립트를 `node:vm`에 올려 봇이 `buildChoices()`의 선택지를 `pick()`으로 실행합니다. 게임 규칙을 복제하지 않으며 `hanbit.html`은 수정하지 않습니다. AI·네트워크는 쓰지 않고(`aiReady=()=>false`, `fetch`·`Math.random` 차단) 판정 난수는 시드 있는 `rng` 하나만 씁니다.

**실행 한 줄:** `node tools/sim/run.cjs --games 5000 --seed 1` (같은 시드면 같은 결과)

| 하고 싶은 일 | 명령 |
|---|---|
| 전략×경로 표 + 판정 기준 대비 | `node tools/sim/run.cjs --games 5000 --seed 1 --out report.md` |
| 엔딩별 대표 로그까지 | `node tools/sim/run.cjs --games 2000 --examples` |
| 일부 전략만 | `node tools/sim/run.cjs --specs random,yumin-first:roof --games 2000` |
| 수치 조정 후보 하나 시험 | `node tools/sim/run.cjs --variant infect4` |
| 후보 전체 비교표 | `node tools/sim/compare.cjs --games 1500` |
| 버그·안정성 검사(저장/불러오기, 옛 저장, 퍼즈, 전수 탐색) | `node tools/sim/check.cjs --report-only` |
| 빠른 확인 테스트 | `node tests/hanbit-sim.test.cjs` |

## 파일
- `loader.cjs` 게임 로더(vm). `patches`로 **메모리 복사본에만** 수치를 바꿔 볼 수 있습니다.
- `prelude.js` 게임 함수를 감싸 조우·물림·호감 변화를 세는 계측 코드(판정은 그대로)와 불변식 검사.
- `engine.cjs` 한 판 실행. `bots.cjs` 전략 16종. `stats.cjs` 집계·표. `variants.cjs` 수치 후보(적용하지 않음).
- `run.cjs` · `compare.cjs` · `check.cjs` 실행기. 보고서는 `REPORT.md`.

## 전략
`random`, `greedy-escape`(후문 최단·유민 무시), `rush-front`/`rush-roof`(경로별 최단 봇), `yumin-first`, `cautious`, `completionist`. 뒤의 3종은 `:front`/`:rear`/`:roof`로 경로를 고정할 수 있고, 붙이지 않으면 가장 안전한 경로를 고릅니다. 봇은 휴리스틱이라 "최적"의 **하한**입니다(진짜 최적은 이보다 같거나 높음).
