// scripts/generateSampleImages.js
const sharp = require('sharp')
const fs = require('fs').promises
const path = require('path')

async function generateSampleImages() {
  const uploadsDir = path.join(__dirname, '../uploads')
  
  // uploads 디렉토리 생성
  try {
    await fs.access(uploadsDir)
  } catch {
    await fs.mkdir(uploadsDir, { recursive: true })
  }

  console.log('🎨 고급 샘플 이미지 생성 중...')

  // 1. 텍스트 중심 이미지 (한국 전자상거래 특화)
  await generateTextHeavyImage(uploadsDir)
  
  // 2. 혼합 콘텐츠 이미지
  await generateMixedContentImage(uploadsDir)
  
  // 3. 사진형 이미지
  await generatePhotoImage(uploadsDir)
  
  // 4. 상품 상세 설명서 이미지
  await generateProductDetailImage(uploadsDir)
  
  console.log('✅ 모든 샘플 이미지가 성공적으로 생성되었습니다!')
  console.log(`📁 위치: ${uploadsDir}`)
  console.log('\n🧪 테스트 방법:')
  console.log('1. npm run dev 실행')
  console.log('2. http://localhost:3000 접속')
  console.log('3. "🧪 고급 기능 테스트" 탭에서 이미지 업로드')
}

async function generateTextHeavyImage(uploadsDir) {
  const textSvg = `
    <svg width="1200" height="1600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1600" fill="#ffffff"/>
      
      <!-- 헤더 -->
      <rect x="0" y="0" width="1200" height="120" fill="#2c3e50"/>
      <text x="600" y="70" font-family="Arial, sans-serif" font-size="36" 
            fill="white" text-anchor="middle" font-weight="bold">
        📱 스마트폰 상세 스펙
      </text>
      
      <!-- 텍스트 정보들 -->
      <g transform="translate(60, 160)">
        <text x="0" y="30" font-family="Arial, sans-serif" font-size="28" fill="#2c3e50" font-weight="bold">📋 주요 사양</text>
        
        <text x="0" y="80" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 디스플레이: 6.7인치 Super AMOLED</text>
        <text x="0" y="110" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 해상도: 3120 x 1440 (Quad HD+)</text>
        <text x="0" y="140" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 프로세서: Snapdragon 8 Gen 2</text>
        <text x="0" y="170" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• RAM: 12GB LPDDR5X</text>
        <text x="0" y="200" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 저장용량: 256GB/512GB</text>
        
        <text x="0" y="260" font-family="Arial, sans-serif" font-size="28" fill="#2c3e50" font-weight="bold">📷 카메라</text>
        <text x="0" y="310" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 메인: 200MP 광각 (f/1.7)</text>
        <text x="0" y="340" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 초광각: 12MP (f/2.2)</text>
        <text x="0" y="370" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 망원: 10MP 3배 줌 (f/2.4)</text>
        <text x="0" y="400" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 전면: 32MP (f/2.2)</text>
        
        <text x="0" y="460" font-family="Arial, sans-serif" font-size="28" fill="#2c3e50" font-weight="bold">🔋 배터리 및 충전</text>
        <text x="0" y="510" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 배터리: 5000mAh</text>
        <text x="0" y="540" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 고속충전: 45W 유선</text>
        <text x="0" y="570" font-family="Arial, sans-serif" font-size="20" fill="#34495e">• 무선충전: 15W Qi</text>
        
        <text x="0" y="630" font-family="Arial, sans-serif" font-size="28" fill="#2c3e50" font-weight="bold">💰 가격 정보</text>
        <rect x="0" y="650" width="500" height="80" fill="#e74c3c" rx="10"/>
        <text x="250" y="700" font-family="Arial, sans-serif" font-size="32" 
              fill="white" text-anchor="middle" font-weight="bold">
          특가 899,000원
        </text>
        
        <text x="0" y="770" font-family="Arial, sans-serif" font-size="18" fill="#7f8c8d">※ 24개월 할부 시 월 37,458원</text>
        <text x="0" y="800" font-family="Arial, sans-serif" font-size="18" fill="#7f8c8d">※ 기존 스마트폰 교환 시 최대 200,000원 할인</text>
      </g>
      
      <!-- 하단 경고 텍스트 -->
      <rect x="60" y="1400" width="1080" height="120" fill="#f39c12" rx="10"/>
      <text x="600" y="1440" font-family="Arial, sans-serif" font-size="16" 
            fill="white" text-anchor="middle" font-weight="bold">
        ⚠️ 주의사항
      </text>
      <text x="600" y="1470" font-family="Arial, sans-serif" font-size="14" 
            fill="white" text-anchor="middle">
        • 색상 및 실제 제품은 차이가 있을 수 있습니다
      </text>
      <text x="600" y="1490" font-family="Arial, sans-serif" font-size="14" 
            fill="white" text-anchor="middle">
        • 배송료는 지역에 따라 상이할 수 있습니다
      </text>
    </svg>
  `

  await sharp(Buffer.from(textSvg))
    .png()
    .toFile(path.join(uploadsDir, 'text_heavy_sample.png'))
    
  console.log('✅ Generated: text_heavy_sample.png (텍스트 중심 이미지)')
}

