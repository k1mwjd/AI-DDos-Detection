# 🖥️ AI DDoS 탐지 시스템 - 프론트엔드 대시보드 (Frontend)

본 폴더는 AI 엔진 및 백엔드(FastAPI)가 분석한 실시간 네트워크 트래픽 상태와 방화벽 차단 현황을 시각화하여 모니터링하는 **보안 관제 대시보드 웹 애플리케이션**입니다.

---

## 📂 1. 프론트엔드 폴더 구조 (Directory Structure)

```text
Frontend/
├── node_modules/           # 의존성 라이브러리 폴더 (Git 관리 제외)
├── public/                 # 정적 자산 (아이콘 등)
├── src/
│   ├── assets/             # 컴포넌트 내부 사용 이미지/자산
│   ├── App.tsx             # 👑 대시보드 메인 화면 UI 및 상태/통신 핵심 로직
│   ├── main.tsx            # React 진입점 엔트리 파일
│   └── index.css           # Tailwind CSS 디렉티브 및 글로벌 스타일 설정
├── index.html              # 기본 HTML 템플릿
├── package.json            # 설치 패키지 및 스크립트 명세서
├── postcss.config.js       # 스타일 후처리 설정
├── tailwind.config.js      # Tailwind CSS 테마 및 레이아웃 설정
├── vite.config.ts          # Vite 빌드 및 개발 서버 설정
└── tsconfig.json           # TypeScript 컴파일 설정

# 1. 프론트엔드 디렉토리로 이동
cd Frontend

# 2. 필요한 모든 패키지 일괄 설치
npm install