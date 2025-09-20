import { Router, Request, Response } from 'express';
import axios from 'axios';

const router: Router = Router();

/**
 * 정적 파일 프록시 라우트 (JS, CSS, 이미지 등)
 */
router.get('/assets/*', async (req: Request, res: Response) => {
  try {
    const assetPath = req.params[0];
    const targetUrl = `https://neture.co.kr/assets/${assetPath}`;
    
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'O4O-Preview-Proxy/1.0'
      },
      responseType: 'stream',
      timeout: 10000
    });
    
    // 원본 헤더 복사 (Content-Type 등)
    const contentType = response.headers['content-type'];
    if (contentType) {
      res.set('Content-Type', contentType);
    }
    
    // 캐시 헤더 설정
    res.set({
      'Cache-Control': 'public, max-age=31536000',
      'Access-Control-Allow-Origin': '*'
    });
    
    response.data.pipe(res);
    
  } catch (error: any) {
    console.error('Asset proxy error:', error.message);
    res.status(404).json({ error: 'Asset not found' });
  }
});

/**
 * 프록시 라우트: X-Frame-Options 우회를 위한 사이트 미리보기
 * admin.neture.co.kr에서 neture.co.kr을 iframe으로 로드하기 위한 프록시
 */
router.get('/site/:domain?', async (req: Request, res: Response) => {
  try {
    const { domain } = req.params;
    const targetUrl = domain ? `https://${domain}` : 'https://neture.co.kr';
    
    // 허용된 도메인만 프록시 (보안)
    const allowedDomains = [
      'neture.co.kr',
      'www.neture.co.kr',
      'localhost:5174',
      'localhost:3000'
    ];
    
    const urlObj = new URL(targetUrl);
    if (!allowedDomains.includes(urlObj.host)) {
      return res.status(403).json({ error: 'Domain not allowed' });
    }
    
    // 원본 사이트 HTML 가져오기
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'O4O-Preview-Proxy/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      },
      timeout: 10000
    });
    
    let html = response.data;
    
    // 1. CSP meta 태그 제거 (frame-ancestors는 meta에서 지원 안됨)
    html = html.replace(/<meta[^>]*http-equiv=['"]Content-Security-Policy['"][^>]*>/gi, '');
    html = html.replace(/<meta[^>]*name=['"]content-security-policy['"][^>]*>/gi, '');
    
    // 2. X-Frame-Options meta 태그 제거
    html = html.replace(/<meta[^>]*http-equiv=['"]X-Frame-Options['"][^>]*>/gi, '');
    
    // 3. 정적 파일 경로를 API 프록시로 리다이렉트
    // trust proxy 설정으로 req.protocol이 올바르게 감지됨
    const apiBaseUrl = req.protocol + '://' + req.get('host');
    
    // CSS 파일 경로 변경
    html = html.replace(/href="\/assets\//g, `href="${apiBaseUrl}/api/v1/preview/assets/`);
    html = html.replace(/href="assets\//g, `href="${apiBaseUrl}/api/v1/preview/assets/`);
    
    // JS 파일 경로 변경
    html = html.replace(/src="\/assets\//g, `src="${apiBaseUrl}/api/v1/preview/assets/`);
    html = html.replace(/src="assets\//g, `src="${apiBaseUrl}/api/v1/preview/assets/`);
    
    // 이미지 경로 변경
    html = html.replace(/src="\/uploads\//g, `src="${targetUrl}/uploads/`);
    html = html.replace(/src="uploads\//g, `src="${targetUrl}/uploads/`);
    
    // base href 태그 추가 - 프록시 경로 사용으로 cross-origin 이슈 방지
    const baseTag = `<base href="${apiBaseUrl}/api/v1/preview/site/${new URL(targetUrl).host}/">`;
    html = html.replace('<head>', `<head>\n  ${baseTag}`);
    
    // 4. iframe-friendly 스크립트 추가
    const iframeScript = `
      <script>
        // History API 보안 오류 방지 (Cross-Origin 제한)
        if (window !== window.top) {
          // iframe 컨텍스트에서 History API 비활성화
          const originalPushState = window.history.pushState;
          const originalReplaceState = window.history.replaceState;
          
          window.history.pushState = function() {
            // History API blocked in iframe context
          };
          
          window.history.replaceState = function() {
            // History API blocked in iframe context
          };
        }
        
        // iframe 환경에서 동작하는 스크립트
        if (window !== window.top) {
          // 상위 프레임과 통신을 위한 PostMessage 설정
          window.addEventListener('message', function(event) {
            if (event.data.type === 'customizer-update') {
              // 커스터마이저 설정 적용
              if (event.data.css) {
                let style = document.getElementById('customizer-preview-css');
                if (!style) {
                  style = document.createElement('style');
                  style.id = 'customizer-preview-css';
                  document.head.appendChild(style);
                }
                style.textContent = event.data.css;
              }
            }
          });
          
          // 상위 프레임에 로드 완료 알림
          window.parent.postMessage({ type: 'preview-loaded' }, '*');
        }
        
        // 외부 링크 클릭 방지 (iframe 내에서)
        if (window !== window.top) {
          document.addEventListener('click', function(e) {
            const target = e.target.closest('a');
            if (target && target.href) {
              e.preventDefault();
              // 상위 프레임에 링크 클릭 알림
              window.parent.postMessage({ 
                type: 'link-clicked', 
                url: target.href 
              }, '*');
            }
          });
        }
      </script>
    `;
    
    // </head> 태그 앞에 스크립트 삽입
    html = html.replace('</head>', iframeScript + '</head>');
    
    // 적절한 헤더 설정
    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'X-Frame-Options': 'ALLOWALL', // iframe 허용
      'Content-Security-Policy': "frame-ancestors 'self' https://*.neture.co.kr", // CSP도 설정
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    res.send(html);
    
  } catch (error: any) {
    console.error('Preview proxy error:', error.message);
    
    // 에러 페이지 HTML 반환
    const errorHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Preview Error</title>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            height: 100vh; 
            margin: 0; 
            background: #f5f5f5; 
          }
          .error-container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .error-icon { 
            font-size: 3rem; 
            color: #ff6b6b; 
            margin-bottom: 1rem; 
          }
          .error-title { 
            color: #333; 
            margin-bottom: 0.5rem; 
          }
          .error-message { 
            color: #666; 
            margin-bottom: 1.5rem; 
          }
          .retry-btn {
            background: #007cba;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .retry-btn:hover {
            background: #005a87;
          }
        </style>
      </head>
      <body>
        <div class="error-container">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">Preview Unavailable</h2>
          <p class="error-message">Unable to load the preview. The target site may be temporarily unavailable.</p>
          <button class="retry-btn" onclick="window.location.reload()">Retry</button>
        </div>
        <script>
          // 상위 프레임에 에러 알림
          if (window !== window.top) {
            window.parent.postMessage({ type: 'preview-error', error: '${error.message}' }, '*');
          }
        </script>
      </body>
      </html>
    `;
    
    res.status(500).set('Content-Type', 'text/html').send(errorHtml);
  }
});

export default router;