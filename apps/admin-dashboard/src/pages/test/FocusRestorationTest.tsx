/**
 * Focus Restoration Test
 *
 * 이 페이지는 다음을 검증합니다:
 * 1. CleanBlockWrapper의 useEffect가 실행되는가?
 * 2. querySelector('[contenteditable="true"]')가 요소를 찾는가?
 * 3. editable.focus()가 실행되는가?
 * 4. focus() 후에 document.activeElement가 실제로 바뀌는가?
 *
 * 이론:
 * - Quote는 EnhancedBlockWrapper + useBlockFocus로 자동 포커스 복원 ✅
 * - Paragraph/Heading은 CleanBlockWrapper인데 포커스 복원 로직이 없음 ❌
 * - List는 EnhancedBlockWrapper지만 disableAutoFocus={true}로 꺼져있음 ❌
 */

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { createEditor, Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { CleanBlockWrapperDebug } from './CleanBlockWrapperDebug';

interface DebugEvent {
  timestamp: string;
  stage: string;
  detail: string;
  blockType: string;
}

const FocusRestorationTest: React.FC = () => {
  const [events, setEvents] = useState<DebugEvent[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);

  // Slate editor instances
  const [paragraphEditor] = useState(() => withReact(createEditor()));
  const [headingEditor] = useState(() => withReact(createEditor()));

  const [paragraphValue, setParagraphValue] = useState<Descendant[]>([
    {
      type: 'paragraph',
      children: [{ text: '' }],
    },
  ]);

  const [headingValue, setHeadingValue] = useState<Descendant[]>([
    {
      type: 'heading',
      level: 2,
      children: [{ text: '' }],
    } as any,
  ]);

  const logEvent = (blockType: string) => (event: { timestamp: string; stage: string; detail: string }) => {
    setEvents(prev => [...prev, { ...event, blockType }].slice(-30)); // 최근 30개
  };

  const handleBlockSelect = (blockId: string) => {
    setSelectedBlock(blockId);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Focus Restoration Test</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Test Blocks */}
        <div className="space-y-6">
          {/* Paragraph Block */}
          <Card>
            <CardHeader>
              <CardTitle>Paragraph Block (CleanBlockWrapper + Slate)</CardTitle>
            </CardHeader>
            <CardContent>
              <CleanBlockWrapperDebug
                id="test-paragraph"
                type="paragraph"
                isSelected={selectedBlock === 'test-paragraph'}
                onSelect={() => handleBlockSelect('test-paragraph')}
                onDebugEvent={logEvent('Paragraph')}
              >
                <Slate
                  editor={paragraphEditor}
                  initialValue={paragraphValue}
                  onChange={value => setParagraphValue(value)}
                >
                  <Editable
                    placeholder="Type something..."
                    style={{
                      outline: 'none',
                      minHeight: '1.5em',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                    }}
                  />
                </Slate>
              </CleanBlockWrapperDebug>
            </CardContent>
          </Card>

          {/* Heading Block */}
          <Card>
            <CardHeader>
              <CardTitle>Heading Block (CleanBlockWrapper + Slate)</CardTitle>
            </CardHeader>
            <CardContent>
              <CleanBlockWrapperDebug
                id="test-heading"
                type="heading"
                isSelected={selectedBlock === 'test-heading'}
                onSelect={() => handleBlockSelect('test-heading')}
                onDebugEvent={logEvent('Heading')}
              >
                <Slate
                  editor={headingEditor}
                  initialValue={headingValue}
                  onChange={value => setHeadingValue(value)}
                >
                  <Editable
                    placeholder="Heading..."
                    style={{
                      outline: 'none',
                      minHeight: '1.5em',
                      padding: '8px',
                      border: '1px solid #ccc',
                      borderRadius: '4px',
                      fontSize: '1.5em',
                      fontWeight: 'bold',
                    }}
                  />
                </Slate>
              </CleanBlockWrapperDebug>
            </CardContent>
          </Card>

          {/* Control: Plain Textarea */}
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Control: Plain Textarea (항상 작동 ✅)</CardTitle>
            </CardHeader>
            <CardContent>
              <CleanBlockWrapperDebug
                id="test-textarea"
                type="textarea"
                isSelected={selectedBlock === 'test-textarea'}
                onSelect={() => handleBlockSelect('test-textarea')}
                onDebugEvent={logEvent('Textarea')}
              >
                <textarea
                  placeholder="This always works..."
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    outline: 'none',
                  }}
                />
              </CleanBlockWrapperDebug>
            </CardContent>
          </Card>
        </div>

        {/* Right: Debug Event Log */}
        <div className="sticky top-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Focus Restoration Debug Log</CardTitle>
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
                      className={`p-2 rounded border-l-4 ${
                        event.stage === 'useEffect START'
                          ? 'bg-blue-50 border-blue-500'
                          : event.stage === 'querySelector'
                          ? 'bg-yellow-50 border-yellow-500'
                          : event.stage === 'After focus()'
                          ? event.detail.includes('success: true')
                            ? 'bg-green-50 border-green-500'
                            : 'bg-red-50 border-red-500'
                          : event.stage === 'onClick'
                          ? 'bg-purple-50 border-purple-500'
                          : 'bg-gray-50 border-gray-500'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">{event.timestamp}</span>
                        <span className="font-bold shrink-0">{event.blockType}</span>
                        <span className="font-semibold text-gray-700">{event.stage}</span>
                      </div>
                      <div className="ml-24 text-gray-600">{event.detail}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-bold text-sm mb-2">검증할 가설:</h4>
                <ul className="text-xs space-y-2">
                  <li>
                    <strong>✅ useEffect가 실행되는가?</strong>
                    <br />→ "useEffect START" 이벤트가 나타나야 함
                  </li>
                  <li>
                    <strong>✅ querySelector가 editable을 찾는가?</strong>
                    <br />→ "querySelector" 이벤트에서 "Found editable: true (DIV)" 확인
                  </li>
                  <li>
                    <strong>✅ focus()가 성공하는가?</strong>
                    <br />→ "After focus()" 이벤트에서 "success: true" 확인
                  </li>
                  <li>
                    <strong>❌ 만약 success: false라면?</strong>
                    <br />→ Slate가 focus를 다시 빼앗아가는 것
                  </li>
                </ul>
              </div>

              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-bold text-sm mb-2">실시간 체크:</h4>
                <button
                  onClick={() => {
                    const activeElement = document.activeElement;
                    const blockId = activeElement?.closest('[data-block-id]')?.getAttribute('data-block-id');
                    alert(`현재 activeElement:\n\nTag: ${activeElement?.tagName}\nBlock ID: ${blockId || 'none'}\ncontentEditable: ${(activeElement as any)?.contentEditable || 'none'}`);
                  }}
                  className="w-full px-3 py-2 bg-yellow-200 hover:bg-yellow-300 rounded font-semibold"
                >
                  Check document.activeElement
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default FocusRestorationTest;
