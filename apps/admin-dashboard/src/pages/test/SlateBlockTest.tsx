/**
 * Slate Block Test Page
 *
 * Purpose: Isolate Slate.js ParagraphBlock input issue
 * Tests in order of complexity to identify exact failure point
 */

import { useState, useMemo, useCallback } from 'react';
import { createEditor, Descendant } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { withHistory } from 'slate-history';
import ParagraphBlock from '@/components/editor/blocks/ParagraphBlock';

export default function SlateBlockTest() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-2">Slate Block Input Test</h1>
          <p className="text-gray-600">
            Testing paragraph block input issue - 커서가 잠깐 보였다가 사라지는 문제
          </p>
        </div>

        {/* Test 1: Pure Slate (no wrappers) */}
        <Test1PureSlate />

        {/* Test 2: Slate with onClick wrapper */}
        <Test2SlateWithOnClick />

        {/* Test 3: Slate with tabIndex wrapper */}
        <Test3SlateWithTabIndex />

        {/* Test 4: Slate with selection manipulation */}
        <Test4SlateWithSelection />

        {/* Test 5: Actual ParagraphBlock */}
        <Test5ActualParagraphBlock />

        {/* Instructions */}
        <div className="bg-blue-50 border-2 border-blue-300 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-blue-900">테스트 방법</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>각 테스트 박스를 클릭하고 타이핑 시도</li>
            <li>커서가 보이는지, 입력이 되는지 확인</li>
            <li>브라우저 개발자 도구 콘솔에서 로그 확인</li>
            <li>어느 테스트부터 실패하는지 파악</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// Test 1: 순수 Slate (wrapper 없음)
function Test1PureSlate() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'paragraph',
      children: [{ text: '' }],
    } as any,
  ]);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3">Test 1: 순수 Slate (no wrappers)</h2>
      <p className="text-sm text-gray-600 mb-4">
        가장 기본적인 Slate editor. 이게 안 되면 Slate 자체 문제.
      </p>
      <div className="border-2 border-green-300 p-4 rounded">
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('Test 1 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="여기 클릭해서 입력..."
            style={{ outline: 'none', minHeight: '60px' }}
            onFocus={() => console.log('Test 1 - Editable focused')}
            onBlur={() => console.log('Test 1 - Editable blurred')}
          />
        </Slate>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        ✓ 이 테스트가 성공하면 Slate는 정상 작동
      </p>
    </div>
  );
}

// Test 2: onClick wrapper 추가
function Test2SlateWithOnClick() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'paragraph',
      children: [{ text: '' }],
    } as any,
  ]);
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3">Test 2: onClick Wrapper</h2>
      <p className="text-sm text-gray-600 mb-4">
        onClick 핸들러가 있는 wrapper. SimpleBlockWrapper 모방.
      </p>
      <div
        onClick={() => {
          console.log('Test 2 - Wrapper clicked');
          setIsSelected(true);
        }}
        className={`border-2 p-4 rounded cursor-text ${
          isSelected ? 'border-blue-500 bg-blue-50' : 'border-yellow-300'
        }`}
      >
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('Test 2 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="여기 클릭해서 입력..."
            style={{ outline: 'none', minHeight: '60px' }}
            onFocus={() => console.log('Test 2 - Editable focused')}
            onBlur={() => console.log('Test 2 - Editable blurred')}
            onClick={(e) => console.log('Test 2 - Editable clicked')}
          />
        </Slate>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Selected: {isSelected ? 'Yes' : 'No'} |
        ✓ 이 테스트가 실패하면 onClick 이벤트 버블링 문제
      </p>
    </div>
  );
}

// Test 3: tabIndex wrapper 추가
function Test3SlateWithTabIndex() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'paragraph',
      children: [{ text: '' }],
    } as any,
  ]);
  const [isSelected, setIsSelected] = useState(false);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3">Test 3: tabIndex Wrapper</h2>
      <p className="text-sm text-gray-600 mb-4">
        tabIndex=0 추가. BlockWrapper 모방.
      </p>
      <div
        onClick={() => {
          console.log('Test 3 - Wrapper clicked');
          setIsSelected(true);
        }}
        tabIndex={isSelected ? 0 : -1}
        className={`border-2 p-4 rounded cursor-text ${
          isSelected ? 'border-orange-500 bg-orange-50' : 'border-orange-300'
        }`}
        onFocus={() => console.log('Test 3 - Wrapper focused')}
        onBlur={() => console.log('Test 3 - Wrapper blurred')}
      >
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('Test 3 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            placeholder="여기 클릭해서 입력..."
            style={{ outline: 'none', minHeight: '60px' }}
            onFocus={() => console.log('Test 3 - Editable focused')}
            onBlur={() => console.log('Test 3 - Editable blurred')}
          />
        </Slate>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Selected: {isSelected ? 'Yes' : 'No'} |
        ✓ 이 테스트가 실패하면 tabIndex focus 충돌 문제
      </p>
    </div>
  );
}

