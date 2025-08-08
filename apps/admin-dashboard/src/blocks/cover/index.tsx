/**
 * Cover Block
 * Full-width block with background image/video and overlaid content
 */

import { registerBlockType } from '@wordpress/blocks';
import { 
  InnerBlocks, 
  useBlockProps, 
  InspectorControls,
  MediaUpload,
  MediaUploadCheck,
  BlockControls,
  BlockVerticalAlignmentToolbar
} from '@wordpress/block-editor';
import { 
  PanelBody, 
  RangeControl, 
  ToggleControl,
  Button,
  ColorPalette,
  FocalPointPicker,
  SelectControl
} from '@wordpress/components';
import { Image } from 'lucide-react';

interface CoverBlockAttributes {
  url?: string;
  id?: number;
  alt?: string;
  hasParallax: boolean;
  isRepeated: boolean;
  dimRatio: number;
  overlayColor?: string;
  customOverlayColor?: string;
  focalPoint?: { x: number; y: number };
  minHeight: number;
  minHeightUnit: string;
  contentPosition?: string;
  isDark: boolean;
}

const ALLOWED_MEDIA_TYPES = ['image', 'video'];

registerBlockType('o4o/cover', {
  title: 'Cover',
  description: 'Add an image or video with a text overlay',
  category: 'media',
  icon: Image as any,
  supports: {
    align: ['left', 'center', 'right', 'wide', 'full'],
    anchor: true,
    color: {
      text: false,
      background: false
    },
    spacing: {
      padding: true
    },
    html: false
  },
  attributes: {
    url: {
      type: 'string'
    },
    id: {
      type: 'number'
    },
    alt: {
      type: 'string',
      default: ''
    },
    hasParallax: {
      type: 'boolean',
      default: false
    },
    isRepeated: {
      type: 'boolean',
      default: false
    },
    dimRatio: {
      type: 'number',
      default: 50
    },
    overlayColor: {
      type: 'string'
    },
    customOverlayColor: {
      type: 'string'
    },
    focalPoint: {
      type: 'object',
      default: { x: 0.5, y: 0.5 }
    },
    minHeight: {
      type: 'number',
      default: 450
    },
    minHeightUnit: {
      type: 'string',
      default: 'px'
    },
    contentPosition: {
      type: 'string',
      default: 'center center'
    },
    isDark: {
      type: 'boolean',
      default: true
    }
  },

  edit: ({ attributes, setAttributes }: { attributes: CoverBlockAttributes; setAttributes: (attrs: Partial<CoverBlockAttributes>) => void }) => {
    const { 
      url, 
      hasParallax, 
      isRepeated, 
      dimRatio, 
      overlayColor,
      customOverlayColor,
      focalPoint,
      minHeight,
      minHeightUnit,
      contentPosition,
      isDark
    } = attributes;

    const overlayColorValue = overlayColor || customOverlayColor || 'rgba(0, 0, 0, 0.5)';
    
    const blockProps = useBlockProps({
      className: `o4o-cover-block ${isDark ? 'is-dark' : 'is-light'} ${hasParallax ? 'has-parallax' : ''}`,
      style: {
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundPosition: focalPoint ? `${focalPoint.x * 100}% ${focalPoint.y * 100}%` : undefined,
        backgroundSize: isRepeated ? 'auto' : 'cover',
        backgroundRepeat: isRepeated ? 'repeat' : 'no-repeat',
        backgroundAttachment: hasParallax ? 'fixed' : undefined,
        minHeight: `${minHeight}${minHeightUnit}`,
        position: 'relative' as 'relative',
        display: 'flex',
        alignItems: contentPosition?.includes('top') ? 'flex-start' :
                    contentPosition?.includes('bottom') ? 'flex-end' : 'center',
        justifyContent: contentPosition?.includes('left') ? 'flex-start' :
                        contentPosition?.includes('right') ? 'flex-end' : 'center',
        padding: '60px 30px'
      }
    });

    const onSelectMedia = (media: any) => {
      setAttributes({
        url: media.url,
        id: media.id,
        alt: media.alt
      });
    };

    const onRemoveMedia = () => {
      setAttributes({
        url: undefined,
        id: undefined,
        alt: ''
      });
    };

    return (
      <>
        <BlockControls>
          <BlockVerticalAlignmentToolbar
            onChange={(value: any) => {
              const position = value === 'top' ? 'top center' :
                             value === 'bottom' ? 'bottom center' :
                             'center center';
              setAttributes({ contentPosition: position });
            }}
            value={contentPosition?.includes('top') ? 'top' :
                  contentPosition?.includes('bottom') ? 'bottom' : 'center'}
          />
        </BlockControls>

        <InspectorControls>
          <PanelBody title="Media Settings" initialOpen={true}>
            <MediaUploadCheck>
              <MediaUpload
                onSelect={onSelectMedia}
                allowedTypes={ALLOWED_MEDIA_TYPES}
                value={attributes.id}
                render={({ open }) => (
                  <div>
                    {!url && (
                      <Button onClick={open} variant="primary" className="mb-2">
                        Select Media
                      </Button>
                    )}
                    {url && (
                      <>
                        <img src={url} alt={attributes.alt} className="w-full mb-2" />
                        <Button onClick={open} variant="secondary" className="mr-2">
                          Replace
                        </Button>
                        <Button onClick={onRemoveMedia} variant="secondary" isDestructive>
                          Remove
                        </Button>
                      </>
                    )}
                  </div>
                )}
              />
            </MediaUploadCheck>

            {url && (
              <>
                <ToggleControl
                  label="Fixed Background"
                  checked={hasParallax}
                  onChange={(value: boolean) => setAttributes({ hasParallax: value })}
                  help="Creates a parallax effect when scrolling"
                  disabled={false}
                  className=""
                  __nextHasNoMarginBottom={false}
                />
                
                <ToggleControl
                  label="Repeated Background"
                  checked={isRepeated}
                  onChange={(value: boolean) => setAttributes({ isRepeated: value })}
                  disabled={false}
                  className=""
                  __nextHasNoMarginBottom={false}
                />

                <FocalPointPicker
                  label="Focal Point"
                  url={url}
                  value={focalPoint || { x: 0.5, y: 0.5 }}
                  onChange={(value: any) => setAttributes({ focalPoint: value })}
                />
              </>
            )}
          </PanelBody>

          <PanelBody title="Overlay" initialOpen={false}>
            <RangeControl
              label="Opacity"
              value={dimRatio}
              onChange={(value?: number) => setAttributes({ dimRatio: value || 0 })}
              min={0}
              max={100}
              step={10}
            />
            
            <p className="mb-2">Overlay Color</p>
            <ColorPalette
              value={overlayColor || customOverlayColor}
              onChange={(color?: string) => setAttributes({ customOverlayColor: color })}
            />

            <ToggleControl
              label="Dark Text"
              checked={!isDark}
              onChange={(value: boolean) => setAttributes({ isDark: !value })}
              help="Use dark text for light backgrounds"
              disabled={false}
              className=""
              __nextHasNoMarginBottom={false}
            />
          </PanelBody>

          <PanelBody title="Dimensions" initialOpen={false}>
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <RangeControl
                  label="Minimum Height"
                  value={minHeight}
                  onChange={(value?: number) => setAttributes({ minHeight: value || 300 })}
                  min={50}
                  max={1000}
                  step={10}
                />
              </div>
              <SelectControl
                value={minHeightUnit as any}
                options={[
                  { label: 'px', value: 'px' },
                  { label: 'vh', value: 'vh' },
                  { label: '%', value: '%' }
                ]}
                onChange={(value: string) => setAttributes({ minHeightUnit: value as 'px' | 'vh' | '%' })}
              />
            </div>
          </PanelBody>
        </InspectorControls>

        <div {...blockProps}>
          {/* Overlay */}
          <div 
            className="o4o-cover-block__overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: overlayColorValue,
              opacity: dimRatio / 100,
              pointerEvents: 'none'
            }}
          />
          
          {/* Content */}
          <div className="o4o-cover-block__content" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '800px' }}>
            <InnerBlocks
              template={[
                ['core/heading', { 
                  level: 1, 
                  textAlign: 'center',
                  placeholder: 'Add title...',
                  style: { color: { text: isDark ? '#ffffff' : '#000000' } }
                }],
                ['core/paragraph', { 
                  align: 'center',
                  placeholder: 'Add description...',
                  style: { color: { text: isDark ? '#ffffff' : '#000000' } }
                }]
              ]}
              renderAppender={InnerBlocks.ButtonBlockAppender}
            />
          </div>
        </div>
      </>
    );
  },

  save: ({ attributes }: { attributes: CoverBlockAttributes }) => {
    const { 
      url, 
      hasParallax, 
      isRepeated, 
      dimRatio, 
      overlayColor,
      customOverlayColor,
      focalPoint,
      minHeight,
      minHeightUnit,
      contentPosition,
      isDark
    } = attributes;

    const overlayColorValue = overlayColor || customOverlayColor || 'rgba(0, 0, 0, 0.5)';
    
    const blockProps = useBlockProps.save({
      className: `o4o-cover-block ${isDark ? 'is-dark' : 'is-light'} ${hasParallax ? 'has-parallax' : ''}`,
      style: {
        backgroundImage: url ? `url(${url})` : undefined,
        backgroundPosition: focalPoint ? `${focalPoint.x * 100}% ${focalPoint.y * 100}%` : undefined,
        backgroundSize: isRepeated ? 'auto' : 'cover',
        backgroundRepeat: isRepeated ? 'repeat' : 'no-repeat',
        backgroundAttachment: hasParallax ? 'fixed' : undefined,
        minHeight: `${minHeight}${minHeightUnit}`,
        position: 'relative' as 'relative',
        display: 'flex',
        alignItems: contentPosition?.includes('top') ? 'flex-start' :
                    contentPosition?.includes('bottom') ? 'flex-end' : 'center',
        justifyContent: contentPosition?.includes('left') ? 'flex-start' :
                        contentPosition?.includes('right') ? 'flex-end' : 'center',
        padding: '60px 30px'
      }
    });

    return (
      <div {...blockProps}>
        <div 
          className="o4o-cover-block__overlay"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: overlayColorValue,
            opacity: dimRatio / 100,
            pointerEvents: 'none'
          }}
        />
        <div className="o4o-cover-block__content" style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '800px' }}>
          <InnerBlocks.Content />
        </div>
      </div>
    );
  }
} as any);