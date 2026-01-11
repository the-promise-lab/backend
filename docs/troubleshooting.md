# 트러블슈팅 가이드

## 애플리케이션이 바로 종료됨

- 로그에 `DATABASE_URL is required`가 나오면 Infisical 설정 또는 `.env`를 확인하세요.
- `SWAGGER_ID and SWAGGER_PW` 오류는 `IS_LOCAL=true`가 아니면 필수입니다.

## 로컬 개발에서 DB 연결 실패

- `IS_LOCAL=true`일 때 SSH 터널이 필요합니다.
- `SSH_PRIVATE_KEY_PATH`는 절대 경로를 권장합니다.
- 터널 포트 충돌 시 `SSH_LOCAL_PORT`를 다른 값으로 변경하세요.

## Kakao 로그인 실패

- `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `KAKAO_CALLBACK_URL` 값 확인.
- 콜백 URL이 Kakao 콘솔 설정과 정확히 일치하는지 점검.

## Object Storage 호출 실패

- `KAKAO_REGION`, `KAKAO_OBJECT_BASE`, `KAKAO_S3_ACCESS_KEY`, `KAKAO_S3_SECRET_KEY` 값 확인.
- 버킷이 존재하는지와 권한이 충분한지 확인.

## 세션이 유지되지 않음

- `SESSION_SECRET`이 설정되지 않았는지 확인.
- 운영 환경의 쿠키 도메인은 `43.200.235.94.nip.io`로 설정되어 있으므로 도메인 변경 시 함께 수정 필요.

## CORS 오류

- `FRONTEND_URLS`에 프론트엔드 도메인을 콤마로 추가하세요.
