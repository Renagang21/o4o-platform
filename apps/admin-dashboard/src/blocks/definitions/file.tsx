/**
 * File Block Definition
 */

import React from 'react';
import { File } from 'lucide-react';
import { BlockDefinition } from '../registry/types';
import FileBlock from '@/components/editor/blocks/FileBlock';
import { BlockComponent } from '../registry/types';

export const fileBlockDefinition: BlockDefinition = {
  name: 'o4o/file',
  title: 'File',
  category: 'media',
  icon: <File className="w-5 h-5" />,
  description: 'Add a link to a downloadable file.',
  keywords: ['file', 'download', 'document', 'pdf', 'attachment'],
  component: FileBlock as unknown as BlockComponent,
  attributes: {
    url: {
      type: 'string',
      default: '',
    },
    fileName: {
      type: 'string',
      default: '',
    },
    fileSize: {
      type: 'number',
      default: 0,
    },
    showDownloadButton: {
      type: 'boolean',
      default: true,
    },
    showFileSize: {
      type: 'boolean',
      default: true,
    },
    buttonText: {
      type: 'string',
      default: '다운로드',
    },
    openInNewTab: {
      type: 'boolean',
      default: false,
    },
  },
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    className: true,
  },
};

export default fileBlockDefinition;
