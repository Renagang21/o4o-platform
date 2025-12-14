/**
 * AGCard & AGStatCard Demo Page
 *
 * Phase 7-C: Global Components Demo
 */

import React from 'react';
import { AGCard, AGCardHeader } from '../../components/ag/cards/AGCard';
import { AGStatCard, AGStatGrid } from '../../components/ag/cards/AGStatCard';

export default function CardsDemo() {
  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AGCard 데모</h1>
        <p className="text-gray-500 mt-1">카드 컴포넌트 데모 페이지</p>
      </div>

      {/* Stat Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">통계 카드</h2>
        <AGStatGrid cols={4}>
          <AGStatCard
            label="총 매출"
            value={12450000}
            delta={12.5}
            trend="up"
            deltaLabel="전월 대비"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <AGStatCard
            label="신규 주문"
            value={238}
            delta={-5.2}
            trend="down"
            deltaLabel="전일 대비"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
            iconBgColor="bg-green-50"
            iconColor="text-green-600"
          />
          <AGStatCard
            label="활성 사용자"
            value="1,234"
            delta={0}
            trend="neutral"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
            iconBgColor="bg-purple-50"
            iconColor="text-purple-600"
          />
          <AGStatCard
            label="전환율"
            value="3.24%"
            delta={8.1}
            trend="up"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
            iconBgColor="bg-yellow-50"
            iconColor="text-yellow-600"
          />
        </AGStatGrid>
      </section>

      {/* Compact Stat Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">컴팩트 통계 카드</h2>
        <AGStatGrid cols={5}>
          <AGStatCard label="오늘 방문" value={892} compact />
          <AGStatCard label="페이지뷰" value="4.5K" compact />
          <AGStatCard label="이탈률" value="42.3%" compact />
          <AGStatCard label="평균 체류" value="3:24" compact />
          <AGStatCard label="신규 가입" value={45} delta={15} compact />
        </AGStatGrid>
      </section>

      {/* Loading Stat Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">로딩 상태</h2>
        <AGStatGrid cols={3}>
          <AGStatCard label="로딩 중..." value={0} loading />
          <AGStatCard label="로딩 중..." value={0} loading />
          <AGStatCard label="로딩 중..." value={0} loading />
        </AGStatGrid>
      </section>

      {/* Basic Cards */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">기본 카드</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AGCard>
            <p className="text-gray-600">기본 카드입니다. 패딩과 보더가 적용되어 있습니다.</p>
          </AGCard>

          <AGCard padding="lg" shadow="lg">
            <p className="text-gray-600">큰 패딩과 그림자가 적용된 카드입니다.</p>
          </AGCard>

          <AGCard hoverable onClick={() => alert('카드 클릭!')}>
            <p className="text-gray-600">클릭 가능한 호버 효과 카드입니다.</p>
          </AGCard>
        </div>
      </section>

      {/* Cards with Header/Footer */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">헤더/푸터 카드</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AGCard
            header={
              <AGCardHeader
                title="프로젝트 현황"
                subtitle="최근 7일 기준"
                action={
                  <button className="text-sm text-blue-600 hover:text-blue-700">
                    더보기
                  </button>
                }
              />
            }
            footer={
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">마지막 업데이트: 5분 전</span>
                <button className="text-blue-600 hover:text-blue-700">새로고침</button>
              </div>
            }
          >
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">완료된 작업</span>
                <span className="font-semibold">24/30</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '80%' }} />
              </div>
            </div>
          </AGCard>

          <AGCard
            header={
              <AGCardHeader
                title="팀 멤버"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                }
              />
            }
          >
            <ul className="space-y-2">
              {['김철수', '이영희', '박지민', '최유진'].map((name) => (
                <li key={name} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm font-medium">
                    {name[0]}
                  </div>
                  <span className="text-gray-700">{name}</span>
                </li>
              ))}
            </ul>
          </AGCard>
        </div>
      </section>

      {/* Shadow Variants */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">그림자 변형</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <AGCard shadow={false} className="text-center">
            <p className="text-gray-600">그림자 없음</p>
          </AGCard>
          <AGCard shadow="sm" className="text-center">
            <p className="text-gray-600">Small</p>
          </AGCard>
          <AGCard shadow="md" className="text-center">
            <p className="text-gray-600">Medium</p>
          </AGCard>
          <AGCard shadow="lg" className="text-center">
            <p className="text-gray-600">Large</p>
          </AGCard>
        </div>
      </section>
    </div>
  );
}
