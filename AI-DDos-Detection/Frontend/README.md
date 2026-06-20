# AI DDoS Detection Frontend

AI 기반 DDoS 탐지/방어 시스템의 프론트엔드 대시보드입니다. FastAPI 백엔드와 연동해 모델 상태 확인, 단일 트래픽 플로우 예측, PCAP 파일 분석, 실시간 패킷 분석, 차단 IP 목록 관리를 한 화면에서 수행합니다.

## 주요 기능

- 백엔드 헬스 체크 및 모델 로드 상태 확인
- `/predict` API를 이용한 단일 플로우 DDoS 예측 테스트
- `/analyze/pcap` API를 이용한 PCAP 파일 기반 트래픽 분석
- `/analyze/live` API를 이용한 네트워크 인터페이스 실시간 분석
- 공격 확률, 위험도, 방어 조치 결과 시각화
- 현재 차단된 source IP 목록 조회 및 차단 해제

## 기술 스택

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- ESLint

## 프로젝트 구조

```text
Frontend/
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── assets/
│   ├── App.css
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── eslint.config.js
├── index.html
├── package.json
├── tsconfig.app.json
├── tsconfig.json
├── tsconfig.node.json
└── vite.config.ts
```

## 실행 전 준비

다음 프로그램이 설치되어 있어야 합니다.

- Node.js 20 이상 권장
- npm
- FastAPI 백엔드 서버

프론트엔드는 기본적으로 백엔드가 `http://127.0.0.1:8000`에서 실행된다고 가정합니다.

## 설치

```bash
cd AI-DDos-Detection/Frontend
npm install
```

## 환경 변수

백엔드 주소를 변경해야 하는 경우 프로젝트 루트에 `.env` 파일을 생성합니다.

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

예를 들어 백엔드가 다른 서버에서 실행 중이면 다음처럼 설정할 수 있습니다.

```env
VITE_API_BASE_URL=http://192.168.0.20:8000
```

## 개발 서버 실행

```bash
npm run dev
```

기본 접속 주소는 다음과 같습니다.

```text
http://localhost:5173
```

백엔드 CORS 설정에는 기본적으로 `localhost:5173`, `127.0.0.1:5173`, `localhost:4173`, `127.0.0.1:4173`이 허용되어 있습니다.

## 프로덕션 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 디렉터리에 생성됩니다.

## 빌드 결과 미리보기

```bash
npm run preview
```

기본 접속 주소는 다음과 같습니다.

```text
http://localhost:4173
```

## 코드 검사

```bash
npm run lint
```

## 백엔드 실행 예시

프론트엔드를 정상적으로 사용하려면 먼저 백엔드 서버가 실행되어 있어야 합니다.

