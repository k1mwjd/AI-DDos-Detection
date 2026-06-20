# AI-DDos-Detection

본 프로젝트는 외부망에서 유입되는 네트워크 트래픽을 분석하여 DDoS 공격 여부를 판단하고, 위험도에 따라 대응할 수 있는 AI 기반 DDoS 탐지 및 방어 시스템 구현을 목표로 한다.

이를 위해 CIC 계열 네트워크 트래픽 CSV 데이터셋을 사용하여 정상 트래픽과 공격 트래픽을 구분하는 이진 분류 모델을 학습하였다. 최종 구현에서는 Random Forest, XGBoost, LightGBM, Logistic Regression 모델을 함께 학습하고 성능을 비교한 뒤, F1-score가 가장 높은 모델을 최종 예측 모델로 선택하도록 구성하였다. 또한 데이터 전처리, feature 선택, 모델 학습, 성능 평가, 최적 모델 저장, Backend 예측 API, Frontend 분석 결과 확인까지의 과정을 구현하였다.

GitHub 주소: https://github.com/k1mwjd/AI-DDos-Detection

## Directory layout

```text
AI-DDos-Detection
├── README.md                     # Project overview and execution guide
└── AI-DDos-Detection             # Main project directory
    ├── AI_engine                 # AI/ML model training and prediction engine
    │   ├── data                  # Project data directory
    │   │   ├── raw               # Raw input data or temporary source files
    │   │   ├── processed         # Preprocessed train/test CSV files and derived outputs
    │   │   └── realtime_logs     # Runtime or experiment log outputs
    │   ├── docs                  # Project documentation and progress notes
    │   ├── models                # Trained models and evaluation metadata
    │   └── src                   # Source code
    │       ├── capture           # Packet-related helper modules
    │       ├── features          # Dataset preprocessing and feature preparation code
    │       ├── firewall          # Firewall-related extension modules
    │       ├── models            # Training, model comparison, and prediction code
    │       └── utils             # Shared configuration and helper code
    ├── Backend                   # FastAPI backend for inference and traffic analysis
    │   ├── app                   # Backend application source code
    │   ├── requirements.txt      # Backend Python dependencies
    │   └── runtime_logs          # Backend runtime analysis logs
    ├── Frontend                  # React/Vite monitoring dashboard
    ├── nest_gateway              # NestJS gateway module
    └── install_all.bat           # Windows setup script
```

## System requirements

```text
OS: Windows 10 또는 Windows 11
Python: 3.9 이상 권장
Node.js: LTS 버전 권장
Package manager: pip, npm
Packet capture: Npcap 설치 필요
Virtualization: VMware 사용 가능
```

실시간 패킷 분석 기능은 VM 환경의 네트워크 인터페이스 이름, Npcap 설치 여부, 관리자 권한 여부에 영향을 받을 수 있다.

## Data

연구에는 CIC 계열 DDoS CSV 데이터셋을 사용하였다. 원본 CSV 및 PCAP 파일은 용량이 매우 커서 GitHub에는 전체 원본을 포함하지 않고, 실제 학습과 평가에 사용한 전처리 CSV 파일을 포함하였다.

포함된 데이터 파일은 다음과 같다.

```text
AI-DDos-Detection/AI_engine/data/processed/train_dataset_medium.csv
AI-DDos-Detection/AI_engine/data/processed/test_dataset_medium.csv
AI-DDos-Detection/AI_engine/data/processed/train_dataset_medium_metadata.json
AI-DDos-Detection/AI_engine/data/processed/test_dataset_medium_metadata.json
```

데이터 구성은 다음과 같다.

```text
train_dataset_medium.csv → 01-12 데이터 기반 학습용 CSV
test_dataset_medium.csv → 03-11 데이터 기반 테스트용 CSV
```

## Feature columns

모델은 패킷 1개가 아니라 flow 단위 feature를 사용한다.

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

## Model training and selection

학습 및 비교 대상 모델은 다음과 같다.

```text
Random Forest
XGBoost
LightGBM
Logistic Regression
```

각 모델을 동일한 feature subset과 train/test 데이터 기준으로 학습한 뒤 precision, recall, f1-score, confusion matrix를 계산한다. 최종 예측 모델은 F1-score가 가장 높은 모델로 선택되며, Backend에서는 최종 배포 모델 파일인 `AI_engine/models/random_forest_medium.joblib`을 로드하여 예측을 수행한다.

모델 파일 및 평가 메타데이터는 다음 경로에 저장된다.

```text
AI-DDos-Detection/AI_engine/models
```

## Backend setup

Backend는 FastAPI 기반으로 모델 로딩, flow feature 예측, PCAP 분석, 실시간 패킷 분석, 차단 대상 IP 조회 기능을 제공한다.

Backend 폴더로 이동한다.

```powershell
cd "AI-DDos-Detection\Backend"
```

가상환경을 생성하고 패키지를 설치한다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

FastAPI 서버를 실행한다.

```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

정상 실행 시 다음과 유사한 메시지가 출력된다.

```text
Uvicorn running on http://0.0.0.0:8000
Application startup complete.
```

Backend 상태를 확인한다.

```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

정상 응답 예시는 다음과 같다.

```text
StatusCode: 200
status: ok
required_feature_count: 20
```

## Frontend setup

Frontend는 React/Vite 기반 대시보드로, Backend API를 호출하여 서버 상태, 예측 결과, PCAP 분석 결과, 실시간 분석 결과, 차단 IP 목록을 확인한다.

Frontend 폴더로 이동한다.

```powershell
cd "AI-DDos-Detection\Frontend"
```