// Test 4: Selection 조작 추가
function Test4SlateWithSelection() {
  const editor = useMemo(() => withHistory(withReact(createEditor())), []);
  const [value, setValue] = useState<Descendant[]>([
    {
      type: 'paragraph',
      children: [{ text: '' }],
    } as any,
  ]);
  const [isSelected, setIsSelected] = useState(false);

  const handleWrapperClick = useCallback(() => {
    console.log('Test 4 - Wrapper clicked');
    setIsSelected(true);

    // useBlockFocus 로직 모방
    setTimeout(() => {
      const editableElement = document.querySelector('[data-test-4-editable="true"]') as HTMLElement;
      if (editableElement && editableElement.contentEditable === 'true') {
        console.log('Test 4 - Auto-focusing editable');
        editableElement.focus();

        const selection = window.getSelection();
        if (selection) {
          console.log('Test 4 - Manipulating selection');
          try {
            const range = document.createRange();
            range.selectNodeContents(editableElement);
            range.collapse(false);
            selection.removeAllRanges(); // ← 이게 문제!
            selection.addRange(range);
            console.log('Test 4 - Selection manipulation succeeded');
          } catch (error) {
            console.error('Test 4 - Selection manipulation failed:', error);
          }
        }
      }
    }, 50);
  }, []);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3">Test 4: Selection 조작 (removeAllRanges)</h2>
      <p className="text-sm text-gray-600 mb-4">
        useBlockFocus의 selection.removeAllRanges() 로직 모방.
      </p>
      <div
        onClick={handleWrapperClick}
        className={`border-2 p-4 rounded cursor-text ${
          isSelected ? 'border-red-500 bg-red-50' : 'border-red-300'
        }`}
      >
        <Slate
          editor={editor}
          initialValue={value}
          onValueChange={(newValue) => {
            console.log('Test 4 - value changed:', newValue);
            setValue(newValue);
          }}
        >
          <Editable
            data-test-4-editable="true"
            placeholder="여기 클릭해서 입력..."
            style={{ outline: 'none', minHeight: '60px' }}
            onFocus={() => console.log('Test 4 - Editable focused')}
            onBlur={() => console.log('Test 4 - Editable blurred')}
          />
        </Slate>
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Selected: {isSelected ? 'Yes' : 'No'} |
        ⚠️ 이 테스트가 실패하면 selection.removeAllRanges() 문제 확정!
      </p>
    </div>
  );
}

// Test 5: 실제 ParagraphBlock
function Test5ActualParagraphBlock() {
  const [isSelected, setIsSelected] = useState(false);
  const [content, setContent] = useState('');

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-3">Test 5: 실제 ParagraphBlock</h2>
      <p className="text-sm text-gray-600 mb-4">
        실제 ParagraphBlock 컴포넌트. 모든 wrapper와 로직 포함.
      </p>
      <div className="border-2 border-purple-300 p-4 rounded">
        <ParagraphBlock
          id="test-paragraph"
          content={content}
          onChange={(newContent) => {
            console.log('Test 5 - ParagraphBlock changed:', newContent);
            setContent(newContent as string);
          }}
          onDelete={() => console.log('Test 5 - Delete')}
          onDuplicate={() => console.log('Test 5 - Duplicate')}
          onMoveUp={() => console.log('Test 5 - Move up')}
          onMoveDown={() => console.log('Test 5 - Move down')}
          isSelected={isSelected}
          onSelect={() => {
            console.log('Test 5 - Block selected');
            setIsSelected(true);
          }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        Selected: {isSelected ? 'Yes' : 'No'} | Content: {content || '(empty)'}
      </p>
    </div>
  );
}
