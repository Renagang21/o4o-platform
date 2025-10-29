# @o4o/slide-app

**Embla Carousel based slide/carousel system for o4o-platform (M2 Complete)**

## Overview

SlideApp is a modern, accessible, and lightweight slide/carousel component built on top of Embla Carousel. It replaces the legacy `o4o/slide`, `o4o/slider`, and `ProductCarousel` implementations with a unified, performant solution.

### Key Features

- **Lightweight**: Only 4KB bundle size (Embla Carousel core)
- **Accessible**: WCAG 2.2 compliant with full ARIA support and screen reader announcements
- **Modern**: Built with React 18 and TypeScript 5.4, modular hooks architecture
- **Feature-rich**: Autoplay, loop, keyboard navigation (Arrow keys, Home, End, Space), touch/swipe support
- **Flexible**: Multiple slide types (text, image, video, mixed content)
- **Customizable**: Pagination styles (dots, numbers, progress), configurable navigation
- **Validated**: Runtime props validation with safe defaults and console warnings

## Installation

```bash
pnpm add @o4o/slide-app
```

## Usage

### Example 1: Autoplay with Dots (Most Common)

```tsx
import { SlideApp } from '@o4o/slide-app';
import type { Slide } from '@o4o/slide-app';

const slides: Slide[] = [
  {
    id: '1',
    type: 'text',
    title: 'Welcome',
    subtitle: 'Getting started',
    content: 'This is a text slide',
    backgroundColor: '#3b82f6',
    textColor: '#ffffff',
    visible: true,
  },
  {
    id: '2',
    type: 'image',
    src: '/path/to/image.jpg',
    alt: 'Description',
    visible: true,
  },
];

function App() {
  return (
    <SlideApp
      slides={slides}
      autoplay={{ enabled: true, delay: 3000, pauseOnInteraction: true }}
      loop={true}
      navigation={true}
      pagination="dots"
      aspectRatio="16/9"
      a11y={{
        prevLabel: 'Previous slide',
        nextLabel: 'Next slide',
        roledescription: 'carousel',
      }}
      onSlideChange={(index) => console.log('Slide changed:', index)}
    />
  );
}
```

### Example 2: Manual Navigation with Numbers

```tsx
<SlideApp
  slides={slides}
  autoplay={{ enabled: false, delay: 3000 }}
  loop={false}
  navigation={true}
  pagination="numbers"
  aspectRatio="4/3"
/>
```

### Example 3: Progress Bar (Performance Test)

```tsx
<SlideApp
  slides={manySlides} // e.g., 10+ slides
  autoplay={{ enabled: false, delay: 2000 }}
  loop={true}
  navigation={true}
  pagination="progress"
  aspectRatio="16/9"
/>
```

## Props API

### SlideAppProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `slides` | `Slide[]` | **required** | Array of slide data |
| `autoplay` | `AutoplayConfig \| undefined` | `{ enabled: false, delay: 3000 }` | Autoplay configuration |
| `loop` | `boolean` | `true` | Enable loop mode |
| `navigation` | `boolean` | `true` | Show prev/next buttons |
| `pagination` | `'none' \| 'dots' \| 'numbers' \| 'progress'` | `'dots'` | Pagination style |
| `aspectRatio` | `'16/9' \| '4/3' \| '1/1' \| 'auto'` | `'16/9'` | Slide aspect ratio |
| `className` | `string` | - | Additional CSS classes |
| `a11y` | `A11yConfig` | `{}` | Accessibility configuration |
| `onSlideChange` | `(index: number) => void` | - | Slide change callback |
| `onSlideClick` | `(slide: Slide, index: number) => void` | - | Slide click callback |

### Slide Type

```typescript
interface Slide {
  id: string;
  type: 'text' | 'image' | 'video' | 'mixed';

  // Content (type-specific)
  content?: string; // For text type
  src?: string; // For image/video type (imageUrl or videoUrl)
  alt?: string; // For image type

  // Optional metadata
  title?: string;
  subtitle?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  textColor?: string;
  ariaLabel?: string;
  order?: number;
  visible?: boolean;
}
```

### AutoplayConfig

```typescript
interface AutoplayConfig {
  enabled: boolean;
  delay: number; // milliseconds (1000-10000)
  pauseOnInteraction?: boolean; // default: true
}
```

### A11yConfig

```typescript
interface A11yConfig {
  prevLabel?: string; // default: "Previous slide"
  nextLabel?: string; // default: "Next slide"
  roledescription?: string; // default: "carousel"
}
```

## Accessibility

SlideApp follows WCAG 2.2 guidelines:

### ARIA Roles and Labels
- **`role="region"`**: Main carousel container
- **`aria-roledescription="carousel"`**: Describes the widget type
- **`role="group"`**: Each slide is a group
- **`aria-label`**: Descriptive labels for all interactive elements
- **`aria-current`**: Marks the active slide

### Screen Reader Announcements
- **`aria-live="polite"`**: Announces slide changes (e.g., "Slide 2 of 5")
- **Debounced**: 300ms debounce prevents duplicate announcements
- **Hidden region**: Announcement area is visually hidden but accessible to screen readers

### Keyboard Navigation
- **Arrow Left/Right**: Navigate to previous/next slide
- **Home**: Jump to first slide
- **End**: Jump to last slide
- **Space**: Pause/Resume autoplay (when enabled)

