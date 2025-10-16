/**
 * Minimal Editor Test Page
 * Purpose: Isolate and identify the exact cause of paragraph input issues
 */

import { useState } from 'react';
import { RichText } from '@/components/editor/gutenberg/RichText';

export default function MinimalEditor() {
  const [simpleText, setSimpleText] = useState('');
  const [richText, setRichText] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-6">Minimal Editor Test</h1>
          <p className="text-gray-600 mb-4">
            Testing to isolate the paragraph input issue
          </p>
        </div>

        {/* Test 1: Raw contentEditable */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 1: Raw contentEditable</h2>
          <p className="text-sm text-gray-600 mb-3">
            If this works, browser/React is fine
          </p>
          <div
            contentEditable
            onInput={(e) => {
              const text = e.currentTarget.textContent || '';
              setSimpleText(text);
              console.log('Test 1 input:', text);
            }}
            className="border-2 border-blue-300 p-4 rounded min-h-[100px] focus:outline-none focus:border-blue-500"
            data-placeholder="Type here directly (raw contentEditable)"
            suppressContentEditableWarning
          />

          <p className="mt-2 text-sm">
            <strong>Captured value:</strong> {simpleText || '(empty)'}
          </p>
          <p className="mt-1 text-xs text-green-600">
            ✓ Check browser console for "Test 1 input" logs
          </p>
        </div>

        {/* Test 2: Our RichText Component */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 2: RichText Component</h2>
          <p className="text-sm text-gray-600 mb-3">
            If this works, RichText component is fine
          </p>
          <RichText
            value={richText}
            onChange={(value) => {
              setRichText(value);
              console.log('Test 2 RichText onChange:', value);
            }}
            placeholder="Type here (RichText component)"
            className="border-2 border-green-300 p-4 rounded min-h-[100px]"
          />
          <p className="mt-2 text-sm">
            <strong>Captured value:</strong> {richText || '(empty)'}
          </p>
          <p className="mt-1 text-xs text-green-600">
            ✓ Check browser console for "Test 2 RichText onChange" logs
          </p>
        </div>

        {/* Test 3: Simple Paragraph Block (no wrapper) */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 3: Direct ParagraphBlock Import</h2>
          <p className="text-sm text-gray-600 mb-3">
            Testing ParagraphBlock without EnhancedBlockWrapper
          </p>
          <div className="border-2 border-purple-300 p-4 rounded">
            <DirectParagraphTest />
          </div>
        </div>

        {/* Test 4: Check Selection API */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Test 4: Selection API Test</h2>
          <p className="text-sm text-gray-600 mb-3">
            Testing if Selection.addRange() works in this environment
          </p>
          <button
            onClick={() => {
              const testDiv = document.getElementById('selection-test');
              if (testDiv) {
                testDiv.focus();
                const selection = window.getSelection();
                if (selection) {
                  try {
                    const range = document.createRange();
                    range.selectNodeContents(testDiv);
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    console.log('✓ Selection.addRange() succeeded');
                    alert('✓ Selection API works! Check console.');
                  } catch (error) {
                    console.error('✗ Selection.addRange() failed:', error);
                    alert('✗ Selection API failed! Check console.');
                  }
                }
              }
            }}
            className="mb-3 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Test Selection.addRange()
          </button>
          <div
            id="selection-test"
            contentEditable
            className="border-2 border-orange-300 p-4 rounded min-h-[60px]"
            suppressContentEditableWarning
          >
            Click the button above to test Selection API
          </div>
        </div>

        {/* Debug Info */}
        <div className="bg-gray-800 text-green-400 p-6 rounded-lg shadow font-mono text-sm">
          <h2 className="text-xl font-semibold mb-4 text-white">Debug Info</h2>
          <div className="space-y-2">
            <p>User Agent: {navigator.userAgent}</p>
            <p>Platform: {navigator.platform}</p>
            <p>Window Size: {window.innerWidth} x {window.innerHeight}</p>
            <p>Document activeElement: {document.activeElement?.tagName || 'none'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Direct Paragraph Block Test (without any wrappers)
// CRITICAL: contentEditable must be UNCONTROLLED (no children from state)
function DirectParagraphTest() {
  const [content, setContent] = useState('');

  return (
    <div>
      <div
        contentEditable
        onInput={(e) => {
          const text = e.currentTarget.textContent || '';
          setContent(text);
          console.log('Test 3 DirectParagraph input:', text);
        }}
        className="outline-none min-h-[60px] p-2 rounded border border-gray-200 focus:border-purple-500"
        data-placeholder="Type here (direct paragraph, no wrapper)"
        suppressContentEditableWarning
      />
      <p className="mt-2 text-sm">
        <strong>Content:</strong> {content || '(empty)'}
      </p>
    </div>
  );
}
