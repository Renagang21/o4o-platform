/**
 * SlideTemplates - Template management for slides
 * Phase 4: Advanced features
 */

import React, { useState } from 'react';
import { 
  Save, 
  Download, 
  Upload, 
  Grid, 
  Star,
  Trash2,
  Copy,
  Eye,
  Check,
  FileText,
  Image,
  Video,
  Layout
} from 'lucide-react';
import { Slide } from './types';

export interface SlideTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'hero' | 'content' | 'cta' | 'testimonial' | 'gallery' | 'video' | 'custom';
  slides: Slide[];
  thumbnail?: string;
  tags?: string[];
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface SlideTemplatesProps {
  onApplyTemplate: (slides: Slide[]) => void;
  currentSlides?: Slide[];
  onSaveTemplate?: (template: Omit<SlideTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

export const SlideTemplates: React.FC<SlideTemplatesProps> = ({
  onApplyTemplate,
  currentSlides,
  onSaveTemplate
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<SlideTemplate | null>(null);

  // Default templates
  const defaultTemplates: SlideTemplate[] = [
    {
      id: 'hero-1',
      name: 'Hero Presentation',
      description: 'Bold hero slide with title and CTA',
      category: 'hero',
      slides: [
        {
          id: 'hero-slide-1',
          type: 'mixed',
          title: 'Welcome to Our Presentation',
          subtitle: 'Discover Amazing Features',
          content: 'Experience the next level of presentations with our advanced slide system.',
          backgroundColor: '#1a1a2e',
          textColor: '#ffffff',
          order: 0
        }
      ],
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'content-1',
      name: 'Content Showcase',
      description: 'Multi-slide content presentation',
      category: 'content',
      slides: [
        {
          id: 'content-slide-1',
          type: 'text',
          title: 'Introduction',
          content: 'Start your journey here',
          backgroundColor: '#f0f0f0',
          textColor: '#333333',
          order: 0
        },
        {
          id: 'content-slide-2',
          type: 'mixed',
          title: 'Key Features',
          content: 'Discover what makes us unique',
          backgroundColor: '#ffffff',
          textColor: '#333333',
          order: 1
        },
        {
          id: 'content-slide-3',
          type: 'text',
          title: 'Conclusion',
          content: 'Thank you for your attention',
          backgroundColor: '#1a1a2e',
          textColor: '#ffffff',
          order: 2
        }
      ],
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'cta-1',
      name: 'Call to Action',
      description: 'Engaging CTA slide',
      category: 'cta',
      slides: [
        {
          id: 'cta-slide-1',
          type: 'text',
          title: 'Ready to Get Started?',
          subtitle: 'Join thousands of satisfied users',
          content: 'Sign up today and get 30% off your first month',
          backgroundColor: '#ff6b6b',
          textColor: '#ffffff',
          order: 0
        }
      ],
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'testimonial-1',
      name: 'Customer Testimonial',
      description: 'Showcase customer feedback',
      category: 'testimonial',
      slides: [
        {
          id: 'testimonial-slide-1',
          type: 'text',
          title: '"Amazing Product!"',
          subtitle: '- John Doe, CEO',
          content: 'This has completely transformed how we do presentations. Highly recommended!',
          backgroundColor: '#f8f9fa',
          textColor: '#212529',
          order: 0
        }
      ],
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const [templates, setTemplates] = useState<SlideTemplate[]>(defaultTemplates);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState<SlideTemplate['category']>('custom');

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          template.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Save current slides as template
  const handleSaveTemplate = () => {
    if (!currentSlides || currentSlides.length === 0) {
      alert('No slides to save as template');
      return;
    }

    if (!templateName) {
      alert('Please enter a template name');
      return;
    }

    const newTemplate: SlideTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      slides: currentSlides.map((slide, index) => ({
        ...slide,
        order: index
      })),
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    setTemplates([...templates, newTemplate]);
    
    if (onSaveTemplate) {
      onSaveTemplate({
        name: templateName,
        description: templateDescription,
        category: templateCategory,
        slides: currentSlides
      });
    }

    // Reset form
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('custom');
    setShowSaveDialog(false);
  };

  // Delete template
  const handleDeleteTemplate = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  // Duplicate template
  const handleDuplicateTemplate = (template: SlideTemplate) => {
    const duplicated: SlideTemplate = {
      ...template,
      id: `template-${Date.now()}`,
      name: `${template.name} (Copy)`,
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setTemplates([...templates, duplicated]);
  };

  // Export template
  const handleExportTemplate = (template: SlideTemplate) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${template.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // Import template
  const handleImportTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string) as SlideTemplate;
        imported.id = `template-${Date.now()}`;
        imported.isDefault = false;
        imported.createdAt = new Date();
        imported.updatedAt = new Date();
        setTemplates([...templates, imported]);
      } catch (error) {
        alert('Invalid template file');
      }
    };
    reader.readAsText(file);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'hero': return <Star size={16} />;
      case 'content': return <FileText size={16} />;
      case 'cta': return <Layout size={16} />;
      case 'testimonial': return <FileText size={16} />;
      case 'gallery': return <Image size={16} />;
      case 'video': return <Video size={16} />;
      default: return <Grid size={16} />;
    }
  };

  return (
    <div className="slide-templates">
      {/* Header */}
      <div className="slide-templates__header">
        <h3>Slide Templates</h3>
        <div className="template-actions">
          <button
            className="btn btn-primary"
            onClick={() => setShowSaveDialog(true)}
            disabled={!currentSlides || currentSlides.length === 0}
          >
            <Save size={16} />
            Save Current
          </button>
          <label className="btn btn-secondary">
            <Upload size={16} />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImportTemplate}
              style={{ display: 'none' }}
            />
          </label>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="slide-templates__filters">
        <input
          type="text"
          placeholder="Search templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="template-search"
        />
        <div className="category-filters">
          <button
            className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            All
          </button>
          {['hero', 'content', 'cta', 'testimonial', 'gallery', 'video', 'custom'].map(cat => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {getCategoryIcon(cat)}
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="slide-templates__grid">
        {filteredTemplates.map(template => (
          <div key={template.id} className="template-card">
            <div className="template-card__preview">
              {template.thumbnail ? (
                <img src={template.thumbnail} alt={template.name} />
              ) : (
                <div className="template-placeholder">
                  {getCategoryIcon(template.category)}
                  <span>{template.slides.length} slides</span>
                </div>
              )}
              {template.isDefault && (
                <span className="template-badge">Default</span>
              )}
            </div>
            
            <div className="template-card__content">
              <h4>{template.name}</h4>
              {template.description && (
                <p>{template.description}</p>
              )}
              <div className="template-meta">
                <span className="template-category">
                  {getCategoryIcon(template.category)}
                  {template.category}
                </span>
                <span className="template-slides">
                  {template.slides.length} slides
                </span>
              </div>
            </div>

            <div className="template-card__actions">
              <button
                className="template-btn template-btn--primary"
                onClick={() => onApplyTemplate(template.slides)}
                title="Apply template"
              >
                <Check size={14} />
                Use
              </button>
              <button
                className="template-btn"
                onClick={() => setPreviewTemplate(template)}
                title="Preview"
              >
                <Eye size={14} />
              </button>
              <button
                className="template-btn"
                onClick={() => handleDuplicateTemplate(template)}
                title="Duplicate"
              >
                <Copy size={14} />
              </button>
              <button
                className="template-btn"
                onClick={() => handleExportTemplate(template)}
                title="Export"
              >
                <Download size={14} />
              </button>
              {!template.isDefault && (
                <button
                  className="template-btn template-btn--danger"
                  onClick={() => handleDeleteTemplate(template.id)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="template-dialog">
          <div className="template-dialog__content">
            <h3>Save as Template</h3>
            
            <div className="form-group">
              <label>Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="My Custom Template"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe your template..."
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label>Category</label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value as any)}
                className="form-select"
              >
                <option value="custom">Custom</option>
                <option value="hero">Hero</option>
                <option value="content">Content</option>
                <option value="cta">Call to Action</option>
                <option value="testimonial">Testimonial</option>
                <option value="gallery">Gallery</option>
                <option value="video">Video</option>
              </select>
            </div>

            <div className="dialog-actions">
              <button 
                className="btn btn-primary"
                onClick={handleSaveTemplate}
              >
                Save Template
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSaveDialog(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <div className="template-preview-modal">
          <div className="template-preview-modal__content">
            <button 
              className="close-btn"
              onClick={() => setPreviewTemplate(null)}
            >
              ×
            </button>
            <h3>{previewTemplate.name}</h3>
            <div className="preview-slides">
              {previewTemplate.slides.map((slide, index) => (
                <div key={slide.id} className="preview-slide">
                  <span className="slide-number">Slide {index + 1}</span>
                  <div 
                    className="slide-mini-preview"
                    style={{
                      backgroundColor: slide.backgroundColor,
                      color: slide.textColor
                    }}
                  >
                    {slide.title && <h4>{slide.title}</h4>}
                    {slide.subtitle && <p>{slide.subtitle}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SlideTemplates;