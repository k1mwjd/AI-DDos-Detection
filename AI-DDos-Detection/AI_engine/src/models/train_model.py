from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, confusion_matrix, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split

# 🔥 새롭게 추가된 강력한 부스팅 알고리즘들
from xgboost import XGBClassifier
from lightgbm import LGBMClassifier

from src.utils.config import FEATURE_COLUMNS, LABEL_COLUMN


def load_feature_csvs(csv_paths: list[Path]) -> pd.DataFrame:
    frames = [pd.read_csv(path) for path in csv_paths]
    if not frames:
        raise ValueError("No feature CSV files were provided.")
    combined = pd.concat(frames, ignore_index=True)
    return combined


def validate_dataset(df: pd.DataFrame) -> None:
    missing_columns = [column for column in FEATURE_COLUMNS + [LABEL_COLUMN] if column not in df.columns]
    if missing_columns:
        raise KeyError(f"Missing required columns: {missing_columns}")


def train_model(
    input_csvs: list[Path] | None,
    model_output: Path,
    metadata_output: Path,
    train_csv: Path | None = None,
    test_csv: Path | None = None,
    test_size: float = 0.2,
    random_state: int = 42,
    n_estimators: int = 200,
) -> None:
    if train_csv is not None and test_csv is not None:
        train_df = pd.read_csv(train_csv)
        test_df = pd.read_csv(test_csv)
        validate_dataset(train_df)
        validate_dataset(test_df)

        X_train = train_df[FEATURE_COLUMNS].copy()
        y_train = train_df[LABEL_COLUMN].astype(int).copy()
        X_test = test_df[FEATURE_COLUMNS].copy()
        y_test = test_df[LABEL_COLUMN].astype(int).copy()
        total_row_count = len(train_df) + len(test_df)
    else:
        if not input_csvs:
            raise ValueError("Either input_csvs or both train_csv/test_csv must be provided.")
        df = load_feature_csvs(input_csvs)
        validate_dataset(df)

        X = df[FEATURE_COLUMNS].copy()
        y = df[LABEL_COLUMN].astype(int).copy()

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=test_size,
            random_state=random_state,
            stratify=y if y.nunique() > 1 else None,
        )
        total_row_count = len(df)

    model_output.parent.mkdir(parents=True, exist_ok=True)
    metadata_output.parent.mkdir(parents=True, exist_ok=True)

    # 1. 💡 테스트할 알고리즘 목록 정의 (n_jobs=-1을 주어 컴퓨터의 모든 코어를 사용해 속도를 높임)
    models = {
        "Logistic_Regression": LogisticRegression(max_iter=1000, random_state=random_state, class_weight="balanced"),
        "Random_Forest": RandomForestClassifier(n_estimators=n_estimators, random_state=random_state, n_jobs=-1, class_weight="balanced"),
        "XGBoost": XGBClassifier(n_estimators=n_estimators, random_state=random_state, n_jobs=-1, eval_metric='logloss'),
        "LightGBM": LGBMClassifier(n_estimators=n_estimators, random_state=random_state, class_weight="balanced", n_jobs=-1)
    }

    comparison_results = {}
    best_f1 = 0
    best_model_name = ""

    # 2. 💡 반복문을 돌며 모든 모델을 순서대로 학습 및 평가
    for name, model in models.items():
        print(f"\n[*] Training {name}...")
        model.fit(X_train, y_train)

        y_pred = model.predict(X_test)
        metrics = {
            "precision": float(precision_score(y_test, y_pred, zero_division=0)),
            "recall": float(recall_score(y_test, y_pred, zero_division=0)),
            "f1_score": float(f1_score(y_test, y_pred, zero_division=0)),
            "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
        }
        comparison_results[name] = metrics

        # 가장 성능이 좋은(F1-Score 기준) 모델 찾기
        if metrics["f1_score"] > best_f1:
            best_f1 = metrics["f1_score"]
            best_model_name = name

        # 모델별로 파일 이름에 알고리즘 이름을 붙여서 따로 저장 (예: random_forest_XGBoost.joblib)
        specific_model_path = model_output.with_name(f"{model_output.stem}_{name}{model_output.suffix}")
        joblib.dump(model, specific_model_path)

        # 트리 기반 알고리즘(Random Forest, XGBoost, LightGBM)인 경우에만 중요도 추출
        if hasattr(model, 'feature_importances_'):
            importance_df = (
                pd.DataFrame({
                    "feature": FEATURE_COLUMNS,
                    "importance": model.feature_importances_,
                })
                .sort_values("importance", ascending=False)
                .reset_index(drop=True)
            )
            importance_path = metadata_output.with_name(f"feature_importance_{name}.csv")
            importance_df.to_csv(importance_path, index=False)

    # 3. 💡 비교 결과를 하나의 JSON 메타데이터로 합쳐서 저장
    metadata = {
        "feature_columns": FEATURE_COLUMNS,
        "label_column": LABEL_COLUMN,
        "row_count": int(total_row_count),
        "train_row_count": int(len(X_train)),
        "test_row_count": int(len(X_test)),
        "model_metrics": comparison_results,
        "best_model": best_model_name
    }
    with open(metadata_output, "w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2, ensure_ascii=False)

    # 4. 💡 터미널에 한눈에 들어오는 비교 표 출력
    print("\n" + "="*50)
    print("🏆 모델 유효성 비교 결과 (Model Comparison)")
    print("="*50)
    for name, metrics in comparison_results.items():
        print(f"🔹 {name}")
        print(f"  - 정밀도(Precision): {metrics['precision']:.4f}")
        print(f"  - 재현율(Recall):    {metrics['recall']:.4f}")
        print(f"  - F1-Score:          {metrics['f1_score']:.4f}\n")
    
    print(f"🔥 가장 성능이 좋은 모델: {best_model_name} (F1-Score: {best_f1:.4f})")
    print("="*50)
    print(f"📁 모델 저장 위치: {model_output.parent}")
    print(f"📄 비교 결과 데이터 저장: {metadata_output}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train and compare multiple models on extracted DDoS feature CSVs.")
    parser.add_argument("--input-csv", type=Path, nargs="+", default=None, help="One or more feature CSV files.")
    parser.add_argument("--train-csv", type=Path, default=None, help="Prebuilt train dataset CSV.")
    parser.add_argument("--test-csv", type=Path, default=None, help="Prebuilt test dataset CSV.")
    parser.add_argument("--model-output", type=Path, default=Path("models/model.joblib"), help="Base output model path.")
    parser.add_argument("--metadata-output", type=Path, default=Path("models/model_metadata.json"), help="Output metadata path.")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio.")
    parser.add_argument("--n-estimators", type=int, default=200, help="Number of trees in the forest/boosting algorithms.")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    train_model(
        input_csvs=args.input_csv,
        model_output=args.model_output,
        metadata_output=args.metadata_output,
        train_csv=args.train_csv,
        test_csv=args.test_csv,
        test_size=args.test_size,
        n_estimators=args.n_estimators,
    )