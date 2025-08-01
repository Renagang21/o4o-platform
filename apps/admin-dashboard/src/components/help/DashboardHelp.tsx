import { FC, useEffect } from 'react';
import { useRegisterHelp } from '@/hooks/useHelpTabs';

/**
 * Help content for Dashboard page
 */
export const DashboardHelp: FC = () => {
  const helpTabs = [
    {
      id: 'overview',
      title: 'Overview',
      content: `
        <p>Welcome to your WordPress Dashboard! This is the main hub of your site where you can access all administrative functions.</p>
        <p>The Dashboard provides a quick overview of your site's content and activity. You can see at a glance:</p>
        <ul>
          <li>Site statistics including posts, pages, and comments</li>
          <li>Recent activity on your site</li>
          <li>Quick actions to create new content</li>
          <li>Links to commonly used features</li>
        </ul>
        <p>The Dashboard is customizable. You can rearrange widgets, add or remove them, and adjust the layout to suit your workflow.</p>
      `
    },
    {
      id: 'navigation',
      title: 'Navigation',
      content: `
        <p>The left-hand navigation menu is your primary way to move around the WordPress admin area.</p>
        <p><strong>Main sections include:</strong></p>
        <ul>
          <li><strong>Posts</strong> - Create and manage blog posts</li>
          <li><strong>Media</strong> - Upload and manage images, videos, and documents</li>
          <li><strong>Pages</strong> - Create static pages like About or Contact</li>
          <li><strong>Comments</strong> - Moderate user comments</li>
          <li><strong>Appearance</strong> - Customize your site's look</li>
          <li><strong>Plugins</strong> - Add functionality to your site</li>
          <li><strong>Users</strong> - Manage user accounts and permissions</li>
          <li><strong>Tools</strong> - Import/export and other utilities</li>
          <li><strong>Settings</strong> - Configure site options</li>
        </ul>
      `
    },
    {
      id: 'quick-actions',
      title: 'Quick Actions',
      content: `
        <p>The Dashboard provides several quick action buttons at the top:</p>
        <ul>
          <li><strong>New Post</strong> - Start writing a new blog post</li>
          <li><strong>New Page</strong> - Create a new static page</li>
          <li><strong>Upload Media</strong> - Add images or files to your media library</li>
        </ul>
        <p>You can also access these actions from the admin bar at the top of every page when you hover over the "+ New" menu.</p>
      `
    }
  ];

  const helpSidebar = {
    title: 'For more information:',
    content: `
      <p><a href="https://wordpress.org/support/article/dashboard-screen/" target="_blank">Documentation on Dashboard</a></p>
      <p><a href="https://wordpress.org/support/" target="_blank">Support Forums</a></p>
      <p><a href="https://wordpress.org/support/article/wordpress-video-tutorials/" target="_blank">Video Tutorials</a></p>
    `
  };

  useRegisterHelp(helpTabs, helpSidebar);

  return null;
};