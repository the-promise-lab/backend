# Backend

NestJS 기반의 백엔드 애플리케이션입니다.

## 🚀 기술 스택

- **Node.js v20.19.4** - JavaScript 런타임 (nvm 관리)
- **NestJS** - Node.js 프레임워크
- **TypeScript** - 정적 타입 지원
- **Swagger/OpenAPI** - API 문서화
- **Jest** - 테스팅 프레임워크
- **ESLint & Prettier** - 코드 품질 관리

## 📁 프로젝트 구조

```
src/
├── common/          # 공통 유틸리티
│   ├── decorators/  # 커스텀 데코레이터
│   ├── filters/     # 예외 필터
│   ├── guards/      # 가드
│   ├── interceptors/# 인터셉터
│   ├── pipes/       # 파이프
│   └── middleware/  # 미들웨어
├── modules/         # 기능별 모듈
│   ├── auth/        # 인증 모듈
│   └── users/       # 사용자 모듈
├── config/          # 설정 파일
├── app.module.ts    # 루트 모듈
├── app.controller.ts# 루트 컨트롤러
├── app.service.ts   # 루트 서비스
└── main.ts          # 애플리케이션 진입점
```

## 🛠️ 설치 및 실행

### Node.js 버전 관리

이 프로젝트는 Node.js v20.19.4를 사용합니다. nvm을 사용하여 버전을 관리합니다.

```bash
# nvm 설치 (없는 경우)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# Node.js 20 설치 및 사용
nvm install 20
nvm use

# 또는 .nvmrc 파일 기반으로 자동 설정
nvm use
```

### 환경 변수 설정

`.env.example` 파일을 참고하여 `.env` 파일을 생성하세요.

```bash
cp .env.example .env
```

### 패키지 설치

```bash
npm install
```

### 개발 서버 실행

```bash
# 개발 모드
npm run start:dev

# 디버그 모드
npm run start:debug

# 프로덕션 모드
npm run start:prod
```

### 빌드

```bash
npm run build
```

## 🧪 테스트

```bash
# 단위 테스트
npm run test

# 테스트 감시 모드
npm run test:watch

# 커버리지 리포트
npm run test:cov

# E2E 테스트
npm run test:e2e
```

## 📋 코드 품질

```bash
# 린팅
npm run lint

# 포매팅
npm run format
```

## 📡 API 엔드포인트

### 기본 엔드포인트

- `GET /api` - Hello World 메시지
- `GET /api/health` - 헬스 체크

### API 문서

- **Swagger UI**: `http://localhost:3000/api/docs` - 대화형 API 문서
- **API 접근**: `http://localhost:3000/api` - 실제 API 엔드포인트

개발 서버 실행 후 Swagger UI에서 모든 API를 테스트할 수 있습니다.

## 🔒 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `PORT` | 서버 포트 | `3000` |
| `NODE_ENV` | 환경 모드 | `development` |
| `DATABASE_URL` | 데이터베이스 URL | - |

## 📝 개발 가이드

### 새 모듈 생성

```bash
nest generate module modules/your-module
nest generate controller modules/your-module
nest generate service modules/your-module
```

### 미들웨어 생성

```bash
nest generate middleware common/middleware/your-middleware
```

### 가드 생성

```bash
nest generate guard common/guards/your-guard
```

## 🤝 기여하기

1. 프로젝트를 포크합니다
2. 새 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다