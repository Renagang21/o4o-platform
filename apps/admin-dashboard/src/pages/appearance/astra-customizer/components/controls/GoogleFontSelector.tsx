import React, { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';

// Popular Google Fonts list (can be expanded)
const GOOGLE_FONTS = [
  'System Default',
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Oswald',
  'Raleway',
  'Poppins',
  'Inter',
  'Nunito',
  'Playfair Display',
  'Merriweather',
  'Ubuntu',
  'Mukta',
  'Rubik',
  'Work Sans',
  'Roboto Condensed',
  'Noto Sans',
  'PT Sans',
  'Roboto Slab',
  'Josefin Sans',
  'Libre Baskerville',
  'Karla',
  'Dancing Script',
  'Bebas Neue',
  'Anton',
  'Pacifico',
  'Indie Flower',
  'Caveat',
  'Quicksand',
  'Hind',
  'Bitter',
  'Source Code Pro',
  'Fira Sans',
  'Barlow',
  'IBM Plex Sans',
  'Crimson Text',
  'Archivo',
  'Arimo',
  'Kanit',
  'Heebo',
  'Oxygen',
  'Prompt',
  'Catamaran',
  'Dosis',
  'Libre Franklin',
  'Cabin',
  'EB Garamond',
];

// Font categories
const FONT_CATEGORIES = {
  'Sans Serif': [
    'System Default', 'Arial', 'Helvetica', 'Roboto', 'Open Sans', 'Lato',
    'Montserrat', 'Raleway', 'Poppins', 'Inter', 'Nunito', 'Ubuntu',
    'Mukta', 'Rubik', 'Work Sans', 'Noto Sans', 'PT Sans', 'Josefin Sans',
    'Karla', 'Quicksand', 'Hind', 'Fira Sans', 'Barlow', 'IBM Plex Sans',
    'Archivo', 'Arimo', 'Kanit', 'Heebo', 'Oxygen', 'Prompt', 'Catamaran',
    'Dosis', 'Libre Franklin', 'Cabin',
  ],
  'Serif': [
    'Georgia', 'Times New Roman', 'Playfair Display', 'Merriweather',
    'Roboto Slab', 'Libre Baskerville', 'Bitter', 'Crimson Text', 'EB Garamond',
  ],
  'Display': [
    'Oswald', 'Bebas Neue', 'Anton',
  ],
  'Handwriting': [
    'Dancing Script', 'Pacifico', 'Indie Flower', 'Caveat',
  ],
  'Monospace': [
    'Source Code Pro',
  ],
};

interface GoogleFontSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  description?: string;
  showPreview?: boolean;
}

export const GoogleFontSelector: React.FC<GoogleFontSelectorProps> = ({
  label,
  value,
  onChange,
  description,
  showPreview = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadedFonts, setLoadedFonts] = useState<Set<string>>(new Set());
  
  // Filter fonts based on search and category
  const filteredFonts = useMemo(() => {
    let fonts = GOOGLE_FONTS;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      fonts = fonts.filter(font => 
        FONT_CATEGORIES[selectedCategory as keyof typeof FONT_CATEGORIES]?.includes(font)
      );
    }
    
    // Filter by search term
    if (searchTerm) {
      fonts = fonts.filter(font =>
        font.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return fonts;
  }, [searchTerm, selectedCategory]);
  
  // Load Google Font for preview
  const loadGoogleFont = (fontName: string) => {
    if (loadedFonts.has(fontName) || fontName === 'System Default') {
      return;
    }
    
    const link = document.createElement('link');
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(' ', '+')}:wght@300;400;500;600;700&display=swap`;
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    setLoadedFonts(prev => new Set(prev).add(fontName));
  };
  
  // Load selected font
  useEffect(() => {
    if (value && value !== 'System Default') {
      loadGoogleFont(value);
    }
  }, [value]);
  
  // Get font family CSS value
  const getFontFamily = (fontName: string) => {
    if (fontName === 'System Default') {
      return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
    return `"${fontName}", sans-serif`;
  };
  
  const handleSelect = (fontName: string) => {
    onChange(fontName);
    setIsOpen(false);
    setSearchTerm('');
  };
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.google-font-selector')) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);
  
  return (
    <div className="astra-control google-font-selector">
      <div className="astra-control-header">
        <label className="astra-control-label">{label}</label>
        {description && (
          <span className="astra-control-description">{description}</span>
        )}
      </div>
      
      <div className="google-font-selector-container">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="google-font-selector-trigger"
          style={{ fontFamily: getFontFamily(value) }}
        >
          <span className="google-font-selector-value">{value || 'Select Font'}</span>
          <span className="google-font-selector-arrow">▼</span>
        </button>
        
        {showPreview && value && (
          <div 
            className="google-font-preview"
            style={{ fontFamily: getFontFamily(value) }}
          >
            The quick brown fox jumps over the lazy dog
          </div>
        )}
        
        {isOpen && (
          <div className="google-font-dropdown">
            {/* Search and Category Filter */}
            <div className="google-font-header">
              <div className="google-font-search">
                <Search size={14} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search fonts..."
                  className="google-font-search-input"
                  autoFocus
                />
              </div>
              
              <div className="google-font-categories">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`google-font-category ${selectedCategory === 'all' ? 'active' : ''}`}
                >
                  All
                </button>
                {Object.keys(FONT_CATEGORIES).map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`google-font-category ${selectedCategory === category ? 'active' : ''}`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Font List */}
            <div className="google-font-list">
              {filteredFonts.length > 0 ? (
                filteredFonts.map(font => {
                  // Load font on hover for preview
                  const handleMouseEnter = () => {
                    if (font !== 'System Default') {
                      loadGoogleFont(font);
                    }
                  };
                  
                  return (
                    <button
                      key={font}
                      onClick={() => handleSelect(font)}
                      onMouseEnter={handleMouseEnter}
                      className={`google-font-option ${font === value ? 'selected' : ''}`}
                      style={{ fontFamily: loadedFonts.has(font) ? getFontFamily(font) : 'inherit' }}
                    >
                      {font}
                    </button>
                  );
                })
              ) : (
                <div className="google-font-empty">No fonts found</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};