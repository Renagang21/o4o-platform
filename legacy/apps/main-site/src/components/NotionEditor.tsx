import { FC, useState, useEffect } from 'react';
import { Save, ArrowLeft } from 'lucide-react';

interface NotionEditorProps {
  pageSlug: string;
  initialContent: string;
  onSave: (html: string, json: Record<string, unknown>) => void;
  onBack: () => void;
}

const NotionEditor: FC<NotionEditorProps> = ({
  pageSlug,
  initialContent,
  onSave,
  onBack
}) => {
  const [content, setContent] = useState(initialContent);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Convert content to JSON structure
      const json = {
        blocks: [
          {
            type: 'paragraph',
            data: {
              text: content
            }
          }
        ],
        version: '2.0.0'
      };
      
      await onSave(content, json);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="뒤로 가기"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">페이지 편집</h1>
                <p className="text-sm text-gray-500">{pageSlug}</p>
              </div>
            </div>
            
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-8">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[500px] p-4 border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="페이지 내용을 입력하세요..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotionEditor;