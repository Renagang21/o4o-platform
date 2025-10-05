#!/bin/bash

# Convert main-site affiliate components to partner components
set -e

# Main site directories
MAIN_SOURCE_DIR="/home/dev/o4o-platform/apps/main-site/src"
MAIN_AFFILIATE_COMPONENTS_DIR="${MAIN_SOURCE_DIR}/components/affiliate"
MAIN_PARTNER_COMPONENTS_DIR="${MAIN_SOURCE_DIR}/components/partner"

# Create target directory
mkdir -p "$MAIN_PARTNER_COMPONENTS_DIR"

echo "Converting main-site affiliate components to partner components..."

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

# Convert affiliate components
if [ -d "$MAIN_AFFILIATE_COMPONENTS_DIR" ]; then
    echo "Converting main-site affiliate components..."
    find "$MAIN_AFFILIATE_COMPONENTS_DIR" -name "*.tsx" -o -name "*.ts" | while read -r file; do
        filename=$(basename "$file")
        partner_filename=$(echo "$filename" | sed -e 's/Affiliate/Partner/g' -e 's/affiliate/partner/g')
        target_file="${MAIN_PARTNER_COMPONENTS_DIR}/${partner_filename}"
        convert_file_content "$file" "$target_file"
    done
fi

# Convert affiliate dashboard page
if [ -f "${MAIN_SOURCE_DIR}/pages/AffiliateDashboard.tsx" ]; then
    echo "Converting affiliate dashboard page..."
    convert_file_content "${MAIN_SOURCE_DIR}/pages/AffiliateDashboard.tsx" "${MAIN_SOURCE_DIR}/pages/PartnerDashboard.tsx"
fi

echo "Main-site conversion completed!"
echo ""
echo "Created partner components at: $MAIN_PARTNER_COMPONENTS_DIR"