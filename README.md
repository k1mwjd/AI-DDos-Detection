# AI-DDos-Detection

## 프로젝트 개요
본 프로젝트는 외부망에서 유입되는 네트워크 트래픽을 분석하여 DDoS 공격 여부를 판단하고, 정상으로 판별된 트래픽만 내부 서버망으로 전달하는 AI 기반 DDoS 방화벽 구현을 목표로 한다.

이를 위해 CIC 계열 네트워크 트래픽 CSV 데이터셋을 사용하여 정상 트래픽과 공격 트래픽을 구분하는 이진 분류 모델을 학습하였다. 모델은 랜덤 포레스트(Random Forest) 분류기를 기반으로 구성하였으며, 데이터 전처리, feature 선택, 모델 학습, 성능 평가, 학습 모델 저장까지의 과정을 구현하였다.

또한 실제 네트워크 환경에 적용할 수 있도록, 학습에 사용되는 feature는 이후 VM 환경에서도 다시 계산 가능한 flow 기반 feature 위주로 선정하였다. 이를 바탕으로 향후에는 실시간 네트워크 트래픽 분석 및 차단 기능까지 확장하는 것을 목표로 한다.

현재 구현 범위는 다음과 같다.

- CSV 전처리
- feature subset 구성
- Random Forest 모델 학습
- 성능 평가
- 학습된 모델 저장
- 저장된 모델 기반 CSV 예측
- FastAPI 기반 예측 API
- 위험도 계산 및 차단 판단 API

## 시스템 요구사항
- 운영 체제: Windows 11
- 가상화 환경: VMware
- 프로그래밍 언어: Python
- 사용 데이터셋: CIC 계열 DDoS 트래픽 CSV 데이터
- 필수 라이브러리
  - pandas
  - numpy
  - scikit-learn
  - joblib
  - scapy
  - fastapi
  - uvicorn

## Directory layout

```text
AI-DDos-Detection/          # 프로젝트 루트
├── AI_engine/              # AI/ML 탐지 엔진 (Python, Random Forest)
│   ├── data/
│   │   ├── raw/
│   │   ├── processed/
│   │   └── realtime_logs/
│   ├── docs/
│   ├── models/
│   └── src/
│       ├── capture/
│       ├── features/
│       ├── firewall/
│       ├── models/
│       └── utils/
├── Backend/                # FastAPI 탐지 API 서버 (Python)
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── schemas.py
│   │   └── services/
│   │       ├── inference.py
│   │       ├── defense.py
│   │       └── flow_analysis.py
│   ├── requirements.txt
│   └── runtime_logs/
├── Frontend/          # React/Vite 모니터링 대시보드
└── nest_gateway/           # NestJS API 게이트웨이
```

## 데이터 사용 방식
- 학습용 데이터: `01-12`
- 테스트용 데이터: `03-11`

학습과 평가는 날짜를 분리하여 진행하며, `03-11` 데이터는 테스트 전용으로 사용한다.

## 사용 feature
- `destination_port`
- `protocol`
- `flow_duration`
- `total_fwd_packets`
- `total_backward_packets`
- `total_length_fwd_packets`
- `total_length_bwd_packets`
- `flow_bytes_per_s`
- `flow_packets_per_s`
- `fwd_packets_per_s`
- `bwd_packets_per_s`
- `min_packet_length`
- `max_packet_length`
- `packet_length_mean`
- `packet_length_std`
- `syn_flag_count`
- `rst_flag_count`
- `ack_flag_count`
- `average_packet_size`
- `down_up_ratio`


### 위험도 분류 기준

`attack_probability`를 0~100 점수로 변환한 뒤 아래 기준으로 분류한다.

| risk_level | risk_score 범위 |
|------------|----------------|
| low        | 0 ~ 39         |
| medium     | 40 ~ 69        |
| high       | 70 ~ 89        |
| critical   | 90 ~ 100       |

`prediction == 1`이고 `risk_score >= threshold`인 경우에만 차단이 실행된다.


## 학습 파이프라인
### 1. 학습 데이터셋 생성
```powershell
.\.venv\Scripts\python.exe -m src.features.prepare_cic_csv_dataset `
  --input-dir ..\data\csv\01-12 `
  --output-csv data\processed\train_dataset_medium.csv `
  --metadata-output data\processed\train_dataset_medium_metadata.json `
  --max-benign-rows-per-file 500 `
  --max-attack-rows-per-file 2000 `
  --chunk-size 50000
```

### 2. 테스트 데이터셋 생성
```powershell
.\.venv\Scripts\python.exe -m src.features.prepare_cic_csv_dataset `
  --input-dir ..\data\csv\03-11 `
  --output-csv data\processed\test_dataset_medium.csv `
  --metadata-output data\processed\test_dataset_medium_metadata.json `
  --max-benign-rows-per-file 500 `
  --max-attack-rows-per-file 2000 `
  --chunk-size 50000
```

### 3. 모델 학습 및 평가
```powershell
.\.venv\Scripts\python.exe -m src.models.train_model `
  --train-csv data\processed\train_dataset_medium.csv `
  --test-csv data\processed\test_dataset_medium.csv `
  --model-output models\random_forest_medium.joblib `
  --metadata-output models\model_metadata_medium.json `
  --n-estimators 300
```
---

## 현재 결과
- train rows: `27392`
- test rows: `17500`
- total rows: `44892`

평가 지표
- Precision: `0.9899`
- Recall: `0.9689`
- F1-score: `0.9792`

혼동행렬
- TN = `3361`
- FP = `139`
- FN = `436`
- TP = `13564`

  
## 백엔드 실행 및 테스트
### 1. Backend 폴더 이동 및 가상환경 생성
```powershell
cd "AI-DDos-Detection\Backend"
python -m venv .venv
Set-ExecutionPolicy -Scope Process Bypass
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
```

### 2. FastAPI 서버 실행
```powershell
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Windows 방화벽 차단까지 함께 사용할 경우
```powershell
$env:AI_DDOS_ENABLE_WINDOWS_FIREWALL="true"
$env:AI_DDOS_DEFENSE_THRESHOLD="70"
$env:AI_DDOS_BLOCK_SECONDS="600"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4. 상태 확인
```powershell
Invoke-WebRequest http://127.0.0.1:8000/health
```

### 5. 예측 API 테스트
```powershell
$body = @{
  source_ip = "192.168.0.10"
  features = @{
    destination_port = 80
    protocol = 6
    flow_duration = 1200
    total_fwd_packets = 50
    total_backward_packets = 3
    total_length_fwd_packets = 4000
    total_length_bwd_packets = 180
    flow_bytes_per_s = 3500
    flow_packets_per_s = 44
    fwd_packets_per_s = 41
    bwd_packets_per_s = 3
    min_packet_length = 60
    max_packet_length = 1500
    packet_length_mean = 78
    packet_length_std = 33
    syn_flag_count = 45
    rst_flag_count = 0
    ack_flag_count = 2
    average_packet_size = 76
    down_up_ratio = 0.06
  }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/predict" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### 6. PCAP 자동 분석 테스트
```powershell
$body = @{
  pcap_path = "C:\path\to\sample.pcap"
  apply_defense = $false
  packet_limit = 50000
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/analyze/pcap" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### 7. 실시간 패킷 분석 테스트
```powershell
$body = @{
  interface = "Ethernet"
  duration_seconds = 10
  apply_defense = $false
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/analyze/live" `
  -Method Post `
  -Body $body `
  -ContentType "application/json"
```

### 8. 차단 목록 조회
```powershell
Invoke-RestMethod http://127.0.0.1:8000/blocked-sources
```

### 9. 특정 IP 차단 해제
```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/blocked-sources/192.168.0.10" `
  -Method Delete
```

## 프론트엔드 실행 (Frontend)

AI 엔진 및 백엔드가 분석한 실시간 네트워크 트래픽 상태와 방화벽 차단 현황을 시각화하는 보안 관제 대시보드입니다.

### 폴더 구조
```text
Frontend/
├── public/                 # 정적 자산 (아이콘 등)
├── src/
│   ├── assets/             # 컴포넌트 내부 이미지/자산
│   ├── App.tsx             # 대시보드 메인 UI 및 상태/통신 로직
│   ├── main.tsx            # React 진입점
│   └── index.css           # 글로벌 스타일
├── index.html
├── package.json
├── vite.config.ts
└── tsconfig.json
```

### 실행 방법
```powershell
cd "AI-DDos-Detection\Frontend"
npm install
npm run dev
```

---

## 현재 결과
- train rows: `27392`
- test rows: `17500`
- total rows: `44892`

평가 지표
- Precision: `0.9899`
- Recall: `0.9689`
- F1-score: `0.9792`

혼동행렬
- TN = `3361`
- FP = `139`
- FN = `436`
- TP = `13564`
