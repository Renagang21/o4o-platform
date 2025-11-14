#!/usr/bin/env tsx
/**
 * 헤더 모듈에 필요한 페이지 자동 생성 스크립트
 *
 * 생성되는 페이지:
 * - /login - 로그인
 * - /my-account - 마이페이지
 * - /my-account/* - 마이페이지 서브 페이지들
 * - /support - 고객지원
 * - /cart - 장바구니
 * - /seller, /supplier, /affiliate - 역할별 대시보드
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'https://api.neture.co.kr';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'test@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'test123!@#';

// Axios instance with auth
let authToken: string = '';

interface PageData {
  slug: string;
  title: string;
  content: string;
  status: 'publish' | 'draft';
  meta_description?: string;
}

const pages: PageData[] = [
  // 1. 로그인 페이지
  {
    slug: 'login',
    title: '로그인',
    content: '[[social_login providers="google,kakao,naver" showTestPanel="true" title="로그인" subtitle="계정에 접속하여 서비스를 이용하세요"]]',
    status: 'publish',
    meta_description: '네이처 플랫폼 로그인 페이지입니다.'
  },

  // 2. 마이페이지 메인
  {
    slug: 'my-account',
    title: '마이페이지',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-gray-900 mb-6">마이페이지</h1>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- 프로필 카드 -->
    <a href="/my-account" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div class="text-blue-600 mb-4">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">프로필</h3>
      <p class="text-gray-600 text-sm">개인정보 및 계정 설정을 관리하세요.</p>
    </a>

    <!-- 주문 내역 카드 -->
    <a href="/my-account/orders" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div class="text-green-600 mb-4">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">주문 내역</h3>
      <p class="text-gray-600 text-sm">주문한 상품의 배송 상태를 확인하세요.</p>
    </a>

    <!-- 위시리스트 카드 -->
    <a href="/my-account/wishlist" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div class="text-red-600 mb-4">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">위시리스트</h3>
      <p class="text-gray-600 text-sm">관심 상품을 저장하고 관리하세요.</p>
    </a>

    <!-- 알림 카드 -->
    <a href="/my-account/notifications" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div class="text-yellow-600 mb-4">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">알림</h3>
      <p class="text-gray-600 text-sm">최신 소식과 알림을 확인하세요.</p>
    </a>

    <!-- 설정 카드 -->
    <a href="/my-account/settings" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div class="text-gray-600 mb-4">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">설정</h3>
      <p class="text-gray-600 text-sm">계정 및 알림 설정을 변경하세요.</p>
    </a>

    <!-- 고객지원 카드 -->
    <a href="/support" class="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
      <div class="text-purple-600 mb-4">
        <svg class="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 mb-2">고객지원</h3>
      <p class="text-gray-600 text-sm">문의사항이 있으시면 연락주세요.</p>
    </a>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '마이페이지에서 계정 정보, 주문 내역, 위시리스트 등을 관리하세요.'
  },

  // 3. 주문 내역
  {
    slug: 'my-account/orders',
    title: '주문 내역',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/my-account" class="text-blue-600 hover:underline text-sm">← 마이페이지로 돌아가기</a>
  </div>

  <h1 class="text-3xl font-bold text-gray-900 mb-6">주문 내역</h1>

  <div class="bg-white rounded-lg shadow p-6">
    <p class="text-gray-600 text-center py-12">
      주문 내역이 없습니다.
    </p>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '주문한 상품의 배송 상태를 확인하세요.'
  },

  // 4. 위시리스트
  {
    slug: 'my-account/wishlist',
    title: '위시리스트',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/my-account" class="text-blue-600 hover:underline text-sm">← 마이페이지로 돌아가기</a>
  </div>

  <h1 class="text-3xl font-bold text-gray-900 mb-6">위시리스트</h1>

  <div class="bg-white rounded-lg shadow p-6">
    <p class="text-gray-600 text-center py-12">
      저장된 상품이 없습니다.
    </p>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '관심 상품을 저장하고 관리하세요.'
  },

  // 5. 알림
  {
    slug: 'my-account/notifications',
    title: '알림',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/my-account" class="text-blue-600 hover:underline text-sm">← 마이페이지로 돌아가기</a>
  </div>

  <h1 class="text-3xl font-bold text-gray-900 mb-6">알림</h1>

  <div class="bg-white rounded-lg shadow p-6">
    <p class="text-gray-600 text-center py-12">
      새로운 알림이 없습니다.
    </p>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '최신 소식과 알림을 확인하세요.'
  },

  // 6. 설정
  {
    slug: 'my-account/settings',
    title: '설정',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <div class="mb-6">
    <a href="/my-account" class="text-blue-600 hover:underline text-sm">← 마이페이지로 돌아가기</a>
  </div>

  <h1 class="text-3xl font-bold text-gray-900 mb-6">설정</h1>

  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">계정 설정</h2>
    <p class="text-gray-600 mb-6">
      계정 정보 및 알림 설정을 관리하세요.
    </p>

    <div class="space-y-4">
      <div class="border-t pt-4">
        <h3 class="font-medium text-gray-900 mb-2">이메일 알림</h3>
        <label class="flex items-center">
          <input type="checkbox" class="mr-2" checked />
          <span class="text-gray-700">주문 알림 받기</span>
        </label>
        <label class="flex items-center mt-2">
          <input type="checkbox" class="mr-2" checked />
          <span class="text-gray-700">프로모션 알림 받기</span>
        </label>
      </div>
    </div>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '계정 및 알림 설정을 변경하세요.'
  },

  // 7. 고객지원
  {
    slug: 'support',
    title: '고객지원',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-gray-900 mb-6">고객지원</h1>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">자주 묻는 질문</h2>
      <ul class="space-y-3">
        <li>
          <a href="#" class="text-blue-600 hover:underline">배송은 얼마나 걸리나요?</a>
        </li>
        <li>
          <a href="#" class="text-blue-600 hover:underline">환불은 어떻게 하나요?</a>
        </li>
        <li>
          <a href="#" class="text-blue-600 hover:underline">회원가입 방법이 궁금합니다.</a>
        </li>
      </ul>
    </div>

    <div class="bg-white rounded-lg shadow p-6">
      <h2 class="text-xl font-semibold text-gray-900 mb-4">연락처</h2>
      <div class="space-y-2 text-gray-700">
        <p><strong>이메일:</strong> support@neture.co.kr</p>
        <p><strong>전화:</strong> 1588-0000</p>
        <p><strong>운영시간:</strong> 평일 09:00 - 18:00</p>
      </div>
    </div>
  </div>

  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">문의하기</h2>
    <form class="space-y-4">
      <div>
        <label class="block text-gray-700 mb-2">이메일</label>
        <input type="email" class="w-full border border-gray-300 rounded px-3 py-2" placeholder="이메일을 입력하세요" />
      </div>
      <div>
        <label class="block text-gray-700 mb-2">제목</label>
        <input type="text" class="w-full border border-gray-300 rounded px-3 py-2" placeholder="제목을 입력하세요" />
      </div>
      <div>
        <label class="block text-gray-700 mb-2">내용</label>
        <textarea class="w-full border border-gray-300 rounded px-3 py-2" rows="5" placeholder="문의 내용을 입력하세요"></textarea>
      </div>
      <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
        문의 보내기
      </button>
    </form>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '문의사항이 있으시면 연락주세요.'
  },

  // 8. 장바구니
  {
    slug: 'cart',
    title: '장바구니',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-gray-900 mb-6">장바구니</h1>

  <div class="bg-white rounded-lg shadow p-6">
    <p class="text-gray-600 text-center py-12">
      장바구니가 비어 있습니다.
    </p>
    <div class="text-center mt-4">
      <a href="/" class="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
        쇼핑 계속하기
      </a>
    </div>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '장바구니에 담긴 상품을 확인하세요.'
  },

  // 9. 판매자 대시보드
  {
    slug: 'seller',
    title: '판매자 대시보드',
    content: '[[seller_dashboard]]',
    status: 'publish',
    meta_description: '판매자 전용 대시보드입니다.'
  },

  // 10. 공급자 대시보드
  {
    slug: 'supplier',
    title: '공급자 대시보드',
    content: '[[supplier_dashboard]]',
    status: 'publish',
    meta_description: '공급자 전용 대시보드입니다.'
  },

  // 11. 제휴자 대시보드
  {
    slug: 'affiliate',
    title: '제휴자 대시보드',
    content: `
<div class="max-w-7xl mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold text-gray-900 mb-6">제휴자 대시보드</h1>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-gray-600 text-sm mb-2">이번 달 수익</h3>
      <p class="text-3xl font-bold text-blue-600">₩0</p>
    </div>
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-gray-600 text-sm mb-2">추천 클릭</h3>
      <p class="text-3xl font-bold text-green-600">0</p>
    </div>
    <div class="bg-white rounded-lg shadow p-6">
      <h3 class="text-gray-600 text-sm mb-2">전환율</h3>
      <p class="text-3xl font-bold text-purple-600">0%</p>
    </div>
  </div>

  <div class="bg-white rounded-lg shadow p-6">
    <h2 class="text-xl font-semibold text-gray-900 mb-4">제휴 링크</h2>
    <p class="text-gray-600 mb-4">
      아래 링크를 공유하여 수익을 창출하세요.
    </p>
    <div class="bg-gray-50 p-4 rounded border border-gray-200">
      <code class="text-sm text-gray-700">https://neture.co.kr/ref/YOUR_CODE</code>
    </div>
  </div>
</div>
    `,
    status: 'publish',
    meta_description: '제휴자 전용 대시보드입니다.'
  }
];

async function login(): Promise<string> {
  console.log('🔐 관리자 로그인 중...\n');

  try {
    const response = await axios.post(
      `${API_URL}/api/v1/auth/login`,
      {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      }
    );

    if (response.data.success && response.data.token) {
      console.log('✅ 로그인 성공\n');
      return response.data.token;
    }

    throw new Error('로그인 실패: 토큰을 받지 못했습니다.');
  } catch (error: any) {
    console.error('❌ 로그인 실패:', error.response?.data?.message || error.message);
    process.exit(1);
  }
}

async function createPages() {
  console.log('🚀 헤더 모듈 페이지 생성 시작...\n');

  // Login first
  authToken = await login();

  let created = 0;
  let skipped = 0;
  let failed = 0;

  for (const page of pages) {
    try {
      console.log(`📄 생성 중: /${page.slug}`);

      const response = await axios.post(
        `${API_URL}/api/v1/pages`,
        page,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (response.data.success) {
        console.log(`   ✅ 성공: ${page.title}\n`);
        created++;
      }
    } catch (error: any) {
      if (error.response?.status === 409 || error.response?.data?.message?.includes('already exists')) {
        console.log(`   ⏭️  이미 존재: ${page.title}\n`);
        skipped++;
      } else {
        console.log(`   ❌ 실패: ${page.title}`);
        console.log(`   오류: ${error.response?.data?.message || error.message}\n`);
        failed++;
      }
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 결과 요약');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 생성됨: ${created}개`);
  console.log(`⏭️  건너뜀: ${skipped}개 (이미 존재)`);
  console.log(`❌ 실패: ${failed}개`);
  console.log(`📝 총 페이지: ${pages.length}개\n`);

  if (created > 0) {
    console.log('🎉 페이지 생성이 완료되었습니다!');
    console.log('\n📍 생성된 주요 페이지:');
    console.log('   - https://neture.co.kr/login (로그인)');
    console.log('   - https://neture.co.kr/my-account (마이페이지)');
    console.log('   - https://neture.co.kr/cart (장바구니)');
    console.log('   - https://neture.co.kr/seller (판매자 대시보드)');
    console.log('   - https://neture.co.kr/supplier (공급자 대시보드)');
    console.log('   - https://neture.co.kr/affiliate (제휴자 대시보드)');
  }
}

createPages().catch(console.error);
