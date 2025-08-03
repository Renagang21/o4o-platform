import { FC } from 'react';
import { Label } from '@/components/ui/label';
import { clsx } from 'clsx';
import { Link2, Grid3X3, Crop } from 'lucide-react';

interface GalleryBlockSettingsProps {
  settings: {
    columns?: number;
    imageCrop?: boolean;
    linkTo?: 'none' | 'media' | 'attachment';
    images?: any[];
  };
  onChange: (settings: any) => void;
}

const GalleryBlockSettings: FC<GalleryBlockSettingsProps> = ({ settings, onChange }) => {
  const columnOptions = [1, 2, 3, 4, 5, 6];
  
  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      {/* 컬럼 수 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          <Grid3X3 className="w-3 h-3 inline mr-1" />
          컬럼 수
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {columnOptions.map(col => (
            <button
              key={col}
              onClick={() => onChange({ ...settings, columns: col })}
              className={clsx(
                'p-2 rounded transition-colors text-sm',
                settings.columns === col
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
              )}
            >
              {col}열
            </button>
          ))}
        </div>
      </div>

      {/* 이미지 자르기 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          <Crop className="w-3 h-3 inline mr-1" />
          이미지 표시
        </Label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...settings, imageCrop: true })}
            className={clsx(
              'flex-1 p-2 rounded transition-colors text-sm',
              settings.imageCrop
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            )}
          >
            자르기
          </button>
          <button
            onClick={() => onChange({ ...settings, imageCrop: false })}
            className={clsx(
              'flex-1 p-2 rounded transition-colors text-sm',
              !settings.imageCrop
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            )}
          >
            전체 표시
          </button>
        </div>
      </div>

      {/* 링크 설정 */}
      <div>
        <Label className="text-sm font-medium mb-2 block">
          <Link2 className="w-3 h-3 inline mr-1" />
          이미지 클릭 시
        </Label>
        <select
          value={settings.linkTo || 'none'}
          onChange={(e: any) => onChange({ ...settings, linkTo: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="none">링크 없음</option>
          <option value="media">미디어 파일</option>
          <option value="attachment">첨부 페이지</option>
        </select>
      </div>

      {/* 이미지 관리 */}
      {settings.images && settings.images.length > 0 && (
        <div>
          <Label className="text-sm font-medium mb-2 block">이미지 관리</Label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {settings.images.map((image: any, index: number) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-white rounded border">
                <img
                  src={image.thumbnailUrl || image.url}
                  alt={image.alt || ''}
                  className="w-10 h-10 object-cover rounded"
                />
                <span className="flex-1 text-sm truncate">{image.alt || `이미지 ${index + 1}`}</span>
                <button
                  onClick={() => {
                    const newImages = settings.images!.filter((_, i) => i !== index);
                    onChange({ ...settings, images: newImages });
                  }}
                  className="text-red-600 hover:text-red-700 text-sm"
                >
                  제거
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryBlockSettings;