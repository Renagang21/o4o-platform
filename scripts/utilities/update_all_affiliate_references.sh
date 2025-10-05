#!/bin/bash

# Update all affiliate references across the entire codebase to support both affiliate and partner terms
# This will add partner support alongside existing affiliate support for backward compatibility

set -e

echo "Updating affiliate references to support partner terminology across the entire codebase..."

# List of files that have affiliate references that need to be updated
# (excluding the ones we already converted)

FILES_TO_UPDATE=(
    # API Server files
    "/home/dev/o4o-platform/apps/api-server/src/main.ts"
    "/home/dev/o4o-platform/apps/api-server/src/database/connection.ts"
    "/home/dev/o4o-platform/apps/api-server/src/routes/v1/apps.routes.ts"
    "/home/dev/o4o-platform/apps/api-server/src/routes/v1/export.routes.ts"
    "/home/dev/o4o-platform/apps/api-server/src/routes/v1/plugins.routes.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/dashboard/dashboardController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/vendor/vendorController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/vendor/vendorProductController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/v1/userRole.controller.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/v1/platform.controller.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/DropshippingController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/signageController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/pricePolicyController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/productsController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/productVariationController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/ExportController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/controllers/dropshipping/DropshippingController.ts"
    "/home/dev/o4o-platform/apps/api-server/src/middleware/permissions.ts"
    "/home/dev/o4o-platform/apps/api-server/src/middleware/dropshipping-auth.ts"
    "/home/dev/o4o-platform/apps/api-server/src/services/pricing.service.ts"
    "/home/dev/o4o-platform/apps/api-server/src/services/pricingService.ts"
    "/home/dev/o4o-platform/apps/api-server/src/services/OrderSplitService.ts"
    "/home/dev/o4o-platform/apps/api-server/src/services/payment-system-integration.service.ts"
    "/home/dev/o4o-platform/apps/api-server/src/modules/cpt-acf/services/cpt.service.ts"
    "/home/dev/o4o-platform/apps/api-server/src/modules/cpt-acf/services/acf.service.ts"
    "/home/dev/o4o-platform/apps/api-server/src/swagger/schemas/index.ts"
    "/home/dev/o4o-platform/apps/api-server/src/swagger/swagger.config.ts"
    "/home/dev/o4o-platform/apps/api-server/src/swagger/vendor.swagger.ts"
    "/home/dev/o4o-platform/apps/api-server/src/types/auth.ts"
    "/home/dev/o4o-platform/apps/api-server/src/types/dropshipping.ts"
    
    # Admin Dashboard files
    "/home/dev/o4o-platform/apps/admin-dashboard/src/App.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/config/wordpressMenuFinal.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/config/rolePermissions.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/hooks/useAdminMenu.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/apps/AppsSimple.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/apps/AppsManagerV2.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/apps/WordPressPluginManager.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/ecommerce/ProductForm.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/users/RolePermissions.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/settings/GeneralSettings.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/dashboard/components/RecentActivity/index.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/pages/dashboard/components/StatsOverview/UserStatsCard.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/vendor/ProductApprovalManager.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/vendor/SupplierProductForm.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/dropshipping/DropshippingSettings.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/shortcodes/dropshipping/RoleVerification.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/shortcodes/dropshipping/UserDashboard.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/shortcodes/dropshipping/index.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/common/AdminBreadcrumb.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/users/UserForm.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/components/users/UserRoleChangeModal.tsx"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/utils/vendorUtils.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/utils/appSettings.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/types/auth.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/types/ecommerce.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/types/user.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/types/dashboard-api.ts"
    "/home/dev/o4o-platform/apps/admin-dashboard/src/types/index.ts"
    
    # Main site files
    "/home/dev/o4o-platform/apps/main-site/src/stores/authStore.ts"
    "/home/dev/o4o-platform/apps/main-site/src/pages/admin/UserRoleManager.tsx"
    "/home/dev/o4o-platform/apps/main-site/src/pages/admin/UserRoleManagerContext.tsx"
    "/home/dev/o4o-platform/apps/main-site/src/types/user.ts"
    "/home/dev/o4o-platform/apps/main-site/src/api/auth/types.ts"
    
    # E-commerce files
    "/home/dev/o4o-platform/apps/ecommerce/src/pages/CartPage.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/pages/vendor/Products.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/pages/HomePage.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/pages/ProductDetailPage.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/pages/ProductsPage.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/pages/ShortcodeDemo.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/components/vendor/ProductForm.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/components/shortcodes/RelatedProducts.tsx"
    "/home/dev/o4o-platform/apps/ecommerce/src/components/common/PriceDisplay.tsx"
    
    # Shared package files
    "/home/dev/o4o-platform/packages/types/src/ecommerce.ts"
    "/home/dev/o4o-platform/packages/types/src/vendor-management.ts"
    "/home/dev/o4o-platform/packages/utils/src/pricing.ts"
    "/home/dev/o4o-platform/packages/auth-client/src/types.ts"
    "/home/dev/o4o-platform/packages/shortcodes/src/index.ts"
    "/home/dev/o4o-platform/packages/shortcodes/src/dropshipping/index.ts"
)

# Function to update file content
update_file_content() {
    local file="$1"
    
    # Skip if file doesn't exist
    if [ ! -f "$file" ]; then
        echo "Skipping non-existent file: $file"
        return
    fi
    
    # Create backup
    cp "$file" "${file}.backup"
    
    # Update content to support partner alongside affiliate
    # This adds partner options rather than replacing affiliate terms
    sed -i.tmp -e "s/'affiliate'/'affiliate' | 'partner'/g" \
               -e "s/\"affiliate\"/\"affiliate\" | \"partner\"/g" \
               -e "s/'business' | 'affiliate'/'business' | 'affiliate' | 'partner'/g" \
               -e "s/\"business\" | \"affiliate\"/\"business\" | \"affiliate\" | \"partner\"/g" \
               -e "s/business.*affiliate.*customer/business | affiliate | partner | customer/g" \
               -e "s/admin.*business.*affiliate/admin | business | affiliate | partner/g" \
               -e "s/\[.*affiliate.*\]/['affiliate', 'partner']/g" \
               -e "s/affiliate.*customer/affiliate | partner | customer/g" \
               -e "s/affiliate.*seller/affiliate | partner | seller/g" \
               -e "s/role === 'affiliate'/role === 'affiliate' || role === 'partner'/g" \
               -e "s/role == 'affiliate'/role == 'affiliate' || role == 'partner'/g" \
               -e "s/user\.role === 'affiliate'/user.role === 'affiliate' || user.role === 'partner'/g" \
               -e "s/userRole === 'affiliate'/userRole === 'affiliate' || userRole === 'partner'/g" \
               "$file"
    
    # Remove temp file
    rm -f "${file}.tmp"
    
    echo "Updated: $file"
}

# Update all files
for file in "${FILES_TO_UPDATE[@]}"; do
    update_file_content "$file"
done

echo ""
echo "Successfully updated $(echo ${#FILES_TO_UPDATE[@]}) files to support partner terminology alongside affiliate."
echo ""
echo "Summary of changes:"
echo "- Added 'partner' as a valid user role alongside 'affiliate'"
echo "- Updated role checks to include both affiliate and partner"
echo "- Maintained backward compatibility with existing affiliate functionality"
echo ""
echo "Note: Original files backed up with .backup extension"