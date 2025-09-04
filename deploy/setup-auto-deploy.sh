#!/bin/bash
# 웹서버에서 한 번만 실행하여 자동 배포 설정

echo "🔧 Setting up Auto Deployment System"

# 1. Webhook receiver 설치
echo "📝 Installing webhook receiver..."
sudo mkdir -p /var/www/webhook
sudo cp webhook-receiver.php /var/www/webhook/deploy.php
sudo chown www-data:www-data /var/www/webhook/deploy.php

# 2. Nginx 설정 추가
echo "⚙️ Configuring Nginx..."
sudo tee /etc/nginx/sites-available/webhook << 'EOF'
server {
    listen 8888;
    server_name admin.neture.co.kr;
    
    root /var/www/webhook;
    index deploy.php;
    
    location /deploy {
        try_files $uri /deploy.php?$query_string;
    }
    
    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
    }
    
    access_log /var/log/nginx/webhook-access.log;
    error_log /var/log/nginx/webhook-error.log;
}
EOF

# 3. Nginx 설정 활성화
sudo ln -sf /etc/nginx/sites-available/webhook /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. 배포 스크립트 설치
echo "📦 Installing deployment script..."
cp deploy-now.sh /home/ubuntu/deploy-now.sh
chmod +x /home/ubuntu/deploy-now.sh

# 5. sudoers 설정 (www-data가 배포 스크립트 실행 가능)
echo "www-data ALL=(ubuntu) NOPASSWD: /home/ubuntu/deploy-now.sh" | sudo tee -a /etc/sudoers

# 6. 로그 파일 생성
sudo touch /var/log/webhook-deploy.log
sudo chown www-data:www-data /var/log/webhook-deploy.log

echo "✅ Auto deployment setup complete!"
echo ""
echo "📌 GitHub Webhook 설정:"
echo "   1. Repository Settings → Webhooks → Add webhook"
echo "   2. Payload URL: http://admin.neture.co.kr:8888/deploy"
echo "   3. Content type: application/json"
echo "   4. Secret: your-webhook-secret-here"
echo "   5. Events: Just the push event"
echo ""
echo "🚀 이제 main 브랜치에 push하면 자동으로 배포됩니다!"