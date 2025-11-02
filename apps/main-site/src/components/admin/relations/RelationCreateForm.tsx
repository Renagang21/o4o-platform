import { FC } from 'react';
import { Save, Package } from 'lucide-react';
import type { RelationFormData, AvailableCPT } from '../../../types/relations';

interface RelationCreateFormProps {
  formData: RelationFormData;
  availableCPTs: AvailableCPT[];
  onFormChange: (formData: RelationFormData) => void;
  onUpdateRelationType: (type: 'one-to-one' | 'one-to-many' | 'many-to-many') => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const RelationCreateForm: FC<RelationCreateFormProps> = ({
  formData,
  availableCPTs,
  onFormChange,
  onUpdateRelationType,
  onSubmit,
  onCancel
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">새 관계 생성</h3>
        <p className="text-gray-600 mt-1">Post Type 간의 관계를 정의하세요</p>
      </div>

      <div className="space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">기본 정보</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                관계명 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => onFormChange({ ...formData, name: e.target.value })}
                placeholder="예: product_brand, event_team"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">내부적으로 사용되는 이름 (영문, 숫자, _ 만 사용)</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                표시 라벨 *
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={e => onFormChange({ ...formData, label: e.target.value })}
                placeholder="예: 상품-브랜드 관계"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={e => onFormChange({ ...formData, description: e.target.value })}
                placeholder="이 관계의 목적과 사용법을 설명해주세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 관계 타입 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">관계 타입</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                value: 'one-to-one' as const,
                label: '일대일 (1:1)',
                desc: '한 항목이 다른 한 항목과만 연결',
                example: '포트폴리오 ↔ 후기'
              },
              {
                value: 'one-to-many' as const,
                label: '일대다 (1:N)',
                desc: '한 항목이 여러 항목과 연결',
                example: '브랜드 → 상품들'
              },
              {
                value: 'many-to-many' as const,
                label: '다대다 (N:N)',
                desc: '여러 항목이 서로 여러 항목과 연결',
                example: '이벤트 ↔ 팀원들'
              }
            ].map(type => (
              <label key={type.value} className="relative">
                <input
                  type="radio"
                  name="relationType"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={() => onUpdateRelationType(type.value)}
                  className="sr-only"
                />
                <div className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  formData.type === type.value
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  <div className="font-medium text-gray-900 mb-1">{type.label}</div>
                  <div className="text-sm text-gray-500 mb-2">{type.desc}</div>
                  <div className="text-xs text-gray-400">{type.example}</div>
                </div>
              </label>
            ))}
          </div>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.bidirectional}
              onChange={e => onFormChange({ ...formData, bidirectional: e.target.checked })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">양방향 관계 (두 Post Type 모두에 관계 필드 생성)</span>
          </label>
        </div>

        {/* 관계 설정 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">관계 설정</h4>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* From */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4" />
                From (출발점)
              </h5>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post Type *
                </label>
                <select
                  value={formData.from.postType}
                  onChange={e => onFormChange({
                    ...formData,
                    from: { ...formData.from, postType: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Post Type 선택</option>
                  {availableCPTs.map(cpt => (
                    <option key={cpt.slug} value={cpt.slug}>
                      {cpt.icon} {cpt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  필드 라벨 *
                </label>
                <input
                  type="text"
                  value={formData.from.label}
                  onChange={e => onFormChange({
                    ...formData,
                    from: { ...formData.from, label: e.target.value }
                  })}
                  placeholder="예: 상품들, 팀원들"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  필드명 *
                </label>
                <input
                  type="text"
                  value={formData.from.fieldName}
                  onChange={e => onFormChange({
                    ...formData,
                    from: { ...formData.from, fieldName: e.target.value }
                  })}
                  placeholder="예: products, team_members"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {formData.type !== 'many-to-many' && formData.type !== 'one-to-many' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    최대 연결 수
                  </label>
                  <input
                    type="number"
                    value={formData.from.maxItems || ''}
                    onChange={e => onFormChange({
                      ...formData,
                      from: {
                        ...formData.from,
                        maxItems: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    placeholder="무제한일 경우 비워두세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.from.required}
                  onChange={e => onFormChange({
                    ...formData,
                    from: { ...formData.from, required: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">필수 필드</span>
              </label>
            </div>

            {/* To */}
            <div className="space-y-4">
              <h5 className="font-medium text-gray-900 flex items-center gap-2">
                <Package className="w-4 h-4" />
                To (도착점)
              </h5>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Post Type *
                </label>
                <select
                  value={formData.to.postType}
                  onChange={e => onFormChange({
                    ...formData,
                    to: { ...formData.to, postType: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Post Type 선택</option>
                  {availableCPTs.map(cpt => (
                    <option key={cpt.slug} value={cpt.slug}>
                      {cpt.icon} {cpt.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  필드 라벨 *
                </label>
                <input
                  type="text"
                  value={formData.to.label}
                  onChange={e => onFormChange({
                    ...formData,
                    to: { ...formData.to, label: e.target.value }
                  })}
                  placeholder="예: 브랜드, 팀"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  필드명 *
                </label>
                <input
                  type="text"
                  value={formData.to.fieldName}
                  onChange={e => onFormChange({
                    ...formData,
                    to: { ...formData.to, fieldName: e.target.value }
                  })}
                  placeholder="예: brand, team"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {formData.type !== 'many-to-many' && formData.type === 'one-to-one' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    최대 연결 수
                  </label>
                  <input
                    type="number"
                    value={formData.to.maxItems || ''}
                    onChange={e => onFormChange({
                      ...formData,
                      to: {
                        ...formData.to,
                        maxItems: e.target.value ? parseInt(e.target.value) : undefined
                      }
                    })}
                    placeholder="무제한일 경우 비워두세요"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              )}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.to.required}
                  onChange={e => onFormChange({
                    ...formData,
                    to: { ...formData.to, required: e.target.checked }
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">필수 필드</span>
              </label>
            </div>
          </div>
        </div>

        {/* 추가 옵션 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">추가 옵션</h4>

          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.settings.sortable}
                onChange={e => onFormChange({
                  ...formData,
                  settings: { ...formData.settings, sortable: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">정렬 가능 (사용자가 수동으로 정렬 가능)</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.settings.duplicates}
                onChange={e => onFormChange({
                  ...formData,
                  settings: { ...formData.settings, duplicates: e.target.checked }
                })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">중복 연결 허용</span>
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연결된 항목 삭제 시 동작
              </label>
              <select
                value={formData.settings.deleteAction}
                onChange={e => onFormChange({
                  ...formData,
                  settings: {
                    ...formData.settings,
                    deleteAction: e.target.value as 'cascade' | 'restrict' | 'set_null'
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="set_null">NULL로 설정 (관계만 제거)</option>
                <option value="restrict">삭제 제한 (연결된 항목이 있으면 삭제 불가)</option>
                <option value="cascade">연쇄 삭제 (연결된 항목도 함께 삭제)</option>
              </select>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={!formData.name || !formData.label || !formData.from.postType || !formData.to.postType}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="w-4 h-4" />
            관계 생성
          </button>
        </div>
      </div>
    </div>
  );
};
