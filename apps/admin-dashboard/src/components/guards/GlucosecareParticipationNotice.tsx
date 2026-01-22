/**
 * GlucosecareParticipationNotice Component
 *
 * WO-KPA-SCOPE-AWARE-UX-NOTICES-V1
 *
 * 혈당관리 프로그램 참여 안내 컴포넌트
 * - 프로그램 미참여 약국에 표시
 * - 참여 조건 및 신청 방법 안내
 */

import React from 'react';
import { useOperatorPolicy } from '@/hooks/useOperatorPolicy';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Activity, Info, CheckCircle2, HelpCircle, ExternalLink } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface GlucosecareParticipationNoticeProps {
  /** 표시 모드 */
  variant?: 'banner' | 'card' | 'inline';
  /** 추가 클래스명 */
  className?: string;
  /** 신청 버튼 표시 여부 */
  showApplyButton?: boolean;
  /** 신청 버튼 클릭 핸들러 */
  onApplyClick?: () => void;
  /** 신청 URL (버튼 대신 링크) */
  applyUrl?: string;
}

// ============================================================================
// Program Info
// ============================================================================

const GLUCOSECARE_PROGRAM_INFO = {
  name: '혈당관리 프로그램',
  description: '약국 기반 혈당관리 서비스를 제공하는 특수 프로그램입니다.',
  benefits: [
    '고객 혈당 데이터 관리',
    '혈당 측정 기록 분석',
    '전문 인증 프로그램 수료',
    '프로그램 전용 콘텐츠 접근',
  ],
  requirements: [
    '약사회 회원 약국',
    '혈당관리 교육 이수',
    '프로그램 이용 동의',
  ],
};

// ============================================================================
// Banner Variant
// ============================================================================

function GlucocareBannerNotice({
  className = '',
  showApplyButton,
  onApplyClick,
  applyUrl,
}: GlucosecareParticipationNoticeProps) {
  return (
    <Alert className={`border-blue-200 bg-blue-50 ${className}`}>
      <Activity className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-800 flex items-center gap-2">
        혈당관리 프로그램 참여 필요
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="h-3.5 w-3.5 text-blue-500 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-sm">
                이 기능은 혈당관리 프로그램에 참여한 약국만 이용할 수 있습니다.
                프로그램 참여 신청은 관리자에게 문의하세요.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </AlertTitle>
      <AlertDescription className="text-blue-700 flex items-center justify-between">
        <span>이 기능은 혈당관리 프로그램 참여 약국만 이용할 수 있습니다.</span>
        {showApplyButton && (
          applyUrl ? (
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100"
              asChild
            >
              <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                참여 신청 <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={onApplyClick}
            >
              참여 신청
            </Button>
          )
        )}
      </AlertDescription>
    </Alert>
  );
}

// ============================================================================
// Card Variant
// ============================================================================

function GlucosecareCardNotice({
  className = '',
  showApplyButton,
  onApplyClick,
  applyUrl,
}: GlucosecareParticipationNoticeProps) {
  return (
    <Card className={`border-blue-200 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-800">
          <Activity className="h-5 w-5" />
          {GLUCOSECARE_PROGRAM_INFO.name}
        </CardTitle>
        <CardDescription>
          {GLUCOSECARE_PROGRAM_INFO.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Benefits */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            프로그램 혜택
          </p>
          <ul className="space-y-1">
            {GLUCOSECARE_PROGRAM_INFO.benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>

        {/* Requirements */}
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-2">
            참여 조건
          </p>
          <div className="flex flex-wrap gap-2">
            {GLUCOSECARE_PROGRAM_INFO.requirements.map((req, index) => (
              <Badge key={index} variant="secondary">
                {req}
              </Badge>
            ))}
          </div>
        </div>

        {/* Apply Button */}
        {showApplyButton && (
          <div className="pt-2">
            {applyUrl ? (
              <Button className="w-full" asChild>
                <a href={applyUrl} target="_blank" rel="noopener noreferrer">
                  프로그램 참여 신청 <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            ) : (
              <Button className="w-full" onClick={onApplyClick}>
                프로그램 참여 신청
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Inline Variant
// ============================================================================

function GlucosecareInlineNotice({
  className = '',
}: GlucosecareParticipationNoticeProps) {
  return (
    <div className={`flex items-center gap-2 text-sm text-blue-700 ${className}`}>
      <Info className="h-4 w-4" />
      <span>혈당관리 프로그램 참여 약국 전용 기능입니다.</span>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <HelpCircle className="h-3.5 w-3.5 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm max-w-xs">
              프로그램 참여를 원하시면 관리자에게 문의하세요.
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * 혈당관리 프로그램 참여 안내
 *
 * 사용 예:
 * ```tsx
 * // 배너 형태
 * <GlucosecareParticipationNotice variant="banner" />
 *
 * // 카드 형태 (상세 정보 포함)
 * <GlucosecareParticipationNotice
 *   variant="card"
 *   showApplyButton
 *   onApplyClick={() => navigate('/apply')}
 * />
 *
 * // 인라인 형태 (간단한 안내)
 * <GlucosecareParticipationNotice variant="inline" />
 * ```
 */
export function GlucosecareParticipationNotice({
  variant = 'banner',
  ...props
}: GlucosecareParticipationNoticeProps) {
  switch (variant) {
    case 'card':
      return <GlucosecareCardNotice {...props} />;
    case 'inline':
      return <GlucosecareInlineNotice {...props} />;
    case 'banner':
    default:
      return <GlucocareBannerNotice {...props} />;
  }
}

// ============================================================================
// Conditional Wrapper
// ============================================================================

export interface GlucosecareGuardedContentProps {
  /** 자식 요소 (glycocare 스코프일 때만 표시) */
  children: React.ReactNode;
  /** 미참여 시 안내 표시 여부 */
  showNotice?: boolean;
  /** 안내 variant */
  noticeVariant?: 'banner' | 'card' | 'inline';
  /** 신청 버튼 표시 */
  showApplyButton?: boolean;
  /** 신청 핸들러 */
  onApplyClick?: () => void;
}

/**
 * 혈당관리 프로그램 조건부 래퍼
 *
 * glycocare 스코프가 있는 경우에만 children 표시,
 * 없으면 참여 안내 표시
 */
export function GlucosecareGuardedContent({
  children,
  showNotice = true,
  noticeVariant = 'banner',
  showApplyButton = false,
  onApplyClick,
}: GlucosecareGuardedContentProps) {
  const { activeScopeKey, isOperator } = useOperatorPolicy();

  // glycocare 스코프가 있으면 children 표시
  if (isOperator && activeScopeKey === 'glycocare') {
    return <>{children}</>;
  }

  // 미참여 시 안내 표시
  if (showNotice) {
    return (
      <GlucosecareParticipationNotice
        variant={noticeVariant}
        showApplyButton={showApplyButton}
        onApplyClick={onApplyClick}
      />
    );
  }

  return null;
}

export default GlucosecareParticipationNotice;
