/**
 * LegalPage — CMS 기반 약관/개인정보 페이지
 * WO-O4O-AUTH-SIGNUP-UX-REFINEMENT-V1
 */

import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/apiClient';

interface LegalPageProps {
  slug: string;
  title: string;
}

interface CmsPageData {
  title: string;
  content: Record<string, unknown>;
  slug: string;
}

export default function LegalPage({ slug, title }: LegalPageProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState<CmsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: result } = await api.get(`/cms/public/page/${slug}`);
        if (result.success && result.data) {
          setPage(result.data);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const renderContent = () => {
    if (!page?.content) return null;

    // CMS content can be: { body: string } or { sections: [{heading, body}] } or { html: string }
    const c = page.content as Record<string, unknown>;

    if (typeof c.html === 'string') {
      return <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: c.html }} />;
    }

    if (typeof c.body === 'string') {
      return <div className="prose max-w-none whitespace-pre-line text-sm text-gray-700 leading-relaxed">{c.body}</div>;
    }

    if (Array.isArray(c.sections)) {
      return (
        <div className="space-y-6">
          {(c.sections as Array<{ heading?: string; body?: string }>).map((section, i) => (
            <div key={i}>
              {section.heading && (
                <h3 className="text-base font-semibold text-gray-900 mb-2">{section.heading}</h3>
              )}
              {section.body && (
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{section.body}</p>
              )}
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">{page?.title || title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-16">
            <p className="text-gray-500 mb-2">해당 페이지를 준비 중입니다.</p>
            <p className="text-sm text-gray-400">관리자에서 CMS 페이지(slug: {slug})를 등록하면 여기에 표시됩니다.</p>
          </div>
        )}

        {!loading && !error && page && renderContent()}
      </div>
    </div>
  );
}
