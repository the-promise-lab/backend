#!/bin/bash
#
# Blue/Green 무중단 배포 스크립트
# 사용법: deploy.sh <IMAGE_TAG> <KCR_IMAGE> <KCR_REGISTRY> <KAKAO_ACCESS_KEY> <KAKAO_SECRET_KEY> <INFISICAL_SERVICE_TOKEN>
#

set -Eeuo pipefail
trap 'echo "❌ 배포 실패 (line $LINENO, exit code $?)"; exit 1' ERR

# === 인자 파싱 ===
IMAGE_TAG="${1:?IMAGE_TAG 필요}"
KCR_IMAGE="${2:?KCR_IMAGE 필요}"
KCR_REGISTRY="${3:?KCR_REGISTRY 필요}"
KAKAO_ACCESS_KEY="${4:?KAKAO_ACCESS_KEY 필요}"
KAKAO_SECRET_KEY="${5:?KAKAO_SECRET_KEY 필요}"
INFISICAL_SERVICE_TOKEN="${6:?INFISICAL_SERVICE_TOKEN 필요}"

CONTAINER_NAME="thepromise-backend"
NGINX_CONFIG="/etc/nginx/sites-available/thepromise-backend"
SWITCH_SCRIPT="/opt/thepromise/scripts/switch-backend.sh"

echo "🚀 배포 시작: ${KCR_IMAGE}:${IMAGE_TAG}"

# === 사전 체크 ===
command -v docker &>/dev/null || { echo "❌ Docker 미설치"; exit 1; }
command -v curl &>/dev/null || { echo "❌ curl 미설치"; exit 1; }

# === Docker 로그인 & 이미지 Pull ===
echo "${KAKAO_SECRET_KEY}" | docker login "${KCR_REGISTRY}" -u "${KAKAO_ACCESS_KEY}" --password-stdin
docker pull "${KCR_IMAGE}:${IMAGE_TAG}" || { echo "❌ 이미지 pull 실패"; exit 1; }

# === 이전 실패 배포의 임시 컨테이너 정리 ===
OLD_NEW_CONTAINER=$(docker ps -aq -f name="^${CONTAINER_NAME}-new$")
if [ -n "$OLD_NEW_CONTAINER" ]; then
  echo "🧹 임시 컨테이너 정리: $OLD_NEW_CONTAINER"
  docker stop "$OLD_NEW_CONTAINER" 2>/dev/null || true
  docker rm "$OLD_NEW_CONTAINER" 2>/dev/null || true
fi

# === Blue/Green 포트 결정 ===
CURRENT_PORT=3000
if [ -f "$NGINX_CONFIG" ]; then
  PARSED_PORT=$(awk '/upstream[[:space:]]+backend_active[[:space:]]*\{/,/\}/ { 
    if ($1=="server" && match($0,/127\.0\.0\.1:([0-9]+)/,m)) { print m[1]; exit } 
  }' "$NGINX_CONFIG" 2>/dev/null || true)
  [ -n "$PARSED_PORT" ] && CURRENT_PORT="$PARSED_PORT"
fi

NEW_PORT=$([[ "$CURRENT_PORT" == "3000" ]] && echo "3001" || echo "3000")
echo "🔄 포트 전환: $CURRENT_PORT → $NEW_PORT"

# === 새 컨테이너 실행 ===
cat > /tmp/.env <<EOF
INFISICAL_SERVICE_TOKEN=${INFISICAL_SERVICE_TOKEN}
INFISICAL_ENV=prod
EOF

NEW_CONTAINER_ID=$(docker run -d \
  --name "${CONTAINER_NAME}-new" \
  -p "127.0.0.1:${NEW_PORT}:3000" \
  --restart unless-stopped \
  --env-file /tmp/.env \
  -e NODE_ENV=production \
  "${KCR_IMAGE}:${IMAGE_TAG}")

rm -f /tmp/.env
echo "🆕 새 컨테이너: $NEW_CONTAINER_ID"

# === 헬스체크 (최대 60초) ===
for i in $(seq 1 20); do
  if [ "$(docker inspect -f '{{.State.Running}}' "$NEW_CONTAINER_ID" 2>/dev/null)" != "true" ]; then
    echo "❌ 컨테이너가 실행되지 않음"
    docker logs --tail 100 "$NEW_CONTAINER_ID" 2>/dev/null || true
    docker rm "$NEW_CONTAINER_ID" 2>/dev/null || true
    exit 1
  fi
  
  if curl -sf --max-time 3 "http://localhost:${NEW_PORT}/api/health" >/dev/null; then
    echo "✅ 헬스체크 성공"
    break
  fi
  
  echo "⏳ 헬스체크 대기 ($i/20)..."
  sleep 3
  
  if [ "$i" -eq 20 ]; then
    echo "❌ 헬스체크 타임아웃"
    docker logs --tail 100 "$NEW_CONTAINER_ID" 2>/dev/null || true
    docker stop "$NEW_CONTAINER_ID" 2>/dev/null || true
    docker rm "$NEW_CONTAINER_ID" 2>/dev/null || true
    exit 1
  fi
done

# === Nginx 트래픽 전환 ===
if [ ! -x "$SWITCH_SCRIPT" ]; then
  echo "❌ 스위치 스크립트 없음: $SWITCH_SCRIPT"
  exit 1
fi
sudo "$SWITCH_SCRIPT" "$NEW_PORT" "$CURRENT_PORT"

# === 이전 컨테이너 정리 ===
OLD_CONTAINER=$(docker ps -aq -f name="^${CONTAINER_NAME}$")
if [ -n "$OLD_CONTAINER" ] && [ "$OLD_CONTAINER" != "$NEW_CONTAINER_ID" ]; then
  echo "🧹 이전 컨테이너 정리"
  docker stop "$OLD_CONTAINER" 2>/dev/null || true
  docker rm "$OLD_CONTAINER" 2>/dev/null || true
fi

# === 컨테이너 이름 변경 & 정리 ===
docker rename "${CONTAINER_NAME}-new" "$CONTAINER_NAME"
docker image prune -f

echo "🎉 배포 완료: ${KCR_IMAGE}:${IMAGE_TAG} (포트: $NEW_PORT)"
