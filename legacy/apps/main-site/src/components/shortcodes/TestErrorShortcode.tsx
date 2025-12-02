/**
 * Test Error Shortcode
 * HP-2: For testing Error Boundary functionality
 *
 * This shortcode intentionally throws an error to verify that:
 * 1. Error Boundary catches the error
 * 2. Fallback UI is displayed
 * 3. Other shortcodes on the page continue to work
 *
 * Usage: [test_error]
 *
 * WARNING: This is for development/testing only!
 * Should not be used in production.
 */

import { FC } from 'react';
import { ShortcodeDefinition } from '@o4o/shortcodes';

interface TestErrorShortcodeProps {
  attributes?: {
    /**
     * Error message to throw (optional)
     */
    message?: string;

    /**
     * Delay in ms before throwing error (optional)
     */
    delay?: string;
  };
  content?: string;
  context?: any;
}

const TestErrorShortcode: FC<TestErrorShortcodeProps> = ({ attributes }) => {
  const message = attributes?.message || 'TEST ERROR: This is an intentional error for testing Error Boundary';
  const delay = attributes?.delay ? parseInt(attributes.delay, 10) : 0;

  if (delay > 0) {
    // Delayed error (simulates async operation failure)
    setTimeout(() => {
      throw new Error(message);
    }, delay);

    return (
      <div style={{ padding: '1rem', backgroundColor: '#ffffcc', border: '2px dashed #ff9900' }}>
        <strong>⏱️ Test Error Shortcode</strong>
        <div>Error will be thrown in {delay}ms...</div>
      </div>
    );
  }

  // Immediate error
  throw new Error(message);
};

/**
 * Test Error Shortcode Definition
 * Only exported in development mode
 */
export const testErrorShortcodes: ShortcodeDefinition[] = import.meta.env.DEV
  ? [
      {
        name: 'test_error',
        component: TestErrorShortcode,
        description: '[DEV ONLY] Throws an error to test Error Boundary',
        attributes: [
          {
            name: 'message',
            type: 'string',
            description: 'Custom error message',
            required: false,
          },
          {
            name: 'delay',
            type: 'string',
            description: 'Delay in ms before throwing error',
            required: false,
          },
        ],
      },
    ]
  : [];

export default TestErrorShortcode;
