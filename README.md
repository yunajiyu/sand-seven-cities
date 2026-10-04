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

## 아지트 꾸미기 (이미지 없음)
이미지 파일은 쓰지 않습니다. 아지트 장면은 CSS 배경(집 단계 1~4)과 이모지만으로 그립니다.
- 시설: 지으면 `FAC_SLOTS`의 자리에 이모지로 나타납니다 (티 코너 🍵, 사물함 🗄, 자전거 보관대 🚲, 작업대 🔨, 충전 거치대 🔋, 휴게 소파 🛋, 교표 연구실 🔍).
- 가구·장식·유실물 진열대: `DECOR`의 이모지(`ic`)로 표시되고 끌어서 옮깁니다.
- 단계 배경 소품: `HOME_BG`(창문·문·조명·액자·시계 등)가 단계에 따라 늘어납니다.
- 좌표·크기(%)는 `FAC_SLOTS`/`DECOR`에서 조절하며, 🛠 시설 위치 편집 모드로 끌어서 맞춘 뒤 좌표를 복사해 반영할 수 있습니다.

## 내부 식별자 (옛 이름 → 새 이름)
`KASR→CAMPUS_POS` · `IRAM_POS→LACUNA_POS` · `tablet→roster` · `G.dungeon→G.site` · `ruin→zone` · `town→hood` · `city(허브)→campus` · `cities→wards` · `west→branch` · `relic→keepsake` · `caravan→peddler` · `camp→shelter` · `MOUNTS→RIDES` · `water→calm`(공포 여유, 공포 = 한계 − calm) · `food→battery` · `gold→cash`. 시설 id: `well→tea`, `store→locker`, `stable→bikerack`, `workshop→workbench`, `garden→charger`, `guest→sofa`, `study→lab`, `land→clubroom`. 설정 저장 키(`sand7_settings` 등)는 API 키를 이어 쓰려고 그대로 둡니다.


## 원작 보관
- `sand_seven_cities.html` — 개변 전 원작 「모래 아래의 일곱 도시」 (`images/home/`의 그림을 사용). `index.html`(출석부에 없는 구역)과 따로 열 수 있고, 세이브 키가 달라(`sand7_save` / `hanbit_save_v1`) 서로 섞이지 않습니다. 설정·API 키는 공유합니다.
