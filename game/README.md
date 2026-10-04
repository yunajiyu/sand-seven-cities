# 모래 아래의 일곱 도시 (픽셀 RPG)

## 처음 한 번
1. `assets/fantasy-tileset/` 에 The Fan-tasy Tileset (Free) 1.5.9 zip을 풀어 둡니다. (저장소에는 포함되지 않음)
2. `npm install`

## 실행
- `npm run dev` → 주소(http://localhost:5173)를 브라우저로 엽니다. 끄려면 터미널에서 Ctrl+C.
- `?debug` 를 주소 뒤에 붙이면 충돌 영역이 보입니다.
- 조작: 방향키/WASD 이동, Space·Enter·E 대화.

## 플레이용 한 파일 만들기
`npm run build:single` → `dist/game.html` (더블클릭으로 오프라인 실행)

## 데이터 고치는 곳
- 대사: `src/data/dialogue/hail.json` / 플래그: `src/data/flags.json` / NPC 색: `src/data/palettes.json`
- 맵을 Tiled에서 고쳤다면 `npm run convert:map`
