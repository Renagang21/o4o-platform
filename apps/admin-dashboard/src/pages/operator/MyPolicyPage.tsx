/**
 * MyPolicyPage - Operator Policy Summary Page
 *
 * WO-KPA-OPERATOR-SCOPE-ASSIGNMENT-OPS-V1
 * WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1
 *
 * 운영자가 자신의 스코프와 정책을 확인할 수 있는 페이지
 */

import React from 'react';
import { useOperatorPolicy } from '@/hooks/useOperatorPolicy';
import {
  OperatorScopeBadge,
  OperatorPolicySummary,
} from '@/components/guards';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Shield, Info, CheckCircle2, XCircle, Users, Activity, MapPin, AlertTriangle } from 'lucide-react';

export default function MyPolicyPage() {
  const {
    activeScopeKey,
    activePolicy,
    isOperator,
    operatorScopeKeys,
    canCreateForum,
    canManageContent,
    canManageCertification,
    canManagePolicy,
    canManageGroupBuy,
    // WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1
    currentServiceEntry,
    currentServiceConfig,
    serviceDefaultScopeKey,
    isScopeMatchingService,
  } = useOperatorPolicy();

  if (!isOperator) {
    return (
      <div className="container max-w-3xl py-8">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>운영자 권한 없음</AlertTitle>
          <AlertDescription>
            이 페이지는 운영자 권한이 있는 사용자만 접근할 수 있습니다.
            운영자 권한이 필요하시면 관리자에게 문의하세요.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const features = [
    {
      key: 'canCreateForum',
      label: '포럼 개설',
      description: '새 포럼 게시판을 생성할 수 있습니다.',
      enabled: canCreateForum,
    },
    {
      key: 'canManageContent',
      label: '콘텐츠 관리',
      description: '콘텐츠를 생성, 수정, 삭제할 수 있습니다.',
      enabled: canManageContent,
    },
    {
      key: 'canManageCertification',
      label: '인증 관리',
      description: '인증 프로그램을 관리할 수 있습니다.',
      enabled: canManageCertification,
    },
    {
      key: 'canManagePolicy',
      label: '정책 관리',
      description: '서비스 운영 정책을 설정할 수 있습니다.',
      enabled: canManagePolicy,
    },
    {
      key: 'canManageGroupBuy',
      label: '공구 관리',
      description: '공동구매 이벤트를 관리할 수 있습니다.',
      enabled: canManageGroupBuy,
    },
  ];

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">내 운영자 정책</h1>
          <p className="text-muted-foreground">
            현재 할당된 스코프와 권한을 확인합니다.
          </p>
        </div>
        <OperatorScopeBadge size="lg" />
      </div>

      <Separator />

      {/* WO-KPA-SERVICE-ENTRY-SCOPE-DEFAULTS-V1: Current Service Context */}
      {currentServiceConfig && (
        <Card className={isScopeMatchingService ? 'border-green-200' : 'border-yellow-200'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              현재 서비스 컨텍스트
            </CardTitle>
            <CardDescription>
              현재 접속 중인 서비스와 적용되는 스코프입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  서비스
                </p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{currentServiceEntry}</Badge>
                  <span className="font-medium">{currentServiceConfig.displayName}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  서비스 기본 스코프
                </p>
                <Badge variant={isScopeMatchingService ? 'default' : 'secondary'}>
                  {serviceDefaultScopeKey}
                </Badge>
              </div>
            </div>

            {currentServiceConfig.isProgram && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  이 서비스는 <strong>프로그램</strong>입니다. 특수 정책이 적용됩니다.
                </p>
              </div>
            )}

            {!isScopeMatchingService && (
              <Alert variant="default" className="border-yellow-300 bg-yellow-50">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-800">스코프 불일치</AlertTitle>
                <AlertDescription className="text-yellow-700">
                  현재 스코프({activeScopeKey})가 서비스 기본 스코프({serviceDefaultScopeKey})와 다릅니다.
                  일부 기능이 제한될 수 있습니다.
                </AlertDescription>
              </Alert>
            )}

            {isScopeMatchingService && (
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">스코프가 서비스 기본과 일치합니다.</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Scope Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            스코프 정보
          </CardTitle>
          <CardDescription>
            운영자 스코프는 서비스별 권한 범위를 정의합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                활성 스코프
              </p>
              <div className="flex items-center gap-2">
                {activeScopeKey === 'glycocare' ? (
                  <Activity className="h-5 w-5 text-blue-600" />
                ) : (
                  <Users className="h-5 w-5 text-green-600" />
                )}
                <span className="font-medium">
                  {activePolicy?.displayName || activeScopeKey}
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">
                인증 기준
              </p>
              <Badge variant="outline">
                {activePolicy?.certificationCriteria === 'program'
                  ? '프로그램 기반'
                  : '협회 기반'}
              </Badge>
            </div>
          </div>

          {activePolicy?.description && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                {activePolicy.description}
              </p>
            </div>
          )}

          {operatorScopeKeys.length > 1 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>복수 스코프</AlertTitle>
              <AlertDescription>
                {operatorScopeKeys.length}개의 스코프가 할당되어 있습니다.
                현재는 첫 번째 스코프({activeScopeKey})가 활성화되어 있습니다.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Feature Permissions */}
      <Card>
        <CardHeader>
          <CardTitle>기능 권한</CardTitle>
          <CardDescription>
            현재 스코프에서 사용 가능한 기능 목록입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {features.map(({ key, label, description, enabled }) => (
              <div
                key={key}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  enabled
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                {enabled ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-gray-400 mt-0.5" />
                )}
                <div>
                  <p
                    className={`font-medium ${
                      enabled ? 'text-green-800' : 'text-gray-500'
                    }`}
                  >
                    {label}
                  </p>
                  <p
                    className={`text-sm ${
                      enabled ? 'text-green-700' : 'text-gray-400'
                    }`}
                  >
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Join Requirements */}
      {activePolicy?.joinRequirements && (
        <Card>
          <CardHeader>
            <CardTitle>가입 조건</CardTitle>
            <CardDescription>
              이 스코프에 적용되는 가입 조건입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  검증 수준
                </p>
                <Badge
                  variant={
                    activePolicy.joinRequirements.strictness === 'strict'
                      ? 'destructive'
                      : 'secondary'
                  }
                >
                  {activePolicy.joinRequirements.strictness === 'strict'
                    ? '엄격'
                    : '완화'}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  승인 필요
                </p>
                <Badge variant="outline">
                  {activePolicy.joinRequirements.requiresApproval
                    ? '필요'
                    : '불필요'}
                </Badge>
              </div>
            </div>

            {activePolicy.joinRequirements.requiredFields.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  필수 입력 항목
                </p>
                <div className="flex flex-wrap gap-2">
                  {activePolicy.joinRequirements.requiredFields.map((field) => (
                    <Badge key={field} variant="outline">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Content Types */}
      {activePolicy?.contentTypes && activePolicy.contentTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>관리 가능 콘텐츠</CardTitle>
            <CardDescription>
              이 스코프에서 관리할 수 있는 콘텐츠 유형입니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {activePolicy.contentTypes.map((contentType) => (
                <Badge key={contentType} variant="secondary">
                  {contentType}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
