# 한빛 게임 · Vertex AI 서비스 계정 JSON 키 연결

브라우저 → 한빛 중계 서버 → Google OAuth 인증 → Vertex AI `generateContent` 순서로 호출합니다.
서비스 계정 JSON과 Google 액세스 토큰은 중계 서버에만 있고, 게임에는 중계 주소와 접속 토큰만 입력합니다.
기존 Gemini API 키 방식과 다른 제공자 설정도 그대로 사용할 수 있습니다.

## 준비

- Node.js 22 이상. npm 패키지 설치는 필요하지 않습니다.
- Google Cloud 프로젝트의 결제 연결과 Vertex AI API (`aiplatform.googleapis.com`) 사용 설정.
- 대상 프로젝트에서 Vertex AI 호출 권한을 가진 서비스 계정. 일반적인 시작 권한은 `roles/aiplatform.user`입니다.
- 해당 서비스 계정에서 내려받은 `type: "service_account"` JSON 키 파일. API 키 JSON이나 OAuth 사용자 클라이언트 JSON은 사용할 수 없습니다.

JSON 파일은 저장소 밖의 개인 폴더에 보관합니다. 게임의 API 키 입력란에 붙여 넣거나 GitHub에 업로드하지 않습니다.

## 가장 간단한 로컬 실행

저장소를 내려받은 폴더에서 터미널을 열고 실행합니다.

```powershell
node vertex-relay/server.cjs --key "C:\MyKeys\vertex-account.json"
```

Windows 파일 선택 창을 사용하려면 다음 명령을 사용합니다. 스크립트 실행이 제한된 PC에서는 위 Node 명령을 사용합니다.

```powershell
powershell -File .\vertex-relay\start-windows.ps1
```

macOS/Linux:

```bash
node vertex-relay/server.cjs --key "$HOME/MyKeys/vertex-account.json"
```

1. 터미널에 표시되는 게임 주소를 엽니다. 기본 주소는 `http://127.0.0.1:8899/hanbit.html`입니다.
2. 게임의 **AI 설정**에서 **모든 역할을 Vertex AI로 설정**을 누릅니다.
3. **Vertex AI 중계 서버 주소**에 `http://127.0.0.1:8899`를 입력합니다.
4. **중계 접속 토큰**에 서버가 터미널에 표시한 토큰을 입력합니다. 서비스 계정 JSON 내용이 아닙니다.
5. 저장한 뒤 역할별 **연결 테스트**를 누릅니다.

서버가 켜져 있어야 게임의 AI 호출이 작동합니다. 접속 토큰을 지정하지 않았다면 서버 재시작 시 새 토큰이 나오므로 게임 설정도 갱신합니다.
로컬 게임 주소는 기존 운영 사이트와 브라우저 저장 공간이 다릅니다. 기존 플레이를 옮길 때는 기존 사이트에서 저장을 내보낸 뒤 로컬 게임에서 가져옵니다. 기존 사이트의 저장을 삭제할 필요는 없습니다.

## 서버 설정

| 환경 변수 | 기본값 / 의미 |
|---|---|
| `GOOGLE_APPLICATION_CREDENTIALS` | `--key`를 생략할 때 읽을 JSON 파일 경로 |
| `GOOGLE_CLOUD_PROJECT` | JSON의 `project_id`; 호출할 프로젝트를 바꿀 때 지정 |
| `VERTEX_LOCATION` | `global`; 모델이 지원하는 리전으로 변경 가능 |
| `VERTEX_MODELS` | `gemini-3.5-flash,gemini-3.5-flash-lite`; 허용할 모델 ID를 쉼표로 구분 |
| `VERTEX_RELAY_TOKEN` | 로컬에서 생략 시 자동 생성. 고정하려면 영문·숫자·`_`·`-` 24~256자 지정 |
| `HOST` | `127.0.0.1`; 외부 서버에서 바인딩할 주소 |
| `PORT` | `8899` |
| `VERTEX_ALLOWED_ORIGINS` | 기본은 로컬 게임 주소 두 종류. 다른 게임의 Origin을 쉼표로 구분 |

모델은 Google 공식 문서와 대상 프로젝트의 사용 가능 목록을 확인해 바꿀 수 있습니다. 게임에서 모델만 바꿨다면 서버의 `VERTEX_MODELS` 허용 목록에도 추가해야 합니다.
Gemini 3 계열에는 `thinkingLevel`, 2.5 Flash 계열에는 `thinkingBudget`을 전달합니다. 게임의 역할별 생각 강도를 사용합니다.

## 기존 운영 사이트에서 연결

GitHub Pages는 HTML·이미지 호스팅이며 이 Node 서버를 실행하지 않습니다.
Node 서버를 실행할 호스트를 준비하고 HTTPS 역방향 프록시 뒤에서 운영합니다.
`HOST`, `VERTEX_RELAY_TOKEN`, `VERTEX_ALLOWED_ORIGINS`를 설정하고 JSON 키는 해당 서버의 비공개 파일로 제공합니다.

예를 들어 허용 Origin은 현재 게임 주소에서 경로를 뺀 `https://실제-게임-호스트`입니다. `*` 또는 `null`은 허용하지 않습니다.
게임에는 HTTPS 중계 주소와 토큰을 입력합니다. 기존 운영 주소를 유지하면 기존 브라우저 저장도 그대로 이어집니다.
중계는 최대 동시 4건, 분당 30건을 허용합니다. 공개 서버의 HTTPS·사용자별 접근 제어는 운영 환경에서 구성해야 합니다.

## 오류 확인

| 표시 | 확인할 항목 |
|---|---|
| 중계 서버 연결 실패 | Node 서버 실행 여부, 중계 주소, 허용 Origin, HTTPS |
| 접속 토큰 오류 | 터미널 토큰과 게임 설정의 토큰 일치 여부 |
| OAuth 인증 실패 | 서비스 계정 JSON 종류, 키 폐기 여부, 서버 시각 |
| 권한·API·결제 확인 | 대상 프로젝트의 IAM, Vertex AI API, 결제 연결 |
| 모델 이름과 리전 확인 | 모델 ID, 프로젝트 사용 가능 여부, `VERTEX_LOCATION` |
| 길이 제한 중단 | 생각 강도를 낮추거나 해당 호출의 응답 길이를 늘림 |
| 호출 한도 | 잠시 기다리거나 Google Cloud 할당량 확인 |

입력·출력·생각·캐시 토큰은 게임의 사용량에 반영합니다. Vertex 청구 단가는 다른 API 단가로 추정하지 않으며 정확한 비용은 Cloud Billing에서 확인합니다.
키·Google 액세스 토큰·OAuth 서명·장면 프롬프트는 서버 로그와 오류 응답에 출력하지 않습니다.

## 검증

```bash
node tests/hanbit-vertex.test.cjs
```

Google 호출을 대체한 인증·HTTP 통합 검증입니다. 실제 프로젝트의 권한·결제·모델 접근은 역할별 연결 테스트로 확인합니다.

공식 자료:
- https://developers.google.com/identity/protocols/oauth2/service-account
- https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
- https://cloud.google.com/vertex-ai/generative-ai/docs/access-control
- https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/3-5-flash
