import { FC, KeyboardEvent, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserQuickEditProps {
  user: any;
  formData: any;
  onUpdate: (field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

/**
 * WordPress-style Quick Edit row for users
 */
export const UserQuickEdit: FC<UserQuickEditProps> = ({
  // user, // Reserved for future use
  formData,
  onUpdate,
  onSave,
  onCancel,
  isLoading
}) => {
  const nameRef = useRef<HTMLInputElement>(null);

  // Focus name field when opened
  useEffect(() => {
    nameRef.current?.focus();
    nameRef.current?.select();
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
    <tr className="inline-edit-row inline-edit-row-user quick-edit-row quick-edit-row-user inline-edit-user" onKeyDown={handleKeyDown}>
      <td colSpan={6} className="colspanchange">
        <fieldset className="inline-edit-col">
          <legend className="inline-edit-legend">Quick Edit</legend>
          
          <div className="inline-edit-col">
            <label>
              <span className="title">Name</span>
              <span className="input-text-wrap">
                <Input
                  ref={nameRef}
                  type="text"
                  name="display_name"
                  className="ptitle"
                  value={formData.name || ''}
                  onChange={(e) => onUpdate('name', e.target.value)}
                />
              </span>
            </label>

            <label>
              <span className="title">Email</span>
              <span className="input-text-wrap">
                <Input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={(e) => onUpdate('email', e.target.value)}
                />
              </span>
            </label>

            <div className="inline-edit-group wp-clearfix">
              <label className="alignleft">
                <span className="title">Role</span>
                <Select 
                  value={formData.role || 'subscriber'}
                  onValueChange={(value) => onUpdate('role', value)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrator">Administrator</SelectItem>
                    <SelectItem value="editor">Editor</SelectItem>
                    <SelectItem value="author">Author</SelectItem>
                    <SelectItem value="contributor">Contributor</SelectItem>
                    <SelectItem value="subscriber">Subscriber</SelectItem>
                  </SelectContent>
                </Select>
              </label>
            </div>

            <div className="inline-edit-group wp-clearfix">
              <label>
                <input 
                  type="checkbox" 
                  name="send_user_notification"
                  checked={formData.sendNotification || false}
                  onChange={(e) => onUpdate('sendNotification', e.target.checked)}
                />
                <span className="checkbox-title">Send the user a notification about their updated profile</span>
              </label>
            </div>
          </div>
        </fieldset>

        <div className="submit inline-edit-save">
          <Button
            className="button button-primary save"
            onClick={onSave}
            disabled={isLoading}
          >
            {isLoading ? 'Updating...' : 'Update User'}
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