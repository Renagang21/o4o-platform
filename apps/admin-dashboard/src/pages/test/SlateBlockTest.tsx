/**
 * Slate Block Input Test Page
 *
 * Purpose: 단계별로 문제 격리 - "커서가 잠깐 보였다가 사라지는" 문제 디버깅
 *
 * Test 순서:
 * 1. Pure Slate (no wrappers)
 * 2. Slate + onClick wrapper
 * 3. Slate + tabIndex wrapper
 * 4. Slate + SimpleBlockWrapper auto-focus
 * 5. Slate + useBlockFocus (selection.removeAllRanges)
 * 6. Actual ParagraphBlock (full integration)
 */

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createEditor, Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import { cn } from '@/lib/utils';
import ParagraphBlock from '@/components/editor/blocks/ParagraphBlock';

export default function SlateBlockTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold mb-3">🔬 Slate Block Input Debugger</h1>
          <p className="text-lg opacity-90">
            단계별 테스트로 "커서가 잠깐 보였다가 사라지는" 문제 원인 파악
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3 text-blue-900 flex items-center gap-2">
            📋 테스트 방법
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800 leading-relaxed">
            <li><strong>각 테스트 박스를 순서대로 클릭</strong></li>
            <li><strong>타이핑을 시도</strong>하고 커서가 보이는지, 입력이 되는지 확인</li>
            <li><strong>F12 (개발자 도구) → Console 탭</strong>에서 로그 확인</li>
            <li><strong>어느 테스트부터 실패하는지 파악</strong> (1→2→3→4→5→6 순서)</li>
            <li>실패한 테스트 번호를 기억하고 보고</li>
          </ol>
        </div>

        {/* Test 1: Pure Slate */}
        <Test1PureSlate />

        {/* Test 2: Slate + onClick */}
        <Test2SlateWithOnClick />

        {/* Test 3: Slate + tabIndex */}
        <Test3SlateWithTabIndex />

        {/* Test 4: Slate + SimpleBlockWrapper auto-focus */}
        <Test4SlateWithAutoFocus />

        {/* Test 5: Slate + useBlockFocus selection manipulation */}
        <Test5SlateWithSelectionManipulation />

        {/* Test 6: Actual ParagraphBlock */}
        <Test6ActualParagraphBlock />

        {/* Results Guide */}
        <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-lg">
          <h2 className="text-xl font-bold mb-3 text-amber-900">🎯 결과 해석 가이드</h2>
          <div className="space-y-3 text-amber-900">
            <div className="flex gap-3">
              <span className="font-mono font-bold">✅ 1-6 모두 성공:</span>
              <span>문제 없음 (다른 곳에 버그)</span>
            </div>
            <div className="flex gap-3">
              <span className="font-mono font-bold">❌ Test 1 실패:</span>
              <span>Slate.js 라이브러리 자체 문제</span>
            </div>
            <div className="flex gap-3">
              <span className="font-mono font-bold">❌ Test 2 실패:</span>
              <span>onClick 이벤트 버블링 문제</span>
            </div>
            <div className="flex gap-3">
              <span className="font-mono font-bold">❌ Test 3 실패:</span>
              <span>tabIndex focus 충돌 문제</span>
            </div>
            <div className="flex gap-3">
              <span className="font-mono font-bold">❌ Test 4 실패:</span>
              <span>Auto-focus 타이밍 문제</span>
            </div>
            <div className="flex gap-3">
              <span className="font-mono font-bold text-red-600">❌ Test 5 실패:</span>
              <span className="font-bold text-red-600">selection.removeAllRanges() 문제 확정!</span>
            </div>
            <div className="flex gap-3">
              <span className="font-mono font-bold">❌ Test 6만 실패:</span>
              <span>ParagraphBlock 특정 로직 문제</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Test 1: Pure Slate (no wrappers)
function Test1PureSlate() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    { type: 'paragraph', children: [{ text: '' }] } as any,
  ]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl font-bold text-green-600">Test 1</div>
        <div>
          <h2 className="text-xl font-semibold">순수 Slate (no wrappers)</h2>
          <p className="text-sm text-gray-600">가장 기본적인 Slate editor. 이게 실패하면 Slate 자체 문제.</p>
        </div>
      </div>

      <div className="border-4 border-green-300 p-4 rounded-lg bg-green-50">
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('✅ Test 1 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="👉 여기 클릭해서 타이핑..."
            className="outline-none min-h-[80px] text-lg"
            onFocus={() => console.log('✅ Test 1 - Editable focused')}
            onBlur={() => console.log('❌ Test 1 - Editable blurred')}
          />
        </Slate>
      </div>

      <div className="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded">
        Current value: {JSON.stringify(value[0])}
      </div>
    </div>
  );
}

