import { FC, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminNotices } from '@/hooks/useAdminNotices';

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
      error('Please enter a title or content for your draft.');
      return;
    }

    setIsSaving(true);
    
    try {
      // TODO: Implement actual draft saving via API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      
      success(`Draft saved: "${title || 'Untitled'}"`, {
        duration: 3000
      });
      
      // Clear form
      setTitle('');
      setContent('');
    } catch (err: any) {
      error('Failed to save draft. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mock drafts data
  const recentDrafts = [
    { id: '1', title: 'Working on new features', date: new Date(Date.now() - 86400000) },
    { id: '2', title: 'Ideas for next sprint', date: new Date(Date.now() - 172800000) },
    { id: '3', title: 'Customer feedback analysis', date: new Date(Date.now() - 259200000) }
  ];

  return (
    <div id="dashboard_quick_press" className="quick-draft-widget">
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
        <div className="view-all">
          <a href="/posts?post_status=draft">View all drafts</a>
        </div>
      </div>
    </div>
  );
};

export default QuickDraftWidget;