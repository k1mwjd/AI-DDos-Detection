# AI-DDos-Detection

AI 기반 DDoS 탐지 및 방어 흐름을 검증하기 위한 프로젝트입니다. CIC 계열 DDoS CSV 데이터를 사용해 flow feature 기반 이진 분류 모델을 학습하고, FastAPI 백엔드와 React 프론트엔드에서 예측, PCAP 분석, 실시간 분석 결과를 확인할 수 있도록 구성했습니다.

GitHub 주소: https://github.com/k1mwjd/AI-DDos-Detection

## 프로젝트 구조

```text
AI-DDos-Detection
└── AI-DDos-Detection
    ├── AI_engine
    │   ├── data
    │   │   ├── raw
    │   │   ├── processed
    │   │   └── realtime_logs
    │   ├── docs
    │   ├── models
    │   └── src
    ├── Backend
    │   ├── app
    │   ├── requirements.txt
    │   └── runtime_logs
    ├── Frontend
    ├── nest_gateway
    └── install_all.bat
```

## 사용 데이터

연구에는 CIC 계열 DDoS CSV 데이터셋을 사용했습니다. 원본 CSV와 PCAP 파일은 용량이 매우 커서 GitHub에는 전체 원본을 포함하지 않고, 실제 학습 및 평가에 사용한 전처리 CSV를 포함했습니다.

포함된 데이터:

```text
AI_engine/data/processed/train_dataset_medium.csv
AI_engine/data/processed/test_dataset_medium.csv
AI_engine/data/processed/train_dataset_medium_metadata.json
AI_engine/data/processed/test_dataset_medium_metadata.json
```

학습 데이터는 `01-12` CSV에서 샘플링했고, 테스트 데이터는 `03-11` CSV에서 샘플링했습니다.

## 학습 Feature

모델은 패킷 1개가 아니라 flow 단위 feature를 사용합니다.

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

## 모델

다음 모델을 학습 및 비교합니다.

```text
Random Forest
XGBoost
LightGBM
Logistic Regression
```

F1-score가 가장 높은 모델을 최종 배포 모델로 선택해 `AI_engine/models/random_forest_medium.joblib` 경로에 저장합니다. 현재 백엔드는 이 파일을 로드해 예측을 수행합니다.

## Backend 실행

위치:

```powershell
cd "AI-DDos-Detection\Backend"
```

가상환경 생성 및 패키지 설치:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

서버 실행:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

상태 확인:

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

## Frontend 실행

위치:

```powershell
cd "AI-DDos-Detection\Frontend"
```

패키지 설치:

```powershell
npm.cmd install
```

개발 서버 실행:

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

브라우저 접속:

```text
http://localhost:5173
```

## 주요 API

```text
GET    /health
POST   /predict
POST   /analyze/pcap
POST   /analyze/live
GET    /blocked-sources
DELETE /blocked-sources/{source_ip}
```

`/predict`는 feature 값을 직접 입력해 모델 예측 결과를 확인합니다.

`/analyze/pcap`은 PCAP 파일을 읽어 flow feature를 생성한 뒤 모델로 분석합니다.

`/analyze/live`는 지정한 네트워크 인터페이스에서 일정 시간 동안 패킷을 캡처해 flow feature를 생성하고 분석합니다.

## 시험 절차 요약

1. Backend 의존성을 설치합니다.
2. Backend 서버를 실행합니다.
3. `GET /health`로 모델 로딩 상태를 확인합니다.
4. Frontend 의존성을 설치합니다.
5. Frontend 개발 서버를 실행합니다.
6. 브라우저에서 서버 상태, 예측 테스트, PCAP 분석, 실시간 분석 화면을 확인합니다.
7. PCAP 분석 시 `pcap_path`, `packet_limit`, `apply_defense` 값을 입력하고 실행합니다.
8. 실시간 분석 시 VM1의 네트워크 인터페이스 이름과 분석 시간을 입력하고 실행합니다.
9. 실행 결과의 `prediction`, `attack_probability`, `risk_score`, `risk_level`, `action_taken`을 확인합니다.

## 검증 완료 항목

```text
Frontend production build 통과
Backend Python 문법 검사 통과
AI_engine 주요 Python 파일 문법 검사 통과
processed train/test CSV 포함
모델 파일 포함
GitHub main 브랜치 반영
```

## 주의 사항

원본 CIC CSV 및 PCAP 전체 파일은 용량이 매우 커서 GitHub에 포함하지 않았습니다. 대신 학습 및 평가에 사용한 전처리 CSV와 메타데이터를 포함했습니다.

실시간 분석 기능은 VM 환경의 네트워크 인터페이스 이름, Npcap 설치 여부, 관리자 권한 여부에 영향을 받을 수 있습니다.
