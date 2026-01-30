/**
 * Header Builder Page
 * Full-featured header builder with module management
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import {
  Layout,
  Plus,
  Save,
  Trash2,
  Settings as SettingsIcon,
  Eye,
  EyeOff,
  Menu as MenuIcon,
  Search,
  ShoppingCart,
  User,
  Globe,
  Code,
  Share2,
  UserCheck,
  Image
} from 'lucide-react';
import type {
  HeaderBuilderLayout,
  ModuleConfig,
  HeaderModuleType
} from './types/header-types';
import { ModuleInspector } from './components/module-inspector';

// Module type definitions with icons
const MODULE_TYPES: Array<{
  type: HeaderModuleType;
  label: string;
  icon: React.ReactNode;
  description: string;
}> = [
  { type: 'logo', label: 'Logo', icon: <Layout className="w-4 h-4" />, description: 'Site logo or brand' },
  { type: 'site-title', label: 'Site Title', icon: <Globe className="w-4 h-4" />, description: 'Site title text' },
  { type: 'primary-menu', label: 'Primary Menu', icon: <MenuIcon className="w-4 h-4" />, description: 'Main navigation menu' },
  { type: 'secondary-menu', label: 'Secondary Menu', icon: <MenuIcon className="w-4 h-4" />, description: 'Secondary navigation' },
  { type: 'search', label: 'Search', icon: <Search className="w-4 h-4" />, description: 'Search box' },
  { type: 'account', label: 'Account', icon: <User className="w-4 h-4" />, description: 'User account links' },
  { type: 'cart', label: 'Cart', icon: <ShoppingCart className="w-4 h-4" />, description: 'Shopping cart' },
  { type: 'button', label: 'Button', icon: <Plus className="w-4 h-4" />, description: 'Custom button' },
  { type: 'html', label: 'HTML', icon: <Code className="w-4 h-4" />, description: 'Custom HTML' },
  { type: 'widget', label: 'Widget', icon: <Layout className="w-4 h-4" />, description: 'Widget area' },
  { type: 'social', label: 'Social', icon: <Share2 className="w-4 h-4" />, description: 'Social media links' },
  { type: 'role-switcher', label: 'Role Switcher', icon: <UserCheck className="w-4 h-4" />, description: 'User role switcher' },
];

const HeaderBuilderPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [layout, setLayout] = useState<HeaderBuilderLayout | null>(null);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [showModulePicker, setShowModulePicker] = useState<{ row: string; col: string } | null>(null);

  // Fetch header builder data
  const { data, isLoading } = useQuery({
    queryKey: ['header-builder'],
    queryFn: async () => {
      const response = await authClient.api.get('/settings/header-builder');
      return response.data.data;
    },
  });

  useEffect(() => {
    if (data?.builder) {
      setLayout(data.builder);
    }
  }, [data]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (updatedLayout: HeaderBuilderLayout) => {
      const response = await authClient.api.post('/settings/header-builder', {
        builder: updatedLayout,
        sticky: data?.sticky || {},
        mobile: data?.mobile || {},
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['header-builder'] });
      toast.success('Header Builder 설정이 저장되었습니다');
    },
    onError: (error: any) => {
      toast.error('저장 실패: ' + (error.message || '알 수 없는 오류'));
    },
  });

  const handleSave = () => {
    if (layout) {
      saveMutation.mutate(layout);
    }
  };

  const handleAddModule = (row: keyof HeaderBuilderLayout, col: 'left' | 'center' | 'right', moduleType: HeaderModuleType) => {
    if (!layout) return;

    const newModule: ModuleConfig = {
      id: `${moduleType}-${Date.now()}`,
      type: moduleType,
      label: MODULE_TYPES.find(m => m.type === moduleType)?.label || moduleType,
      settings: {
        visibility: { desktop: true, tablet: true, mobile: true }
      }
    };

    setLayout({
      ...layout,
      [row]: {
        ...layout[row],
        [col]: [...layout[row][col], newModule]
      }
    });

    setShowModulePicker(null);
    toast.success(`${newModule.label} 모듈이 추가되었습니다`);
  };

  const handleRemoveModule = (row: keyof HeaderBuilderLayout, col: 'left' | 'center' | 'right', moduleId: string) => {
    if (!layout) return;

    setLayout({
      ...layout,
      [row]: {
        ...layout[row],
        [col]: layout[row][col].filter(m => m.id !== moduleId)
      }
    });

    toast.success('모듈이 제거되었습니다');
  };

  const toggleRowEnabled = (row: keyof HeaderBuilderLayout) => {
    if (!layout || row === 'primary') return; // Primary row is always enabled

    setLayout({
      ...layout,
      [row]: {
        ...layout[row],
        settings: {
          ...layout[row].settings,
          enabled: !layout[row].settings.enabled
        }
      }
    });
  };

  // Update module settings
  const updateModuleSettings = (moduleId: string, newSettings: any) => {
    if (!layout) return;

    const newLayout = { ...layout };

    // Find and update the module across all rows and columns
    (['above', 'primary', 'below'] as const).forEach(row => {
      (['left', 'center', 'right'] as const).forEach(col => {
        const moduleIndex = newLayout[row][col].findIndex(m => m.id === moduleId);
        if (moduleIndex !== -1) {
          newLayout[row][col][moduleIndex] = {
            ...newLayout[row][col][moduleIndex],
            settings: newSettings
          };
        }
      });
    });

    setLayout(newLayout);
  };

  // Find currently selected module from layout
  const currentSelectedModule = useMemo(() => {
    if (!selectedModuleId || !layout) return null;

    let found: ModuleConfig | null = null;
    (['above', 'primary', 'below'] as const).forEach(row => {
      (['left', 'center', 'right'] as const).forEach(col => {
        const module = layout[row][col].find(m => m.id === selectedModuleId);
        if (module) found = module;
      });
    });

    return found;
  }, [selectedModuleId, layout]);

  if (isLoading || !layout) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderRow = (row: keyof HeaderBuilderLayout, rowLabel: string) => {
    const rowData = layout[row];
    const isEnabled = row === 'primary' || ('enabled' in rowData.settings && rowData.settings.enabled);

    return (
      <div key={row} className="border border-gray-300 rounded-lg overflow-hidden bg-white">
        {/* Row Header */}
        <div className="bg-gray-50 px-4 py-3 border-b border-gray-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-700">{rowLabel}</h3>
            <span className="text-xs text-gray-500">
              Height: {rowData.settings.height.desktop}px
            </span>
          </div>
          <div className="flex items-center gap-2">
            {row !== 'primary' && (
              <button
                onClick={() => toggleRowEnabled(row)}
                className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium ${
                  isEnabled
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {isEnabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {isEnabled ? 'Enabled' : 'Disabled'}
              </button>
            )}
          </div>
        </div>

        {/* Row Content - 3 columns */}
        <div className={`grid grid-cols-3 gap-px bg-gray-200 ${!isEnabled ? 'opacity-50' : ''}`}>
          {(['left', 'center', 'right'] as const).map(col => (
            <div
              key={col}
              className="bg-white p-4 min-h-[120px]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase">{col}</span>
                <button
                  onClick={() => setShowModulePicker({ row, col })}
                  className="text-blue-600 hover:text-blue-700"
                  title="Add Module"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Modules in this column */}
              <div className="space-y-2">
                {rowData[col].map((module: ModuleConfig) => (
                  <div
                    key={module.id}
                    className="bg-gray-50 border border-gray-300 rounded px-3 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {MODULE_TYPES.find(m => m.type === module.type)?.icon}
                      <span className="text-sm font-medium text-gray-700">{module.label}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedModuleId(module.id)}
                        className="p-1 text-gray-500 hover:text-blue-600"
                        title="Settings"
                      >
                        <SettingsIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveModule(row, col, module.id)}
                        className="p-1 text-gray-500 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Header Builder</h1>
          <p className="text-sm text-gray-600 mt-1">
            Customize your header layout with drag-and-drop modules
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saveMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Info Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Layout className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How to use Header Builder:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>Click <Plus className="w-3 h-3 inline" /> to add modules to any column</li>
              <li>Click <Trash2 className="w-3 h-3 inline" /> to remove modules</li>
              <li>Toggle row visibility for Above and Below sections</li>
              <li>Click Save Changes to apply your layout</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Header Rows */}
      <div className="space-y-4">
        {renderRow('above', 'Above Header')}
        {renderRow('primary', 'Primary Header')}
        {renderRow('below', 'Below Header')}
      </div>

      {/* Module Picker Modal */}
      {showModulePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Module</h3>
                <button
                  onClick={() => setShowModulePicker(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {MODULE_TYPES.map(moduleType => (
                  <button
                    key={moduleType.type}
                    onClick={() =>
                      handleAddModule(
                        showModulePicker.row as keyof HeaderBuilderLayout,
                        showModulePicker.col as 'left' | 'center' | 'right',
                        moduleType.type
                      )
                    }
                    className="flex items-start gap-3 p-4 border border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                  >
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      {moduleType.icon}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{moduleType.label}</div>
                      <div className="text-xs text-gray-500 mt-1">{moduleType.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Module Inspector Panel */}
      {currentSelectedModule && (
        <ModuleInspector
          module={currentSelectedModule}
          onUpdate={updateModuleSettings}
          onClose={() => setSelectedModuleId(null)}
        />
      )}
    </div>
  );
};

export default HeaderBuilderPage;
