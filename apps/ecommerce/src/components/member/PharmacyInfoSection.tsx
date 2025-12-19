/**
 * PharmacyInfoSection
 *
 * Phase 4: 약국 정보 관리 섹션
 *
 * 표시/수정 가능 필드:
 * - 약국명 (편집)
 * - 주소 (편집)
 * - 근무지명 (편집)
 * - 근무지 주소 (편집)
 * - 근무지 유형 (편집)
 *
 * Policy Enforcement:
 * - 본인만 수정 가능
 * - 수정 시 책임 안내 필수 표시
 */

import { useState, useEffect } from 'react';
import { Store, MapPin, Briefcase, AlertTriangle, Save, X, CheckCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, Button, Input, Label } from '@o4o/ui';
import type { PharmacyInfoData, PharmacyUpdateRequest } from '@/lib/api/member';

interface PharmacyInfoSectionProps {
  data: PharmacyInfoData | null;
  canEdit?: boolean;
  editWarning?: string;
  isLoading?: boolean;
  error?: Error | null;
  onSave?: (data: PharmacyUpdateRequest) => Promise<void>;
  isSaving?: boolean;
  saveResult?: {
    success: boolean;
    warning: string;
    updatedFields: string[];
  } | null;
}

// Workplace type options
const WORKPLACE_TYPES = [
  { value: 'pharmacy', label: '약국' },
  { value: 'hospital', label: '병원' },
  { value: 'clinic', label: '의원' },
  { value: 'company', label: '제약회사' },
  { value: 'research', label: '연구소' },
  { value: 'government', label: '공공기관' },
  { value: 'other', label: '기타' },
];