// Test 2: Slate + onClick wrapper
function Test2SlateWithOnClick() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    { type: 'paragraph', children: [{ text: '' }] } as any,
  ]);
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl font-bold text-yellow-600">Test 2</div>
        <div>
          <h2 className="text-xl font-semibold">Slate + onClick Wrapper</h2>
          <p className="text-sm text-gray-600">SimpleBlockWrapper의 onClick 핸들러 모방. 이게 실패하면 onClick 충돌.</p>
        </div>
      </div>

      <div
        onClick={() => {
          console.log('🟡 Test 2 - Wrapper clicked');
          setIsSelected(true);
        }}
        className={cn(
          'border-4 p-4 rounded-lg cursor-text transition-all',
          isSelected ? 'border-yellow-500 bg-yellow-50' : 'border-yellow-300 bg-yellow-50/50'
        )}
      >
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('✅ Test 2 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="👉 여기 클릭해서 타이핑..."
            className="outline-none min-h-[80px] text-lg"
            onFocus={() => console.log('✅ Test 2 - Editable focused')}
            onBlur={() => console.log('❌ Test 2 - Editable blurred')}
            onClick={() => console.log('🟡 Test 2 - Editable clicked')}
          />
        </Slate>
      </div>

      <div className="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded">
        Selected: {isSelected ? '✅ Yes' : '❌ No'} | Value: {JSON.stringify(value[0])}
      </div>
    </div>
  );
}

// Test 3: Slate + tabIndex wrapper
function Test3SlateWithTabIndex() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    { type: 'paragraph', children: [{ text: '' }] } as any,
  ]);
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl font-bold text-orange-600">Test 3</div>
        <div>
          <h2 className="text-xl font-semibold">Slate + tabIndex Wrapper</h2>
          <p className="text-sm text-gray-600">BlockWrapper의 tabIndex=0 모방. 이게 실패하면 tabIndex focus 충돌.</p>
        </div>
      </div>

      <div
        onClick={() => {
          console.log('🟠 Test 3 - Wrapper clicked');
          setIsSelected(true);
        }}
        tabIndex={isSelected ? 0 : -1}
        className={cn(
          'border-4 p-4 rounded-lg cursor-text transition-all',
          isSelected ? 'border-orange-500 bg-orange-50' : 'border-orange-300 bg-orange-50/50'
        )}
        onFocus={() => console.log('🟠 Test 3 - Wrapper focused')}
        onBlur={() => console.log('🟠 Test 3 - Wrapper blurred')}
      >
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('✅ Test 3 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="👉 여기 클릭해서 타이핑..."
            className="outline-none min-h-[80px] text-lg"
            onFocus={() => console.log('✅ Test 3 - Editable focused')}
            onBlur={() => console.log('❌ Test 3 - Editable blurred')}
          />
        </Slate>
      </div>

      <div className="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded">
        Selected: {isSelected ? '✅ Yes' : '❌ No'} | Value: {JSON.stringify(value[0])}
      </div>
    </div>
  );
}

// Test 4: Slate + SimpleBlockWrapper auto-focus
function Test4SlateWithAutoFocus() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    { type: 'paragraph', children: [{ text: '' }] } as any,
  ]);
  const [isSelected, setIsSelected] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  // SimpleBlockWrapper auto-focus logic
  useEffect(() => {
    if (isSelected && blockRef.current) {
      const editableElement = blockRef.current.querySelector('[contenteditable="true"]') as HTMLElement;
      if (editableElement) {
        setTimeout(() => {
          if (editableElement.isConnected && document.activeElement !== editableElement) {
            console.log('🔵 Test 4 - Auto-focusing editable');
            editableElement.focus();
          }
        }, 50);
      }
    }
  }, [isSelected]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-gray-200">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl font-bold text-blue-600">Test 4</div>
        <div>
          <h2 className="text-xl font-semibold">Slate + Auto-Focus (50ms delay)</h2>
          <p className="text-sm text-gray-600">SimpleBlockWrapper의 auto-focus 로직. 이게 실패하면 타이밍 문제.</p>
        </div>
      </div>

      <div
        ref={blockRef}
        onClick={() => {
          console.log('🔵 Test 4 - Wrapper clicked');
          setIsSelected(true);
        }}
        className={cn(
          'border-4 p-4 rounded-lg cursor-text transition-all',
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-blue-300 bg-blue-50/50'
        )}
      >
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('✅ Test 4 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="👉 여기 클릭해서 타이핑..."
            className="outline-none min-h-[80px] text-lg"
            onFocus={() => console.log('✅ Test 4 - Editable focused')}
            onBlur={() => console.log('❌ Test 4 - Editable blurred')}
          />
        </Slate>
      </div>

      <div className="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded">
        Selected: {isSelected ? '✅ Yes' : '❌ No'} | Value: {JSON.stringify(value[0])}
      </div>
    </div>
  );
}

