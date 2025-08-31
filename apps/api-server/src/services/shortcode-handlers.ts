import { Shortcode } from '../entities/Shortcode';
import { ShortcodeParseOptions } from './shortcode-parser.service';
import { menuService } from './menu.service';
import { AppDataSource } from '../database/connection';
import { MediaFile } from '../entities/MediaFile';

export interface ShortcodeHandlerContext {
  name: string;
  attributes: Record<string, any>;
  content: string;
  shortcode: Shortcode;
  options: ShortcodeParseOptions;
}

export type ShortcodeHandler = (context: ShortcodeHandlerContext) => Promise<string>;

/**
 * Gallery shortcode handler
 * [gallery ids="1,2,3" columns="3" size="medium"]
 */
const renderGallery: ShortcodeHandler = async ({ attributes }) => {
  const { ids = '', columns = 3, size = 'medium', link = 'none' } = attributes;
  
  if (!ids) {
    return '<div class="shortcode-gallery empty">No images selected</div>';
  }

  const imageIds = String(ids).split(',').map(id => id.trim());
  
  // Fetch images from database
  const mediaRepository = AppDataSource.getRepository(MediaFile);
  const images = await mediaRepository.findBy({ 
    id: AppDataSource.getRepository(MediaFile).metadata.columns.find(col => col.propertyName === 'id')?.type === 'uuid' 
      ? imageIds as any 
      : imageIds.map(id => parseInt(id)) as any
  });

  if (images.length === 0) {
    return '<div class="shortcode-gallery empty">Images not found</div>';
  }

  // Generate gallery HTML
  let html = `<div class="shortcode-gallery gallery-columns-${columns} gallery-size-${size}">`;
  
  for (const image of images) {
    const imageUrl = image.url || image.path;
    const thumbnailUrl = image.sizes?.thumbnail?.url || imageUrl;
    const altText = image.altText || image.originalName || '';
    
    html += '<figure class="gallery-item">';
    
    if (link === 'file') {
      html += `<a href="${imageUrl}" target="_blank">`;
    }
    
    html += `<img src="${thumbnailUrl}" alt="${altText}" loading="lazy" />`;
    
    if (link === 'file') {
      html += '</a>';
    }
    
    if (image.caption) {
      html += `<figcaption class="gallery-caption">${image.caption}</figcaption>`;
    }
    
    html += '</figure>';
  }
  
  html += '</div>';
  
  return html;
};

/**
 * Button shortcode handler
 * [button url="/contact" style="primary" size="large"]Contact Us[/button]
 */
const renderButton: ShortcodeHandler = async ({ attributes, content }) => {
  const { 
    url = '#', 
    style = 'primary', 
    size = 'medium', 
    target = '_self',
    icon = ''
  } = attributes;
  
  const buttonText = content || 'Click Here';
  
  let classes = `shortcode-button btn btn-${style} btn-${size}`;
  
  let html = `<a href="${url}" target="${target}" class="${classes}">`;
  
  if (icon) {
    html += `<i class="${icon}"></i> `;
  }
  
  html += buttonText;
  html += '</a>';
  
  return html;
};

/**
 * Quote shortcode handler
 * [quote author="John Doe" source="Book Title"]This is a quote[/quote]
 */
const renderQuote: ShortcodeHandler = async ({ attributes, content }) => {
  const { 
    author = '', 
    source = '', 
    style = 'default',
    align = 'left'
  } = attributes;
  
  if (!content) {
    return '';
  }
  
  let html = `<blockquote class="shortcode-quote quote-${style} align-${align}">`;
  html += `<p>${content}</p>`;
  
  if (author || source) {
    html += '<footer class="quote-footer">';
    
    if (author) {
      html += `<cite class="quote-author">${author}</cite>`;
    }
    
    if (source) {
      html += `<span class="quote-source">${author ? ', ' : ''}${source}</span>`;
    }
    
    html += '</footer>';
  }
  
  html += '</blockquote>';
  
  return html;
};

/**
 * Video shortcode handler
 * [video url="https://youtube.com/watch?v=..." width="100%" height="auto"]
 */