async function generateMixedContentImage(uploadsDir) {
  // 혼합 콘텐츠 이미지 생성 로직
  const mixedSvg = `
    <svg width="1200" height="800" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="photo" x="0" y="0" width="600" height="400" patternUnits="userSpaceOnUse">
          <rect width="600" height="400" fill="#3498db"/>
          <circle cx="300" cy="200" r="100" fill="#2980b9"/>
          <rect x="250" y="150" width="100" height="100" fill="#1abc9c" rx="20"/>
        </pattern>
      </defs>
      
      <!-- 사진 영역 -->
      <rect x="0" y="0" width="600" height="400" fill="url(#photo)"/>
      
      <!-- 텍스트 영역 -->
      <rect x="600" y="0" width="600" height="400" fill="#ecf0f1"/>
      <text x="900" y="50" font-family="Arial, sans-serif" font-size="24" 
            fill="#2c3e50" text-anchor="middle" font-weight="bold">
        제품 특징
      </text>
      <text x="650" y="100" font-family="Arial, sans-serif" font-size="16" fill="#34495e">
        • 프리미엄 소재 사용
      </text>
      <text x="650" y="130" font-family="Arial, sans-serif" font-size="16" fill="#34495e">
        • 방수 기능 지원
      </text>
      <text x="650" y="160" font-family="Arial, sans-serif" font-size="16" fill="#34495e">
        • 1년 무상 A/S
      </text>
      
      <!-- 하단 그라디언트 -->
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#e74c3c;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#f39c12;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect x="0" y="400" width="1200" height="400" fill="url(#grad)"/>
    </svg>
  `

  await sharp(Buffer.from(mixedSvg))
    .png()
    .toFile(path.join(uploadsDir, 'mixed_content_sample.png'))
    
  console.log('✅ Generated: mixed_content_sample.png (혼합 콘텐츠 이미지)')
}

async function generatePhotoImage(uploadsDir) {
  // 사진형 이미지 (그라디언트와 기하학적 도형으로 구성)
  const photoSvg = `
    <svg width="1600" height="1200" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sunset" cx="50%" cy="30%" r="70%">
          <stop offset="0%" style="stop-color:#ff6b6b;stop-opacity:1" />
          <stop offset="30%" style="stop-color:#feca57;stop-opacity:1" />
          <stop offset="70%" style="stop-color:#ff9ff3;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#54a0ff;stop-opacity:1" />
        </radialGradient>
      </defs>
      
      <rect width="1600" height="1200" fill="url(#sunset)"/>
      
      <!-- 산 실루엣 -->
      <polygon points="0,800 400,400 800,600 1200,300 1600,500 1600,1200 0,1200" 
               fill="rgba(44,62,80,0.7)"/>
      
      <!-- 태양 -->
      <circle cx="1200" cy="350" r="80" fill="#f39c12" opacity="0.8"/>
      
      <!-- 구름들 -->
      <ellipse cx="300" cy="250" rx="100" ry="60" fill="rgba(255,255,255,0.3)"/>
      <ellipse cx="500" cy="200" rx="80" ry="40" fill="rgba(255,255,255,0.3)"/>
      <ellipse cx="1000" cy="180" rx="120" ry="70" fill="rgba(255,255,255,0.3)"/>
      
      <!-- 물결 효과 -->
      <path d="M0,900 Q400,850 800,900 T1600,900 L1600,1200 L0,1200 Z" 
            fill="rgba(116,185,255,0.2)"/>
    </svg>
  `

  await sharp(Buffer.from(photoSvg))
    .png()
    .toFile(path.join(uploadsDir, 'photo_sample.png'))
    
  console.log('✅ Generated: photo_sample.png (사진형 이미지)')
}

