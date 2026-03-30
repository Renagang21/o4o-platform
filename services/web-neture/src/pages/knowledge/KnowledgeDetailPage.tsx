/**
 * KnowledgeDetailPage - Knowledge 자료 상세
 *
 * WO-O4O-KNOWLEDGE-LIBRARY-V1
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Calendar, Download, FileText, Paperclip } from 'lucide-react';
import { cmsApi, type CmsContent } from '../../lib/api';
import { blocksToHtml } from '@o4o/forum-core/utils';
import { sanitizeHtml } from '@o4o/content-editor';

export default function KnowledgeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [content, setContent] = useState<CmsContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchContent = async () => {
      try {
        setLoading(true);
        const data = await cmsApi.getContentById(id);
        setContent(data);
        // Track view
        cmsApi.trackView(id);
      } catch (err) {
        setError('자료를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/4" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-40 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-500">{error || '자료를 찾을 수 없습니다.'}</p>
        <Link to="/knowledge" className="text-primary-600 hover:underline mt-4 inline-block">
          목록으로
        </Link>
      </div>
    );
  }

  const attachments = content.attachments && Array.isArray(content.attachments) ? content.attachments : [];

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-500" />;
      case 'doc':
      case 'docx':
        return <FileText className="w-5 h-5 text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FileText className="w-5 h-5 text-green-500" />;
      case 'ppt':
      case 'pptx':
        return <FileText className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back */}
      <Link
        to="/knowledge"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        자료실 목록으로
      </Link>

      <article className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
              Knowledge
            </span>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-4">{content.title}</h1>

          {content.summary && (
            <p className="text-lg text-gray-600 mb-4">{content.summary}</p>
          )}

          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            <span>
              {new Date(content.publishedAt || content.createdAt).toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {content.imageUrl && (
            <img
              src={content.imageUrl}
              alt={content.title}
              className="w-full rounded-lg mb-8"
            />
          )}

          {content.bodyBlocks && Array.isArray(content.bodyBlocks) && content.bodyBlocks.length > 0 ? (
            <div
              className="prose prose-gray max-w-none"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(blocksToHtml(content.bodyBlocks as any)) }}
            />
          ) : content.body ? (
            <div className="prose prose-gray max-w-none">
              {content.body.split('\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          ) : null}

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <Paperclip className="w-5 h-5" />
                첨부파일 ({attachments.length})
              </h3>
              <div className="space-y-2">
                {attachments.map((att, index) => (
                  <a
                    key={index}
                    href={att.url}
                    download={att.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(att.type)}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700 truncate group-hover:text-primary-600">
                          {att.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {att.type.toUpperCase()}
                          {att.size ? ` · ${formatFileSize(att.size)}` : ''}
                        </p>
                      </div>
                    </div>
                    <Download className="w-4 h-4 text-gray-400 group-hover:text-primary-600 flex-shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
