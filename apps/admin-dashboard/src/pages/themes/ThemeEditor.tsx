import { FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Palette, Code, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ThemeEditor: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate('/themes')}
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Themes
        </Button>
        
        <h1 className="text-3xl font-bold">Theme Editor</h1>
        <p className="text-gray-600 mt-2">
          Editing theme: {id || 'default'}
        </p>
      </div>

      <Card className="p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <Palette className="h-16 w-16 text-gray-400 mb-4" />
          <h2 className="text-2xl font-semibold mb-2">Gutenberg Theme Editor</h2>
          <p className="text-gray-600 text-center max-w-md mb-6">
            Theme editing uses the WordPress Gutenberg block editor for a familiar and powerful editing experience.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="p-4 border-2 border-dashed">
              <Code className="h-8 w-8 text-blue-500 mb-2" />
              <h3 className="font-semibold">Block Templates</h3>
              <p className="text-sm text-gray-600">
                Create reusable block templates
              </p>
            </Card>
            
            <Card className="p-4 border-2 border-dashed">
              <Palette className="h-8 w-8 text-green-500 mb-2" />
              <h3 className="font-semibold">Theme Styles</h3>
              <p className="text-sm text-gray-600">
                Customize colors and typography
              </p>
            </Card>
            
            <Card className="p-4 border-2 border-dashed">
              <Settings className="h-8 w-8 text-purple-500 mb-2" />
              <h3 className="font-semibold">Theme Settings</h3>
              <p className="text-sm text-gray-600">
                Configure theme options
              </p>
            </Card>
          </div>
          
          <div className="mt-8">
            <Button size="lg" onClick={() => navigate(`/editor/theme/${id}`)}>
              Open in Gutenberg Editor
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ThemeEditor;