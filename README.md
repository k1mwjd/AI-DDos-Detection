  # AI-DDos-Detection

  ## ?꾨줈?앺듃 媛쒖슂
  蹂??꾨줈?앺듃???몃?留앹뿉???좎엯?섎뒗 ?ㅽ듃?뚰겕 ?몃옒?쎌쓣 遺꾩꽍?섏뿬 DDoS 怨듦꺽 ?щ?瑜??먮떒?섍퀬, ?뺤긽?쇰줈 ?먮퀎???몃옒?쎈쭔 ?대?
  ?쒕쾭留앹쑝濡??꾨떖?섎뒗 AI 湲곕컲 DDoS 諛⑺솕踰?援ы쁽??紐⑺몴濡??쒕떎.

  ?대? ?꾪빐 CIC 怨꾩뿴 ?ㅽ듃?뚰겕 ?몃옒??CSV ?곗씠?곗뀑???ъ슜?섏뿬 ?뺤긽 ?몃옒?쎄낵 怨듦꺽 ?몃옒?쎌쓣 援щ텇?섎뒗 ?댁쭊 遺꾨쪟 紐⑤뜽???숈뒿
  ?섏??? 紐⑤뜽? ?쒕뜡 ?щ젅?ㅽ듃(Random Forest) 遺꾨쪟湲곕? 湲곕컲?쇰줈 援ъ꽦?섏??쇰ŉ, ?곗씠???꾩쿂由? feature ?좏깮, 紐⑤뜽 ?숈뒿, ??  ???됯?, ?숈뒿 紐⑤뜽 ??κ퉴吏??怨쇱젙??援ы쁽?섏???

  ?먰븳 ?ㅼ젣 ?ㅽ듃?뚰겕 ?섍꼍???곸슜?????덈룄濡? ?숈뒿???ъ슜?섎뒗 feature???댄썑 VM ?섍꼍?먯꽌???ㅼ떆 怨꾩궛 媛?ν븳 flow 湲곕컲
  feature ?꾩＜濡??좎젙?섏??? ?대? 諛뷀깢?쇰줈 ?ν썑?먮뒗 ?ㅼ떆媛??ㅽ듃?뚰겕 ?몃옒??遺꾩꽍 諛?李⑤떒 湲곕뒫源뚯? ?뺤옣?섎뒗 寃껋쓣 紐⑺몴濡???  ??

  ## ?쒖뒪???붽뎄?ы빆
  - OS: Windows 11 Pro, 64-bit
  - Virtual-Environments: VMware짰 Workstation Pro 25.0.0.24995812
  - Language: Python
  - Dataset: CIC-DDoS 2019
  - ?꾩닔 ?쇱씠釉뚮윭由?
    - pandas
    - numpy
    - scikit-learn
    - joblib
    - scapy


## Directory layout

```
AI-DDos-Detection
└── dedos_Defense
    └── AI_engine
        ├── data                   # Project data directory
        │   ├── raw                # Raw input data or temporary source files
        │   ├── processed          # Preprocessed train/test CSV files and derived outputs
        │   └── realtime_logs      # Runtime or experiment log outputs
        ├── docs                   # Project documentation and progress notes
        ├── models                 # Trained Random Forest models and evaluation metadata
        └── src                    # Source code
            ├── capture            # Packet-related modules
            ├── features           # Dataset preprocessing and feature preparation code
            ├── firewall           # Firewall-related extension modules
            ├── models             # Training and prediction code
            └── utils              # Shared configuration and helper code
```
## ?숈뒿 ?뚯씠?꾨씪??
### 1. ?숈뒿 ?곗씠?곗뀑 ?앹꽦

```powershell
.\.venv\Scripts\python.exe -m src.features.prepare_cic_csv_dataset `
  --input-dir ..\data\csv\01-12 `
  --output-csv data\processed\train_dataset_medium.csv `
  --metadata-output data\processed\train_dataset_medium_metadata.json `
  --max-benign-rows-per-file 500 `
  --max-attack-rows-per-file 2000 `
  --chunk-size 50000
```

### 2. ?뚯뒪???곗씠?곗뀑 ?앹꽦

```powershell
.\.venv\Scripts\python.exe -m src.features.prepare_cic_csv_dataset `
  --input-dir ..\data\csv\03-11 `
  --output-csv data\processed\test_dataset_medium.csv `
  --metadata-output data\processed\test_dataset_medium_metadata.json `
  --max-benign-rows-per-file 500 `
  --max-attack-rows-per-file 2000 `
  --chunk-size 50000
```

### 3. 紐⑤뜽 ?숈뒿 諛??됯?

```powershell
.\.venv\Scripts\python.exe -m src.models.train_model `
  --train-csv data\processed\train_dataset_medium.csv `
  --test-csv data\processed\test_dataset_medium.csv `
  --model-output models\random_forest_medium.joblib `
  --metadata-output models\model_metadata_medium.json `
  --n-estimators 300
```

## ?꾩옱 寃곌낵

?뺤옣 ?곗씠?곗뀑 湲곗?:

- train rows: `27392`
- test rows: `17500`
- total rows: `44892`

?됯? 吏??

- Precision: `0.9899`
- Recall: `0.9689`
- F1-score: `0.9792`

?쇰룞?됰젹:

- TN = `3361`
- FP = `139`
- FN = `436`
- TP = `13564`

??寃곌낵???쇰꺼???덈뒗 ?뚯뒪??CSV瑜?湲곗??쇰줈 怨꾩궛??媛믪씠硫? ?꾩옱 ?쒖떆?섎뒗 紐⑤뜽 ?깅뒫 寃곌낵?????됯? 寃곌낵瑜?湲곗??쇰줈 ?쒕떎.
