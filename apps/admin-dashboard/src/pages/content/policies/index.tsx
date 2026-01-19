/**
 * Content Policies - Read-Only Policy Reference
 *
 * WO-O4O-CONTENT-POLICIES-READONLY-V1
 *
 * ⚠️ READ-ONLY 기준 화면
 * - 이 페이지는 Content Core 정책 기준을 가시화합니다
 * - 정책 생성/수정/삭제 기능이 없습니다
 * - 플랫폼의 콘텐츠 규칙을 "헌법"으로 고정하는 역할입니다
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 */

import { useState } from 'react';
import {
  Shield,
  ArrowLeft,
  Eye,
  Globe,
  Lock,
  User,
  Building2,
  Users,
  FileEdit,
  CheckCircle,
  Archive,
  Monitor,
  BookOpen,
  Layout,
  Puzzle,
  ChevronDown,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * ============================================================================
 * Content Core - Policy Reference UI (Read-Only)
 * WO-O4O-CONTENT-POLICIES-READONLY-V1
 *
 * NOTE:
 * 이 페이지는 Content Core의 정책(Policy) 개념을 운영자에게 가시화합니다.
 * 정책은 수정 불가능하며, 플랫폼의 기준으로 고정됩니다.
 *
 * @see docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
 * ============================================================================
 */
import {
  ContentStatus,
  ContentVisibility,
  ContentOwnerType,
} from '@o4o-apps/content-core';

// 정책 섹션 타입
interface PolicySection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

// 정책 항목 타입
interface PolicyItem {
  value: string;
  label: string;
  description: string;
  example: string;
  icon: React.ReactNode;
}

/**
 * Visibility Policy 정의
 */
const VISIBILITY_POLICIES: PolicyItem[] = [
  {
    value: ContentVisibility.PUBLIC,
    label: 'Public (공개)',
    description: '모든 서비스 및 매장에서 사용 가능한 콘텐츠입니다. 플랫폼 전체에서 자유롭게 활용할 수 있습니다.',
    example: '약국 기본 안내 영상, 공통 건강 정보 배너',
    icon: <Globe className="w-5 h-5 text-green-600" />,
  },
  {
    value: ContentVisibility.RESTRICTED,
    label: 'Restricted (제한)',
    description: '특정 서비스, 조직, 또는 파트너에게만 사용이 허용된 콘텐츠입니다. 명시적 권한이 필요합니다.',
    example: '파트너 전용 프로모션 자료, 특정 약국 체인 전용 콘텐츠',
    icon: <Lock className="w-5 h-5 text-amber-600" />,
  },
];

/**
 * Ownership Policy 정의
 */
const OWNERSHIP_POLICIES: PolicyItem[] = [
  {
    value: ContentOwnerType.PLATFORM,
    label: 'Platform (플랫폼)',
    description: '플랫폼이 직접 생성하고 관리하는 공통 자산입니다. 모든 서비스에서 기본적으로 사용 가능합니다.',
    example: '플랫폼 기본 템플릿, 공통 UI 요소, 기본 안내 콘텐츠',
    icon: <Building2 className="w-5 h-5 text-blue-600" />,
  },
  {
    value: ContentOwnerType.SERVICE,
    label: 'Service (서비스)',
    description: '특정 서비스(Signage, LMS 등)가 생성하고 관리하는 자산입니다. 해당 서비스 맥락에서 사용됩니다.',
    example: 'Signage 전용 템플릿, LMS 교육 콘텐츠',
    icon: <User className="w-5 h-5 text-purple-600" />,
  },
  {
    value: ContentOwnerType.PARTNER,
    label: 'Partner (파트너)',
    description: '외부 파트너가 제공하는 자산입니다. 파트너 계약 및 라이선스 조건에 따라 사용됩니다.',
    example: '제약사 제공 교육 자료, 파트너 브랜드 콘텐츠',
    icon: <Users className="w-5 h-5 text-orange-600" />,
  },
];

/**
 * Status Policy 정의
 */
const STATUS_POLICIES: PolicyItem[] = [
  {
    value: ContentStatus.DRAFT,
    label: 'Draft (작성 중)',
    description: '아직 준비 중인 콘텐츠입니다. 외부 노출 및 사용이 불가능합니다.',
    example: '검토 대기 중인 새 영상, 수정 중인 문서',
    icon: <FileEdit className="w-5 h-5 text-gray-500" />,
  },
  {
    value: ContentStatus.PUBLISHED,
    label: 'Published (게시됨)',
    description: '사용 가능한 상태의 콘텐츠입니다. Visibility 정책에 따라 노출됩니다.',
    example: '현재 서비스 중인 모든 콘텐츠',
    icon: <CheckCircle className="w-5 h-5 text-green-600" />,
  },
  {
    value: ContentStatus.ARCHIVED,
    label: 'Archived (보관됨)',
    description: '사용이 중단되었지만 보존되는 콘텐츠입니다. 필요 시 복원 가능합니다.',
    example: '종료된 캠페인 자료, 이전 버전 콘텐츠',
    icon: <Archive className="w-5 h-5 text-amber-600" />,
  },
];

/**
 * Usage Context 정의
 */
const USAGE_CONTEXTS = [
  {
    id: 'signage',
    label: 'Signage',
    description: '약국 디지털 사이니지에서 표시되는 콘텐츠',
    icon: <Monitor className="w-5 h-5 text-blue-600" />,
  },
  {
    id: 'lms',
    label: 'LMS',
    description: '학습 관리 시스템의 교육 콘텐츠',
    icon: <BookOpen className="w-5 h-5 text-green-600" />,
  },
  {
    id: 'cms',
    label: 'CMS',
    description: '콘텐츠 관리 시스템의 페이지/블록',
    icon: <Layout className="w-5 h-5 text-purple-600" />,
  },
  {
    id: 'extension',
    label: 'Extension',
    description: '확장 기능에서 사용하는 콘텐츠',
    icon: <Puzzle className="w-5 h-5 text-orange-600" />,
  },
];

// 접기/펼치기 가능한 정책 섹션 컴포넌트
function PolicyBlock({
  title,
  description,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-4 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg border border-gray-200">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="font-medium text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        {isOpen ? (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="p-4 border-t border-gray-200">{children}</div>}
    </div>
  );
}

// 정책 항목 컴포넌트
function PolicyItemCard({ item }: { item: PolicyItem }) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-white rounded-lg border border-gray-200">
          {item.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-gray-900">{item.label}</h4>
            <code className="text-xs bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">
              {item.value}
            </code>
          </div>
          <p className="text-sm text-gray-600 mb-2">{item.description}</p>
          <div className="text-xs text-gray-500">
            <span className="font-medium">예시:</span> {item.example}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContentPoliciesPage() {
  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="mb-4">
        <Link
          to="/content"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Content
        </Link>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="w-8 h-8 text-gray-400" />
          <h1 className="text-2xl font-semibold text-gray-900">Content / Policies</h1>
        </div>
        <p className="text-gray-500">
          콘텐츠 접근 정책 및 규칙 기준
        </p>
      </div>

      {/* Read-Only Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Eye className="w-5 h-5 text-blue-500 mt-0.5" />
          <div>
            <p className="text-blue-800 font-medium">Read-Only 기준 화면</p>
            <p className="text-blue-700 text-sm mt-1">
              이 화면은 Content Core 정책 기준을 가시화하기 위한 Read-only 기준 화면입니다.
              아래 정책들은 플랫폼의 콘텐츠 규칙을 정의하며, 수정할 수 없습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Policy Sections */}
      <div className="space-y-4">
        {/* Visibility Policy */}
        <PolicyBlock
          title="Visibility Policy (공개 범위)"
          description="콘텐츠가 어디까지 공개되는지를 정의합니다"
          icon={<Globe className="w-5 h-5 text-gray-600" />}
        >
          <div className="space-y-3">
            {VISIBILITY_POLICIES.map((item) => (
              <PolicyItemCard key={item.value} item={item} />
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700">
                <span className="font-medium">주의:</span> Visibility는 "볼 수 있는 범위"를 정의할 뿐,
                실제 접근 권한은 인증 시스템과 함께 동작합니다.
              </p>
            </div>
          </div>
        </PolicyBlock>

        {/* Ownership Policy */}
        <PolicyBlock
          title="Ownership Policy (소유권)"
          description="콘텐츠의 생성/관리 주체를 정의합니다"
          icon={<User className="w-5 h-5 text-gray-600" />}
        >
          <div className="space-y-3">
            {OWNERSHIP_POLICIES.map((item) => (
              <PolicyItemCard key={item.value} item={item} />
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700">
                <span className="font-medium">주의:</span> 소유권은 "누가 관리 책임을 갖는가"를 정의합니다.
                소유권과 사용 권한은 별개입니다.
              </p>
            </div>
          </div>
        </PolicyBlock>

        {/* Status Policy */}
        <PolicyBlock
          title="Status Policy (생명주기)"
          description="콘텐츠의 상태 전이를 정의합니다"
          icon={<CheckCircle className="w-5 h-5 text-gray-600" />}
        >
          <div className="space-y-3">
            {STATUS_POLICIES.map((item) => (
              <PolicyItemCard key={item.value} item={item} />
            ))}
          </div>
          {/* Status Flow Diagram */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 font-medium mb-3">상태 전이 흐름</p>
            <div className="flex items-center justify-center gap-2 text-sm">
              <span className="px-3 py-1 bg-gray-200 rounded text-gray-600">Draft</span>
              <span className="text-gray-400">→</span>
              <span className="px-3 py-1 bg-green-100 rounded text-green-700">Published</span>
              <span className="text-gray-400">→</span>
              <span className="px-3 py-1 bg-amber-100 rounded text-amber-700">Archived</span>
            </div>
            <p className="text-xs text-gray-400 text-center mt-3">
              * 상태 전이는 자동으로 발생하지 않습니다. 명시적 액션이 필요합니다.
            </p>
          </div>
        </PolicyBlock>

        {/* Usage Policy */}
        <PolicyBlock
          title="Usage Policy (사용 맥락)"
          description="콘텐츠가 사용될 수 있는 맥락을 정의합니다"
          icon={<Puzzle className="w-5 h-5 text-gray-600" />}
        >
          <div className="grid grid-cols-2 gap-3">
            {USAGE_CONTEXTS.map((context) => (
              <div
                key={context.id}
                className="p-3 bg-gray-50 rounded-lg border border-gray-100"
              >
                <div className="flex items-center gap-2 mb-1">
                  {context.icon}
                  <span className="font-medium text-gray-900">{context.label}</span>
                </div>
                <p className="text-xs text-gray-500">{context.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5" />
              <p className="text-xs text-amber-700">
                <span className="font-medium">주의:</span> Usage Policy는 "허용 범위"를 정의할 뿐,
                실제 콘텐츠 연결은 각 서비스에서 수행합니다.
              </p>
            </div>
          </div>
        </PolicyBlock>
      </div>

      {/* Content Core Info */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Content Core 정책 기반 enum</h4>
        <div className="grid grid-cols-3 gap-4 text-xs text-gray-500">
          <div>
            <span className="font-medium">ContentVisibility:</span>
            <span className="ml-1">{Object.values(ContentVisibility).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentOwnerType:</span>
            <span className="ml-1">{Object.values(ContentOwnerType).join(', ')}</span>
          </div>
          <div>
            <span className="font-medium">ContentStatus:</span>
            <span className="ml-1">{Object.values(ContentStatus).join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Reference */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-400">
          Work Order: WO-O4O-CONTENT-POLICIES-READONLY-V1 |
          참조: docs/platform/content-core/CONTENT-CORE-OVERVIEW.md
        </p>
      </div>
    </div>
  );
}
