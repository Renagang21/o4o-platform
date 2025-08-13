/**
 * Gutenberg Page with WordPress Module Loading
 * 
 * This version ensures WordPress modules are only loaded when this page is accessed
 */

import { lazy, Suspense } from 'react';
import WordPressPageWrapper from '../wordpress/WordPressPageWrapper';

// Lazy load the actual Gutenberg page
const GutenbergPage = lazy(() => 
  import(/* webpackChunkName: "gutenberg-page-impl" */ './GutenbergPage')
);

export default function GutenbergPageWrapped() {
  return (
    <WordPressPageWrapper>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        </div>
      }>
        <GutenbergPage />
      </Suspense>
    </WordPressPageWrapper>
  );
}