```bash
cd AI-DDos-Detection/Backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

백엔드가 정상 실행되면 프론트엔드 상단 상태 패널이 `Backend Online`으로 표시됩니다.

## 연동 API

| Method | Endpoint | 설명 |
| --- | --- | --- |
| `GET` | `/health` | 백엔드 상태, 모델 경로, feature 개수, 방화벽 사용 여부 확인 |
| `POST` | `/predict` | 입력 feature 기반 단일 플로우 예측 |
| `POST` | `/analyze/pcap` | 서버 로컬 PCAP 파일 분석 |
| `POST` | `/analyze/live` | 서버 네트워크 인터페이스 실시간 분석 |
| `GET` | `/blocked-sources` | 현재 차단된 source IP 목록 조회 |
| `DELETE` | `/blocked-sources/{source_ip}` | 특정 source IP 차단 해제 |

## 화면 사용 방법

### 1. 서버 상태 확인

대시보드 상단에서 백엔드 연결 상태와 API Base URL을 확인합니다. 연결이 실패하면 `재확인` 버튼으로 `/health` 요청을 다시 보낼 수 있습니다.

### 2. 예측 테스트

`예측 테스트` 영역에서 source IP, destination IP, flow ID, 20개 feature 값을 입력한 뒤 `POST /predict` 버튼을 클릭합니다. 응답 결과로 공격 여부, 공격 확률, 위험도, 방어 조치 여부가 표시됩니다.

### 3. PCAP 분석

`PCAP 분석` 영역에서 백엔드 서버가 접근할 수 있는 PCAP 파일 경로를 입력합니다. `apply_defense`를 활성화하면 분석 결과에 따라 방어 로직이 적용됩니다.

주의: PCAP 경로는 브라우저가 아니라 백엔드 서버 기준의 파일 경로입니다.

### 4. 실시간 분석

`실시간 분석` 영역에서 네트워크 인터페이스 이름과 캡처 시간을 입력합니다. Windows 환경에서는 예를 들어 `Ethernet`, `Wi-Fi` 같은 인터페이스 이름을 사용할 수 있습니다.

### 5. 차단 목록 관리

`차단 목록` 영역에서 현재 메모리에 등록된 차단 IP를 조회하고, 필요하면 개별 IP의 차단을 해제할 수 있습니다.

## 요청 데이터 참고

`/predict` 요청에는 다음 feature 값이 필요합니다.

```text
destination_port
protocol
flow_duration
total_fwd_packets
total_backward_packets
total_length_fwd_packets
total_length_bwd_packets
flow_bytes_per_s
flow_packets_per_s
fwd_packets_per_s
bwd_packets_per_s
min_packet_length
max_packet_length
packet_length_mean
packet_length_std
syn_flag_count
rst_flag_count
ack_flag_count
average_packet_size
down_up_ratio
```

## 문제 해결

### Backend Offline이 표시되는 경우

- 백엔드 서버가 실행 중인지 확인합니다.
- `.env`의 `VITE_API_BASE_URL` 값이 실제 백엔드 주소와 일치하는지 확인합니다.
- 브라우저 개발자 도구의 Network 탭에서 `/health` 요청 실패 원인을 확인합니다.

### CORS 오류가 발생하는 경우

- 프론트엔드를 `http://localhost:5173` 또는 `http://127.0.0.1:5173`에서 실행 중인지 확인합니다.
- 다른 포트를 사용한다면 백엔드의 CORS 허용 origin 목록에 해당 주소를 추가해야 합니다.

### PCAP 파일을 찾을 수 없다는 오류가 발생하는 경우

- 입력한 `pcap_path`가 백엔드 서버 기준 경로인지 확인합니다.
- 해당 파일에 백엔드 프로세스가 접근할 수 있는 권한이 있는지 확인합니다.

### 실시간 분석이 실패하는 경우

- 입력한 네트워크 인터페이스 이름이 실제 환경과 일치하는지 확인합니다.
- 패킷 캡처 권한이 필요한 환경에서는 관리자 권한으로 백엔드를 실행합니다.
- `scapy` 및 관련 패킷 캡처 드라이버가 정상 설치되어 있는지 확인합니다.

### 차단 기능이 적용되지 않는 경우

- 백엔드 환경 변수 `AI_DDOS_ENABLE_WINDOWS_FIREWALL` 값이 `true`인지 확인합니다.
- Windows Firewall 제어가 필요한 경우 백엔드를 관리자 권한으로 실행해야 할 수 있습니다.

## npm scripts

| Script | 설명 |
| --- | --- |
| `npm run dev` | Vite 개발 서버 실행 |
| `npm run build` | TypeScript 검사 후 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 로컬 미리보기 |
| `npm run lint` | ESLint 검사 |

## 배포 참고

정적 호스팅 환경에 배포할 때는 빌드 시점의 `VITE_API_BASE_URL`이 실제 운영 백엔드 주소를 가리키도록 설정해야 합니다.

```bash
VITE_API_BASE_URL=https://api.example.com npm run build
```

Windows PowerShell에서는 다음처럼 실행합니다.

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"
npm run build
```
