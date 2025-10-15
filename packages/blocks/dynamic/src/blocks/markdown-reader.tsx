import React, { useState, useEffect, useCallback } from 'react';
import {
  useBlockProps,
  BlockControls,
  InspectorControls,
  MediaUpload,
  MediaUploadCheck
} from '@wordpress/block-editor';
import {
  ToolbarGroup,
  ToolbarButton,
  PanelBody,
  RangeControl,
  SelectControl,
  Button,
  Placeholder,
  Spinner
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { FileCode } from 'lucide-react';
import { BlockDefinition } from '@o4o/block-core';
import { parseMarkdown } from '../utils/markdownParser';
import '../styles/markdown-styles.css';

interface MarkdownReaderBlockAttributes {
  mediaId?: number;
  mediaUrl?: string;
  mediaTitle?: string;
  fontSize?: number;
  containerWidth?: 'wide' | 'full' | 'narrow' | 'medium';
  theme?: 'github' | 'minimal' | 'dark';
  markdownContent?: string;
  lastFetched?: number;
}

interface MarkdownReaderBlockProps {
  attributes: MarkdownReaderBlockAttributes;
  setAttributes: (attributes: Partial<MarkdownReaderBlockAttributes>) => void;
}

const Edit: React.FC<MarkdownReaderBlockProps> = ({
  attributes,
  setAttributes
}) => {
  const {
    mediaId,
    mediaUrl,
    mediaTitle,
    fontSize = 16,
    containerWidth = 'full',
    theme = 'github',
    markdownContent,
    lastFetched
  } = attributes;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedHtml, setParsedHtml] = useState<string>('');

  const blockProps = useBlockProps({
    className: `markdown-reader-block markdown-theme-${theme}`
  });

  // Fetch markdown content from URL
  const fetchMarkdownContent = useCallback(async (url: string) => {
    if (!url) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Accept': 'text/plain, text/markdown, text/x-markdown, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const text = await response.text();
      setAttributes({
        markdownContent: text,
        lastFetched: Date.now()
      });

      // Parse markdown to HTML
      const html = parseMarkdown(text);
      setParsedHtml(html);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load markdown file');
      setParsedHtml('');
    } finally {
      setLoading(false);
    }
  }, [setAttributes]);

  // Fetch content when media changes
  useEffect(() => {
    if (mediaUrl && (!markdownContent || !lastFetched || Date.now() - lastFetched > 60000)) {
      fetchMarkdownContent(mediaUrl);
    } else if (markdownContent) {
      const html = parseMarkdown(markdownContent);
      setParsedHtml(html);
    }
  }, [mediaUrl, markdownContent, lastFetched, fetchMarkdownContent]);

  // Handle media selection
  const onSelectMedia = (media: any) => {
    // Check if it's a markdown file
    const isMarkdown = media.mime === 'text/markdown' ||
                      media.mime === 'text/x-markdown' ||
                      media.filename?.endsWith('.md') ||
                      media.url?.endsWith('.md');

    if (!isMarkdown) {
      setError('Please select a markdown (.md) file');
      return;
    }

    setAttributes({
      mediaId: media.id,
      mediaUrl: media.url,
      mediaTitle: media.title || media.filename,
      markdownContent: undefined,
      lastFetched: undefined
    });
  };

  // Handle media removal
  const onRemoveMedia = () => {
    setAttributes({
      mediaId: undefined,
      mediaUrl: undefined,
      mediaTitle: undefined,
      markdownContent: undefined,
      lastFetched: undefined
    });
    setParsedHtml('');
    setError(null);
  };

  // Refresh content
  const refreshContent = () => {
    if (mediaUrl) {
      fetchMarkdownContent(mediaUrl);
    }
  };

  // Container width classes (only for editor preview)
  const getContainerClass = () => {
    switch (containerWidth) {
      case 'narrow':
        return 'max-w-3xl mx-auto';
      case 'medium':
        return 'max-w-5xl mx-auto';
      case 'wide':
        return 'max-w-7xl mx-auto';
      default:
        return 'w-full';
    }
  };

  return (
    <div {...blockProps}>
      <BlockControls>
        <ToolbarGroup>
          <MediaUploadCheck>
            <MediaUpload
              onSelect={onSelectMedia}
              allowedTypes={['text/markdown', 'text/x-markdown', 'text/plain']}
              value={mediaId}
              render={({ open }) => (
                <ToolbarButton
                  icon={() => <FileCode size={24} />}
                  label={__('Select Markdown File')}
                  onClick={open}
                />
              )}
            />
          </MediaUploadCheck>
          {mediaUrl && (
            <>
              <ToolbarButton
                label={__('Remove File')}
                onClick={onRemoveMedia}
              >
                Remove
              </ToolbarButton>
              <ToolbarButton
                label={__('Refresh')}
                onClick={refreshContent}
              >
                Refresh
              </ToolbarButton>
            </>
          )}
        </ToolbarGroup>
      </BlockControls>

      <InspectorControls>
        <PanelBody title={__('Markdown Settings')} initialOpen={true}>
          <RangeControl
            label={__('Font Size')}
            value={fontSize}
            onChange={(value) => setAttributes({ fontSize: value })}
            min={12}
            max={24}
            step={1}
          />
          <SelectControl
            label={__('Container Width')}
            value={containerWidth}
            options={[
              { label: 'Full Width', value: 'full' },
              { label: 'Wide (7xl)', value: 'wide' },
              { label: 'Medium (5xl)', value: 'medium' },
              { label: 'Narrow (3xl)', value: 'narrow' }
            ]}
            onChange={(value) => setAttributes({ containerWidth: value as 'wide' | 'full' | 'narrow' | 'medium' })}
          />
          <SelectControl
            label={__('Theme')}
            value={theme}
            options={[
              { label: 'GitHub', value: 'github' },
              { label: 'Minimal', value: 'minimal' },
              { label: 'Dark', value: 'dark' }
            ]}
            onChange={(value) => setAttributes({ theme: value })}
          />
        </PanelBody>

        {mediaTitle && (
          <PanelBody title={__('File Information')} initialOpen={false}>
            <div className="markdown-file-info">
              <p><strong>File:</strong> {mediaTitle}</p>
              {lastFetched && (
                <p><strong>Last Updated:</strong> {new Date(lastFetched).toLocaleString()}</p>
              )}
              <Button
                variant="secondary"
                onClick={refreshContent}
                disabled={loading}
              >
                {loading ? 'Refreshing...' : 'Refresh Content'}
              </Button>
            </div>
          </PanelBody>
        )}
      </InspectorControls>

      <div className={`markdown-content-wrapper ${getContainerClass()}`}>
        {!mediaUrl && !loading && (
          <Placeholder
            icon={<FileCode size={48} />}
            label={__('Markdown Reader')}
            instructions={__('Select a markdown file from your media library to display its content.')}
          >
            <MediaUploadCheck>
              <MediaUpload
                onSelect={onSelectMedia}
                allowedTypes={['text/markdown', 'text/x-markdown', 'text/plain']}
                value={mediaId}
                render={({ open }) => (
                  <Button variant="primary" onClick={open}>
                    {__('Select Markdown File')}
                  </Button>
                )}
              />
            </MediaUploadCheck>
          </Placeholder>
        )}

        {loading && (
          <div className="markdown-loading">
            <Spinner />
            <p>{__('Loading markdown content...')}</p>
          </div>
        )}

        {error && (
          <div className="markdown-error">
            <p className="error-message">{error}</p>
            <Button variant="secondary" onClick={refreshContent}>
              {__('Try Again')}
            </Button>
          </div>
        )}

        {parsedHtml && !loading && !error && (
          <div
            className="markdown-rendered-content"
            style={{ fontSize: `${fontSize}px` }}
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
          />
        )}
      </div>
    </div>
  );
};

