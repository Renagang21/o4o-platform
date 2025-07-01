# Healthcare Platform Main Page with Tiptap Blocks

A comprehensive React + TypeScript healthcare platform main page component system with drag-and-drop block editing capabilities using Tiptap editor integration.

## 🚀 Features

### Core Functionality
- **Real-time Block Editing**: Live editing of all content blocks with immediate preview
- **Drag & Drop Interface**: Intuitive block reordering with visual feedback
- **Responsive Design**: Mobile-first approach with optimized layouts for all devices
- **Component-Based Architecture**: Modular, reusable block components
- **Type Safety**: Full TypeScript support with comprehensive type definitions

### Block Types
1. **Hero Section Block** - Main banner with editable title, subtitle, CTA, and background image
2. **Expert Content Block** - Medical professional articles with author profiles and verification
3. **Product List Block** - E-commerce product listings with multiple layout options
4. **Trending Issues Block** - Health trend topics with related product connections
5. **Business Banners Block** - Partner/service promotion banners
6. **Community Banner Block** - User engagement and Q&A showcase

### Layout Options
- **Grid Layouts**: 2, 3, 4, 5, 6 column responsive grids
- **Horizontal Scroll**: Touch-friendly product carousels
- **List View**: Detailed product/content listings
- **Mixed Layouts**: Flexible arrangement combinations

## 📁 File Structure

```
shared/components/healthcare/
├── blocks/
│   ├── HeroSectionBlock.tsx         # Main hero banner
│   ├── ExpertContentBlock.tsx       # Professional content
│   ├── ProductListBlock.tsx         # Product showcase
│   ├── TrendingIssuesBlock.tsx      # Health trends
│   ├── BusinessBannersBlock.tsx     # Partner promotions
│   └── CommunityBannerBlock.tsx     # User engagement
├── HealthcareMainPage.tsx           # Main orchestrator component
├── types.ts                         # TypeScript definitions
├── sampleData.ts                    # Test data generator
├── healthcare.css                   # Responsive styles
├── index.ts                         # Component exports
└── README.md                        # Documentation

services/main-site/src/pages/healthcare/
├── HealthcarePage.tsx               # Page wrapper component
└── index.ts                         # Page exports
```

## 🛠️ Installation & Setup

### 1. Dependencies
Ensure these packages are installed in your shared components:
```bash
# UI Components (already exists in shared)
npm install @o4o/shared/ui

# Icons
npm install lucide-react

# Tiptap (already installed)
npm install @tiptap/react @tiptap/starter-kit
```

### 2. CSS Import
Add the healthcare CSS to your main app:
```typescript
// In your main app component or index.css
import '@o4o/shared/healthcare/healthcare.css';
```

### 3. Route Setup
Add the healthcare route to your main-site App.tsx:
```typescript
import { HealthcarePage } from './pages/healthcare';

// In your routes
<Route path="/healthcare" element={<HealthcarePage />} />
```

## 🎯 Usage Examples

### Basic Usage
```typescript
import { HealthcareMainPage } from '@o4o/shared/healthcare';

function MyApp() {
  return (
    <HealthcareMainPage
      isEditing={false}
      onToggleEdit={() => console.log('Toggle edit mode')}
    />
  );
}
```

### With Edit Controls
```typescript
import { HealthcarePage } from './pages/healthcare';

// Use the complete page wrapper with edit controls
function App() {
  return <HealthcarePage />;
}
```

### Custom Block Configuration
```typescript
import { 
  HeroSectionBlock, 
  ProductListBlock,
  type HeroBlockData,
  type ProductListBlockData 
} from '@o4o/shared/healthcare';

function CustomPage() {
  const heroData: HeroBlockData = {
    title: "맞춤 건강 솔루션",
    subtitle: "개인 맞춤형 건강 관리",
    description: "AI 기반 건강 분석으로 당신만의 건강 플랜을 제공합니다",
    ctaText: "건강 체크 시작하기",
    ctaLink: "/health-check",
    backgroundImage: "/images/custom-hero.jpg"
  };

  return (
    <div>
      <HeroSectionBlock 
        data={heroData}
        isEditing={true}
        onEdit={(newData) => console.log('Hero updated:', newData)}
      />
    </div>
  );
}
```

