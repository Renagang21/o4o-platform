// test-partner-server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 기본 Partner API 모의 구현
app.post('/api/partner/apply', (req, res) => {
  const { customer_id, customer_email, customer_name, application_reason } = req.body;
  
  if (!customer_id || !customer_email || !customer_name || !application_reason) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: '필수 정보를 모두 입력해주세요.'
    });
  }

  // 모의 응답
  res.status(201).json({
    success: true,
    message: 'Partner 신청이 완료되었습니다.',
    data: {
      id: Math.floor(Math.random() * 1000),
      customer_id,
      customer_email,
      customer_name,
      application_reason,
      status: 'pending',
      applied_at: new Date().toISOString()
    }
  });
});

app.get('/api/partner/profile/:partnerCode', (req, res) => {
  const { partnerCode } = req.params;
  
  // 모의 Partner 프로필
  res.json({
    success: true,
    data: {
      id: 1,
      customer_id: 'cust_123',
      customer_email: 'test@example.com',
      customer_name: '테스트 사용자',
      partner_code: partnerCode,
      status: 'active',
      total_clicks: 150,
      total_conversions: 12,
      total_earnings: 125000,
      stats: {
        totalClicks: 150,
        totalConversions: 12,
        totalEarnings: 125000,
        conversionRate: 8.0,
        pendingEarnings: 45000
      }
    }
  });
});

app.post('/api/partner/generate-link', (req, res) => {
  const { partner_code, product_id, base_url } = req.body;
  
  if (!partner_code) {
    return res.status(400).json({
      error: 'Missing partner code',
      message: 'Partner 코드가 필요합니다.'
    });
  }

  const link = product_id 
    ? `${base_url || 'https://yourstore.com'}/products/${product_id}?ref=${partner_code}`
    : `${base_url || 'https://yourstore.com'}?ref=${partner_code}`;

  res.json({
    success: true,
    data: {
      link,
      partner_code,
      product_id,
      created_at: new Date().toISOString()
    }
  });
});

app.get('/api/partner/admin/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      totalPartners: 25,
      activePartners: 23,
      pendingApplications: 5,
      totalClicks: 3240,
      totalConversions: 187,
      totalEarnings: 2450000
    }
  });
});

// 헬스 체크
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Partner 시스템 테스트 서버',
    timestamp: new Date().toISOString()
  });
});

// 간단한 테스트 페이지
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Partner 시스템 테스트</title>
        <meta charset="utf-8">
        <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; }
            .container { max-width: 800px; margin: 0 auto; }
            .section { margin: 30px 0; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            button { padding: 10px 20px; margin: 5px; border: none; border-radius: 4px; background: #007bff; color: white; cursor: pointer; }
            button:hover { background: #0056b3; }
            input, textarea { width: 100%; padding: 8px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; }
            .result { margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🤝 Partner 시스템 테스트</h1>
            
            <div class="section">
                <h2>1. Partner 신청</h2>
                <input type="text" id="customerId" placeholder="고객 ID" value="cust_${Date.now()}">
                <input type="email" id="customerEmail" placeholder="이메일" value="test@example.com">
                <input type="text" id="customerName" placeholder="이름" value="테스트 사용자">
                <textarea id="applicationReason" placeholder="신청 사유">온라인 마케팅 경험이 풍부하여 Partner로 활동하고 싶습니다.</textarea>
                <button onclick="applyPartner()">Partner 신청</button>
                <div id="applyResult" class="result" style="display:none;"></div>
            </div>

            <div class="section">
                <h2>2. Partner 프로필 조회</h2>
                <input type="text" id="partnerCode" placeholder="Partner 코드" value="P1234567">
                <button onclick="getProfile()">프로필 조회</button>
                <div id="profileResult" class="result" style="display:none;"></div>
            </div>

            <div class="section">
                <h2>3. 링크 생성</h2>
                <input type="text" id="linkPartnerCode" placeholder="Partner 코드" value="P1234567">
                <input type="text" id="productId" placeholder="제품 ID (선택사항)" value="prod_123">
                <input type="text" id="baseUrl" placeholder="기본 URL" value="https://yourstore.com">
                <button onclick="generateLink()">링크 생성</button>
                <div id="linkResult" class="result" style="display:none;"></div>
            </div>

            <div class="section">
                <h2>4. 시스템 통계</h2>
                <button onclick="getStats()">통계 조회</button>
                <div id="statsResult" class="result" style="display:none;"></div>
            </div>
        </div>

        <script>
            async function applyPartner() {
                const data = {
                    customer_id: document.getElementById('customerId').value,
                    customer_email: document.getElementById('customerEmail').value,
                    customer_name: document.getElementById('customerName').value,
                    application_reason: document.getElementById('applicationReason').value
                };

                try {
                    const response = await fetch('/api/partner/apply', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    document.getElementById('applyResult').style.display = 'block';
                    document.getElementById('applyResult').innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
                } catch (error) {
                    console.error('Error:', error);
                }
            }

            async function getProfile() {
                const partnerCode = document.getElementById('partnerCode').value;
                try {
                    const response = await fetch('/api/partner/profile/' + partnerCode);
                    const result = await response.json();
                    document.getElementById('profileResult').style.display = 'block';
                    document.getElementById('profileResult').innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
                } catch (error) {
                    console.error('Error:', error);
                }
            }

            async function generateLink() {
                const data = {
                    partner_code: document.getElementById('linkPartnerCode').value,
                    product_id: document.getElementById('productId').value,
                    base_url: document.getElementById('baseUrl').value
                };

                try {
                    const response = await fetch('/api/partner/generate-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                    const result = await response.json();
                    document.getElementById('linkResult').style.display = 'block';
                    document.getElementById('linkResult').innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
                } catch (error) {
                    console.error('Error:', error);
                }
            }

            async function getStats() {
                try {
                    const response = await fetch('/api/partner/admin/stats');
                    const result = await response.json();
                    document.getElementById('statsResult').style.display = 'block';
                    document.getElementById('statsResult').innerHTML = '<pre>' + JSON.stringify(result, null, 2) + '</pre>';
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        </script>
    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log(`🚀 Partner 시스템 테스트 서버가 포트 ${PORT}에서 실행 중입니다.`);
  console.log(`🌐 브라우저에서 http://localhost:${PORT} 접속`);
  console.log(`📊 API 테스트: http://localhost:${PORT}/health`);
});