### Focus Management
- **Visible focus rings**: All interactive elements have `focus:ring-2` styling
- **Tabindex**: Proper tab order for navigation buttons and pagination dots
- **Outline**: Focus indicators preserved (Tailwind `outline`)

## Demo

The package includes 3 comprehensive test cases:

### Case A: Autoplay + Dots + Loop
- Autoplay enabled (3s delay)
- Pauses on interaction
- Dot pagination
- Loop mode

### Case B: Numbers + No Loop + Navigation
- Manual navigation only
- Number pagination ("2 / 4")
- No loop (stops at ends)
- Navigation buttons

### Case C: Progress Bar + 10 Slides
- Performance test with 10 slides
- Progress bar pagination
- Smooth transitions
- No frame drops

See `demo/App.tsx` for full implementation.

## Architecture

### M2 Enhancements

- **Validated Props**: Runtime validation with console warnings
- **Modular Hooks**: `useEmbla`, `useSlideKeyboard`, `useA11y`
- **Component Separation**: `Navigation`, `Pagination` (Dots/Numbers/Progress)
- **Screen Reader**: Automatic announcements via `aria-live`
- **Type Safety**: Full TypeScript coverage with exported types

### Package Structure

```
packages/slide-app/
├── src/
│   ├── SlideApp.tsx              # Main component (M2 refactored)
│   ├── index.ts                  # Module entry point
│   ├── types/
│   │   └── slide.types.ts        # Type definitions (M2 schema)
│   ├── hooks/
│   │   ├── useEmbla.ts           # Embla initialization
│   │   ├── useSlideKeyboard.ts   # Keyboard navigation
│   │   └── useA11y.ts            # Accessibility features
│   ├── components/
│   │   ├── Navigation.tsx        # Prev/Next buttons
│   │   └── Pagination/
│   │       ├── index.tsx         # Unified pagination
│   │       ├── Dots.tsx          # Dot indicators
│   │       ├── Numbers.tsx       # Numeric counter
│   │       └── Progress.tsx      # Progress bar
│   └── utils/
│       └── validateProps.ts      # Props validation
├── demo/
│   ├── index.html                # Static demo
│   └── App.tsx                   # React demo (3 cases)
├── dist/                         # Build output
├── package.json
├── tsconfig.json
└── README.md
```

## Development

```bash
# Install dependencies
pnpm install

# Build package
pnpm run build

# Type check
pnpm run type-check

# Development watch mode
pnpm run dev
```

## Integration with o4o-platform

### Gutenberg Block Wrapper (M3 - Planned)

SlideApp will be integrated into the admin-dashboard via a thin Gutenberg block wrapper that transforms Gutenberg attributes to SlideApp props.

### Frontend Rendering (M4 - Planned)

- **main-site**: Direct SlideApp usage for marketing slides
- **ecommerce**: Product carousel replacement
- **signage**: Full-screen slide displays

## Migration from Legacy Systems

### Removed Systems (M6 - Planned)
- `o4o/slide` block (27 files, 762-line SlideBlock.tsx)
- `o4o/slider` block (5 files)
- `ProductCarousel` component (ecommerce)

### Why the Change?
- **Fragmentation**: 3 separate implementations
- **Tech Debt**: 2022-2023 tech stack
- **Dependency Issues**: Framer Motion inconsistencies (40KB+)
- **Gutenberg Lock-in**: Data structure not reusable across apps
- **Bundle Size**: Embla (4KB) vs Framer Motion (40KB+)
- **Accessibility**: WCAG 2.2 compliance required

## Props Validation

SlideApp validates props at runtime and provides helpful warnings:

```typescript
// Invalid autoplay delay (too short)
<SlideApp
  slides={slides}
  autoplay={{ enabled: true, delay: 500 }} // Warning: Using 1000ms minimum
/>

// Empty slides array
<SlideApp slides={[]} /> // Error: Safe defaults applied

// Invalid aspect ratio
<SlideApp slides={slides} aspectRatio="21/9" /> // Warning: Using default '16/9'
```

All warnings are logged to console with `[SlideApp]` prefix and are deduplicated.

## Performance

- **Bundle Size**: ~4KB (Embla Carousel) + ~2KB (SlideApp code) = **6KB total**
- **No Frame Drops**: Tested with 10+ slides, smooth 60fps transitions
- **Lazy Loading**: Future enhancement (M4)
- **Tree Shaking**: ES modules with named exports

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT - O4O Platform Team

## Version

1.0.0 - M2 Complete (2025-10-29)

### Changelog

#### M2 (2025-10-29)
- ✅ Fixed props schema with AutoplayConfig and A11yConfig
- ✅ Runtime props validation with console warnings
- ✅ Modular hooks: useEmbla, useSlideKeyboard, useA11y
- ✅ Component separation: Navigation, Pagination (Dots/Numbers/Progress)
- ✅ Screen reader announcements via aria-live
- ✅ Enhanced demo with 3 test cases
- ✅ Full TypeScript coverage (0 errors)

#### M1 (2025-10-29)
- ✅ Initial package scaffold
- ✅ Embla Carousel integration
- ✅ Basic SlideApp component
- ✅ CI/CD integration
