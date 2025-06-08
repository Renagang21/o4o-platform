const express = require('express');
const crypto = require('crypto');
const { exec } = require('child_process');
const app = express();

app.use(express.json());

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
const API_SERVER_SCRIPT = '/opt/o4o-platform/scripts/sync-api-server.sh';
const WEB_SERVER_SCRIPT = '/opt/o4o-platform/scripts/sync-web-servers.sh';

function verifySignature(req) {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

app.post('/webhook', (req, res) => {
    if (!verifySignature(req)) {
        return res.status(401).send('Unauthorized');
    }

    const { commits, ref } = req.body;
    
    if (ref !== 'refs/heads/main') {
        return res.status(200).send('Not main branch');
    }

    let needsApiSync = false;
    let needsWebSync = false;

    // 변경된 파일 경로 분석
    commits.forEach(commit => {
        commit.added.concat(commit.modified, commit.removed).forEach(file => {
            if (file.startsWith('services/api-server/')) {
                needsApiSync = true;
            } else if (file.startsWith('services/') && !file.startsWith('services/api-server/')) {
                needsWebSync = true;
            }
        });
    });

    // API 서버 동기화
    if (needsApiSync) {
        console.log('🔄 API 서버 동기화 실행...');
        exec(API_SERVER_SCRIPT, (error, stdout, stderr) => {
            if (error) {
                console.error('API 서버 동기화 오류:', error);
            } else {
                console.log('✅ API 서버 동기화 완료');
            }
        });
    }

    // 웹 서버 동기화
    if (needsWebSync) {
        console.log('🔄 웹 서버 동기화 실행...');
        exec(WEB_SERVER_SCRIPT, (error, stdout, stderr) => {
            if (error) {
                console.error('웹 서버 동기화 오류:', error);
            } else {
                console.log('✅ 웹 서버 동기화 완료');
            }
        });
    }

    res.status(200).send('OK');
});

app.listen(3001, () => {
    console.log('🎣 웹훅 서버가 포트 3001에서 실행 중...');
});