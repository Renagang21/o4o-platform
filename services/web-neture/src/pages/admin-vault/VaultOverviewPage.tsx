/**
 * VaultOverviewPage - Admin Vault 개요
 *
 * Work Order: WO-O4O-ADMIN-VAULT-ACCESS-V1
 *
 * 보호 구역 안내 페이지
 * 콘텐츠는 다음 단계에서 정리
 */

import { Shield, FileText, Box, StickyNote, Monitor, Users, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function VaultOverviewPage() {
  const sections = [
    {
      path: '/admin-vault/docs',
      icon: FileText,
      title: 'Docs',
      description: '기존 설명서 이동 대상',
      status: '정리 예정',
    },
    {
      path: '/admin-vault/architecture',
      icon: Box,
      title: 'Architecture',
      description: '설계 관련 문서 이동 대상',
      status: '정리 예정',
    },
    {
      path: '/admin-vault/notes',
      icon: StickyNote,
      title: 'Notes',
      description: '임시 보관',
      status: '정리 예정',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-amber-500" />
          <h1 className="text-2xl font-bold text-white">Admin Vault Overview</h1>
        </div>
        <p className="text-slate-400">
          o4o 설계 보호 구역입니다.
          설계·구조를 유추할 수 있는 콘텐츠가 이곳에 보관됩니다.
        </p>
      </div>

      {/* Section Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sections.map((section) => (
          <Link
            key={section.path}
            to={section.path}
            className="bg-slate-800 border border-slate-700 rounded-xl p-6 hover:border-amber-500/50 transition-colors"
          >
            <div className="flex items-center gap-3 mb-4">
              <section.icon className="w-6 h-6 text-amber-500" />
              <h2 className="text-lg font-semibold text-white">{section.title}</h2>
            </div>
            <p className="text-slate-400 text-sm mb-4">{section.description}</p>
            <span className="inline-block px-2 py-1 bg-slate-700 text-slate-400 text-xs rounded">
              {section.status}
            </span>
          </Link>
        ))}
      </div>

      {/* Hidden Pages - 공개 메뉴에서 제거된 페이지 */}
      <div className="mt-12">
        <h3 className="text-sm font-medium text-slate-300 mb-4">비공개 페이지 (정리 예정)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            to="/channel/structure"
            className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
          >
            <Monitor className="w-6 h-6 text-slate-500" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-300">채널·판매 구조 안내</h4>
              <p className="text-xs text-slate-500 mt-1">/channel/structure</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-600" />
          </Link>
          <Link
            to="/seller/overview"
            className="flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700 rounded-xl hover:border-slate-600 transition-colors"
          >
            <Users className="w-6 h-6 text-slate-500" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-slate-300">판매자 안내</h4>
              <p className="text-xs text-slate-500 mt-1">/seller/overview</p>
            </div>
            <ExternalLink className="w-4 h-4 text-slate-600" />
          </Link>
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 p-6 bg-slate-800/50 border border-slate-700 rounded-xl">
        <h3 className="text-sm font-medium text-slate-300 mb-2">접근 정책</h3>
        <ul className="text-sm text-slate-500 space-y-1">
          <li>• 지정된 관리자 계정만 접근 가능</li>
          <li>• 공개 메뉴에 노출되지 않음</li>
          <li>• 직접 URL 접근 시 권한 검증</li>
        </ul>
      </div>
    </div>
  );
}
