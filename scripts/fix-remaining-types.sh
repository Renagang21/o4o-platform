#!/bin/bash

echo "Fixing remaining type issues..."

# Fix MediaLibrary.tsx
sed -i '1s/.*import.*FC.*react.*/import { FC, Fragment } from '\''react'\'';/' apps/admin-dashboard/src/components/media/MediaLibrary.tsx
sed -i 's/React\.Fragment/Fragment/g' apps/admin-dashboard/src/components/media/MediaLibrary.tsx

# Fix AtAGlance.tsx
cat > apps/admin-dashboard/src/pages/dashboard/components/AtAGlance.tsx << 'EOF'
import { FC } from 'react';
import { FileText, Users, MessageSquare, ShoppingBag, ShoppingCart, Layout } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';

interface AtAGlanceData {
  posts: number;
  pages: number;
  comments: number;
  users: number;
  products: number;
  orders: number;
}

export const AtAGlance: FC = () => {
  const data: AtAGlanceData = {
    posts: 0,
    pages: 0,
    comments: 0,
    users: 0,
    products: 0,
    orders: 0,
  };

  const items = [
    {
      icon: FileText,
      label: '게시글',
      value: data.posts,
      link: '/content/posts',
      color: 'text-blue-600',
    },
    {
      icon: Layout,
      label: '페이지',
      value: data.pages,
      link: '/content/pages',
      color: 'text-green-600',
    },
    {
      icon: MessageSquare,
      label: '댓글',
      value: data.comments,
      link: '/comments',
      color: 'text-orange-600',
    },
    {
      icon: Users,
      label: '사용자',
      value: data.users,
      link: '/users',
      color: 'text-purple-600',
    },
    {
      icon: ShoppingBag,
      label: '상품',
      value: data.products,
      link: '/ecommerce/products',
      color: 'text-red-600',
    },
    {
      icon: ShoppingCart,
      label: '주문',
      value: data.orders,
      link: '/ecommerce/orders',
      color: 'text-indigo-600',
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold mb-4">At a Glance</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                to={item.link}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <Icon className={`w-8 h-8 ${item.color}`} />
                <div>
                  <p className="text-2xl font-bold">{item.value}</p>
                  <p className="text-sm text-gray-500">{item.label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
EOF

# Fix ActivityFeed type issues
sed -i 's/activity.type/activity?.type || ""/g' apps/admin-dashboard/src/pages/dashboard/components/ActivityFeed/index.tsx
sed -i 's/activity.id/activity?.id || ""/g' apps/admin-dashboard/src/pages/dashboard/components/ActivityFeed/index.tsx

# Fix ResponsiveImage objectFit
sed -i 's/objectFit: objectFit/objectFit: objectFit as any/g' apps/admin-dashboard/src/pages/media/components/ResponsiveImage.tsx
sed -i 's/loading: loading/loading: loading as "lazy" | "eager" | undefined/g' apps/admin-dashboard/src/pages/media/components/ResponsiveImage.tsx

# Fix template/BlockEditor spacing type
sed -i '/^interface SpacingControlProps/,/^}/d' apps/admin-dashboard/src/components/template/BlockEditor.tsx
cat >> apps/admin-dashboard/src/components/template/BlockEditor.tsx << 'EOF'

interface SpacingValue {
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
}

interface SpacingControlProps {
  label: string;
  value: SpacingValue;
  onChange: (value: SpacingValue) => void;
}
EOF

# Fix button size/variant issues in components
find apps/admin-dashboard/src -name "*.tsx" -type f | xargs sed -i 's/size="sm"/size={"sm" as const}/g'
find apps/admin-dashboard/src -name "*.tsx" -type f | xargs sed -i 's/size="icon"/size={"icon" as const}/g'
find apps/admin-dashboard/src -name "*.tsx" -type f | xargs sed -i 's/variant="outline"/variant={"outline" as const}/g'
find apps/admin-dashboard/src -name "*.tsx" -type f | xargs sed -i 's/variant="ghost"/variant={"ghost" as const}/g'

echo "Remaining type fixes complete!"