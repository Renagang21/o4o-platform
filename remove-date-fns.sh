#!/bin/bash

# Remove date-fns imports and related code
echo "Removing date-fns dependencies..."

# List of files that use date-fns
FILES=(
  "apps/admin-dashboard/src/pages/content/PostForm.tsx"
  "apps/admin-dashboard/src/pages/users/UserListEnhanced.tsx"
  "apps/admin-dashboard/src/pages/users/UserList.tsx"
  "apps/admin-dashboard/src/pages/users/UserDetail.tsx"
  "apps/admin-dashboard/src/pages/Users/UserList.tsx"
  "apps/admin-dashboard/src/pages/Users/UserDetail.tsx"
  "apps/admin-dashboard/src/pages/forms/FormList.tsx"
  "apps/admin-dashboard/src/pages/forms/FormSubmissions.tsx"
  "apps/admin-dashboard/src/pages/dashboard/DashboardSimple.tsx"
  "apps/admin-dashboard/src/pages/pages/Pages.tsx"
  "apps/admin-dashboard/src/pages/ecommerce/Orders.tsx"
  "apps/admin-dashboard/src/pages/ecommerce/OrderDetail.tsx"
  "apps/admin-dashboard/src/hooks/useDashboardStats.ts"
  "apps/admin-dashboard/src/components/media/MediaLibraryModal.tsx"
  "apps/admin-dashboard/src/components/shortcodes/dropshipping/affiliate/PayoutRequests.tsx"
  "apps/admin-dashboard/src/components/shortcodes/dropshipping/affiliate/CommissionDashboard.tsx"
  "apps/admin-dashboard/src/components/shortcodes/dropshipping/supplier/OrderManagement.tsx"
  "apps/admin-dashboard/src/components/dashboard/ActivityWidget.tsx"
)

# Comment out date-fns imports
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."
    # Comment out date-fns import lines
    sed -i "s/^import.*from 'date-fns.*$/\/\/ &/" "$file"
    # Comment out format() and formatDistanceToNow() function calls
    sed -i "s/format(.*)/'\/* date removed *\/'/" "$file"
    sed -i "s/formatDistanceToNow(.*)/'\/* date removed *\/'/" "$file"
  fi
done

echo "Date-fns removal complete!"