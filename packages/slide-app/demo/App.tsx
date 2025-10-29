/**
 * SlideApp React Demo (M2 Enhanced)
 * 3 test cases: A (autoplay/dots), B (numbers/no-loop), C (progress/10-slides)
 */

import React, { useState } from 'react';
import { SlideApp } from '../src/SlideApp';
import type { Slide } from '../src/types/slide.types';

// Case A: Autoplay + Dots + Loop
const slidesA: Slide[] = [
  {
    id: 'a1',
    type: 'text',
    title: 'Case A: Autoplay Enabled',
    subtitle: 'Auto-advance every 3 seconds',
    content: 'This carousel uses autoplay with 3s delay and loops continuously',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: 'a2',
    type: 'text',
    title: 'Pause on Interaction',
    subtitle: 'User-friendly behavior',
    content: 'Autoplay stops when you interact (drag, click arrows, or press keys)',
    backgroundColor: '#10b981',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: 'a3',
    type: 'text',
    title: 'Dot Pagination',
    subtitle: 'Visual indicators',
    content: 'Active dot expands to show current position',
    backgroundColor: '#f59e0b',
    textColor: '#ffffff',
    visible: true,
  },
];

// Case B: Numbers + No Loop + Navigation
const slidesB: Slide[] = [
  {
    id: 'b1',
    type: 'text',
    title: 'Case B: No Loop',
    subtitle: 'Linear navigation',
    content: 'This carousel does NOT loop - you reach the end and stop',
    backgroundColor: '#8b5cf6',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: 'b2',
    type: 'text',
    title: 'Number Pagination',
    subtitle: 'Simple counter',
    content: 'Shows "2 / 4" style pagination below',
    backgroundColor: '#ec4899',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: 'b3',
    type: 'text',
    title: 'Navigation Buttons',
    subtitle: 'Manual control',
    content: 'Use arrow buttons or keyboard to navigate',
    backgroundColor: '#f43f5e',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: 'b4',
    type: 'text',
    title: 'End of Carousel',
    subtitle: 'No more slides',
    content: 'This is the last slide - loop disabled means we stop here',
    backgroundColor: '#06b6d4',
    textColor: '#ffffff',
    visible: true,
  },
];

// Case C: Progress Bar + 10 Slides (Performance Test)
const slidesC: Slide[] = Array.from({ length: 10 }, (_, i) => ({
  id: `c${i + 1}`,
  type: 'text' as const,
  title: `Slide ${i + 1} of 10`,
  subtitle: `Performance Test Case`,
  content: `Testing smooth rendering with ${10} slides total. Progress bar below shows completion.`,
  backgroundColor: `hsl(${(i * 36) % 360}, 70%, 50%)`,
  textColor: '#ffffff',
  visible: true,
}));

type DemoCase = 'A' | 'B' | 'C';

