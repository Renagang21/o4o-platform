import { useState } from 'react';
import {
  Layout,
  FileText,
  Info,
  Phone,
  Star,
  TrendingUp,
  Users,
  Package,
  Megaphone,
  BookOpen,
  Search,
  Plus,
  Eye,
  Heart,
  Copy,
  Check,
  MessageSquare,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

// Template types
export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'landing' | 'product' | 'blog' | 'page' | 'section';
  icon: React.ComponentType<any>;
  thumbnail?: string;
  blocks: any[];
  tags: string[];
  isPro?: boolean;
  isFavorite?: boolean;
}

export interface Pattern {
  id: string;
  name: string;
  category: 'header' | 'hero' | 'features' | 'cta' | 'testimonial' | 'pricing' | 'footer' | 'content';
  blocks: any[];
  thumbnail?: string;
}

// Template data
const templates: Template[] = [
  {
    id: 'landing-1',
    name: 'SaaS Landing Page',
    description: 'Modern landing page for SaaS products with hero, features, pricing, and testimonials',
    category: 'landing',
    icon: TrendingUp,
    tags: ['saas', 'startup', 'modern'],
    blocks: [
      { type: 'hero', content: { title: 'Build Better Products Faster' } },
      { type: 'features', content: { columns: 3 } },
      { type: 'pricing', content: { plans: 3 } },
      { type: 'testimonials', content: { count: 3 } },
      { type: 'cta', content: { title: 'Start Your Free Trial' } }
    ]
  },
  {
    id: 'product-1',
    name: 'Product Showcase',
    description: 'Elegant product page with gallery, description, and purchase options',
    category: 'product',
    icon: Package,
    tags: ['ecommerce', 'product', 'shop'],
    blocks: [
      { type: 'breadcrumb', content: {} },
      { type: 'product-gallery', content: {} },
      { type: 'product-info', content: {} },
      { type: 'product-tabs', content: {} },
      { type: 'related-products', content: {} }
    ]
  },
  {
    id: 'blog-1',
    name: 'Blog Article',
    description: 'Clean blog post layout with sidebar and comments',
    category: 'blog',
    icon: BookOpen,
    tags: ['blog', 'article', 'content'],
    blocks: [
      { type: 'post-header', content: {} },
      { type: 'post-content', content: {} },
      { type: 'author-bio', content: {} },
      { type: 'related-posts', content: {} },
      { type: 'comments', content: {} }
    ]
  },
  {
    id: 'about-1',
    name: 'About Us',
    description: 'Company about page with team, values, and history',
    category: 'page',
    icon: Users,
    tags: ['about', 'company', 'team'],
    isPro: true,
    blocks: [
      { type: 'hero', content: { title: 'Our Story' } },
      { type: 'text-image', content: {} },
      { type: 'team-grid', content: {} },
      { type: 'values', content: {} },
      { type: 'timeline', content: {} }
    ]
  },
  {
    id: 'contact-1',
    name: 'Contact Page',
    description: 'Contact page with form, map, and office locations',
    category: 'page',
    icon: Phone,
    tags: ['contact', 'form', 'location'],
    blocks: [
      { type: 'contact-hero', content: {} },
      { type: 'contact-form', content: {} },
      { type: 'office-locations', content: {} },
      { type: 'map', content: {} }
    ]
  }
];

// Pattern data
const patterns: Pattern[] = [
  {
    id: 'hero-1',
    name: 'Hero with CTA',
    category: 'hero',
    blocks: [
      { type: 'heading', content: { text: 'Welcome to Our Platform' } },
      { type: 'paragraph', content: { text: 'Build amazing things with our tools' } },
      { type: 'buttons', content: {} }
    ]
  },
  {
    id: 'features-1',
    name: '3 Column Features',
    category: 'features',
    blocks: [
      { type: 'heading', content: { text: 'Our Features' } },
      { type: 'columns', content: { count: 3 } }
    ]
  },
  {
    id: 'cta-1',
    name: 'Centered CTA',
    category: 'cta',
    blocks: [
      { type: 'cta', content: { alignment: 'center' } }
    ]
  },
  {
    id: 'testimonial-1',
    name: 'Testimonial Carousel',
    category: 'testimonial',
    blocks: [
      { type: 'testimonial-carousel', content: {} }
    ]
  },
  {
    id: 'pricing-1',
    name: '3 Tier Pricing',
    category: 'pricing',
    blocks: [
      { type: 'pricing-table', content: { plans: 3 } }
    ]
  }
];

interface ContentTemplatesProps {
  onSelectTemplate?: (template: Template) => void;
  onSelectPattern?: (pattern: Pattern) => void;
  mode?: 'templates' | 'patterns' | 'both';
}

