import { FC, useState, useEffect } from 'react';
import {
  Edit2,
  ExternalLink,
  Trash2,
  Save,
  X,
  Link2,
  Type,
  AlignLeft
} from 'lucide-react';
import toast from 'react-hot-toast';
import type { MenuItemTree } from '../../utils/menu-tree-helpers';

export interface MenuItemEditorProps {
  item: MenuItemTree | null;
  onUpdate: (id: string, updates: Partial<MenuItemTree>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

/**
 * Menu Item Editor Component
 * Provides detailed editing interface for a single menu item
 */
export const MenuItemEditor: FC<MenuItemEditorProps> = ({
  item,
  onUpdate,
  onDelete,
  onClose
}) => {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [target, setTarget] = useState<'_self' | '_blank'>('_self');
  const [cssClass, setCssClass] = useState('');
  const [description, setDescription] = useState('');

  // Sync with item prop
  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setUrl(item.url || '');
      setTarget(item.target || '_self');
      setCssClass(item.cssClass || '');
      setDescription(item.description || '');
    }
  }, [item]);

  if (!item) {
    return null;
  }

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('제목을 입력하세요');
      return;
    }

    onUpdate(item.id, {
      title: title.trim(),
      url: url.trim(),
      target,
      cssClass: cssClass.trim(),
      description: description.trim()
    });

    toast.success('메뉴 항목이 업데이트되었습니다');
  };

  const handleDelete = () => {
    if (confirm('이 메뉴 항목을 삭제하시겠습니까?')) {
      onDelete(item.id);
      toast.success('메뉴 항목이 삭제되었습니다');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 w-96">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Edit2 className="w-5 h-5 text-gray-600" />
          <h3 className="font-semibold text-gray-900">메뉴 항목 편집</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="닫기"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
        {/* Title */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Type className="w-4 h-4" />
            제목 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="메뉴 항목 제목"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* URL */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Link2 className="w-4 h-4" />
            URL
          </label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https:// 또는 /path"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            외부 링크는 https://, 내부 링크는 /로 시작
          </p>
        </div>

        {/* Target */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <ExternalLink className="w-4 h-4" />
            링크 열기 방식
          </label>
          <div className="flex gap-2">
            <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="target"
                value="_self"
                checked={target === '_self'}
                onChange={(e) => setTarget(e.target.value as '_self')}
                className="text-blue-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">같은 창</div>
                <div className="text-xs text-gray-500">현재 탭에서 열기</div>
              </div>
            </label>
            <label className="flex-1 flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="target"
                value="_blank"
                checked={target === '_blank'}
                onChange={(e) => setTarget(e.target.value as '_blank')}
                className="text-blue-600"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">새 창</div>
                <div className="text-xs text-gray-500">새 탭에서 열기</div>
              </div>
            </label>
          </div>
        </div>

        {/* CSS Class */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            CSS 클래스 (선택사항)
          </label>
          <input
            type="text"
            value={cssClass}
            onChange={(e) => setCssClass(e.target.value)}
            placeholder="custom-class another-class"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            스타일링을 위한 CSS 클래스 (공백으로 구분)
          </p>
        </div>

        {/* Description */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <AlignLeft className="w-4 h-4" />
            설명 (선택사항)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="이 메뉴 항목에 대한 설명"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          />
          <p className="mt-1 text-xs text-gray-500">
            스크린 리더 등 접근성을 위한 설명
          </p>
        </div>

        {/* Item Type Info */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 space-y-1">
            <div>
              <span className="font-medium">타입:</span> {item.type}
            </div>
            {item.originalId && (
              <div>
                <span className="font-medium">원본 ID:</span> {item.originalId}
              </div>
            )}
            <div>
              <span className="font-medium">순서:</span> {item.order_num}
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-gray-50">
        <button
          onClick={handleDelete}
          className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          삭제
        </button>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Save className="w-4 h-4" />
            저장
          </button>
        </div>
      </div>
    </div>
  );
};
