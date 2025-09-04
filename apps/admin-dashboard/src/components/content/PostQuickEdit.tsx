import { FC, KeyboardEvent, useEffect, useRef } from 'react';
// import { X, Check } from 'lucide-react'; // Icons not used directly
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Post } from '@o4o/types';

interface PostQuickEditProps {
  post: Post;
  formData: any;
  onUpdate: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  categories?: any[];
  tags?: any[];
}

/**
 * WordPress-style Quick Edit row for posts
 */
export const PostQuickEdit: FC<PostQuickEditProps> = ({
  post,
  formData,
  onUpdate,
  onSave,
  onCancel,
  isLoading,
  categories = []
  // tags = [] // Not used
}) => {
  const titleRef = useRef<HTMLInputElement>(null);

  // Focus title field when opened
  useEffect(() => {
    titleRef.current?.focus();
    titleRef.current?.select();
  }, []);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      onSave();
    }
  };

  return (
    <tr className="inline-edit-row inline-edit-row-post quick-edit-row quick-edit-row-post inline-edit-post" onKeyDown={handleKeyDown}>
      <td colSpan={7} className="colspanchange">
        <fieldset className="inline-edit-col-left">
          <legend className="inline-edit-legend">Quick Edit</legend>
          
          <div className="inline-edit-col">
            <label>
              <span className="title">Title</span>
              <span className="input-text-wrap">
                <Input
                  ref={titleRef}
                  type="text"
                  name="post_title"
                  className="ptitle"
                  value={formData.title || ''}
                  onChange={(e: any) => onUpdate('title', e.target.value)}
                />
              </span>
            </label>

            <label>
              <span className="title">Slug</span>
              <span className="input-text-wrap">
                <Input
                  type="text"
                  name="post_name"
                  value={formData.slug || ''}
                  onChange={(e: any) => onUpdate('slug', e.target.value)}
                />
              </span>
            </label>

            <br className="clear" />

            <label className="inline-edit-author">
              <span className="title">Author</span>
              <Select 
                value={formData.authorId || ''}
                onValueChange={(value) => onUpdate('authorId', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={post.author?.id || ''}>
                    {post.author?.name || 'Unknown'}
                  </SelectItem>
                  {/* TODO: Load all authors */}
                </SelectContent>
              </Select>
            </label>

            <label className="inline-edit-password">
              <span className="title">Password</span>
              <span className="input-text-wrap">
                <Input
                  type="text"
                  name="post_password"
                  value={formData.password || ''}
                  onChange={(e: any) => onUpdate('password', e.target.value)}
                />
              </span>
              <em className="alignleft">
                –OR–
              </em>
            </label>
            
            <label className="inline-edit-private alignleft">
              <input 
                type="checkbox" 
                name="keep_private"
                checked={formData.isPrivate || false}
                onChange={(e: any) => onUpdate('isPrivate', e.target.checked)}
              />
              <span className="checkbox-title">Private</span>
            </label>
          </div>
        </fieldset>

        <fieldset className="inline-edit-col-center inline-edit-categories">
          <div className="inline-edit-col">
            <span className="title inline-edit-categories-label">Categories</span>
            <ul className="cat-checklist category-checklist">
              {categories.map((category: any) => (
                <li key={category.id} className="popular-category">
                  <label className="selectit">
                    <input
                      type="checkbox"
                      name="post_category[]"
                      value={category.id}
                      checked={formData.categoryIds?.includes(category.id) || false}
                      onChange={(e: any) => {
                        const ids = formData.categoryIds || [];
                        if (e.target.checked) {
                          onUpdate('categoryIds', [...ids, category.id]);
                        } else {
                          onUpdate('categoryIds', ids.filter((id: string) => id !== category.id));
                        }
                      }}
                    />
                    {' '}{category.name}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </fieldset>

        <fieldset className="inline-edit-col-right">
          <label className="inline-edit-tags">
            <span className="title">Tags</span>
            <Textarea
              name="tax_input[post_tag]"
              className="tax_input_post_tag"
              value={formData.tags || ''}
              onChange={(e: any) => onUpdate('tags', e.target.value)}
              placeholder="Separate tags with commas"
            />
          </label>

          <div className="inline-edit-group wp-clearfix">
            <label className="alignleft">
              <span className="title">Comments</span>
              <Select 
                value={formData.commentStatus || 'open'}
                onValueChange={(value) => onUpdate('commentStatus', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Allow</SelectItem>
                  <SelectItem value="closed">Do not allow</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="alignleft">
              <span className="title">Pings</span>
              <Select 
                value={formData.pingStatus || 'open'}
                onValueChange={(value) => onUpdate('pingStatus', value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Allow</SelectItem>
                  <SelectItem value="closed">Do not allow</SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>

          <div className="inline-edit-group wp-clearfix">
            <label className="inline-edit-status alignleft">
              <span className="title">Status</span>
              <Select 
                value={formData.status || 'draft'}
                onValueChange={(value) => onUpdate('status', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="alignleft">
              <input 
                type="checkbox" 
                name="sticky"
                checked={formData.isSticky || false}
                onChange={(e: any) => onUpdate('isSticky', e.target.checked)}
              />
              <span className="checkbox-title">Make this post sticky</span>
            </label>
          </div>
        </fieldset>

        <div className="submit inline-edit-save">
          <Button
            className="button button-primary save"
            onClick={onSave}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update'}
          </Button>
          <Button
            className="button cancel"
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <span className="spinner"></span>
          <br className="clear" />
          <div className="notice notice-error notice-alt inline hidden">
            <p className="error"></p>
          </div>
        </div>
      </td>
    </tr>
  );
};