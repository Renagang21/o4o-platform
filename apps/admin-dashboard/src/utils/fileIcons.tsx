import React from 'react';
import {
  FileText,
  FileJson,
  FileMinus,
  FileCode,
  FileSpreadsheet,
  FileType,
  File,
  Image,
  Video,
  Music
} from 'lucide-react';

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'markdown' | 'json' | 'pdf' | 'text' | 'spreadsheet' | 'other';

export const getFileTypeFromMime = (mimeType: string, filename?: string): FileType => {
  // Check by MIME type
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType === 'application/json') return 'json';
  if (mimeType === 'text/markdown' || mimeType === 'text/x-markdown') return 'markdown';
  if (mimeType === 'text/plain') return 'text';
  if (mimeType.includes('spreadsheet') || mimeType === 'text/csv') return 'spreadsheet';
  if (mimeType.includes('document')) return 'document';

  // Check by file extension if available
  if (filename) {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'json':
        return 'json';
      case 'txt':
        return 'text';
      case 'pdf':
        return 'pdf';
      case 'csv':
      case 'xls':
      case 'xlsx':
        return 'spreadsheet';
      case 'doc':
      case 'docx':
        return 'document';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp':
      case 'svg':
        return 'image';
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'webm':
        return 'video';
      case 'mp3':
      case 'wav':
      case 'ogg':
        return 'audio';
    }
  }

  return 'other';
};

export const getFileIcon = (fileType: FileType, className: string = 'w-5 h-5') => {
  switch (fileType) {
    case 'image':
      return <Image className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'audio':
      return <Music className={className} />;
    case 'markdown':
      return <FileCode className={className} />;
    case 'json':
      return <FileJson className={className} />;
    case 'pdf':
      return <FileText className={`${className} text-red-600`} />;
    case 'text':
      return <FileText className={className} />;
    case 'spreadsheet':
      return <FileSpreadsheet className={`${className} text-green-600`} />;
    case 'document':
      return <FileType className={`${className} text-blue-600`} />;
    default:
      return <File className={className} />;
  }
};

export const getFileColorClass = (fileType: FileType): string => {
  switch (fileType) {
    case 'image':
      return 'text-purple-600 bg-purple-50';
    case 'video':
      return 'text-indigo-600 bg-indigo-50';
    case 'audio':
      return 'text-pink-600 bg-pink-50';
    case 'markdown':
      return 'text-gray-700 bg-gray-100';
    case 'json':
      return 'text-yellow-600 bg-yellow-50';
    case 'pdf':
      return 'text-red-600 bg-red-50';
    case 'text':
      return 'text-gray-600 bg-gray-50';
    case 'spreadsheet':
      return 'text-green-600 bg-green-50';
    case 'document':
      return 'text-blue-600 bg-blue-50';
    default:
      return 'text-gray-500 bg-gray-50';
  }
};