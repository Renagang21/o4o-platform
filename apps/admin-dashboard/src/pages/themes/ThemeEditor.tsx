import { FC, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Save, 
  X, 
  FileText,
  Code,
  Folder,
  FolderOpen,
  File,
  ChevronRight,
  ChevronDown,
  Search,
  AlertTriangle,
  Check,
  Copy,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
// import MonacoEditor from '@monaco-editor/react';
const MonacoEditor = () => <div>Monaco Editor temporarily disabled</div>;

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  content?: string;
  language?: string;
}

interface ThemeFile {
  path: string;
  content: string;
  language: string;
}

const ThemeEditor: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<ThemeFile | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [editorTheme, setEditorTheme] = useState<'vs-dark' | 'light'>('vs-dark');
  const editorRef = useRef<any>(null);

  useEffect(() => {
    fetchThemeFiles();
  }, [id]);

  useEffect(() => {
    // Warn user about unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const fetchThemeFiles = async () => {
    try {
      setLoading(true);
      // In production, fetch from API
      // const response = await api.get(`/v1/themes/${id}/files`);
      // setFileTree(response.data.data);
      
      // Mock data for development
      setFileTree(getMockFileTree());
    } catch (error) {
      console.error('Error fetching theme files:', error);
      toast.error('Failed to load theme files');
    } finally {
      setLoading(false);
    }
  };

  const getMockFileTree = (): FileNode[] => [
    {
      name: 'styles',
      path: '/styles',
      type: 'directory',
      children: [
        {
          name: 'main.css',
          path: '/styles/main.css',
          type: 'file',
          language: 'css',
          content: `/* Main Theme Styles */
:root {
  --primary-color: #3b82f6;
  --secondary-color: #8b5cf6;
  --text-color: #1a1a1a;
  --bg-color: #ffffff;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
  color: var(--text-color);
  background-color: var(--bg-color);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
}

/* Header Styles */
.header {
  background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
  padding: 20px 0;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}`
        },
        {
          name: 'responsive.css',
          path: '/styles/responsive.css',
          type: 'file',
          language: 'css',
          content: `/* Responsive Styles */
@media (max-width: 768px) {
  .container {
    padding: 0 10px;
  }
  
  .header {
    padding: 15px 0;
  }
}`
        }
      ]
    },
    {
      name: 'templates',
      path: '/templates',
      type: 'directory',
      children: [
        {
          name: 'header.php',
          path: '/templates/header.php',
          type: 'file',
          language: 'php',
          content: `<?php
/**
 * Theme Header Template
 */
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
  <header class="header">
    <div class="container">
      <h1><?php bloginfo('name'); ?></h1>
      <nav><?php wp_nav_menu(['theme_location' => 'primary']); ?></nav>
    </div>
  </header>`
        },
        {
          name: 'footer.php',
          path: '/templates/footer.php',
          type: 'file',
          language: 'php',
          content: `<?php
/**
 * Theme Footer Template
 */
?>
  <footer class="footer">
    <div class="container">
      <p>&copy; <?php echo date('Y'); ?> <?php bloginfo('name'); ?></p>
    </div>
  </footer>
  <?php wp_footer(); ?>
</body>
</html>`
        },
        {
          name: 'index.php',
          path: '/templates/index.php',
          type: 'file',
          language: 'php',
          content: `<?php
/**
 * Main Template File
 */
get_header();
?>

<main class="main">
  <div class="container">
    <?php if (have_posts()) : ?>
      <?php while (have_posts()) : the_post(); ?>
        <article>
          <h2><?php the_title(); ?></h2>
          <?php the_content(); ?>
        </article>
      <?php endwhile; ?>
    <?php endif; ?>
  </div>
</main>

<?php get_footer(); ?>`
        }
      ]
    },
    {
      name: 'scripts',
      path: '/scripts',
      type: 'directory',
      children: [
        {
          name: 'main.js',
          path: '/scripts/main.js',
          type: 'file',
          language: 'javascript',
          content: `// Main Theme Scripts
document.addEventListener('DOMContentLoaded', function() {
  // console.log('Theme initialized');
  
  // Mobile menu toggle
  const menuToggle = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.navigation');
  
  if (menuToggle) {
    menuToggle.addEventListener('click', function() {
      navigation.classList.toggle('active');
    });
  }
});`
        }
      ]
    },
    {
      name: 'theme.json',
      path: '/theme.json',
      type: 'file',
      language: 'json',
      content: `{
  "name": "Custom Theme",
  "version": "1.0.0",
  "description": "A custom WordPress-style theme",
  "author": "O4O Platform",
  "license": "GPL v2",
  "textDomain": "custom-theme",
  "supportedFeatures": [
    "responsive",
    "customizer",
    "widgets",
    "menus",
    "post-thumbnails"
  ]
}`
    }
  ];

  const toggleFolder = (path: string) => {
    setOpenFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  const handleFileSelect = (file: FileNode) => {
    if (file.type === 'directory') {
      toggleFolder(file.path);
    } else {
      setSelectedFile({
        path: file.path,
        content: file.content || '',
        language: file.language || 'text'
      });
      setEditorContent(file.content || '');
    }
  };

  const getFileIcon = (file: FileNode) => {
    if (file.type === 'directory') {
      return openFolders.has(file.path) ? 
        <FolderOpen className="w-4 h-4 text-yellow-600" /> : 
        <Folder className="w-4 h-4 text-yellow-600" />;
    }
    
    const ext = file.name.split('.').pop();
    let color = 'text-gray-500';
    
    switch (ext) {
      case 'css':
      case 'scss':
        color = 'text-blue-500';
        break;
      case 'js':
      case 'jsx':
      case 'ts':
      case 'tsx':
        color = 'text-yellow-500';
        break;
      case 'php':
        color = 'text-purple-500';
        break;
      case 'html':
        color = 'text-orange-500';
        break;
      case 'json':
        color = 'text-green-500';
        break;
    }
    
    return <File className={`w-4 h-4 ${color}`} />;
  };

  const renderFileTree = (nodes: FileNode[], level = 0) => {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-100 cursor-pointer ${
            selectedFile?.path === node.path ? 'bg-blue-50' : ''
          }`}
          style={{ paddingLeft: `${level * 20 + 8}px` }}
          onClick={() => handleFileSelect(node)}
        >
          {node.type === 'directory' && (
            openFolders.has(node.path) ? 
              <ChevronDown className="w-3 h-3" /> : 
              <ChevronRight className="w-3 h-3" />
          )}
          {getFileIcon(node)}
          <span className="text-sm">{node.name}</span>
        </div>
        {node.type === 'directory' && openFolders.has(node.path) && node.children && (
          renderFileTree(node.children, level + 1)
        )}
      </div>
    ));
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    try {
      setSaving(true);
      
      // In production, save to API
      // await api.put(`/v1/themes/${id}/files`, {
      //   path: selectedFile.path,
      //   content: editorContent
      // });
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success('파일이 저장되었습니다');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving file:', error);
      toast.error('파일 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    setEditorContent(value || '');
    setHasChanges(true);
  };

  const handleEditorMount = (editor: any) => {
    editorRef.current = editor;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold">테마 에디터</h1>
          {hasChanges && (
            <span className="text-sm text-orange-500 flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" />
              변경사항이 있습니다
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditorTheme(editorTheme === 'vs-dark' ? 'light' : 'vs-dark')}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/themes')}
          >
            <X className="w-4 h-4 mr-1" />
            닫기
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1" />
                저장
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File Explorer */}
        <div className="w-64 border-r bg-gray-50 overflow-y-auto">
          <div className="p-2 border-b bg-white">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="파일 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1 text-sm border rounded"
              />
            </div>
          </div>
          <div className="p-2">
            {renderFileTree(fileTree)}
          </div>
        </div>

        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          {selectedFile ? (
            <>
              <div className="px-4 py-2 border-b bg-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">{selectedFile.path}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(editorContent);
                      toast.success('코드가 클립보드에 복사되었습니다');
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1">
                <MonacoEditor
                  value={editorContent}
                  language={selectedFile.language}
                  theme={editorTheme}
                  onChange={handleEditorChange}
                  onMount={handleEditorMount}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    roundedSelection: false,
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    formatOnPaste: true,
                    formatOnType: true
                  }}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Code className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>파일을 선택하세요</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className="px-4 py-1 border-t bg-gray-100 text-xs text-gray-600 flex justify-between">
        <div className="flex items-center gap-4">
          {selectedFile && (
            <>
              <span>{selectedFile.language.toUpperCase()}</span>
              <span>UTF-8</span>
              <span>줄 {editorContent.split('\n').length}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {hasChanges ? (
            <span className="flex items-center gap-1 text-orange-500">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              수정됨
            </span>
          ) : (
            <span className="flex items-center gap-1 text-green-500">
              <Check className="w-3 h-3" />
              저장됨
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThemeEditor;