# AI 기반 DDoS 방화벽

## 프로젝트 개요
본 프로젝트는 외부망에서 유입되는 네트워크 트래픽을 분석하여 DDoS 공격 여부를 판단하고, 정상으로 판별된 트래픽만 내부 서버망으로 전달하는 AI 기반 DDoS 방화벽 구현을 목표로 한다.

이를 위해 CIC 계열 네트워크 트래픽 CSV 데이터셋을 사용하여 정상 트래픽과 공격 트래픽을 구분하는 이진 분류 모델을 학습하였다. 모델은 Random Forest 분류기를 기반으로 구성하였으며, 데이터 전처리, feature 선택, 모델 학습, 성능 평가, 학습 모델 저장까지의 과정을 구현하였다.

## 시스템 요구사항
- 운영 체제: Windows 11
- 가상화 환경: VMware
- 프로그래밍 언어: Python
- 사용 데이터셋: CIC 계열 DDoS 트래픽 CSV 데이터
- 필수 라이브러리:
  - pandas
  - numpy
  - scikit-learn
  - joblib
  - scapy

## Directory layout

```text
AI-DDos-Detection
└── AI_engine
    ├── data                   # Project data directory
    │   ├── raw                # Raw input data or temporary source files
    │   ├── processed          # Preprocessed train/test CSV files and derived outputs
    │   └── realtime_logs      # Runtime or experiment log outputs
    ├── docs                   # Project documentation and progress notes
    ├── models                 # Trained Random Forest models and evaluation metadata
    └── src                    # Source code
        ├── capture            # Packet-related helper modules
        ├── features           # Dataset preprocessing and feature preparation code
        ├── firewall           # Firewall-related extension modules
        ├── models             # Training and prediction code
        └── utils              # Shared configuration and helper code
```
