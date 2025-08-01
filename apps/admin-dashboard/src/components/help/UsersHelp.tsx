import { FC } from 'react';
import { useRegisterHelp } from '@/hooks/useHelpTabs';

/**
 * Help content for Users page
 */
export const UsersHelp: FC = () => {
  const helpTabs = [
    {
      id: 'overview',
      title: 'Overview',
      content: `
        <p>This screen lists all the existing users for your site. Each user has one of five defined roles as set by the site admin: Site Administrator, Editor, Author, Contributor, or Subscriber. Users with roles other than Administrator will see fewer options when they are logged in, based on their role.</p>
        <p>To add a new user for your site, click the Add New button at the top of the screen or Add New in the Users menu section.</p>
      `
    },
    {
      id: 'user-roles',
      title: 'User Roles',
      content: `
        <p>WordPress uses a concept of Roles, designed to give the site owner the ability to control what users can and cannot do within the site.</p>
        <p><strong>The default roles are:</strong></p>
        <ul>
          <li><strong>Administrator</strong> - Complete access to all administration features</li>
          <li><strong>Editor</strong> - Can publish and manage posts including those of other users</li>
          <li><strong>Author</strong> - Can publish and manage their own posts</li>
          <li><strong>Contributor</strong> - Can write and manage their own posts but cannot publish them</li>
          <li><strong>Subscriber</strong> - Can only manage their profile</li>
        </ul>
      `
    },
    {
      id: 'actions',
      title: 'Available Actions',
      content: `
        <p>Hovering over a row in the users list will display action links that allow you to manage users. You can perform the following actions:</p>
        <ul>
          <li><strong>Edit</strong> takes you to the editable profile screen for that user. You can also reach that screen by clicking on the username.</li>
          <li><strong>Delete</strong> brings you to the Delete Users screen for confirmation, where you can permanently remove a user from your site and delete or attribute their content to another user.</li>
          <li><strong>View</strong> takes you to their author archive page.</li>
          <li><strong>Send password reset</strong> sends an email to the user with a link to reset their password.</li>
        </ul>
      `
    },
    {
      id: 'bulk-actions',
      title: 'Bulk Actions',
      content: `
        <p>You can perform bulk actions on multiple users at once:</p>
        <ul>
          <li><strong>Delete</strong> - Remove multiple users at once</li>
          <li><strong>Change role to...</strong> - Update the role for multiple users simultaneously</li>
          <li><strong>Send password reset</strong> - Send password reset emails to multiple users</li>
        </ul>
        <p>Select the users you want to act on using the checkboxes, then select the action from the Bulk actions menu and click Apply.</p>
      `
    }
  ];

  const helpSidebar = {
    title: 'For more information:',
    content: `
      <p><a href="https://wordpress.org/support/article/users-screen/" target="_blank">Documentation on Managing Users</a></p>
      <p><a href="https://wordpress.org/support/article/roles-and-capabilities/" target="_blank">Roles and Capabilities</a></p>
      <p><a href="https://wordpress.org/support/" target="_blank">Support Forums</a></p>
    `
  };

  useRegisterHelp(helpTabs, helpSidebar);

  return null;
};