export function PharmacyInfoSection({
  data,
  canEdit = true,
  editWarning,
  isLoading,
  error,
  onSave,
  isSaving,
  saveResult,
}: PharmacyInfoSectionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [formData, setFormData] = useState<PharmacyUpdateRequest>({
    pharmacyName: data?.pharmacyName || '',
    pharmacyAddress: data?.pharmacyAddress || '',
    workplaceName: data?.workplaceName || '',
    workplaceAddress: data?.workplaceAddress || '',
    workplaceType: data?.workplaceType || '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Update form when data changes
  useEffect(() => {
    if (data) {
      setFormData({
        pharmacyName: data.pharmacyName || '',
        pharmacyAddress: data.pharmacyAddress || '',
        workplaceName: data.workplaceName || '',
        workplaceAddress: data.workplaceAddress || '',
        workplaceType: data.workplaceType || '',
      });
    }
  }, [data]);

  // Clear success message after 5 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const handleInputChange = (field: keyof PharmacyUpdateRequest, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    setFormErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSaveClick = () => {
    // Show responsibility warning before save
    setShowWarning(true);
  };

  const handleConfirmSave = async () => {
    if (!onSave) return;

    try {
      await onSave(formData);
      setShowWarning(false);
      setIsEditing(false);
      setSuccessMessage('약국 정보가 저장되었습니다. 변경된 내용이 반영되었습니다.');
    } catch (err: any) {
      setFormErrors({ general: err.message || '저장 중 오류가 발생했습니다.' });
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setShowWarning(false);
    setFormErrors({});
    // Reset form to original data
    if (data) {
      setFormData({
        pharmacyName: data.pharmacyName || '',
        pharmacyAddress: data.pharmacyAddress || '',
        workplaceName: data.workplaceName || '',
        workplaceAddress: data.workplaceAddress || '',
        workplaceType: data.workplaceType || '',
      });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            약국 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Store className="h-5 w-5" />
            약국 정보
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <AlertTriangle className="h-4 w-4" />
            약국 정보를 불러올 수 없습니다.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5 text-green-600" />
          약국 정보
        </CardTitle>
        {canEdit && !isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            수정
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {/* Success message */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="h-4 w-4" />
            {successMessage}
          </div>
        )}

        {/* Warning modal/banner for save confirmation */}
        {showWarning && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800">저장 전 확인</p>
                <p className="text-sm text-amber-700 mt-1">
                  입력하신 약국 정보의 정확성은 본인의 책임입니다.
                  <br />
                  약사회는 해당 정보를 검증·조정하지 않습니다.
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={handleConfirmSave}
                    disabled={isSaving}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {isSaving ? '저장 중...' : '확인하고 저장'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWarning(false)}
                    disabled={isSaving}
                  >
                    취소
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* General error */}
        {formErrors.general && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            {formErrors.general}
          </div>
        )}

        {isEditing ? (
          // Edit mode
          <div className="space-y-4">
            {/* Pharmacy Name */}
            <div>
              <Label htmlFor="pharmacyName" className="flex items-center gap-2">
                <Store className="h-4 w-4 text-gray-500" />
                약국명
              </Label>
              <Input
                id="pharmacyName"
                value={formData.pharmacyName}
                onChange={(e) => handleInputChange('pharmacyName', e.target.value)}
                placeholder="약국명을 입력하세요"
                className="mt-1"
              />
            </div>

            {/* Pharmacy Address */}
            <div>
              <Label htmlFor="pharmacyAddress" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                약국 주소
              </Label>
              <Input
                id="pharmacyAddress"
                value={formData.pharmacyAddress}
                onChange={(e) => handleInputChange('pharmacyAddress', e.target.value)}
                placeholder="약국 주소를 입력하세요"
                className="mt-1"
              />
            </div>

            {/* Workplace Name */}
            <div>
              <Label htmlFor="workplaceName" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" />
                근무지명
              </Label>
              <Input
                id="workplaceName"
                value={formData.workplaceName}
                onChange={(e) => handleInputChange('workplaceName', e.target.value)}
                placeholder="근무지명을 입력하세요"
                className="mt-1"
              />
            </div>

            {/* Workplace Address */}
            <div>
              <Label htmlFor="workplaceAddress" className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                근무지 주소
              </Label>
              <Input
                id="workplaceAddress"
                value={formData.workplaceAddress}
                onChange={(e) => handleInputChange('workplaceAddress', e.target.value)}
                placeholder="근무지 주소를 입력하세요"
                className="mt-1"
              />
            </div>

            {/* Workplace Type */}
            <div>
              <Label htmlFor="workplaceType" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-gray-500" aria-hidden="true" />
                근무지 유형
              </Label>
              <select
                id="workplaceType"
                value={formData.workplaceType}
                onChange={(e) => handleInputChange('workplaceType', e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-label="근무지 유형 선택"
              >
                <option value="">선택하세요</option>
                {WORKPLACE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Edit Warning */}
            {editWarning && (
              <p className="text-xs text-gray-500 mt-2">
                {editWarning}
              </p>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleSaveClick} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                저장
              </Button>
              <Button variant="outline" onClick={handleCancelEdit} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                취소
              </Button>
            </div>
          </div>
        ) : (
          // View mode
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Pharmacy Name */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Store className="h-4 w-4" />
                약국명
              </div>
              <div className="font-medium text-gray-900">
                {data?.pharmacyName || '-'}
              </div>
            </div>

            {/* Pharmacy Address */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <MapPin className="h-4 w-4" />
                약국 주소
              </div>
              <div className="font-medium text-gray-900">
                {data?.pharmacyAddress || '-'}
              </div>
            </div>

            {/* Workplace Name */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Briefcase className="h-4 w-4" />
                근무지명
              </div>
              <div className="font-medium text-gray-900">
                {data?.workplaceName || '-'}
              </div>
            </div>

            {/* Workplace Address */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <MapPin className="h-4 w-4" />
                근무지 주소
              </div>
              <div className="font-medium text-gray-900">
                {data?.workplaceAddress || '-'}
              </div>
            </div>

            {/* Workplace Type */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 md:col-span-2">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Briefcase className="h-4 w-4" />
                근무지 유형
              </div>
              <div className="font-medium text-gray-900">
                {formatWorkplaceType(data?.workplaceType)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Format workplace type for display
 */
function formatWorkplaceType(type: string | null | undefined): string {
  if (!type) return '-';

  const typeMap: Record<string, string> = {
    pharmacy: '약국',
    hospital: '병원',
    clinic: '의원',
    company: '제약회사',
    research: '연구소',
    government: '공공기관',
    other: '기타',
  };

  return typeMap[type] || type;
}