const Save: React.FC<MarkdownReaderBlockProps> = ({ attributes }) => {
  const {
    mediaUrl,
    fontSize = 16,
    theme = 'github',
    markdownContent
  } = attributes;

  // Parse markdown on save
  const parsedHtml = markdownContent ? parseMarkdown(markdownContent) : '';

  if (!mediaUrl || !parsedHtml) {
    return null;
  }

  // Simplified save structure following Gutenberg standards
  // Single wrapper with content-only classes (no layout constraints)
  return (
    <div
      className={`wp-block-markdown-reader markdown-theme-${theme}`}
      style={{ fontSize: `${fontSize}px` }}
      dangerouslySetInnerHTML={{ __html: parsedHtml }}
    />
  );
};

const MarkdownReaderBlock: BlockDefinition = {
  name: 'o4o/markdown-reader',
  title: 'Markdown Reader',
  category: 'widgets',
  icon: FileCode,
  description: 'Display markdown files from media library with syntax highlighting',
  keywords: ['markdown', 'md', 'reader', 'document'],
  attributes: {
    mediaId: {
      type: 'number',
      default: undefined
    },
    mediaUrl: {
      type: 'string',
      default: ''
    },
    mediaTitle: {
      type: 'string',
      default: ''
    },
    fontSize: {
      type: 'number',
      default: 16
    },
    theme: {
      type: 'string',
      default: 'github'
    },
    markdownContent: {
      type: 'string',
      default: ''
    },
    lastFetched: {
      type: 'number',
      default: undefined
    }
  },
  supports: {
    align: ['wide', 'full'],
    html: false,
    className: true
  },
  edit: Edit,
  save: Save
};

export default MarkdownReaderBlock;