# 배포 가이드

## CI/CD 개요

- PR 생성 시 `kakao_ci_pr.yml`이 린트/테스트/빌드를 수행한다.
- `main`에 머지되면 `kakao_ci.yml`이 Docker 이미지를 빌드해 KCR에 푸시하고 릴리즈를 생성한다.
- 릴리즈 완료 후 `kakao_cd.yml`이 프로덕션 배포를 수행한다.

## 필수 시크릿 (GitHub Actions)

- `INFISICAL_SERVICE_TOKEN` (GitHub Secrets)
- Infisical에 저장된 값: `KCR_REGISTRY`, `KCR_IMAGE`, `KAKAO_ACCESS_KEY`, `KAKAO_SECRET_KEY`, `KAKAO_CLOUD_HOST`, `KAKAO_CLOUD_USER`, `KAKAO_CLOUD_SSH_KEY`

## 프로덕션 배포 흐름

1. `kakao_ci.yml`이 Docker 이미지를 `latest`와 버전 태그로 푸시
2. `kakao_cd.yml`이 `.github/scripts/deploy.sh`를 서버에 전송
3. 배포 스크립트가 새 컨테이너를 띄우고 `/api/health`로 헬스체크
4. Nginx 업스트림을 새 포트로 전환 (블루/그린)

## 롤백

- `kakao_cd.yml`을 수동 실행하고 `image_tag`에 이전 릴리즈 태그를 입력한다.

## 로컬/테스트 실행

```bash
npm install
cp .env.example .env
npm run start:dev
```

## Docker 기반 실행

```bash
docker build -t backend .
docker run --rm -p 3000:3000 --env-file .env backend
```

## 런타임 필수 환경 변수 (Infisical로 주입)

- `DATABASE_URL`
- `SESSION_SECRET`
- `FRONTEND_URLS` (콤마 구분)
- `SWAGGER_ID`, `SWAGGER_PW` (운영에서 필수)
- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_CALLBACK_URL`
- `KAKAO_REGION`, `KAKAO_OBJECT_BASE`, `KAKAO_S3_ACCESS_KEY`, `KAKAO_S3_SECRET_KEY`
