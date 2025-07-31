#!/bin/bash

# SSL 설정 스크립트 - 커스텀 포트용

echo "🔐 Setting up SSL for custom ports..."

# 1. 자체 서명 인증서 생성 (개발/테스트용)
echo "Creating self-signed certificate..."
mkdir -p /home/user/o4o-platform/ssl
cd /home/user/o4o-platform/ssl

# 자체 서명 인증서 생성
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout selfsigned.key \
  -out selfsigned.crt \
  -subj "/C=KR/ST=Seoul/L=Seoul/O=Neture/CN=neture.co.kr"

echo "✅ Self-signed certificate created!"

# 2. Nginx 설정 파일 생성
cat > /home/user/o4o-platform/nginx-ssl.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    # HTTP to HTTPS redirect for port 8080
    server {
        listen 8080;
        server_name neture.co.kr www.neture.co.kr;
        return 301 https://$server_name:8443$request_uri;
    }

    # HTTPS server for main site
    server {
        listen 8443 ssl;
        server_name neture.co.kr www.neture.co.kr;

        ssl_certificate /home/user/o4o-platform/ssl/selfsigned.crt;
        ssl_certificate_key /home/user/o4o-platform/ssl/selfsigned.key;

        location / {
            proxy_pass http://localhost:3000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # HTTPS server for admin
    server {
        listen 8444 ssl;
        server_name admin.neture.co.kr;

        ssl_certificate /home/user/o4o-platform/ssl/selfsigned.crt;
        ssl_certificate_key /home/user/o4o-platform/ssl/selfsigned.key;

        location / {
            proxy_pass http://localhost:3001;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    # HTTPS server for API
    server {
        listen 8445 ssl;
        server_name api.neture.co.kr;

        ssl_certificate /home/user/o4o-platform/ssl/selfsigned.crt;
        ssl_certificate_key /home/user/o4o-platform/ssl/selfsigned.key;

        location / {
            proxy_pass http://localhost:4000;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

echo "✅ Nginx SSL configuration created!"

# 3. 시작 스크립트 생성
cat > /home/user/o4o-platform/start-with-ssl.sh << 'EOF'
#!/bin/bash

echo "🚀 Starting O4O Platform with SSL support..."

# Kill any existing nginx
sudo pkill nginx

# Start nginx with custom config
sudo nginx -c /home/user/o4o-platform/nginx-ssl.conf

# Start services on internal ports
cd /home/user/o4o-platform
npm run dev &

echo "✅ Services started with SSL!"
echo ""
echo "Access URLs:"
echo "- Main Site: https://neture.co.kr:8443"
echo "- Admin: https://admin.neture.co.kr:8444"
echo "- API: https://api.neture.co.kr:8445"
echo ""
echo "Note: Browser will show security warning for self-signed certificate"
EOF

chmod +x /home/user/o4o-platform/start-with-ssl.sh

echo "✅ SSL setup complete!"