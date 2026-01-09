import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { ContentApi } from '@/api/contentApi';

/**
 * WordPress Quick Draft Widget
 */
const QuickDraftWidget: FC = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { success, error } = useAdminNotices();

  const handleSaveDraft = async () => {
    if (!title.trim() && !content.trim()) {
      error('초안 제목이나 내용을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    
    try {
      // Create draft via API
      const draftData = {
        title: title || 'Untitled Draft',
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: content ? [{ type: 'text', text: content }] : []
            }
          ]
        } as any,
        status: 'draft' as const,
        excerpt: content.substring(0, 150) + (content.length > 150 ? '...' : ''),
        postType: 'post' as any,
        slug: (title || 'untitled-draft').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        allowComments: true
      };
      
      const response = await ContentApi.createPost(draftData);
      
      if (response) {
        success(`초안이 저장되었습니다: "${title || '제목 없음'}"`, {
          duration: 3000
        });
        
        // Clear form after successful save
        setTitle('');
        setContent('');
      } else {
        error('초안 저장 중 오류가 발생했습니다.');
      }
    } catch (err: any) {
      // Error log removed
      
      // Show user-friendly message for development environment
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        error('기능 개발 중: 현재 초안 저장 기능을 개발 중입니다. API 서버와의 연결이 필요합니다.');
      } else {
        error('초안 저장에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Recent drafts - empty until API integration
  const recentDrafts: Array<{ id: string; title: string; date: Date }> = [];

  return (
    <div id="dashboard_quick_press" className="quick-draft-widget">
      {/* Development Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 text-sm text-blue-800">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-blue-600">ℹ️</span>
          </div>
          <div className="ml-2">
            <strong>개발 중인 기능:</strong> 현재 빠른 초안 작성 기능을 개발 중입니다. 
            API 서버 연결이 완료되면 실제 초안이 저장됩니다.
          </div>
        </div>
      </div>
      
      <form onSubmit={(e) => { e.preventDefault(); handleSaveDraft(); }}>
        <div className="input-text-wrap" id="title-wrap">
          <label htmlFor="title" className="screen-reader-text">Title</label>
          <Input
            type="text"
            id="title"
            name="post_title"
            placeholder="Title"
            autoComplete="off"
            value={title}
            onChange={(e: any) => setTitle(e.target.value)}
            className="wp-input"
          />
        </div>

        <div className="textarea-wrap" id="description-wrap">
          <label htmlFor="content" className="screen-reader-text">Content</label>
          <Textarea
            id="content"
            name="content"
            placeholder="What's on your mind?"
            rows={4}
            value={content}
            onChange={(e: any) => setContent(e.target.value)}
            className="wp-textarea"
          />
        </div>

        <p className="submit">
          <Button
            type="submit"
            id="save-post"
            className="button button-primary"
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>
          <br className="clear" />
        </p>
      </form>

      <div className="drafts-list">
        <h3>Your Recent Drafts</h3>
        {recentDrafts.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No drafts yet. Start writing above!</p>
        ) : (
          <ul>
            {recentDrafts.map((draft: any) => (
              <li key={draft.id}>
                <div className="draft-title">
                  <a href={`/posts/${draft.id}/edit`} className="draft-link">
                    {draft.title}
                  </a>
                </div>
                <time dateTime={draft.date.toISOString()}>
                  {draft.date.toLocaleDateString()}
                </time>
              </li>
            ))}
          </ul>
        )}
        <div className="view-all">
          <a href="/posts?post_status=draft">View all drafts</a>
        </div>
      </div>
    </div>
  );
};

export default QuickDraftWidget;