패키지를 설치한다.

```powershell
npm.cmd install
```

개발 서버를 실행한다.

```powershell
npm.cmd run dev -- --host 0.0.0.0 --port 5173
```

브라우저에서 아래 주소로 접속한다.

```text
http://localhost:5173
```

정상 실행 시 대시보드 화면에서 다음 항목을 확인할 수 있다.

```text
서버 상태
예측 테스트
PCAP 분석
실시간 분석
차단 IP 목록
최근 분석 결과
```

## Main API endpoints

```text
GET    /health
POST   /predict
POST   /analyze/pcap
POST   /analyze/live
GET    /blocked-sources
DELETE /blocked-sources/{source_ip}
```

`/health`는 Backend 서버 상태와 모델 로딩 정보를 확인한다.

`/predict`는 사용자가 입력한 20개 flow feature 값을 기반으로 정상 또는 공격 여부를 예측한다.

`/analyze/pcap`은 PCAP 파일을 읽어 flow feature를 생성하고 모델로 분석한다.

`/analyze/live`는 지정한 네트워크 인터페이스에서 일정 시간 동안 패킷을 캡처하고 flow feature를 생성하여 분석한다.

`/blocked-sources`는 현재 차단 대상으로 관리 중인 source IP 목록을 조회한다.

## Risk decision policy

모델 출력값은 다음 기준으로 해석한다.

```text
prediction = 0 → 정상 트래픽으로 예측
prediction = 1 → 공격 트래픽으로 예측
attack_probability → 공격 클래스 확률
risk_score = attack_probability × 100
```

위험도 등급은 다음 기준으로 분류한다.

```text
0 ~ 39.99   → low
40 ~ 69.99  → medium
70 ~ 89.99  → high
90 ~ 100    → critical
```

기본 차단 기준은 다음과 같다.

```text
prediction = 1
risk_score >= 70
```

위 조건을 만족하면 공격 가능성이 높은 flow로 판단하고 차단 대상으로 처리한다. 단, 현재 기본 구현은 VM1을 통과하는 트래픽을 실시간 분석하고 위험도를 판단하는 구조이며, 커널 수준에서 모든 패킷을 선분석 후통과시키는 구조는 별도 패킷 필터 구현이 필요하다.

## PCAP analysis test

PCAP 분석은 저장된 PCAP 파일을 읽어 flow feature를 생성하고 모델로 분석하는 기능이다.

요청 예시는 다음과 같다.

```powershell
$body = @{
  pcap_path = "C:\path\to\sample.pcap"
  apply_defense = $false
  packet_limit = 50000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/analyze/pcap" -Method Post -Body $body -ContentType "application/json"
```

예상 결과는 다음과 같다.

```text
total_flows
attack_flows
benign_flows
log_csv_path
log_json_path
flow별 prediction 및 risk_score
```

## Live analysis test

실시간 분석은 VM1의 네트워크 인터페이스에서 일정 시간 동안 패킷을 캡처하여 분석한다.

VM1에서 인터페이스 이름을 확인한다.

```powershell
Get-NetAdapter
```

요청 예시는 다음과 같다.

```powershell
$body = @{
  interface = "Ethernet1"
  duration_seconds = 10
  apply_defense = $false
  packet_limit = 50000
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/analyze/live" -Method Post -Body $body -ContentType "application/json"
```

예상 결과는 다음과 같다.

```text
total_flows
attack_flows
benign_flows
log_csv_path
log_json_path
flow별 prediction 및 risk_score
```

## VM test structure

VM 기반 테스트는 다음 구조를 기준으로 한다.

```text
VM3 → VM1 → VM2
```

```text
VM1: AI 분석 및 Backend 실행 VM
VM2: 내부 서버 VM
VM3: 트래픽 발생 VM
```

검증 목표는 다음과 같다.

```text
VM3에서 발생한 트래픽이 VM1을 거쳐 VM2로 전달되는지 확인
VM1에서 해당 트래픽을 실시간 캡처 및 분석할 수 있는지 확인
Frontend에서 분석 결과가 표시되는지 확인
```

VM2에서 테스트 서버를 실행한다.

```powershell
python -m http.server 8000
```

VM3에서 VM2로 요청을 전송한다.

```powershell
Invoke-WebRequest http://192.168.145.128:8000 -TimeoutSec 10
```

VM1에서 `/analyze/live`를 실행하여 flow 분석 결과가 생성되는지 확인한다.

## Verification commands

Frontend production build 검증:

```powershell
cd "AI-DDos-Detection\Frontend"
npm.cmd run build
```

Backend Python 문법 검사:

```powershell
cd "AI-DDos-Detection"
python -m py_compile Backend\app\main.py Backend\app\config.py Backend\app\schemas.py Backend\app\services\defense.py Backend\app\services\flow_analysis.py Backend\app\services\inference.py
```

AI_engine Python 문법 검사:

```powershell
cd "AI-DDos-Detection"
python -m py_compile AI_engine\src\features\prepare_cic_csv_dataset.py AI_engine\src\features\extract_pcap_features.py AI_engine\src\models\train_model.py AI_engine\src\models\predict_flow.py
```

## Notes

원본 CIC CSV 및 PCAP 전체 파일은 용량이 매우 커서 GitHub에 포함하지 않았다. 대신 실제 학습 및 평가에 사용한 전처리 CSV와 메타데이터를 포함하였다.

실시간 분석 기능은 Npcap 설치, 관리자 권한, VM 네트워크 설정, 인터페이스 이름에 따라 실행 결과가 달라질 수 있다.
