# Shortcode Registration Guide

## 🎯 Auto-Discovery System

Shortcodes are **automatically discovered and registered** using Vite's `import.meta.glob`. No need to modify `main.tsx` when adding new shortcode modules.

## 📁 File Naming Convention

### Option 1: Direct File
```
components/shortcodes/[name]Shortcodes.tsx
```

**Example:**
```typescript
// forumShortcodes.tsx
import { ShortcodeDefinition } from '@o4o/shortcodes';

export const forumListShortcode: ShortcodeDefinition = {
  name: 'forum_list',
  component: ({ attributes }) => <ForumList {...attributes} />
};

export const forumPostShortcode: ShortcodeDefinition = {
  name: 'forum_post',
  component: ({ attributes }) => <ForumPost {...attributes} />
};

// ✅ IMPORTANT: Export array with naming pattern [name]Shortcodes
export const forumShortcodes = [
  forumListShortcode,
  forumPostShortcode
];
```

### Option 2: Directory Structure
```
components/shortcodes/[name]/index.ts
```

**Example:**
```
components/shortcodes/forum/
├── index.ts              # Exports forumShortcodes array
├── ForumList.tsx         # Individual component
└── ForumPost.tsx         # Individual component
```

```typescript
// forum/index.ts
export { forumListShortcode } from './ForumList';
export { forumPostShortcode } from './ForumPost';

export const forumShortcodes = [
  forumListShortcode,
  forumPostShortcode
];
```

## 🚀 Adding New Shortcode Module

### Step 1: Create File

**For single file approach:**
```bash
touch apps/main-site/src/components/shortcodes/communityShortcodes.tsx
```

**For directory approach:**
```bash
mkdir apps/main-site/src/components/shortcodes/community
touch apps/main-site/src/components/shortcodes/community/index.ts
```

### Step 2: Export Array

**Critical:** Export an array named `[name]Shortcodes`:

```typescript
// ✅ Correct
export const communityShortcodes = [...];

// ❌ Wrong - won't be auto-discovered
export const shortcuts = [...];
export const communityShortcode = [...]; // singular
```

### Step 3: Done!

That's it. The shortcode module will be:
- ✅ Automatically discovered
- ✅ Automatically loaded (lazy)
- ✅ Automatically registered

## 📝 Existing Modules

Current auto-discovered shortcode modules:

- `formShortcodes.tsx` → form-related shortcodes
- `authShortcodes` (auth/index.ts) → authentication shortcodes
- `dropshippingShortcodes.tsx` → dropshipping shortcodes
- `productShortcodes.tsx` → product/e-commerce shortcodes

## 🔍 How It Works

The auto-discovery system uses two glob patterns:

```typescript
// Pattern 1: Files named *Shortcodes.{ts,tsx}
'./components/shortcodes/**/*Shortcodes.{ts,tsx}'

// Pattern 2: index.{ts,tsx} files in subdirectories
'./components/shortcodes/**/index.{ts,tsx}'
```

### Module Name Extraction

| File Path | Extracted Module Name |
|-----------|----------------------|
| `formShortcodes.tsx` | `formShortcodes` |
| `productShortcodes.tsx` | `productShortcodes` |
| `auth/index.ts` | `authShortcodes` |
| `forum/index.ts` | `forumShortcodes` |

## 🎨 Best Practices

### 1. Use Lazy Loading for Heavy Dependencies

```typescript
import { Suspense, lazy } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export const heavyShortcode: ShortcodeDefinition = {
  name: 'heavy',
  component: ({ attributes }) => (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent {...attributes} />
    </Suspense>
  )
};
```

### 2. Create Custom Hooks for Data Fetching

```typescript
// hooks/useForum.ts
export const useForum = (forumId: string) => {
  return useQuery({
    queryKey: ['forum', forumId],
    queryFn: async () => {
      const response = await authClient.api.get(`/forums/${forumId}`);
      return response.data;
    }
  });
};

// forumShortcodes.tsx
import { useForum } from '@/hooks/useForum';

const ForumPost = ({ id }) => {
  const { data, isLoading } = useForum(id);
  // ...
};
```

### 3. Validate Attributes

```typescript
export const postShortcode: ShortcodeDefinition = {
  name: 'post',
  component: ({ attributes }) => {
    const postId = String(attributes.id || '');

    if (!postId) {
      return <div className="error">Post ID is required</div>;
    }

    return <Post postId={postId} />;
  }
};
```

## 🐛 Debugging

### Check Auto-Discovery in Console

Open browser console and look for:
```
[Shortcode Registry] ✅ Auto-discovered 4 modules: [...]
```

### Check Registered Shortcodes (Dev Only)

```javascript
// In browser console
window.__shortcodeRegistry
```

## 📦 Example: Adding Forum Shortcodes

```typescript
// apps/main-site/src/components/shortcodes/forumShortcodes.tsx
import { ShortcodeDefinition } from '@o4o/shortcodes';
import { useForum, useForumPosts } from '@/hooks/useForum';

// Forum List Shortcode: [forum_list category="general" limit="10"]
export const forumListShortcode: ShortcodeDefinition = {
  name: 'forum_list',
  component: ({ attributes }) => {
    const category = String(attributes.category || '');
    const limit = Number(attributes.limit || 10);

    const { data, isLoading } = useForumPosts(category, limit);

    if (isLoading) return <div>Loading...</div>;
    if (!data) return <div>No posts found</div>;

    return (
      <div className="forum-list">
        {data.posts.map(post => (
          <div key={post.id} className="forum-post">
            <h3>{post.title}</h3>
            <p>{post.excerpt}</p>
          </div>
        ))}
      </div>
    );
  }
};

// Forum Post Shortcode: [forum_post id="123"]
export const forumPostShortcode: ShortcodeDefinition = {
  name: 'forum_post',
  component: ({ attributes }) => {
    const postId = String(attributes.id || '');

    if (!postId) {
      return <div className="error">Post ID is required</div>;
    }

    const { data, isLoading } = useForum(postId);

    if (isLoading) return <div>Loading...</div>;
    if (!data) return <div>Post not found</div>;

    return (
      <article className="forum-post-full">
        <h1>{data.title}</h1>
        <div className="content">{data.content}</div>
      </article>
    );
  }
};

// ✅ Export array - required for auto-discovery
export const forumShortcodes = [
  forumListShortcode,
  forumPostShortcode
];
```

That's it! The forum shortcodes are now available throughout the application.

## 🔗 Related Documentation

- [Shortcodes Package](/packages/shortcodes/README.md)
- [Block Renderer](/packages/block-renderer/README.md)
- [Auth Client](/packages/auth-client/README.md)
