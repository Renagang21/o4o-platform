import { FC } from 'react';
import { Save, Code, Settings, Zap } from 'lucide-react';
import type { TemplateFormData, TemplateField, AvailableCPT, EditorMode } from '../../../types/templates';

interface TemplateCreateFormProps {
  formData: TemplateFormData;
  availableCPTs: AvailableCPT[];
  availableFields: TemplateField[];
  activeEditor: EditorMode;
  onFormChange: (formData: TemplateFormData) => void;
  onActiveEditorChange: (editor: EditorMode) => void;
  onInsertField: (shortcode: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export const TemplateCreateForm: FC<TemplateCreateFormProps> = ({
  formData,
  availableCPTs,
  availableFields,
  activeEditor,
  onFormChange,
  onActiveEditorChange,
  onInsertField,
  onSubmit,
  onCancel
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-full">
      {/* 왼쪽: 폼 */}
      <div className="lg:col-span-1 space-y-6">
        {/* 기본 정보 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">기본 정보</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Template 이름 *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => onFormChange({ ...formData, name: e.target.value })}
                placeholder="예: product_card"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                표시 제목 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={e => onFormChange({ ...formData, title: e.target.value })}
                placeholder="예: 상품 카드"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={e => onFormChange({ ...formData, description: e.target.value })}
                placeholder="템플릿 설명"
                rows={3}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* 타입 설정 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">타입 설정</h4>

          <div className="space-y-3">
            {[
              { value: 'single' as const, label: '단일 페이지', desc: '개별 포스트 표시' },
              { value: 'archive' as const, label: '목록 페이지', desc: '포스트 목록 표시' },
              { value: 'custom' as const, label: '커스텀', desc: '자유 형식' }
            ].map(type => (
              <label key={type.value} className="flex items-start">
                <input
                  type="radio"
                  name="templateType"
                  value={type.value}
                  checked={formData.type === type.value}
                  onChange={e => onFormChange({ ...formData, type: e.target.value as 'single' | 'archive' | 'custom' })}
                  className="mt-1 mr-2"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">{type.label}</div>
                  <div className="text-xs text-gray-500">{type.desc}</div>
                </div>
              </label>
            ))}
          </div>

          {(formData.type === 'single' || formData.type === 'archive') && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                적용할 Post Type
              </label>
              <select
                value={formData.postType}
                onChange={e => onFormChange({ ...formData, postType: e.target.value })}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Post Type 선택</option>
                {availableCPTs.map(cpt => (
                  <option key={cpt.slug} value={cpt.slug}>{cpt.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 사용 가능한 필드 */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-4">사용 가능한 필드</h4>
          <div className="space-y-2">
            {availableFields.map(field => (
              <div key={field.name} className="group">
                <button
                  onClick={() => onInsertField(field.shortcode)}
                  className="w-full text-left p-2 rounded hover:bg-blue-50 transition-colors"
                >
                  <div className="text-xs font-medium text-gray-900">{field.label}</div>
                  <div className="text-xs text-gray-500 font-mono">{field.shortcode}</div>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 오른쪽: 에디터 */}
      <div className="lg:col-span-3">
        <div className="bg-white border border-gray-200 rounded-lg h-full flex flex-col">
          {/* 에디터 탭 */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-4 px-4">
              {[
                { id: 'html' as const, label: 'HTML', icon: Code },
                { id: 'css' as const, label: 'CSS', icon: Settings },
                { id: 'js' as const, label: 'JavaScript', icon: Zap }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => onActiveEditorChange(tab.id)}
                  className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                    activeEditor === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* 에디터 영역 */}
          <div className="flex-1 p-4">
            {activeEditor === 'html' && (
              <textarea
                id="html-editor"
                value={formData.htmlContent}
                onChange={e => onFormChange({ ...formData, htmlContent: e.target.value })}
                placeholder="HTML 코드를 입력하세요..."
                className="w-full h-full resize-none border border-gray-300 rounded p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {activeEditor === 'css' && (
              <textarea
                value={formData.cssContent}
                onChange={e => onFormChange({ ...formData, cssContent: e.target.value })}
                placeholder="CSS 스타일을 입력하세요..."
                className="w-full h-full resize-none border border-gray-300 rounded p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}

            {activeEditor === 'js' && (
              <textarea
                value={formData.jsContent}
                onChange={e => onFormChange({ ...formData, jsContent: e.target.value })}
                placeholder="JavaScript 코드를 입력하세요..."
                className="w-full h-full resize-none border border-gray-300 rounded p-3 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="border-t border-gray-200 p-4 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={onSubmit}
              disabled={!formData.name || !formData.title}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              Template 생성
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