async function generateProductDetailImage(uploadsDir) {
  // 기존 상세 이미지 개선
  const detailSvg = `
    <svg width="1200" height="1600" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="1600" fill="#f8f9fa"/>
      <rect x="50" y="50" width="1100" height="300" fill="white" stroke="#e9ecef" stroke-width="2"/>
      <text x="600" y="150" font-family="Arial, sans-serif" font-size="48" 
            fill="#343a40" text-anchor="middle" font-weight="bold">
        🍃 프리미엄 한국 전통차 세트
      </text>
      <text x="600" y="200" font-family="Arial, sans-serif" font-size="24" 
            fill="#6c757d" text-anchor="middle">
        엄선된 한국 전통차 3종 세트로 건강한 차 생활을 시작하세요
      </text>
      <text x="600" y="250" font-family="Arial, sans-serif" font-size="32" 
            fill="#dc3545" text-anchor="middle" font-weight="bold">
        특가 45,000원 (정가 65,000원)
      </text>
      
      <!-- 제품 설명 섹션 -->
      <rect x="50" y="400" width="1100" height="1150" fill="white" stroke="#e9ecef" stroke-width="2"/>
      <text x="100" y="460" font-family="Arial, sans-serif" font-size="32" 
            fill="#343a40" font-weight="bold">
        🌟 제품 상세 정보
      </text>
      
      <!-- 상세 텍스트들 -->
      <text x="100" y="520" font-family="Arial, sans-serif" font-size="20" fill="#495057">
        ✓ 100% 유기농 재료로 만든 프리미엄 전통차
      </text>
      <text x="100" y="560" font-family="Arial, sans-serif" font-size="20" fill="#495057">
        ✓ 국내산 우수 차엽만을 엄선하여 제조
      </text>
      <text x="100" y="600" font-family="Arial, sans-serif" font-size="20" fill="#495057">
        ✓ 전통 제조 방식으로 깊은 맛과 향 구현
      </text>
      <text x="100" y="640" font-family="Arial, sans-serif" font-size="20" fill="#495057">
        ✓ 카페인 함량 조절로 누구나 부담없이 즐기기 가능
      </text>
      
      <text x="100" y="720" font-family="Arial, sans-serif" font-size="24" 
            fill="#343a40" font-weight="bold">
        📦 구성품
      </text>
      <rect x="120" y="740" width="960" height="200" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1" rx="8"/>
      <text x="140" y="780" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        🍵 녹차 (50g) - 제주도산 유기농 차엽, 은은한 단맛과 깔끔한 뒷맛
      </text>
      <text x="140" y="810" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        🍵 홍차 (50g) - 경상남도산 전통 발효차, 진한 색깔과 깊은 풍미
      </text>
      <text x="140" y="840" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        🍵 우롱차 (50g) - 전라남도산 반발효차, 꽃향기와 과일향의 조화
      </text>
      <text x="140" y="870" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        🎁 고급 원목 차 보관함 - 습도 조절 기능으로 차엽 신선도 유지
      </text>
      <text x="140" y="900" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        📖 전통차 우리는 법 가이드북 - 최적의 우리는 온도와 시간 안내
      </text>
      
      <text x="100" y="980" font-family="Arial, sans-serif" font-size="24" 
            fill="#343a40" font-weight="bold">
        🎯 이런 분께 추천
      </text>
      <text x="120" y="1020" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        • 건강한 차 생활을 시작하고 싶은 분
      </text>
      <text x="120" y="1050" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        • 전통차에 관심이 있지만 어떤 것을 선택해야 할지 모르는 분
      </text>
      <text x="120" y="1080" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        • 소중한 사람에게 의미있는 선물을 하고 싶은 분
      </text>
      <text x="120" y="1110" font-family="Arial, sans-serif" font-size="18" fill="#495057">
        • 카페인을 줄이면서도 맛있는 음료를 즐기고 싶은 분
      </text>
      
      <!-- 하단 주문 정보 -->
      <rect x="50" y="1280" width="1100" height="250" fill="#e3f2fd" stroke="#1976d2" stroke-width="2" rx="10"/>
      <text x="600" y="1320" font-family="Arial, sans-serif" font-size="24" 
            fill="#1976d2" text-anchor="middle" font-weight="bold">
        🚚 배송 및 교환/반품 안내
      </text>
      <text x="100" y="1360" font-family="Arial, sans-serif" font-size="16" fill="#1976d2">
        • 전국 무료배송 (제주/도서산간 지역 제외)
      </text>
      <text x="100" y="1385" font-family="Arial, sans-serif" font-size="16" fill="#1976d2">
        • 주문 후 2-3일 내 배송 (주말/공휴일 제외)
      </text>
      <text x="100" y="1410" font-family="Arial, sans-serif" font-size="16" fill="#1976d2">
        • 상품 수령 후 7일 이내 교환/반품 가능
      </text>
      <text x="100" y="1435" font-family="Arial, sans-serif" font-size="16" fill="#1976d2">
        • 고객센터: 1588-0000 (평일 09:00-18:00)
      </text>
      <text x="100" y="1460" font-family="Arial, sans-serif" font-size="16" fill="#1976d2">
        • 품질보증: 제조일로부터 2년 (적절한 보관 조건 하에서)
      </text>
    </svg>
  `

  await sharp(Buffer.from(detailSvg))
    .png()
    .toFile(path.join(uploadsDir, 'product_detail_enhanced.png'))
    
  console.log('✅ Generated: product_detail_enhanced.png (상품 상세 설명서)')

// 스크립트 직접 실행 시
if (require.main === module) {
  generateSampleImages()
}

module.exports = { generateSampleImages }
