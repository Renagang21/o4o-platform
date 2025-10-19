import React from 'react';
import { CPTPost } from '@/hooks/cpt/useCPTData';

interface CPTQuickEditRowProps {
  data: {
    title: string;
    slug: string;
    status: CPTPost['status'];
    customFields?: Record<string, any>;
  };
  onChange: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  colSpan: number;
}

export const CPTQuickEditRow: React.FC<CPTQuickEditRowProps> = ({
  data,
  onChange,
  onSave,
  onCancel,
  colSpan
}) => {
  return (
    <tr className="border-b border-gray-200 bg-gray-50">
      <td colSpan={colSpan} className="p-4">
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="font-medium text-sm mb-3">빠른 편집</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => onChange({...data, title: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">슬러그</label>
              <input
                type="text"
                value={data.slug}
                onChange={(e) => onChange({...data, slug: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">상태</label>
              <select
                value={data.status}
                onChange={(e) => onChange({...data, status: e.target.value as CPTPost['status']})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="publish">발행됨</option>
                <option value="draft">임시글</option>
                <option value="private">비공개</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={onSave}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              업데이트
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};