// Test 5: Slate + useBlockFocus selection manipulation
function Test5SlateWithSelectionManipulation() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    { type: 'paragraph', children: [{ text: '' }] } as any,
  ]);
  const [isSelected, setIsSelected] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);

  // useBlockFocus logic with selection manipulation
  useEffect(() => {
    if (!isSelected || !blockRef.current) return;

    const focusableElement = blockRef.current.querySelector('[contenteditable]');
    if (!(focusableElement instanceof HTMLElement)) return;

    const timeoutId = setTimeout(() => {
      if (!focusableElement.isConnected) return;

      if (document.activeElement !== focusableElement) {
        console.log('🔴 Test 5 - Focusing editable');
        focusableElement.focus();
      }

      // CRITICAL: Selection manipulation (this is the suspected bug!)
      if (focusableElement.contentEditable === 'true') {
        const selection = window.getSelection();
        if (!selection) return;

        const needsSelection =
          selection.rangeCount === 0 ||
          !focusableElement.contains(selection.anchorNode) ||
          (selection.rangeCount > 0 &&
            selection.anchorNode === focusableElement &&
            focusableElement.childNodes.length === 0);

        if (needsSelection) {
          try {
            console.log('🔴 Test 5 - Manipulating selection (removeAllRanges)');
            const range = document.createRange();
            range.selectNodeContents(focusableElement);
            range.collapse(false);
            selection.removeAllRanges(); // ← 이게 문제의 원인!
            selection.addRange(range);
            console.log('✅ Test 5 - Selection manipulation succeeded');
          } catch (error) {
            console.error('❌ Test 5 - Selection manipulation failed:', error);
          }
        }
      }
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [isSelected]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-red-300">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl font-bold text-red-600">Test 5</div>
        <div>
          <h2 className="text-xl font-semibold text-red-700">Slate + Selection Manipulation (removeAllRanges)</h2>
          <p className="text-sm text-red-600 font-semibold">
            ⚠️ useBlockFocus의 selection.removeAllRanges() 로직. 이게 실패하면 문제 확정!
          </p>
        </div>
      </div>

      <div
        ref={blockRef}
        onClick={() => {
          console.log('🔴 Test 5 - Wrapper clicked');
          setIsSelected(true);
        }}
        className={cn(
          'border-4 p-4 rounded-lg cursor-text transition-all',
          isSelected ? 'border-red-600 bg-red-50' : 'border-red-400 bg-red-50/50'
        )}
      >
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('✅ Test 5 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="👉 여기 클릭해서 타이핑... (이 테스트에서 실패하면 selection.removeAllRanges가 원인!)"
            className="outline-none min-h-[80px] text-lg"
            onFocus={() => console.log('✅ Test 5 - Editable focused')}
            onBlur={() => console.log('❌ Test 5 - Editable blurred')}
          />
        </Slate>
      </div>

      <div className="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded">
        Selected: {isSelected ? '✅ Yes' : '❌ No'} | Value: {JSON.stringify(value[0])}
      </div>
    </div>
  );
}

// Test 6: Actual ParagraphBlock
function Test6ActualParagraphBlock() {
  const [isSelected, setIsSelected] = useState(false);
  const [content, setContent] = useState('');

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-purple-300">
      <div className="flex items-center gap-3 mb-3">
        <div className="text-2xl font-bold text-purple-600">Test 6</div>
        <div>
          <h2 className="text-xl font-semibold text-purple-700">실제 ParagraphBlock (Full Integration)</h2>
          <p className="text-sm text-purple-600">
            실제 ParagraphBlock 컴포넌트. EnhancedBlockWrapper + 모든 로직 포함.
          </p>
        </div>
      </div>

      <div className="border-4 border-purple-300 p-4 rounded-lg bg-purple-50">
        <ParagraphBlock
          id="test-paragraph"
          content={content}
          onChange={(newContent) => {
            console.log('🟣 Test 6 - ParagraphBlock changed:', newContent);
            setContent(newContent as string);
          }}
          onDelete={() => console.log('🟣 Test 6 - Delete')}
          onDuplicate={() => console.log('🟣 Test 6 - Duplicate')}
          onMoveUp={() => console.log('🟣 Test 6 - Move up')}
          onMoveDown={() => console.log('🟣 Test 6 - Move down')}
          isSelected={isSelected}
          onSelect={() => {
            console.log('🟣 Test 6 - Block selected');
            setIsSelected(true);
          }}
        />
      </div>

      <div className="mt-3 text-xs text-gray-600 bg-gray-100 p-2 rounded">
        Selected: {isSelected ? '✅ Yes' : '❌ No'} | Content length: {content.length}
      </div>
    </div>
  );
}
