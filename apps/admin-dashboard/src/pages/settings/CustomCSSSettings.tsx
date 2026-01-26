import { FC, useState, useEffect } from 'react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { Code } from 'lucide-react';

const CustomCSSSettings: FC = () => {
  const [customCSS, setCustomCSS] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCustomCSS();
  }, []);

  const loadCustomCSS = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/settings/customizer');
      const css = response.data?.data?.customCSS || '';
      setCustomCSS(css);
    } catch (error: any) {
      console.error('Failed to load custom CSS:', error);
      toast.error('Custom CSS를 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get current customizer settings
      const currentResponse = await authClient.api.get('/settings/customizer');
      const currentSettings = currentResponse.data?.data || {};

      // Update only customCSS field
      const updatedSettings = {
        ...currentSettings,
        customCSS: customCSS
      };

      // Save back to customizer
      await authClient.api.put('/settings/customizer', {
        settings: updatedSettings
      });

      toast.success('Custom CSS가 저장되었습니다');
    } catch (error: any) {
      console.error('Failed to save custom CSS:', error);
      toast.error('Custom CSS 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="o4o-card">
        <div className="o4o-card-body">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="o4o-card">
        <div className="o4o-card-header">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-o4o-text-secondary" />
            <h3 className="o4o-card-title">Custom CSS</h3>
          </div>
        </div>
        <div className="o4o-card-body space-y-4">
          <p className="text-sm text-o4o-text-secondary">
            사이트 전체에 적용될 CSS를 입력하세요. 이 CSS는 모든 페이지에서 로드됩니다.
          </p>

          <div>
            <label className="block text-sm font-medium text-o4o-text-primary mb-2">
              CSS 코드
            </label>
            <textarea
              value={customCSS}
              onChange={(e) => setCustomCSS(e.target.value)}
              className="w-full h-96 px-3 py-2 border border-gray-300 rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="/* 여기에 CSS를 입력하세요 */&#10;&#10;.my-custom-class {&#10;  color: #333;&#10;  font-size: 16px;&#10;}"
              spellCheck={false}
            />
            <p className="mt-2 text-xs text-o4o-text-secondary">
              {customCSS.length} 문자 | {customCSS.split('\n').length} 줄
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">💡 사용 팁</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>클래스 선택자는 충돌을 피하기 위해 고유한 이름을 사용하세요</li>
              <li>!important는 꼭 필요한 경우에만 사용하세요</li>
              <li>미디어 쿼리를 사용하여 반응형 디자인을 구현할 수 있습니다</li>
              <li>변경사항은 저장 후 즉시 사이트에 반영됩니다</li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="o4o-button o4o-button-primary"
            >
              {saving ? (
                <>
                  <span className="animate-spin inline-block mr-2">⏳</span>
                  저장 중...
                </>
              ) : (
                '변경사항 저장'
              )}
            </button>

            <button
              onClick={loadCustomCSS}
              disabled={loading || saving}
              className="o4o-button o4o-button-secondary"
            >
              새로고침
            </button>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <div className="o4o-card">
        <div className="o4o-card-header">
          <h3 className="o4o-card-title">CSS 미리보기</h3>
        </div>
        <div className="o4o-card-body">
          <p className="text-sm text-o4o-text-secondary mb-4">
            입력한 CSS가 어떻게 표시되는지 확인하세요.
          </p>
          <div className="bg-gray-50 border border-gray-300 rounded-md p-4">
            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap">
              {customCSS || '/* CSS가 입력되지 않았습니다 */'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomCSSSettings;
