#!/bin/bash

# Convert affiliate module to partner module
# This script will copy affiliate files to partner directory and replace all affiliate terms with partner terms

set -e

SOURCE_DIR="/home/dev/o4o-platform/apps/api-server/src/modules/affiliate"
TARGET_DIR="/home/dev/o4o-platform/apps/api-server/src/modules/partner"

# Create target directory structure if it doesn't exist
mkdir -p "${TARGET_DIR}/controllers"
mkdir -p "${TARGET_DIR}/dto"
mkdir -p "${TARGET_DIR}/middleware"
mkdir -p "${TARGET_DIR}/repositories"
mkdir -p "${TARGET_DIR}/routes"
mkdir -p "${TARGET_DIR}/services"
mkdir -p "${TARGET_DIR}/utils"
mkdir -p "${TARGET_DIR}/validators"
mkdir -p "${TARGET_DIR}/websocket"

echo "Converting affiliate module files to partner module..."

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

# Convert all TypeScript files in the affiliate module
find "$SOURCE_DIR" -name "*.ts" -type f | while read -r file; do
    # Get relative path from source directory
    relative_path="${file#$SOURCE_DIR/}"
    
    # Convert affiliate to partner in filename
    partner_filename=$(echo "$relative_path" | sed -e 's/affiliate/partner/g' -e 's/Affiliate/Partner/g')
    
    # Full target path
    target_file="${TARGET_DIR}/${partner_filename}"
    
    # Create target directory if it doesn't exist
    target_dir=$(dirname "$target_file")
    mkdir -p "$target_dir"
    
    # Convert file content
    convert_file_content "$file" "$target_file"
done

echo "Conversion completed!"
echo "Created partner module at: $TARGET_DIR"
echo ""
echo "Files converted:"
find "$TARGET_DIR" -name "*.ts" -type f | wc -l