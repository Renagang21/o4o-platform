#!/bin/bash

# Convert admin dashboard affiliate components to partner components
set -e

# Admin Dashboard directories
ADMIN_SOURCE_DIR="/home/dev/o4o-platform/apps/admin-dashboard/src"
ADMIN_AFFILIATE_PAGES_DIR="${ADMIN_SOURCE_DIR}/pages/affiliate"
ADMIN_AFFILIATE_COMPONENTS_DIR="${ADMIN_SOURCE_DIR}/components/affiliate"
ADMIN_AFFILIATE_SHORTCODE_DIR="${ADMIN_SOURCE_DIR}/components/shortcodes/dropshipping/affiliate"

ADMIN_PARTNER_PAGES_DIR="${ADMIN_SOURCE_DIR}/pages/partner"
ADMIN_PARTNER_COMPONENTS_DIR="${ADMIN_SOURCE_DIR}/components/partner"
ADMIN_PARTNER_SHORTCODE_DIR="${ADMIN_SOURCE_DIR}/components/shortcodes/dropshipping/partner"

# Create target directories
mkdir -p "$ADMIN_PARTNER_PAGES_DIR"
mkdir -p "$ADMIN_PARTNER_COMPONENTS_DIR"
mkdir -p "$ADMIN_PARTNER_SHORTCODE_DIR"

echo "Converting admin dashboard affiliate components to partner components..."

# Function to convert file content from affiliate to partner terms
convert_file_content() {
    local source_file="$1"
    local target_file="$2"
    
    # Copy file and replace all affiliate terms with partner terms
    sed -e 's/affiliate/partner/g' \
        -e 's/Affiliate/Partner/g' \
        -e 's/AFFILIATE/PARTNER/g' \
        -e 's/affiliates/partners/g' \
        -e 's/Affiliates/Partners/g' \
        -e 's/AFFILIATES/PARTNERS/g' \
        -e 's/제휴/파트너/g' \
        -e 's/제휴자/파트너/g' \
        -e 's/제휴마케팅/파트너 마케팅/g' \
        "$source_file" > "$target_file"
        
    echo "Converted: $(basename "$source_file") -> $(basename "$target_file")"
}

# Convert affiliate pages
if [ -d "$ADMIN_AFFILIATE_PAGES_DIR" ]; then
    echo "Converting affiliate pages..."
    find "$ADMIN_AFFILIATE_PAGES_DIR" -name "*.tsx" -o -name "*.ts" | while read -r file; do
        filename=$(basename "$file")
        partner_filename=$(echo "$filename" | sed -e 's/Affiliate/Partner/g' -e 's/affiliate/partner/g')
        target_file="${ADMIN_PARTNER_PAGES_DIR}/${partner_filename}"
        convert_file_content "$file" "$target_file"
    done
fi

# Convert affiliate components
if [ -d "$ADMIN_AFFILIATE_COMPONENTS_DIR" ]; then
    echo "Converting affiliate components..."
    find "$ADMIN_AFFILIATE_COMPONENTS_DIR" -name "*.tsx" -o -name "*.ts" | while read -r file; do
        filename=$(basename "$file")
        partner_filename=$(echo "$filename" | sed -e 's/Affiliate/Partner/g' -e 's/affiliate/partner/g')
        target_file="${ADMIN_PARTNER_COMPONENTS_DIR}/${partner_filename}"
        convert_file_content "$file" "$target_file"
    done
fi

# Convert affiliate shortcode components
if [ -d "$ADMIN_AFFILIATE_SHORTCODE_DIR" ]; then
    echo "Converting affiliate shortcode components..."
    find "$ADMIN_AFFILIATE_SHORTCODE_DIR" -name "*.tsx" -o -name "*.ts" | while read -r file; do
        relative_path="${file#$ADMIN_AFFILIATE_SHORTCODE_DIR/}"
        partner_filename=$(echo "$relative_path" | sed -e 's/Affiliate/Partner/g' -e 's/affiliate/partner/g')
        target_file="${ADMIN_PARTNER_SHORTCODE_DIR}/${partner_filename}"
        
        # Create target directory if needed
        target_dir=$(dirname "$target_file")
        mkdir -p "$target_dir"
        
        convert_file_content "$file" "$target_file"
    done
fi

# Convert affiliate API file
if [ -f "${ADMIN_SOURCE_DIR}/api/affiliate.ts" ]; then
    echo "Converting affiliate API file..."
    convert_file_content "${ADMIN_SOURCE_DIR}/api/affiliate.ts" "${ADMIN_SOURCE_DIR}/api/partner.ts"
fi

# Convert affiliate utils file
if [ -f "${ADMIN_SOURCE_DIR}/utils/affiliateTrackingUtils.ts" ]; then
    echo "Converting affiliate tracking utils..."
    convert_file_content "${ADMIN_SOURCE_DIR}/utils/affiliateTrackingUtils.ts" "${ADMIN_SOURCE_DIR}/utils/partnerTrackingUtils.ts"
fi

echo "Admin dashboard conversion completed!"
echo ""
echo "Created partner components at:"
echo "- Pages: $ADMIN_PARTNER_PAGES_DIR"
echo "- Components: $ADMIN_PARTNER_COMPONENTS_DIR"
echo "- Shortcodes: $ADMIN_PARTNER_SHORTCODE_DIR"