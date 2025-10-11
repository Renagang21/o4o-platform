import { FC, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Menu,
  Save,
  X,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Download,
  Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useMenuEditor } from './hooks/useMenuEditor';
import { useMenuOperations } from './hooks/useMenuOperations';
import { MenuSettings } from './components/menu-editor/MenuSettings';
import { MenuItemTree } from './components/menu-editor/MenuItemTree';
import { MenuItemEditor } from './components/menu-editor/MenuItemEditor';
import { AvailableItems } from './components/menu-editor/AvailableItems';

/**
 * Menu Editor - Main Container
 * New refactored version of WordPressMenuEditor
 * Clean, modular, and maintainable
 */
const MenuEditor: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Main hook for menu editing
  const editor = useMenuEditor({
    menuId: id,
    onSaveSuccess: (menuId) => {
      if (!id || id === 'new') {
        navigate(`/appearance/menus/${menuId}/edit?version=new`, { replace: true });
      }
    },
    onSaveError: (error) => {
      console.error('Save error:', error);
    }
  });

  // Advanced operations hook
  const operations = useMenuOperations({
    items: editor.items,
    onItemsChange: editor.reorderItems,
    menuId: id
  });

  // Warn before leaving if there are unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (editor.isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editor.isDirty]);

  // Handle save with keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        editor.saveMenu();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  // Export menu
  const handleExport = () => {
    const json = operations.exportItems();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `menu-${editor.menu?.slug || 'export'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import menu
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const json = event.target?.result as string;
          operations.importItems(json);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  // Handle cancel
  const handleCancel = () => {
    if (editor.isDirty) {
      if (confirm('저장하지 않은 변경사항이 있습니다. 취소하시겠습니까?')) {
        editor.discardChanges();
        navigate('/appearance/menus');
      }
    } else {
      navigate('/appearance/menus');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/appearance/menus"
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="메뉴 목록으로"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </Link>
              <div className="flex items-center gap-3">
                <Menu className="w-7 h-7 text-gray-700" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {editor.menu?.name || '새 메뉴'}
                  </h1>
                  <p className="text-sm text-gray-500">
                    {id === 'new' ? '새 메뉴 만들기' : '메뉴 편집'}
                  </p>
                </div>
              </div>
              {editor.isDirty && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                  저장 안됨
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Export/Import */}
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="내보내기"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">내보내기</span>
              </button>
              <button
                onClick={handleImport}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                title="가져오기"
              >
                <Upload className="w-4 h-4" />
                <span className="hidden sm:inline">가져오기</span>
              </button>

              {/* Cancel */}
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={editor.isSaving}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline">취소</span>
              </button>

              {/* Save */}
              <button
                onClick={editor.saveMenu}
                disabled={editor.isSaving || !editor.isDirty}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {editor.isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>저장 중...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>저장</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {editor.isLoading ? (
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-gray-600">메뉴 불러오는 중...</p>
          </div>
        </div>
      ) : (
        <div className="max-w-[1800px] mx-auto px-6 py-6">
          {/* Info Banner */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 mb-1">새로운 메뉴 편집기</h3>
              <p className="text-sm text-blue-700">
                이것은 리팩토링된 새 버전의 메뉴 편집기입니다. 모든 기능이 작동하며 더 빠르고 안정적입니다.
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Ctrl/Cmd + S로 저장 • 드래그하여 항목 재정렬 • 클릭하여 편집
              </p>
            </div>
          </div>

          {/* Main Layout */}
          <div className="grid grid-cols-12 gap-6">
            {/* Left Column - Settings */}
            <div className="col-span-12 lg:col-span-3">
              <MenuSettings
                menu={editor.menu}
                onUpdate={editor.updateMenu}
                onNameChange={editor.setMenuName}
                onLocationChange={editor.setMenuLocation}
              />
            </div>

            {/* Middle Column - Tree */}
            <div className="col-span-12 lg:col-span-5">
              <MenuItemTree
                items={editor.items}
                selected={editor.selectedItem?.id || null}
                onSelect={editor.selectItem}
                onReorder={editor.reorderItems}
                onDuplicate={operations.duplicateItem}
                onDelete={editor.deleteItem}
              />
            </div>

            {/* Right Column - Available Items + Editor */}
            <div className="col-span-12 lg:col-span-4 space-y-6">
              {/* Available Items */}
              <AvailableItems onAdd={editor.addItem} />

              {/* Item Editor (Sticky) */}
              {editor.selectedItem && (
                <div className="lg:sticky lg:top-6">
                  <MenuItemEditor
                    item={editor.selectedItem}
                    onUpdate={editor.updateItem}
                    onDelete={editor.deleteItem}
                    onClose={() => editor.selectItem(null)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer Help */}
      <div className="bg-white border-t mt-12">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="text-xs text-gray-500 flex items-center justify-between">
            <div>
              메뉴 편집기 v2.0 • 더 빠르고 안정적인 새 버전
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-gray-700">도움말</a>
              <a href="#" className="hover:text-gray-700">피드백</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuEditor;
