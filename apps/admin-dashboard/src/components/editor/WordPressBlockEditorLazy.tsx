/**
 * Lazy-loaded WordPress Block Editor wrapper
 * This component handles the dynamic import of WordPress modules
 */

import { lazy, Suspense } from 'react';
import { EditorSkeleton } from '../common/LoadingStates';

// Lazy load the actual WordPress Block Editor component
// This ensures WordPress modules are only loaded when needed
const WordPressBlockEditor = lazy(() => 
  import(
    /* webpackChunkName: "wordpress-block-editor" */
    './WordPressBlockEditor'
  )
);

interface WordPressBlockEditorLazyProps {
  initialContent?: string;
  onChange?: (serialized: string, blocks: any[]) => void;
  className?: string;
  settings?: any;
}

export default function WordPressBlockEditorLazy(props: WordPressBlockEditorLazyProps) {
  return (
    <Suspense fallback={<EditorSkeleton showSidebar={true} />}>
      <WordPressBlockEditor {...props} />
    </Suspense>
  );
}