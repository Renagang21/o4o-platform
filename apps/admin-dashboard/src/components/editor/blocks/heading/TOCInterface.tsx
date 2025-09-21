/**
 * TOCInterface Component
 * 목차 연동 인터페이스 및 헤딩 구조 분석
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  List,
  ChevronRight,
  ChevronDown,
  Eye,
  EyeOff,
  Navigation,
  FileText
} from 'lucide-react';

interface HeadingStructure {
  id: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  anchor?: string;
  children?: HeadingStructure[];
}

interface TOCInterfaceProps {
  currentHeading: {
    level: 1 | 2 | 3 | 4 | 5 | 6;
    text: string;
    anchor?: string;
  };
  headings?: HeadingStructure[];
  onNavigate?: (anchor: string) => void;
  showTOCPreview?: boolean;
  onToggleTOCPreview?: () => void;
}

export const TOCInterface: React.FC<TOCInterfaceProps> = ({
  currentHeading,
  headings = [],
  onNavigate,
  showTOCPreview = false,
  onToggleTOCPreview,
}) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // 헤딩 구조 분석
  const analyzeStructure = () => {
    const analysis = {
      totalHeadings: headings.length,
      byLevel: {} as { [key: number]: number },
      depth: 0,
      hasNumbers: false,
    };

    headings.forEach(heading => {
      analysis.byLevel[heading.level] = (analysis.byLevel[heading.level] || 0) + 1;
      analysis.depth = Math.max(analysis.depth, heading.level);
    });

    return analysis;
  };

  // 현재 헤딩의 위치 정보
  const getCurrentPosition = () => {
    const currentIndex = headings.findIndex(h => h.anchor === currentHeading.anchor);
    return {
      index: currentIndex,
      total: headings.length,
      isFirst: currentIndex === 0,
      isLast: currentIndex === headings.length - 1,
    };
  };

  // 노드 토글
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // 헤딩 레벨별 들여쓰기 스타일
  const getLevelIndent = (level: number) => {
    return `${(level - 1) * 16}px`;
  };

  // 헤딩 레벨별 스타일
  const getLevelStyle = (level: number) => {
    const styles = {
      1: 'text-sm font-bold text-gray-900',
      2: 'text-sm font-semibold text-gray-800',
      3: 'text-sm font-medium text-gray-700',
      4: 'text-xs font-medium text-gray-600',
      5: 'text-xs text-gray-600',
      6: 'text-xs text-gray-500',
    };
    return styles[level as keyof typeof styles] || styles[6];
  };

  const structure = analyzeStructure();
  const position = getCurrentPosition();

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <List className="h-4 w-4" />
          <Label className="text-sm font-medium">Table of Contents</Label>
        </div>
        {onToggleTOCPreview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTOCPreview}
            className="h-8 px-2"
          >
            {showTOCPreview ? (
              <EyeOff className="h-3 w-3" />
            ) : (
              <Eye className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Current Heading Info */}
      <div className="p-3 bg-white rounded border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          <span className="text-sm font-medium">
            Current: H{currentHeading.level}
          </span>
        </div>
        <p className="text-sm text-gray-700 truncate">
          {currentHeading.text || 'Untitled heading'}
        </p>
        {currentHeading.anchor && (
          <p className="text-xs text-gray-500 mt-1">
            #{currentHeading.anchor}
          </p>
        )}
      </div>

      {/* Document Structure Analysis */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Document Structure</Label>
        <div className="p-3 bg-white rounded border space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Total headings:</span>
            <span className="font-medium">{structure.totalHeadings}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Max depth:</span>
            <span className="font-medium">H{structure.depth}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-600">Position:</span>
            <span className="font-medium">
              {position.index + 1} of {position.total}
            </span>
          </div>
        </div>
      </div>

      {/* Heading Levels Distribution */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-gray-700">Level Distribution</Label>
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6].map(level => {
            const count = structure.byLevel[level] || 0;
            const percentage = structure.totalHeadings > 0
              ? (count / structure.totalHeadings) * 100
              : 0;

            return (
              <div key={level} className="flex items-center gap-2">
                <span className="text-xs w-6">H{level}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-xs w-8 text-right text-gray-600">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* TOC Preview */}
      {showTOCPreview && headings.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs font-medium text-gray-700">TOC Preview</Label>
          <div className="max-h-48 overflow-y-auto p-3 bg-white rounded border">
            {headings.map((heading, index) => (
              <div
                key={heading.id || index}
                className={`
                  flex items-center gap-1 py-1 cursor-pointer hover:bg-gray-50 rounded px-1
                  ${heading.anchor === currentHeading.anchor ? 'bg-blue-50 border-l-2 border-blue-500' : ''}
                `}
                style={{ paddingLeft: getLevelIndent(heading.level) }}
                onClick={() => heading.anchor && onNavigate?.(heading.anchor)}
              >
                {heading.children && heading.children.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNode(heading.id);
                    }}
                  >
                    {expandedNodes.has(heading.id) ? (
                      <ChevronDown className="h-3 w-3" />
                    ) : (
                      <ChevronRight className="h-3 w-3" />
                    )}
                  </Button>
                )}
                <span className={getLevelStyle(heading.level)}>
                  {heading.text || `Heading ${heading.level}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const prevIndex = Math.max(0, position.index - 1);
            const prevHeading = headings[prevIndex];
            if (prevHeading?.anchor) {
              onNavigate?.(prevHeading.anchor);
            }
          }}
          disabled={position.isFirst}
          className="flex-1 text-xs"
        >
          <Navigation className="h-3 w-3 mr-1 rotate-180" />
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const nextIndex = Math.min(headings.length - 1, position.index + 1);
            const nextHeading = headings[nextIndex];
            if (nextHeading?.anchor) {
              onNavigate?.(nextHeading.anchor);
            }
          }}
          disabled={position.isLast}
          className="flex-1 text-xs"
        >
          Next
          <Navigation className="h-3 w-3 ml-1" />
        </Button>
      </div>

      {/* Tips */}
      <div className="text-xs text-gray-500 space-y-1 pt-2 border-t">
        <p><strong>Tip:</strong> Use hierarchical structure (H1 → H2 → H3)</p>
        <p><strong>SEO:</strong> Only one H1 per page recommended</p>
        <p><strong>Accessibility:</strong> Don't skip heading levels</p>
      </div>
    </div>
  );
};

export default TOCInterface;