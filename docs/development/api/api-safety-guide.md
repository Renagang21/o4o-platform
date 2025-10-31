# API Response Safety Guide

## Problem
The admin dashboard has been experiencing "TypeError: x.map is not a function" errors due to inconsistent API response formats. Different endpoints return data in various structures:
- Direct array: `response.data = [...]`
- Nested data: `response.data.data = [...]`
- Resource-specific: `response.data.data.users = [...]`
- Sometimes non-array values when arrays are expected

## Solution

### 1. Use Safe API Response Helpers

Instead of directly using response data, use the helper functions:

```typescript
import { ensureArray, safeMap, safeFilter } from '@/utils/apiResponseHelper';

// BAD - Can cause runtime errors
const users = response.data.map(user => user.name);

// GOOD - Always safe
const users = safeMap(response.data, user => user.name);

// Or ensure array first
const userData = ensureArray(response.data);
const users = userData.map(user => user.name);
```

### 2. Use Safe Query Hooks

Replace `useQuery` with `useSafeQuery` for automatic safety:

```typescript
import { useSafeArrayQuery } from '@/hooks/useSafeQuery';

// BAD - Might get non-array data
const { data: users = [] } = useQuery({
  queryKey: ['users'],
  queryFn: () => authClient.api.get('/users')
});

// GOOD - Always returns array
const { data: users } = useSafeArrayQuery(
  ['users'],
  () => authClient.api.get('/users'),
  undefined,
  [] // default value
);
```

### 3. Available Helper Functions

#### `ensureArray(data, defaultValue = [])`
Ensures data is always an array, checking multiple response patterns.

```typescript
const items = ensureArray(response.data);
// Safe to use array methods
items.map(item => item.id);
```

#### `safeMap(data, mapFn, defaultValue = [])`
Safely maps over data that might not be an array.

```typescript
const names = safeMap(response.data, user => user.name);
```

#### `safeFilter(data, filterFn, defaultValue = [])`
Safely filters data that might not be an array.

```typescript
const activeUsers = safeFilter(response.data, user => user.active);
```

#### `normalizeResponse(response)`
Normalizes any API response to consistent format.

```typescript
const { data, success, pagination } = normalizeResponse(response);
```

### 4. Migration Examples

#### Before (Unsafe):
```typescript
const { data: templateParts = [] } = useQuery({
  queryKey: ['template-parts'],
  queryFn: async () => {
    const response = await authClient.api.get('/template-parts');
    return response.data.data || response.data || [];
  }
});

// Later in component
{templateParts.map(part => <PartItem key={part.id} />)}
```

#### After (Safe):
```typescript
const { data: templateParts } = useSafeArrayQuery(
  ['template-parts'],
  () => authClient.api.get('/template-parts')
);

// Safe to use - always an array
{templateParts.map(part => <PartItem key={part.id} />)}
```

### 5. Component-Level Safety

If you can't refactor the data fetching, add safety at the component level:

```typescript
// Add safety check before mapping
{Array.isArray(data) && data.map(item => (
  <ItemComponent key={item.id} item={item} />
))}

// Or use the helper
{safeMap(data, item => (
  <ItemComponent key={item.id} item={item} />
))}
```

### 6. Testing for Safety

When testing API integrations:
1. Test with empty responses
2. Test with non-array data
3. Test with nested data structures
4. Test with missing data properties

```typescript
// Test various response formats
const testResponses = [
  { data: [] },
  { data: { data: [] } },
  { data: { data: { users: [] } } },
  { data: null },
  { data: "not an array" },
  undefined
];

testResponses.forEach(response => {
  const result = ensureArray(response?.data);
  expect(Array.isArray(result)).toBe(true);
});
```

## Best Practices

1. **Always validate array data** before using array methods
2. **Use TypeScript** to catch type mismatches at compile time
3. **Provide default values** for all data that will be mapped/filtered
4. **Use the safe helpers** instead of direct array operations on API data
5. **Normalize API responses** as early as possible in the data flow
6. **Document expected response formats** in API service files

## Common Patterns to Avoid

```typescript
// ❌ DON'T DO THIS
response.data.map(...)
response.data.data.map(...)
data?.map(...) // Still unsafe if data is not array

// ✅ DO THIS INSTEAD
ensureArray(response.data).map(...)
safeMap(response.data, ...)
Array.isArray(data) && data.map(...)
```

## Gradual Migration Strategy

1. **Phase 1**: Add safety checks to components showing errors
2. **Phase 2**: Update data fetching hooks to use safe versions
3. **Phase 3**: Refactor API service layer to normalize responses
4. **Phase 4**: Add TypeScript types for all API responses

## Emergency Fix

If you encounter a "map is not a function" error in production:

```typescript
// Quick fix - wrap with Array.isArray check
{Array.isArray(data) && data.map(item => <Item key={item.id} />)}

// Or use optional chaining with fallback
{(Array.isArray(data) ? data : []).map(item => <Item key={item.id} />)}
```

Remember: It's better to fix the root cause using the helpers than to add checks everywhere!