/**
 * Pattern Page Builder Component
 * Quick page creation using block patterns
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { 
  Plus, 
  FileText, 
  Sparkles, 
  Layout,
  Grid,
  Save,
  Loader2
} from 'lucide-react';
import BlockPatternsBrowser from './BlockPatternsBrowser';
import O4OBlockEditor from './O4OBlockEditor';
import useBlockPatterns from '../../hooks/useBlockPatterns';

interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  patterns: string[];
}

const pageTemplates: PageTemplate[] = [
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero, features, testimonials, and CTA',
    icon: <FileText className="h-5 w-5" />,
    patterns: ['hero-with-cta', 'three-column-features', 'testimonial-cards', 'simple-cta']
  },
  {
    id: 'about',
    name: 'About Page',
    description: 'Company introduction with team and values',
    icon: <Sparkles className="h-5 w-5" />,
    patterns: ['split-hero-image', 'feature-grid-icons', 'simple-cta']
  },
  {
    id: 'services',
    name: 'Services Page',
    description: 'Service offerings with pricing',
    icon: <Layout className="h-5 w-5" />,
    patterns: ['hero-with-cta', 'feature-grid-icons', 'pricing-table', 'simple-cta']
  },
  {
    id: 'blank',
    name: 'Blank Page',
    description: 'Start from scratch',
    icon: <Grid className="h-5 w-5" />,
    patterns: []
  }
];

interface PatternPageBuilderProps {
  onSave?: (title: string, content: string, blocks: any[]) => void;
}

const PatternPageBuilder: React.FC<PatternPageBuilderProps> = ({
  onSave
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<PageTemplate | null>(null);
  const [pageTitle, setPageTitle] = useState('');
  const [showPatternBrowser, setShowPatternBrowser] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorBlocks, setEditorBlocks] = useState<any[]>([]);
  const [isBuilding, setIsBuilding] = useState(false);
  
  const { insertBlockPattern } = useBlockPatterns();

  // Build page from template
  const buildPageFromTemplate = async (template: PageTemplate) => {
    if (template.patterns.length === 0) {
      setSelectedTemplate(template);
      return;
    }

    setIsBuilding(true);
    
    try {
      const allBlocks: any[] = [];
      
      // Fetch and combine all patterns in the template
      for (const patternSlug of template.patterns) {
        const response = await fetch(`/api/block-patterns?slug=${patternSlug}`);
        if (response.ok) {
          const patterns = await response.json();
          if (patterns.length > 0) {
            const blocks = await insertBlockPattern(patterns[0].id);
            if (blocks) {
              allBlocks.push(...blocks);
            }
          }
        }
      }

      // Set the combined blocks to editor
      setEditorBlocks(allBlocks);
      setSelectedTemplate(template);
    } catch (error) {
    // Error logging - use proper error handler
    } finally {
      setIsBuilding(false);
    }
  };

  // Handle pattern insertion
  const handleInsertPattern = async (pattern: any) => {
    const blocks = await insertBlockPattern(pattern.id);
    if (blocks) {
      setEditorBlocks([...editorBlocks, ...blocks]);
    }
    setShowPatternBrowser(false);
  };

  // Handle editor changes
  const handleEditorChange = (content: string, blocks: any[]) => {
    setEditorContent(content);
    setEditorBlocks(blocks);
  };

  // Handle save
  const handleSave = () => {
    if (onSave && pageTitle) {
      onSave(pageTitle, editorContent, editorBlocks);
    }
  };

  if (!selectedTemplate) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Create New Page</h1>
          <p className="text-gray-600">
            Choose a template to quickly build your page with pre-designed block patterns
          </p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Page Title</label>
          <input
            type="text"
            value={pageTitle}
            onChange={(e) => setPageTitle(e.target.value)}
            placeholder="Enter page title..."
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {pageTemplates.map((template) => (
            <Card
              key={template.id}
              className="p-6 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => buildPageFromTemplate(template)}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                  {template.icon}
                </div>
                <h3 className="font-semibold">{template.name}</h3>
              </div>
              <p className="text-sm text-gray-600">{template.description}</p>
            </Card>
          ))}
        </div>

        {isBuilding && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="p-6 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Building your page...</span>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">
              {pageTitle || 'Untitled Page'}
            </h1>
            <p className="text-sm text-gray-500">
              Using {selectedTemplate.name} template
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowPatternBrowser(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pattern
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={!pageTitle}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Page
            </Button>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <O4OBlockEditor
          initialBlocks={editorBlocks}
          onChange={(blocks) => handleEditorChange(JSON.stringify(blocks), blocks)}
          documentTitle=""
          slug=""
          onTitleChange={() => {}}
          onSave={() => Promise.resolve()}
          onPublish={() => Promise.resolve()}
        />
      </div>

      {/* Pattern Browser Modal */}
      {showPatternBrowser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Add Block Pattern</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPatternBrowser(false)}
              >
                ×
              </Button>
            </div>
            <div className="p-4 overflow-auto max-h-[calc(90vh-120px)]">
              <BlockPatternsBrowser
                onInsertPattern={handleInsertPattern}
                compact={false}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatternPageBuilder;