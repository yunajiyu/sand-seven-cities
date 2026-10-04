# 출석부에 없는 구역

한빛 기숙학원 7반 괴담 조사 기록 — 현대 한국 성인 기숙학원을 배경으로 한 조사 호러 텍스트 탐험 게임입니다. HTML 파일 하나(`index.html`)로 동작하며 서버가 필요 없습니다.

## 플레이 방법
1. `index.html`을 브라우저로 엽니다(더블클릭 또는 창으로 끌어다 놓기).
2. 첫 화면의 **AI 설정**에서 API 키(Anthropic 또는 Gemini 등)를 입력합니다. 키가 없으면 간단한 기본 서술로 진행됩니다.
3. **입소하기**로 새 게임을 시작합니다(20세 전입생 · 기본 이름 도현). 이어 하려면 **기숙사로 돌아가기**.
4. 저장은 브라우저에 됩니다(`hanbit_save_v1`). 다른 곳으로 옮기려면 게임의 저장 내보내기/불러오기를 쓰세요.

## 상태값
체력 · **공포**(높을수록 위험, 아지트에서 회복) · **배터리**(휴대폰 %) · 손전등 · 캐시 · **벌점**(점호 누락·무단 외출, 10점 이상이면 외출 금지 경고) · **출입 권한**(1~3등급) · **시간대**(낮 → 방과 후 → 야간 → 새벽) · 교표 조각 n/8 · 유민 호감도(Lv).

## 프롬프트
- `system_prompt_hanbit.md` — 서술·유민 대사용 메인 프롬프트와 구역 즉석 생성용 보조 프롬프트의 원문(설계 초안).
- 코드에는 `SYS_BASE`(메인), `SYS_ZONE`(보조), `TURN_SCHEMA`(JSON 출력 형식)로 들어 있습니다. 상태 블록은 JSON의 `effects`로 받습니다: `체력`·`공포`·`배터리`·`손전등`·`캐시`·`벌점`·`출입권한`·`유민호감`·`교표조각`·`사전추가`·`조사보드`·`떡밥장부`.

## 아지트 이미지(선택)
`images/home/`에 정해진 파일명으로 이미지를 넣으면 🪴 아지트 장식에 표시됩니다. 없으면 이모지로 표시됩니다(파일명은 이전 버전과 같습니다).
- 아지트 배경: `house_1.webp` ~ `house_4.webp`
- 시설: `fac_well.webp`(티 코너), `fac_well2.webp`, `fac_store.webp`(사물함), `fac_store2.webp`, `fac_stable.webp`(자전거 보관대), `fac_workshop.webp`(작업대), `fac_garden.webp`(충전 거치대), `fac_guest.webp`(휴게 소파), `fac_study.webp`(교표 연구실)
- 가구: `furn_bed`, `furn_rug`, `furn_table`, `furn_lamp`, `furn_shelf`, `furn_pot`, `furn_plant`, `furn_cushion` (`.webp`)
- 지구 특산 장식: `deco_east_*`(동부 저수지 공원), `deco_south_*`(고시촌 골목), `deco_north_*`(구 신시가 재개발지구)
- 유실물 진열대: `relic_1.webp` ~ `relic_4.webp`
- 곁가지 구역 보상 장식: `deco_west_coral`, `deco_west_gate`, `deco_west_map` (`.webp`)
