import pandas as pd
import numpy as np
import os
# 프로젝트의 실제 설정 파일에서 컬럼명을 직접 임포트합니다.
from src.utils.config import FEATURE_COLUMNS, LABEL_COLUMN

os.makedirs('data/processed', exist_ok=True)
os.makedirs('models', exist_ok=True)

# 코드가 요구하는 피처 컬럼들로 데이터프레임 생성
df = pd.DataFrame(np.random.rand(200, len(FEATURE_COLUMNS)), columns=FEATURE_COLUMNS)

# 코드가 요구하는 정확한 라벨 컬럼명으로 타겟 지정 (0 또는 1)
df[LABEL_COLUMN] = np.random.randint(0, 2, 200)

# 가짜 데이터 저장
df.to_csv('data/processed/train_dataset_medium.csv', index=False)
df.to_csv('data/processed/test_dataset_medium.csv', index=False)

print(f"정확한 컬럼 구조로 가짜 데이터셋 생성 완료! (라벨 컬럼명: {LABEL_COLUMN})")