## 🎨 Customization

### Block Data Customization
Each block accepts data props that can be customized:

```typescript
// Expert Content Block
const expertData: ExpertContentBlockData = {
  title: "전문가 칼럼",
  subtitle: "신뢰할 수 있는 의료진의 조언",
  contentIds: ["expert-1", "expert-2"],
  layout: "grid", // "grid" | "carousel" | "list"
  showCount: 4
};

// Product List Block
const productData: ProductListBlockData = {
  title: "추천 제품",
  productIds: ["prod-1", "prod-2"],
  layout: "horizontal-scroll", // "grid" | "horizontal-scroll" | "list"
  columns: 4,
  showPrice: true,
  showRating: true,
  productType: "recommended"
};
```

### Styling Customization
Override styles using CSS classes:
```css
/* Custom hero styling */
.healthcare-hero {
  background-attachment: fixed;
  min-height: 600px;
}

/* Custom product card hover */
.product-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
}
```

## 📱 Responsive Design

### Breakpoints
- **Mobile**: < 640px (1 column layouts)
- **Tablet**: 641px - 1024px (2-3 column layouts)
- **Desktop**: > 1024px (3-6 column layouts)

### Mobile Optimizations
- Touch-friendly buttons and interactions
- Optimized image sizes
- Simplified layouts for small screens
- Horizontal scroll for product lists
- Collapsible content sections

### Performance Features
- Lazy loading for images
- Virtual scrolling for large lists
- CSS transforms for smooth animations
- Optimized re-renders with React.memo

## 🔧 API Integration

### Expected Data Structure
```typescript
// Expert Content
interface ExpertContent {
  id: string;
  title: string;
  author: {
    name: string;
    title: string;
    profileImage: string;
    verified: boolean;
  };
  summary: string;
  thumbnail: string;
  readTime: number;
  category: string;
}

// Product
interface Product {
  id: string;
  name: string;
  brand: string;
  price: number;
  discountPrice?: number;
  image: string;
  rating: number;
  reviewCount: number;
  description: string;
  badges?: string[];
}
```

### Backend Integration
```typescript
// Replace sample data with API calls
const fetchExpertContent = async (): Promise<ExpertContent[]> => {
  const response = await fetch('/api/expert-content');
  return response.json();
};

const fetchProducts = async (type: string): Promise<Product[]> => {
  const response = await fetch(`/api/products?type=${type}`);
  return response.json();
};
```

## 🧪 Testing

### Sample Data
The component comes with comprehensive sample data for testing:
- 4 expert content items with different categories
- 15+ products across recommended/new/popular categories  
- 4 trending health issues with related products
- 3 business banners for different services
- Community Q&A sample data

### Test Scenarios
1. **Block Editing**: Test all edit forms and data persistence
2. **Drag & Drop**: Verify block reordering works smoothly
3. **Responsive**: Test layouts on different screen sizes
4. **Performance**: Check loading times with large datasets
5. **Accessibility**: Verify keyboard navigation and screen readers

## 🔮 Future Enhancements

### Planned Features
- **A/B Testing**: Different block layouts for optimization
- **Analytics Integration**: Track user engagement with blocks
- **Advanced Filtering**: Product and content filtering options
- **Multi-language**: Support for Korean/English content
- **Dark Mode**: Theme switching capability
- **Advanced SEO**: Dynamic meta tags and structured data

### Tiptap Integration
- **Custom Extensions**: Healthcare-specific content blocks
- **Collaborative Editing**: Multi-user editing capabilities
- **Version History**: Content change tracking
- **Import/Export**: Content migration tools

## 🤝 Contributing

### Development Workflow
1. Create feature branch
2. Implement changes with tests
3. Update documentation
4. Submit pull request
5. Code review and merge

### Code Standards
- TypeScript strict mode required
- ESLint + Prettier formatting
- Component-based architecture
- Accessibility compliance (WCAG 2.1 AA)
- Performance optimizations

## 📞 Support

For questions or issues:
1. Check the documentation first
2. Review existing GitHub issues
3. Create new issue with detailed reproduction steps
4. Tag appropriate team members

## 📄 License

This component system is part of the O4O Platform and follows the project's licensing terms.