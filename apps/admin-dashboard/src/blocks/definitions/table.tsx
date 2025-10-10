/**
 * Table Block Definition
 */

import React from 'react';
import { Table } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import TableBlock from '@/components/editor/blocks/TableBlock';
import { BlockComponent } from '../registry/types';

export const tableBlockDefinition: BlockDefinition = {
  name: 'core/table',
  title: 'Table',
  category: 'text',
  icon: <Table className="w-5 h-5" />,
  description: 'Create tables with structured data.',
  keywords: ['table', 'data', 'grid', 'spreadsheet'],
  component: TableBlock as unknown as BlockComponent,
  attributes: {
    tableData: {
      type: 'object',
    },
    caption: {
      type: 'string',
      default: '',
    },
    style: {
      type: 'string',
      default: 'default',
    },
    hasHeaderRow: {
      type: 'boolean',
      default: true,
    },
    hasHeaderCol: {
      type: 'boolean',
      default: false,
    },
    fontSize: {
      type: 'string',
      default: 'medium',
    },
    theme: {
      type: 'string',
      default: 'default',
    },
    alignment: {
      type: 'string',
      default: 'left',
    },
  },
  supports: {
    align: true,
    anchor: true,
    className: true,
  },
};

export default tableBlockDefinition;
