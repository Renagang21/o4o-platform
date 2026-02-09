/**
 * BranchRoutes - 분회 라우팅 래퍼
 *
 * SVC-C: 분회 서비스 라우트
 * - /branch-services/:branchId/* 경로를 처리
 * - /demo/branch/:branchId/* 경로도 호환 (레거시)
 * - basePath를 자동 감지하여 BranchContext에 전달
 */

import { Routes, Route, useParams, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { BranchLayout } from '../components/branch';
import { BranchProvider } from '../contexts/BranchContext';
import { branchApi } from '../api/branch';

// Branch pages
import {
  BranchDashboardPage,
  BranchNewsListPage,
  BranchNewsDetailPage,
  BranchForumListPage,
  BranchForumDetailPage,
  BranchForumWritePage,
  BranchGroupbuyListPage,
  BranchGroupbuyDetailPage,
  BranchAboutPage,
  BranchOfficersPage,
  BranchContactPage,
  BranchDocsPage,
} from '../pages/branch';

// 분회 목록 (실제로는 API에서 가져옴)
const BRANCH_NAMES: Record<string, string> = {
  'gangnam': '강남',
  'gangbuk': '강북',
  'gangdong': '강동',
  'gangseo': '강서',
  'gwanak': '관악',
  'dongjak': '동작',
  'mapo': '마포',
  'seodaemun': '서대문',
  'seongbuk': '성북',
  'yeongdeungpo': '영등포',
  'yongsan': '용산',
  'eunpyeong': '은평',
  'jongno': '종로',
  'junggu': '중구',
};

export function BranchRoutes() {
  const { branchId } = useParams<{ branchId: string }>();
  const location = useLocation();
  const [branchName, setBranchName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // basePath 자동 감지: /branch-services/:branchId 기준
  const basePath = `/branch-services/${branchId}`;

  useEffect(() => {
    if (branchId) {
      // 먼저 로컬 맵에서 찾고, 없으면 API 호출
      const localName = BRANCH_NAMES[branchId];
      if (localName) {
        setBranchName(localName);
        setLoading(false);
      } else {
        loadBranchInfo();
      }
    }
  }, [branchId]);

  const loadBranchInfo = async () => {
    try {
      const res = await branchApi.getBranchInfo(branchId!);
      setBranchName(res.data.name || branchId || '분회');
    } catch {
      setBranchName(branchId || '분회');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div>로딩 중...</div>
      </div>
    );
  }

  return (
    <BranchProvider branchId={branchId || ''} branchName={branchName} basePath={basePath}>
      <BranchLayout branchId={branchId || ''} branchName={branchName}>
        <Routes>
          {/* Dashboard */}
          <Route index element={<BranchDashboardPage />} />

          {/* News */}
          <Route path="news" element={<BranchNewsListPage />} />
          <Route path="news/notice" element={<BranchNewsListPage />} />
          <Route path="news/branch-news" element={<BranchNewsListPage />} />
          <Route path="news/gallery" element={<BranchNewsListPage />} />
          <Route path="news/:id" element={<BranchNewsDetailPage />} />

          {/* Forum */}
          <Route path="forum" element={<BranchForumListPage />} />
          <Route path="forum/post/:id" element={<BranchForumDetailPage />} />
          <Route path="forum/write" element={<BranchForumWritePage />} />
          <Route path="forum/edit/:id" element={<BranchForumWritePage />} />

          {/* Groupbuy */}
          <Route path="groupbuy" element={<BranchGroupbuyListPage />} />
          <Route path="groupbuy/history" element={<BranchGroupbuyListPage />} />
          <Route path="groupbuy/:id" element={<BranchGroupbuyDetailPage />} />

          {/* Docs */}
          <Route path="docs" element={<BranchDocsPage />} />

          {/* About */}
          <Route path="about" element={<BranchAboutPage />} />
          <Route path="about/officers" element={<BranchOfficersPage />} />
          <Route path="about/contact" element={<BranchContactPage />} />

          {/* 404 for branch */}
          <Route path="*" element={<BranchNotFound branchName={branchName} />} />
        </Routes>
      </BranchLayout>
    </BranchProvider>
  );
}

function BranchNotFound({ branchName }: { branchName: string }) {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '3rem', margin: 0, color: '#059669' }}>404</h1>
      <h2 style={{ fontSize: '1.25rem', marginTop: '16px', color: '#0F172A' }}>
        페이지를 찾을 수 없습니다
      </h2>
      <p style={{ color: '#64748B', marginTop: '8px' }}>
        {branchName} 분회에 해당 페이지가 없습니다.
      </p>
      <a
        href="/"
        style={{
          display: 'inline-block',
          marginTop: '24px',
          padding: '12px 24px',
          backgroundColor: '#059669',
          color: '#fff',
          textDecoration: 'none',
          borderRadius: '6px',
        }}
      >
        본부로 돌아가기
      </a>
    </div>
  );
}
