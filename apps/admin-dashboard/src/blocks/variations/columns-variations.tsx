/**
 * Columns Block Variations
 * WordPress Gutenberg 완전 모방 - 6가지 프리셋 레이아웃
 */

import React from 'react';

export interface ColumnVariation {
  name: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  scope?: string[];
  attributes: {
    columnCount: number;
  };
  innerBlocks: Array<[string, { width: number }]>;
}

export const COLUMNS_VARIATIONS: ColumnVariation[] = [
  // 1. 50 / 50 - Two columns; equal split
  {
    name: 'two-columns-equal',
    title: '50 / 50',
    description: 'Two columns; equal split',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="12" width="12" height="24" fill="currentColor" />
        <rect x="26" y="12" width="12" height="24" fill="currentColor" />
      </svg>
    ),
    scope: ['block'],
    attributes: {
      columnCount: 2,
    },
    innerBlocks: [
      ['o4o/column', { width: 50 }],
      ['o4o/column', { width: 50 }],
    ],
  },

  // 2. 33 / 66 - Two columns; one-third, two-thirds split
  {
    name: 'two-columns-one-third-two-thirds',
    title: '33 / 66',
    description: 'Two columns; one-third, two-thirds split',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="12" width="8" height="24" fill="currentColor" />
        <rect x="22" y="12" width="16" height="24" fill="currentColor" />
      </svg>
    ),
    scope: ['block'],
    attributes: {
      columnCount: 2,
    },
    innerBlocks: [
      ['o4o/column', { width: 33.33 }],
      ['o4o/column', { width: 66.67 }],
    ],
  },

  // 3. 66 / 33 - Two columns; two-thirds, one-third split
  {
    name: 'two-columns-two-thirds-one-third',
    title: '66 / 33',
    description: 'Two columns; two-thirds, one-third split',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="12" width="16" height="24" fill="currentColor" />
        <rect x="30" y="12" width="8" height="24" fill="currentColor" />
      </svg>
    ),
    scope: ['block'],
    attributes: {
      columnCount: 2,
    },
    innerBlocks: [
      ['o4o/column', { width: 66.67 }],
      ['o4o/column', { width: 33.33 }],
    ],
  },

  // 4. 33 / 33 / 33 - Three columns; equal split
  {
    name: 'three-columns-equal',
    title: '33 / 33 / 33',
    description: 'Three columns; equal split',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="12" width="7" height="24" fill="currentColor" />
        <rect x="20.5" y="12" width="7" height="24" fill="currentColor" />
        <rect x="31" y="12" width="7" height="24" fill="currentColor" />
      </svg>
    ),
    scope: ['block'],
    attributes: {
      columnCount: 3,
    },
    innerBlocks: [
      ['o4o/column', { width: 33.33 }],
      ['o4o/column', { width: 33.33 }],
      ['o4o/column', { width: 33.34 }],
    ],
  },

  // 5. 25 / 50 / 25 - Three columns; wide center column
  {
    name: 'three-columns-wider-center',
    title: '25 / 50 / 25',
    description: 'Three columns; wide center column',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="12" width="5" height="24" fill="currentColor" />
        <rect x="18.5" y="12" width="11" height="24" fill="currentColor" />
        <rect x="33" y="12" width="5" height="24" fill="currentColor" />
      </svg>
    ),
    scope: ['block'],
    attributes: {
      columnCount: 3,
    },
    innerBlocks: [
      ['o4o/column', { width: 25 }],
      ['o4o/column', { width: 50 }],
      ['o4o/column', { width: 25 }],
    ],
  },

  // 6. 25 / 25 / 25 / 25 - Four columns; equal split
  {
    name: 'four-columns-equal',
    title: '25 / 25 / 25 / 25',
    description: 'Four columns; equal split',
    icon: (
      <svg width="48" height="48" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="12" width="5" height="24" fill="currentColor" />
        <rect x="18" y="12" width="5" height="24" fill="currentColor" />
        <rect x="26" y="12" width="5" height="24" fill="currentColor" />
        <rect x="34" y="12" width="5" height="24" fill="currentColor" />
      </svg>
    ),
    scope: ['block'],
    attributes: {
      columnCount: 4,
    },
    innerBlocks: [
      ['o4o/column', { width: 25 }],
      ['o4o/column', { width: 25 }],
      ['o4o/column', { width: 25 }],
      ['o4o/column', { width: 25 }],
    ],
  },
];

/**
 * Get variation by name
 */
export function getVariation(name: string): ColumnVariation | undefined {
  return COLUMNS_VARIATIONS.find(v => v.name === name);
}

/**
 * Get default variation (50/50)
 */
export function getDefaultVariation(): ColumnVariation {
  return COLUMNS_VARIATIONS[0];
}