const renderVideo: ShortcodeHandler = async ({ attributes }) => {
  const { 
    url = '', 
    width = '100%', 
    height = 'auto',
    autoplay = false,
    controls = true,
    loop = false
  } = attributes;
  
  if (!url) {
    return '<div class="shortcode-video empty">No video URL provided</div>';
  }
  
  // Check if it's a YouTube URL
  const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
  if (youtubeMatch) {
    const videoId = youtubeMatch[1];
    const params = new URLSearchParams({
      ...(autoplay && { autoplay: '1' }),
      ...(loop && { loop: '1', playlist: videoId }),
      ...(!controls && { controls: '0' })
    });
    
    return `
      <div class="shortcode-video video-youtube" style="width: ${width};">
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?${params.toString()}"
          width="100%"
          height="${height === 'auto' ? '315' : height}"
          frameborder="0"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
    `;
  }
  
  // Check if it's a Vimeo URL
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) {
    const videoId = vimeoMatch[1];
    const params = new URLSearchParams({
      ...(autoplay && { autoplay: '1' }),
      ...(loop && { loop: '1' })
    });
    
    return `
      <div class="shortcode-video video-vimeo" style="width: ${width};">
        <iframe 
          src="https://player.vimeo.com/video/${videoId}?${params.toString()}"
          width="100%"
          height="${height === 'auto' ? '315' : height}"
          frameborder="0"
          allowfullscreen
          loading="lazy"
        ></iframe>
      </div>
    `;
  }
  
  // Direct video file
  const videoAttrs = [
    controls && 'controls',
    autoplay && 'autoplay',
    loop && 'loop',
    'loading="lazy"'
  ].filter(Boolean).join(' ');
  
  return `
    <div class="shortcode-video video-direct" style="width: ${width};">
      <video width="100%" height="${height}" ${videoAttrs}>
        <source src="${url}" />
        Your browser does not support the video tag.
      </video>
    </div>
  `;
};

/**
 * Menu shortcode handler
 * [menu location="primary" style="horizontal" depth="3"]
 */
const renderMenu: ShortcodeHandler = async ({ attributes }) => {
  const { 
    location = 'primary', 
    style = 'horizontal',
    depth = 3,
    class: customClass = ''
  } = attributes;
  
  try {
    // Get menu by location
    const menu = await menuService.getMenuByLocation(location);
    
    if (!menu) {
      return `<div class="shortcode-menu empty">No menu found for location: ${location}</div>`;
    }
    
    // Render menu HTML
    const renderMenuItems = (items: any[], level: number = 0): string => {
      if (!items || items.length === 0 || level >= depth) {
        return '';
      }
      
      let html = `<ul class="menu-level-${level}">`;
      
      for (const item of items) {
        const hasChildren = item.children && item.children.length > 0;
        
        html += `<li class="menu-item${hasChildren ? ' has-children' : ''}">`;
        
        if (item.url) {
          html += `<a href="${item.url}" target="${item.target || '_self'}">`;
          
          if (item.icon) {
            html += `<i class="${item.icon}"></i> `;
          }
          
          html += item.title;
          html += '</a>';
        } else {
          html += `<span class="menu-label">${item.title}</span>`;
        }
        
        if (hasChildren && level < depth - 1) {
          html += renderMenuItems(item.children, level + 1);
        }
        
        html += '</li>';
      }
      
      html += '</ul>';
      return html;
    };
    
    let menuClass = `shortcode-menu menu-${style}`;
    if (customClass) {
      menuClass += ` ${customClass}`;
    }
    
    return `
      <nav class="${menuClass}" data-menu-location="${location}">
        ${renderMenuItems(menu.items)}
      </nav>
    `;
  } catch (error) {
    console.error('Error rendering menu shortcode:', error);
    return `<div class="shortcode-menu error">Error loading menu</div>`;
  }
};

/**
 * Contact form shortcode handler
 * [contact to="email@example.com" subject="Contact Form" success_message="Thank you!"]
 */
const renderContactForm: ShortcodeHandler = async ({ attributes }) => {
  const { 
    to = '',
    subject = 'Contact Form Submission',
    success_message = 'Thank you for your message!',
    button_text = 'Send Message'
  } = attributes;
  
  // Generate a unique form ID
  const formId = `contact-form-${Math.random().toString(36).substr(2, 9)}`;
  
  return `
    <form class="shortcode-contact-form" id="${formId}" data-to="${to}" data-subject="${subject}">
      <div class="form-group">
        <label for="${formId}-name">Name *</label>
        <input type="text" id="${formId}-name" name="name" required class="form-control" />
      </div>
      
      <div class="form-group">
        <label for="${formId}-email">Email *</label>
        <input type="email" id="${formId}-email" name="email" required class="form-control" />
      </div>
      
      <div class="form-group">
        <label for="${formId}-subject">Subject</label>
        <input type="text" id="${formId}-subject" name="subject" class="form-control" />
      </div>
      
      <div class="form-group">
        <label for="${formId}-message">Message *</label>
        <textarea id="${formId}-message" name="message" required class="form-control" rows="5"></textarea>
      </div>
      
      <div class="form-group">
        <button type="submit" class="btn btn-primary">${button_text}</button>
      </div>
      
      <div class="form-message" style="display: none;">
        <div class="success-message">${success_message}</div>
        <div class="error-message">There was an error sending your message. Please try again.</div>
      </div>
    </form>
  `;
};

/**
 * Export all shortcode handlers
 */
export const shortcodeHandlers: Record<string, ShortcodeHandler> = {
  gallery: renderGallery,
  button: renderButton,
  quote: renderQuote,
  video: renderVideo,
  menu: renderMenu,
  contact: renderContactForm
};