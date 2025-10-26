/**
 * Focus Debug Test Page
 *
 * 커서가 나타났다 사라지는 문제를 디버깅하기 위한 페이지
 */

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import GutenbergParagraphBlock from '@/components/editor/blocks/gutenberg/GutenbergParagraphBlock';
import GutenbergHeadingBlock from '@/components/editor/blocks/gutenberg/GutenbergHeadingBlock';
import ListBlock from '@/components/editor/blocks/ListBlock';
import QuoteBlock from '@/components/editor/blocks/QuoteBlock';

interface FocusEvent {
  timestamp: string;
  type: 'focus' | 'blur' | 'click' | 'select';
  target: string;
  blockType: string;
  detail: string;
}

const FocusDebugTest: React.FC = () => {
  const [events, setEvents] = useState<FocusEvent[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [paragraphContent, setParagraphContent] = useState('');
  const [headingContent, setHeadingContent] = useState('');
  const [listContent, setListContent] = useState('');
  const [quoteContent, setQuoteContent] = useState('');

  const logEvent = (type: FocusEvent['type'], target: string, blockType: string, detail: string = '') => {
    const timestamp = new Date().toLocaleTimeString('ko-KR', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });

    setEvents(prev => [...prev, { timestamp, type, target, blockType, detail }].slice(-20)); // 최근 20개만
  };

  useEffect(() => {
    // Global focus/blur listeners
    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const blockWrapper = target.closest('[data-block-id]');
      const blockId = blockWrapper?.getAttribute('data-block-id') || 'unknown';
      const blockType = blockWrapper?.getAttribute('data-block-type') || 'unknown';

      logEvent('focus', target.tagName, blockType, `id: ${blockId}`);
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const blockWrapper = target.closest('[data-block-id]');
      const blockId = blockWrapper?.getAttribute('data-block-id') || 'unknown';
      const blockType = blockWrapper?.getAttribute('data-block-type') || 'unknown';

      logEvent('blur', target.tagName, blockType, `id: ${blockId}`);
    };

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  const handleBlockSelect = (blockId: string, blockType: string) => {
    logEvent('select', 'BLOCK', blockType, blockId);
    setSelectedBlock(blockId);

    // Check what has focus after selection
    setTimeout(() => {
      const activeElement = document.activeElement;
      logEvent('select', 'After 50ms', blockType, `Focus on: ${activeElement?.tagName || 'nothing'}`);
    }, 50);
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Focus Debug Test</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Test Blocks */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Paragraph Block (Gutenberg)</CardTitle>
            </CardHeader>
            <CardContent>
              <GutenbergParagraphBlock
                id="test-paragraph"
                content={paragraphContent}
                onChange={(content) => {
                  setParagraphContent(content);
                  logEvent('click', 'onChange', 'paragraph', 'Content changed');
                }}
                onDelete={() => {}}
                isSelected={selectedBlock === 'test-paragraph'}
                onSelect={() => handleBlockSelect('test-paragraph', 'paragraph')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Heading Block (Gutenberg)</CardTitle>
            </CardHeader>
            <CardContent>
              <GutenbergHeadingBlock
                id="test-heading"
                content={headingContent}
                onChange={(content) => {
                  setHeadingContent(content);
                  logEvent('click', 'onChange', 'heading', 'Content changed');
                }}
                onDelete={() => {}}
                isSelected={selectedBlock === 'test-heading'}
                onSelect={() => handleBlockSelect('test-heading', 'heading')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>List Block</CardTitle>
            </CardHeader>
            <CardContent>
              <ListBlock
                id="test-list"
                content={listContent}
                onChange={(content) => {
                  setListContent(content);
                  logEvent('click', 'onChange', 'list', 'Content changed');
                }}
                onDelete={() => {}}
                onDuplicate={() => {}}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                isSelected={selectedBlock === 'test-list'}
                onSelect={() => handleBlockSelect('test-list', 'list')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Quote Block (작동함 ✅)</CardTitle>
            </CardHeader>
            <CardContent>
              <QuoteBlock
                id="test-quote"
                content={quoteContent}
                onChange={(content) => {
                  setQuoteContent(content);
                  logEvent('click', 'onChange', 'quote', 'Content changed');
                }}
                onDelete={() => {}}
                onDuplicate={() => {}}
                onMoveUp={() => {}}
                onMoveDown={() => {}}
                isSelected={selectedBlock === 'test-quote'}
                onSelect={() => handleBlockSelect('test-quote', 'quote')}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right: Event Log */}
        <div className="sticky top-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Focus/Blur Events (최근 20개)</CardTitle>
              <button
                onClick={() => setEvents([])}
                className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
              >
                Clear
              </button>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 font-mono text-xs max-h-[600px] overflow-y-auto">
                {events.length === 0 ? (
                  <p className="text-gray-500">No events yet. Click on blocks to start.</p>
                ) : (
                  events.map((event, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded ${
                        event.type === 'focus'
                          ? 'bg-green-50 border-l-4 border-green-500'
                          : event.type === 'blur'
                          ? 'bg-red-50 border-l-4 border-red-500'
                          : event.type === 'select'
                          ? 'bg-blue-50 border-l-4 border-blue-500'
                          : 'bg-gray-50 border-l-4 border-gray-500'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">{event.timestamp}</span>
                        <span
                          className={`font-bold shrink-0 ${
                            event.type === 'focus'
                              ? 'text-green-600'
                              : event.type === 'blur'
                              ? 'text-red-600'
                              : event.type === 'select'
                              ? 'text-blue-600'
                              : 'text-gray-600'
                          }`}
                        >
                          {event.type.toUpperCase()}
                        </span>
                        <span className="font-semibold">{event.blockType}</span>
                        <span className="text-gray-700">{event.target}</span>
                      </div>
                      {event.detail && (
                        <div className="ml-24 text-gray-600">{event.detail}</div>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-bold text-sm mb-2">문제 패턴 찾기:</h4>
                <ul className="text-xs space-y-1">
                  <li>✅ 정상: FOCUS → (입력 가능)</li>
                  <li>❌ 문제: FOCUS → BLUR → (커서 사라짐)</li>
                  <li>🔍 확인: BLUR를 일으키는 요소가 무엇인지</li>
                </ul>
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-bold text-sm mb-2">Current Active Element:</h4>
                <p className="text-xs font-mono" id="current-focus">
                  {document.activeElement?.tagName || 'BODY'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FocusDebugTest;
