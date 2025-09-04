<?php
/**
 * GitHub Webhook Receiver for Auto Deployment
 * 웹서버의 /var/www/webhook/deploy.php 에 설치
 */

// 보안: GitHub에서만 요청 허용
$secret = 'your-webhook-secret-here'; // GitHub webhook 설정 시 사용할 시크릿

// GitHub signature 검증
function verifySignature($payload, $signature, $secret) {
    $calculated = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($calculated, $signature);
}

// POST 요청만 처리
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die('Method not allowed');
}

// Payload 읽기
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

// 서명 검증
if (!verifySignature($payload, $signature, $secret)) {
    http_response_code(401);
    die('Invalid signature');
}

$data = json_decode($payload, true);

// main 브랜치 push만 처리
if ($data['ref'] !== 'refs/heads/main') {
    die('Not main branch, skipping');
}

// 배포 스크립트 실행 (백그라운드)
$logFile = '/var/log/webhook-deploy.log';
$command = '/home/ubuntu/deploy-now.sh >> ' . $logFile . ' 2>&1 &';

// 실행
exec($command);

// 응답
echo json_encode([
    'status' => 'success',
    'message' => 'Deployment triggered',
    'commit' => substr($data['after'], 0, 7),
    'timestamp' => date('Y-m-d H:i:s')
]);
?>