export const DemoApp: React.FC = () => {
  const [activeCase, setActiveCase] = useState<DemoCase>('A');
  const [caseAIndex, setCaseAIndex] = useState(0);
  const [caseBIndex, setCaseBIndex] = useState(0);
  const [caseCIndex, setCaseCIndex] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            SlideApp Demo - M2 Enhanced
          </h1>
          <p className="text-gray-600">
            Three test cases: Autoplay/Dots, Numbers/No-Loop, Progress/10-Slides
          </p>
        </header>

        {/* Case Selector */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Select Test Case</h2>
          <div className="flex gap-4">
            <button
              type="button"
              className={`px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeCase === 'A'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveCase('A')}
            >
              Case A: Autoplay + Dots
            </button>
            <button
              type="button"
              className={`px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                activeCase === 'B'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveCase('B')}
            >
              Case B: Numbers + No Loop
            </button>
            <button
              type="button"
              className={`px-6 py-3 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 ${
                activeCase === 'C'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              onClick={() => setActiveCase('C')}
            >
              Case C: Progress + 10 Slides
            </button>
          </div>
        </div>

        {/* Case A */}
        {activeCase === 'A' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-blue-600">
                Case A: Autoplay + Dots + Loop
              </h3>
              <SlideApp
                slides={slidesA}
                autoplay={{ enabled: true, delay: 3000, pauseOnInteraction: true }}
                loop={true}
                navigation={true}
                pagination="dots"
                aspectRatio="16/9"
                a11y={{
                  prevLabel: 'Previous slide',
                  nextLabel: 'Next slide',
                  roledescription: 'carousel',
                }}
                onSlideChange={(index) => {
                  setCaseAIndex(index);
                  console.log('[Case A] Slide changed:', index);
                }}
              />
            </div>
            <StatusPanel
              caseLabel="A"
              currentIndex={caseAIndex}
              totalSlides={slidesA.length}
              features={[
                '✅ Autoplay enabled (3s)',
                '✅ Pause on interaction',
                '✅ Loop mode: cycles back to first',
                '✅ Dot pagination',
                '✅ Keyboard navigation (Arrow keys, Home, End, Space)',
              ]}
            />
          </>
        )}

        {/* Case B */}
        {activeCase === 'B' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-purple-600">
                Case B: Numbers + No Loop + Navigation
              </h3>
              <SlideApp
                slides={slidesB}
                autoplay={{ enabled: false, delay: 3000 }}
                loop={false}
                navigation={true}
                pagination="numbers"
                aspectRatio="16/9"
                a11y={{
                  prevLabel: 'Go to previous slide',
                  nextLabel: 'Go to next slide',
                }}
                onSlideChange={(index) => {
                  setCaseBIndex(index);
                  console.log('[Case B] Slide changed:', index);
                }}
              />
            </div>
            <StatusPanel
              caseLabel="B"
              currentIndex={caseBIndex}
              totalSlides={slidesB.length}
              features={[
                '✅ No autoplay (manual only)',
                '✅ Loop disabled: stops at ends',
                '✅ Number pagination (e.g., "2 / 4")',
                '✅ Navigation buttons visible',
                '✅ Keyboard: ArrowLeft/Right, Home/End',
              ]}
            />
          </>
        )}

        {/* Case C */}
        {activeCase === 'C' && (
          <>
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-green-600">
                Case C: Progress Bar + 10 Slides (Performance Test)
              </h3>
              <SlideApp
                slides={slidesC}
                autoplay={{ enabled: false, delay: 2000 }}
                loop={true}
                navigation={true}
                pagination="progress"
                aspectRatio="16/9"
                onSlideChange={(index) => {
                  setCaseCIndex(index);
                  console.log('[Case C] Slide changed:', index);
                }}
              />
            </div>
            <StatusPanel
              caseLabel="C"
              currentIndex={caseCIndex}
              totalSlides={slidesC.length}
              features={[
                '✅ 10 slides for performance testing',
                '✅ Progress bar pagination',
                '✅ Smooth transitions (no frame drops)',
                '✅ Loop enabled',
                '✅ Touch/swipe gestures enabled',
              ]}
            />
          </>
        )}

        {/* Controls Info */}
        <div className="bg-gray-100 rounded-lg p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">
            🎮 Controls & Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <h3 className="font-semibold mb-2">Keyboard</h3>
              <ul className="space-y-1">
                <li>⌨️ <strong>Arrow Left/Right:</strong> Navigate slides</li>
                <li>⌨️ <strong>Home/End:</strong> Jump to first/last</li>
                <li>⌨️ <strong>Space:</strong> Pause/Resume autoplay</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Mouse/Touch</h3>
              <ul className="space-y-1">
                <li>🖱️ <strong>Click buttons:</strong> Previous/Next</li>
                <li>👆 <strong>Swipe:</strong> Drag left/right</li>
                <li>🔘 <strong>Click dots:</strong> Jump to slide</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Accessibility</h3>
              <ul className="space-y-1">
                <li>♿ <strong>ARIA:</strong> Full screen reader support</li>
                <li>♿ <strong>Focus:</strong> Visible focus rings</li>
                <li>♿ <strong>Announce:</strong> Slide changes (aria-live)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Validation</h3>
              <ul className="space-y-1">
                <li>✅ <strong>Props:</strong> Runtime validation</li>
                <li>✅ <strong>Console:</strong> Check for warnings</li>
                <li>✅ <strong>Defaults:</strong> Safe fallbacks</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Status Panel Component
interface StatusPanelProps {
  caseLabel: string;
  currentIndex: number;
  totalSlides: number;
  features: string[];
}

const StatusPanel: React.FC<StatusPanelProps> = ({ caseLabel, currentIndex, totalSlides, features }) => {
  return (
    <div className="bg-blue-50 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-blue-900 mb-3">
        📊 Case {caseLabel} Status
      </h3>
      <div className="mb-4">
        <p className="text-blue-800 mb-1">
          <strong>Current Slide:</strong> {currentIndex + 1} / {totalSlides}
        </p>
        <p className="text-blue-800 text-sm">
          Open browser console to see debug logs and screen reader announcements
        </p>
      </div>
      <div>
        <h4 className="font-semibold text-blue-900 mb-2">Features:</h4>
        <ul className="space-y-1 text-sm text-blue-800">
          {features.map((feature, i) => (
            <li key={i}>{feature}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default DemoApp;
