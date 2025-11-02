/**
 * ViewPreview Component
 * Displays preview of a view with sample data
 */

import { FC } from 'react';
import type { View } from '../../../types/views';

interface ViewPreviewProps {
  view: View;
  previewData: any[];
  onBack: () => void;
}

export const ViewPreview: FC<ViewPreviewProps> = ({
  view,
  previewData,
  onBack
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">View 미리보기</h3>
          <p className="text-gray-600 mt-1">{view.title}</p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          목록으로 돌아가기
        </button>
      </div>

      {/* Preview Content */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">
          렌더링 결과 (샘플 데이터)
        </h4>

        <div className="bg-gray-50 rounded-lg p-6">
          <div className={view.template.wrapperClass || 'space-y-4'}>
            {previewData.map((item, index) => (
              <div key={index} className={view.template.itemClass || 'bg-white p-4 rounded border'}>
                {view.template.fields.map((field) => (
                  <div key={field} className="mb-2">
                    <span className="font-medium text-sm text-gray-700">{field}:</span>
                    <span className="ml-2 text-sm text-gray-900">
                      {item[field] || `샘플 ${field}`}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h5 className="font-medium text-blue-900 mb-2">숏코드</h5>
          <code className="text-blue-800 bg-blue-100 px-2 py-1 rounded">
            {view.shortcode}
          </code>
        </div>
      </div>
    </div>
  );
};
