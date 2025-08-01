import { FC } from 'react';
import { useRegisterHelp } from '@/hooks/useHelpTabs';

/**
 * Help content for Posts page
 */
export const PostsHelp: FC = () => {
  const helpTabs = [
    {
      id: 'overview',
      title: 'Overview',
      content: `
        <p>This screen provides access to all of your posts. You can customize the display of this screen to suit your workflow.</p>
        <p>By default, this screen will show all of your posts in a simple list. You can customize the display of this screen in a number of ways:</p>
        <ul>
          <li>You can hide/display columns based on your needs and decide how many posts to list per screen using the Screen Options tab.</li>
          <li>You can filter the list of posts by post status using the text links above the posts list to only show posts with that status.</li>
          <li>You can view posts in a simple title list or with an excerpt using the Screen Options tab.</li>
          <li>You can refine the list to show only posts in a specific category or from a specific month by using the dropdown menus above the posts list.</li>
        </ul>
      `
    },
    {
      id: 'actions',
      title: 'Available Actions',
      content: `
        <p>Hovering over a row in the posts list will display action links that allow you to manage your post. You can perform the following actions:</p>
        <ul>
          <li><strong>Edit</strong> takes you to the editing screen for that post. You can also reach that screen by clicking on the post title.</li>
          <li><strong>Quick Edit</strong> provides inline access to the metadata of your post, allowing you to update post details without leaving this screen.</li>
          <li><strong>Trash</strong> removes your post from this list and places it in the Trash, from which you can permanently delete it.</li>
          <li><strong>View</strong> will show you what your draft post will look like if you publish it.</li>
        </ul>
      `
    },
    {
      id: 'bulk-actions',
      title: 'Bulk Actions',
      content: `
        <p>You can also edit or move multiple posts to the Trash at once. Select the posts you want to act on using the checkboxes, then select the action you want to take from the Bulk actions menu and click Apply.</p>
        <p>When using Bulk Edit, you can change the metadata (categories, author, etc.) for all selected posts at once. To remove a post from the grouping, just click the x next to its name in the Bulk Edit area that appears.</p>
      `
    },
    {
      id: 'quick-edit',
      title: 'Quick Edit',
      content: `
        <p>Quick Edit is a powerful feature that allows you to make changes to post metadata without leaving the posts list screen. To use Quick Edit:</p>
        <ol>
          <li>Hover over any post in the list</li>
          <li>Click the "Quick Edit" link that appears</li>
          <li>The post row will transform into an edit form</li>
          <li>Make your changes</li>
          <li>Click "Update" to save or "Cancel" to discard changes</li>
        </ol>
        <p><strong>Available fields in Quick Edit:</strong></p>
        <ul>
          <li>Title and Slug</li>
          <li>Date and Author</li>
          <li>Categories and Tags</li>
          <li>Comments and Pings settings</li>
          <li>Status and Visibility</li>
          <li>Password protection</li>
        </ul>
      `
    }
  ];

  const helpSidebar = {
    title: 'For more information:',
    content: `
      <p><a href="https://wordpress.org/support/article/posts-screen/" target="_blank">Documentation on Managing Posts</a></p>
      <p><a href="https://wordpress.org/support/article/quick-edit/" target="_blank">Quick Edit Documentation</a></p>
      <p><a href="https://wordpress.org/support/" target="_blank">Support Forums</a></p>
    `
  };

  useRegisterHelp(helpTabs, helpSidebar);

  return null;
};