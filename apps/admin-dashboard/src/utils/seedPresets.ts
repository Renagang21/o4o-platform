/**
 * Seed Preset Data
 * Creates example presets for Forms, Views, and Templates
 *
 * Usage: Call these functions from the browser console or a test page
 */

import { formPresetsApi, viewPresetsApi, templatePresetsApi } from '@/api/presets';
import type {
  CreateFormPresetRequest,
  CreateViewPresetRequest,
  CreateTemplatePresetRequest
} from '@o4o/types';

/**
 * Seed Form Preset: Standard Contact Form
 */
export const seedFormPreset = async () => {
  const formPreset: CreateFormPresetRequest = {
    name: 'Standard Contact Form',
    description: 'A basic contact form with name, email, phone, and message fields',
    cptSlug: 'contact',
    config: {
      fields: [
        {
          fieldKey: 'full_name',
          order: 1,
          required: true,
          placeholder: 'Enter your full name',
          helpText: 'Please provide your full name'
        },
        {
          fieldKey: 'email',
          order: 2,
          required: true,
          placeholder: 'your.email@example.com',
          helpText: 'We will never share your email'
        },
        {
          fieldKey: 'phone',
          order: 3,
          required: false,
          placeholder: '010-1234-5678',
          helpText: 'Optional phone number'
        },
        {
          fieldKey: 'message',
          order: 4,
          required: true,
          placeholder: 'Enter your message here...',
          helpText: 'Please describe your inquiry'
        }
      ],
      layout: {
        columns: 1,
        sections: [
          {
            id: 'contact_info',
            title: 'Contact Information',
            description: 'Please provide your contact details',
            order: 1,
            collapsible: false,
            defaultCollapsed: false
          },
          {
            id: 'message_section',
            title: 'Your Message',
            description: 'Tell us what you need',
            order: 2,
            collapsible: false,
            defaultCollapsed: false
          }
        ]
      },
      validation: [
        {
          field: 'full_name',
          type: 'required',
          message: 'Full name is required'
        },
        {
          field: 'email',
          type: 'email',
          message: 'Please enter a valid email address'
        },
        {
          field: 'email',
          type: 'required',
          message: 'Email is required'
        },
        {
          field: 'message',
          type: 'required',
          message: 'Message is required'
        }
      ],
      submitBehavior: {
        redirectTo: '/thank-you',
        showSuccessMessage: true,
        successMessage: 'Thank you for contacting us! We will get back to you soon.'
      }
    },
    roles: ['admin', 'editor', 'author']
  };

  try {
    const result = await formPresetsApi.create(formPreset);
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Seed View Preset: Latest 10 Posts List
 */
export const seedViewPreset = async () => {
  const viewPreset: CreateViewPresetRequest = {
    name: 'Latest 10 Posts List',
    description: 'Display the latest 10 posts in a list format with title, author, and date',
    cptSlug: 'post',
    config: {
      renderMode: 'list',
      fields: [
        {
          fieldKey: 'title',
          label: 'Title',
          format: 'text',
          sortable: true,
          order: 1
        },
        {
          fieldKey: 'author',
          label: 'Author',
          format: 'text',
          sortable: true,
          order: 2
        },
        {
          fieldKey: 'createdAt',
          label: 'Published Date',
          format: 'date',
          formatter: {
            type: 'date',
            pattern: 'YYYY-MM-DD'
          },
          sortable: true,
          order: 3
        },
        {
          fieldKey: 'status',
          label: 'Status',
          format: 'badge',
          formatter: {
            type: 'badge',
            colorMap: {
              'published': 'green',
              'draft': 'gray',
              'pending': 'yellow'
            }
          },
          sortable: false,
          order: 4
        }
      ],
      defaultSort: {
        field: 'createdAt',
        order: 'DESC'
      },
      pagination: {
        pageSize: 10,
        showPagination: true,
        showPageSizeSelector: true,
        pageSizeOptions: [10, 20, 50, 100]
      },
      filters: [
        {
          id: 'status_filter',
          label: 'Status',
          field: 'status',
          type: 'select',
          options: [
            { label: 'All', value: '' },
            { label: 'Published', value: 'published' },
            { label: 'Draft', value: 'draft' },
            { label: 'Pending', value: 'pending' }
          ]
        }
      ],
      search: {
        enabled: true,
        fields: ['title', 'content', 'author'],
        placeholder: 'Search posts by title, content, or author...'
      }
    },
    roles: ['admin', 'editor']
  };

  try {
    const result = await viewPresetsApi.create(viewPreset);
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Seed Template Preset: Standard Single Page
 */
export const seedTemplatePreset = async () => {
  const templatePreset: CreateTemplatePresetRequest = {
    name: 'Standard Single Page',
    description: 'A simple single-column page template with basic SEO configuration',
    cptSlug: 'page',
    config: {
      layout: {
        type: '1-column',
        header: {
          blocks: [
            {
              blockName: 'BreadcrumbBlock',
              props: {
                showHome: true,
                separator: '/'
              },
              order: 1
            }
          ]
        },
        main: {
          blocks: [
            {
              blockName: 'TitleBlock',
              props: {
                tag: 'h1',
                className: 'text-4xl font-bold mb-4'
              },
              order: 1
            },
            {
              blockName: 'ContentBlock',
              props: {
                className: 'prose max-w-none'
              },
              order: 2
            }
          ]
        },
        footer: {
          blocks: [
            {
              blockName: 'RelatedPostsBlock',
              props: {
                limit: 3,
                title: 'Related Pages'
              },
              order: 1
            }
          ]
        }
      },
      seoMeta: {
        titleTemplate: '{title} | My Website',
        descriptionField: 'excerpt',
        ogImageField: 'featured_image',
        keywords: ['page', 'content', 'information'],
        keywordsField: 'seo_keywords'
      }
    },
    roles: ['admin', 'editor']
  };

  try {
    const result = await templatePresetsApi.create(templatePreset);
    return result;
  } catch (error) {
    throw error;
  }
};

/**
 * Seed all presets at once
 */
export const seedAllPresets = async () => {
  try {
    const formResult = await seedFormPreset();
    const viewResult = await seedViewPreset();
    const templateResult = await seedTemplatePreset();

    return {
      formPreset: formResult.data,
      viewPreset: viewResult.data,
      templatePreset: templateResult.data
    };
  } catch (error) {
    throw error;
  }
};

// Export for window access in browser console
if (typeof window !== 'undefined') {
  (window as any).seedPresets = {
    seedFormPreset,
    seedViewPreset,
    seedTemplatePreset,
    seedAllPresets
  };
}
