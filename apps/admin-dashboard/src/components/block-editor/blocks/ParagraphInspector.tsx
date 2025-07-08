import React from 'react';
import { BlockInspectorProps, ParagraphBlockAttributes } from '@/types/block-editor';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

/**
 * 단락 블록 인스펙터 패널 - 우측 설정 패널
 */
export const ParagraphInspector: React.FC<BlockInspectorProps> = ({
  block,
  onChange,
}) => {
  const attributes = block.attributes as ParagraphBlockAttributes;

  return (
    <div className="space-y-6">
      {/* 텍스트 설정 */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">텍스트 설정</h4>
        
        {/* 정렬 */}
        <div className="space-y-2 mb-4">
          <Label>정렬</Label>
          <RadioGroup
            value={attributes.align}
            onValueChange={(value) => onChange({ align: value as ParagraphBlockAttributes['align'] })}
            className="flex flex-wrap gap-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="left" id="align-left" />
              <Label htmlFor="align-left" className="text-sm">왼쪽</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="center" id="align-center" />
              <Label htmlFor="align-center" className="text-sm">가운데</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="right" id="align-right" />
              <Label htmlFor="align-right" className="text-sm">오른쪽</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="justify" id="align-justify" />
              <Label htmlFor="align-justify" className="text-sm">양쪽</Label>
            </div>
          </RadioGroup>
        </div>

        {/* 폰트 크기 */}
        <div className="space-y-2 mb-4">
          <Label>폰트 크기</Label>
          <Select
            value={attributes.fontSize}
            onValueChange={(value) => onChange({ fontSize: value as ParagraphBlockAttributes['fontSize'] })}
          >
            <SelectTrigger>
              <SelectValue placeholder="폰트 크기 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">작게 (14px)</SelectItem>
              <SelectItem value="normal">보통 (16px)</SelectItem>
              <SelectItem value="large">크게 (18px)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* 색상 설정 */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">색상 설정</h4>
        
        {/* 텍스트 색상 */}
        <div className="space-y-2 mb-4">
          <Label htmlFor="text-color">텍스트 색상</Label>
          <Input
            id="text-color"
            type="color"
            value={attributes.textColor || '#000000'}
            onChange={(e) => onChange({ textColor: e.target.value })}
            className="w-full h-10"
          />
        </div>

        {/* 배경 색상 */}
        <div className="space-y-2">
          <Label htmlFor="bg-color">배경 색상</Label>
          <div className="flex gap-2">
            <Input
              id="bg-color"
              type="color"
              value={attributes.backgroundColor || '#ffffff'}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
              className="flex-1 h-10"
            />
            <button
              type="button"
              onClick={() => onChange({ backgroundColor: '' })}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded border"
            >
              초기화
            </button>
          </div>
        </div>
      </Card>

      {/* 고급 설정 */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">고급 설정</h4>
        
        <div className="text-sm text-gray-600 space-y-1">
          <div><strong>블록 ID:</strong> {block.id}</div>
          <div><strong>블록 타입:</strong> {block.type}</div>
          <div><strong>생성일:</strong> {block.metadata.created.toLocaleDateString()}</div>
          <div><strong>수정일:</strong> {block.metadata.modified.toLocaleDateString()}</div>
          <div><strong>버전:</strong> {block.metadata.version}</div>
        </div>
      </Card>
    </div>
  );
};