const ContentTemplates: React.FC<ContentTemplatesProps> = ({
  onSelectTemplate,
  onSelectPattern,
  mode = 'both'
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'patterns'>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Template categories
  const templateCategories = [
    { id: 'all', name: 'All Templates', icon: Layout },
    { id: 'landing', name: 'Landing Pages', icon: TrendingUp },
    { id: 'product', name: 'Product Pages', icon: Package },
    { id: 'blog', name: 'Blog Posts', icon: BookOpen },
    { id: 'page', name: 'Pages', icon: FileText },
  ];

  // Pattern categories
  const patternCategories = [
    { id: 'all', name: 'All Patterns', icon: Layout },
    { id: 'header', name: 'Headers', icon: Layout },
    { id: 'hero', name: 'Hero Sections', icon: Star },
    { id: 'features', name: 'Features', icon: Package },
    { id: 'cta', name: 'Call to Action', icon: Megaphone },
    { id: 'testimonial', name: 'Testimonials', icon: MessageSquare },
    { id: 'pricing', name: 'Pricing', icon: DollarSign },
    { id: 'footer', name: 'Footers', icon: Layout },
  ];

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Filter patterns
  const filteredPatterns = patterns.filter(pattern => {
    const matchesSearch = pattern.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || pattern.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Toggle favorite
  const toggleFavorite = (id: string) => {
    setFavorites(prev => 
      prev.includes(id) 
        ? prev.filter(fId => fId !== id)
        : [...prev, id]
    );
  };

  // Copy template ID
  const copyTemplateId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold mb-2">Content Templates & Patterns</h2>
        <p className="text-gray-600">
          Choose from pre-designed templates or mix and match patterns
        </p>
      </div>

      {/* Search */}
      <div className="p-6 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates and patterns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(value: any) => setActiveTab(value)}
        className="flex-1 flex flex-col"
      >
        {mode === 'both' && (
          <TabsList className="mx-6">
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="patterns">Patterns</TabsTrigger>
          </TabsList>
        )}

        {/* Templates Tab */}
        <TabsContent value="templates" className="flex-1 flex m-0">
          {/* Categories Sidebar */}
          <div className="w-64 border-r p-4">
            <h3 className="font-medium text-sm mb-4">Categories</h3>
            <div className="space-y-1">
              {templateCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    selectedCategory === category.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-gray-100'
                  )}
                >
                  <category.icon className="h-4 w-4" />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(template => {
                const Icon = template.icon;
                const isFavorite = favorites.includes(template.id);
                
                return (
                  <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                            <Icon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{template.name}</CardTitle>
                            {template.isPro && (
                              <Badge variant="secondary" className="mt-1">
                                PRO
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleFavorite(template.id)}
                        >
                          <Heart
                            className={cn(
                              'h-4 w-4',
                              isFavorite && 'fill-red-500 text-red-500'
                            )}
                          />
                        </Button>
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <CardDescription>{template.description}</CardDescription>
                      
                      <div className="flex flex-wrap gap-2 mt-4">
                        {template.tags.map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                      
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-xs text-gray-600 mb-1">Contains:</p>
                        <p className="text-sm">{template.blocks.length} blocks</p>
                      </div>
                    </CardContent>
                    
                    <CardFooter className="gap-2">
                      <Button
                        className="flex-1"
                        onClick={() => onSelectTemplate?.(template)}
                      >
                        Use Template
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          // Preview
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyTemplateId(template.id)}
                      >
                        {copiedId === template.id ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Patterns Tab */}
        <TabsContent value="patterns" className="flex-1 flex m-0">
          {/* Categories Sidebar */}
          <div className="w-64 border-r p-4">
            <h3 className="font-medium text-sm mb-4">Pattern Types</h3>
            <div className="space-y-1">
              {patternCategories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    selectedCategory === category.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-gray-100'
                  )}
                >
                  <category.icon className="h-4 w-4" />
                  <span>{category.name}</span>
                </button>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Info className="h-4 w-4" />
                Pro Tip
              </h4>
              <p className="text-xs text-gray-700">
                Combine multiple patterns to create your own unique layouts. 
                Patterns are reusable across all your pages.
              </p>
            </div>
          </div>

          {/* Patterns Grid */}
          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPatterns.map(pattern => (
                <Card
                  key={pattern.id}
                  className="cursor-pointer hover:shadow-md transition-all hover:scale-105"
                  onClick={() => onSelectPattern?.(pattern)}
                >
                  <CardContent className="p-6">
                    <div className="aspect-video bg-gray-100 rounded-md mb-4 flex items-center justify-center">
                      <Layout className="h-12 w-12 text-gray-400" />
                    </div>
                    <h4 className="font-medium">{pattern.name}</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {pattern.blocks.length} blocks
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Create custom pattern */}
            <Card className="mt-6 border-dashed">
              <CardContent className="p-12 text-center">
                <Plus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Create Custom Pattern</h3>
                <p className="text-gray-600 mb-4">
                  Save your own block combinations as reusable patterns
                </p>
                <Button variant="outline">
                  Create Pattern
                </Button>
              </CardContent>
            </Card>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ContentTemplates;