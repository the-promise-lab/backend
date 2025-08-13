#!/bin/bash

# Ubuntu 24.04.2 LTS에서 Nginx를 사용한 무중단 배포 환경 설정 스크립트
# 실행 방법: sudo bash setup-nginx.sh

set -Eeuo pipefail
IFS=$'\n\t'

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수들
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# root 권한 확인
if [[ $EUID -ne 0 ]]; then
   log_error "이 스크립트는 root 권한으로 실행되어야 합니다."
   log_info "다음과 같이 실행하세요: sudo bash $0"
   exit 1
fi

log_info "🚀 Ubuntu 24.04.2 LTS에서 Nginx 무중단 배포 환경 설정을 시작합니다..."

# 1. 시스템 업데이트
log_info "📦 시스템 패키지 업데이트 중..."
apt update -y
apt upgrade -y

# 2. 필수 패키지 설치
log_info "🔧 필수 패키지 설치 중..."
apt install -y nginx curl ufw software-properties-common

# 3. Nginx 버전 확인
log_success "✅ Nginx 설치 완료: $(nginx -v 2>&1)"

# 4. Nginx 서비스 시작 및 부팅시 자동 시작 설정
log_info "🔄 Nginx 서비스 설정 중..."
systemctl start nginx
systemctl enable nginx

# 5. 방화벽 설정
log_info "🔥 방화벽 설정 중..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3000  # 백엔드 컨테이너 포트
ufw allow 3001  # 블루/그린 배포용 포트

log_success "✅ 방화벽 설정 완료"
ufw status

# 6. 기본 Nginx 설정 백업
log_info "💾 기본 Nginx 설정 백업 중..."
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.backup
cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup

# 7. 무중단 배포용 Nginx 설정 생성
log_info "⚙️ 무중단 배포용 Nginx 설정 생성 중..."

# 메인 설정 파일 생성
cat > /etc/nginx/sites-available/thepromise-backend << 'EOF'
# 현재 활성 백엔드 설정
upstream backend_active {
    server 127.0.0.1:3000 fail_timeout=5s max_fails=3;
}

# 블루/그린 배포용 백엔드 설정
upstream backend_new {
    server 127.0.0.1:3001 fail_timeout=5s max_fails=3;
}

# 현재 활성 업스트림을 가리키는 변수
map $request_uri $backend {
    default backend_active;
}

server {
    listen 80;
    server_name _;  # 모든 도메인에서 접근 가능
    
    # 로그 설정
    access_log /var/log/nginx/thepromise_access.log;
    error_log /var/log/nginx/thepromise_error.log;
    
    # 클라이언트 최대 업로드 크기
    client_max_body_size 100M;
    
    # 타임아웃 설정
    proxy_connect_timeout 10s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    
    # 기본 프록시 헤더
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # 백엔드로 모든 요청 프록시
    location / {
        proxy_pass http://backend_active;
        
        # WebSocket 지원 (필요시)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # 헬스체크 엔드포인트
    location /api/health {
        proxy_pass http://backend_active/api/health;
        access_log off;  # 헬스체크는 로그에서 제외
    }
    
    # Nginx 상태 확인 (내부에서만 접근 가능)
    location /nginx-status {
        stub_status on;
        allow 127.0.0.1;
        deny all;
    }
}
EOF

# 8. 설정 파일 활성화
log_info "🔗 Nginx 설정 활성화 중..."
# 기본 설정 비활성화
rm -f /etc/nginx/sites-enabled/default
# 새 설정 활성화
ln -sf /etc/nginx/sites-available/thepromise-backend /etc/nginx/sites-enabled/

# 9. Nginx 설정 테스트
log_info "🧪 Nginx 설정 테스트 중..."
if nginx -t; then
    log_success "✅ Nginx 설정이 올바릅니다."
else
    log_error "❌ Nginx 설정에 오류가 있습니다."
    exit 1
fi

# 10. 배포 스크립트 생성
log_info "📜 배포 스크립트 생성 중..."
mkdir -p /opt/thepromise/scripts

cat > /opt/thepromise/scripts/switch-backend.sh << 'EOF'
#!/bin/bash

# 백엔드 스위칭 스크립트 (Blue/Green 배포용)
# 사용법: switch-backend.sh <new_port> [old_port]

set -Eeuo pipefail

NEW_PORT=${1:-3001}
OLD_PORT=${2:-3000}
NGINX_CONFIG="/etc/nginx/sites-available/thepromise-backend"

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $1"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $1" >&2
}

log_info "🔄 백엔드를 포트 $OLD_PORT에서 $NEW_PORT로 전환합니다..."

# 새 백엔드 헬스체크
log_info "🏥 새 백엔드 헬스체크 중... (포트: $NEW_PORT)"
for i in {1..30}; do
    if curl -s --max-time 3 "http://127.0.0.1:$NEW_PORT/api/health" > /dev/null; then
        log_info "✅ 새 백엔드 헬스체크 성공!"
        break
    fi
    
    if [ $i -eq 30 ]; then
        log_error "❌ 새 백엔드 헬스체크 실패! 전환을 중단합니다."
        exit 1
    fi
    
    log_info "⏳ 헬스체크 재시도 ($i/30)..."
    sleep 2
done

# Nginx 설정 업데이트
log_info "⚙️ Nginx 설정 업데이트 중..."
sed -i "s/server 127\.0\.0\.1:$OLD_PORT/server 127.0.0.1:$NEW_PORT/" "$NGINX_CONFIG"

# Nginx 설정 테스트
if ! nginx -t; then
    log_error "❌ Nginx 설정 테스트 실패! 롤백합니다."
    sed -i "s/server 127\.0\.0\.1:$NEW_PORT/server 127.0.0.1:$OLD_PORT/" "$NGINX_CONFIG"
    exit 1
fi

# Nginx 리로드
log_info "🔄 Nginx 리로드 중..."
systemctl reload nginx

# 최종 확인
sleep 2
if curl -s --max-time 5 "http://127.0.0.1/api/health" > /dev/null; then
    log_info "🎉 백엔드 전환 완료! 새 포트: $NEW_PORT"
else
    log_error "❌ 전환 후 헬스체크 실패!"
    exit 1
fi
EOF

chmod +x /opt/thepromise/scripts/switch-backend.sh

# 11. 로그 로테이션 설정
log_info "📋 로그 로테이션 설정 중..."
cat > /etc/logrotate.d/thepromise-nginx << 'EOF'
/var/log/nginx/thepromise_*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 0644 www-data www-data
    sharedscripts
    postrotate
        if [ -f /var/run/nginx.pid ]; then
            kill -USR1 `cat /var/run/nginx.pid`
        fi
    endscript
}
EOF

# 12. Nginx 리로드
log_info "🔄 Nginx 리로드 중..."
systemctl reload nginx

# 13. 서비스 상태 확인
log_info "🔍 서비스 상태 확인 중..."
systemctl status nginx --no-pager -l

# 14. 완료 메시지 및 테스트 정보
log_success "🎉 Nginx 무중단 배포 환경 설정이 완료되었습니다!"

echo ""
echo "📋 설정 요약:"
echo "  - Nginx 버전: $(nginx -v 2>&1)"
echo "  - 설정 파일: /etc/nginx/sites-available/thepromise-backend"
echo "  - 스위칭 스크립트: /opt/thepromise/scripts/switch-backend.sh"
echo "  - 로그 디렉토리: /var/log/nginx/"
echo ""
echo "🧪 테스트 명령어:"
echo "  - Nginx 상태: sudo systemctl status nginx"
echo "  - 설정 테스트: sudo nginx -t"
echo "  - 방화벽 상태: sudo ufw status"
echo "  - 헬스체크: curl http://localhost/api/health"
echo ""
echo "🔄 배포 스크립트 사용법:"
echo "  sudo /opt/thepromise/scripts/switch-backend.sh 3001 3000"
echo ""

log_warning "⚠️ 주의사항:"
echo "  1. 백엔드 컨테이너가 실행 중인지 확인하세요."
echo "  2. 도메인을 사용하는 경우 server_name을 수정하세요."
echo "  3. SSL 인증서가 필요한 경우 별도 설정이 필요합니다."
echo ""

log_info "✅ 설정이 완료되었습니다. 이제 CD 워크플로우에서 이 환경을 사용할 수 있습니다."
