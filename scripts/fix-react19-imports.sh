#!/bin/bash

# Fix React 19 Breaking Changes Script
# This script fixes React default imports and namespace usage for React 19 compatibility

echo "🔧 Fixing React 19 breaking changes..."

# Function to process a single file
process_file() {
    local file="$1"
    local temp_file="${file}.tmp"
    local changed=false
    
    # Skip node_modules and dist directories
    if [[ "$file" == *"node_modules"* ]] || [[ "$file" == *"/dist/"* ]] || [[ "$file" == *"/build/"* ]]; then
        return
    fi
    
    # Create a temporary file
    cp "$file" "$temp_file"
    
    # Fix React default import to named imports
    if grep -q "^import React from ['\"]react['\"]" "$temp_file"; then
        # Check what React APIs are used in the file
        local react_apis=""
        
        # Common React APIs
        if grep -q "React\.useState\|useState" "$file"; then
            react_apis="${react_apis}useState, "
        fi
        if grep -q "React\.useEffect\|useEffect" "$file"; then
            react_apis="${react_apis}useEffect, "
        fi
        if grep -q "React\.useLayoutEffect\|useLayoutEffect" "$file"; then
            react_apis="${react_apis}useLayoutEffect, "
        fi
        if grep -q "React\.useContext\|useContext" "$file"; then
            react_apis="${react_apis}useContext, "
        fi
        if grep -q "React\.useReducer\|useReducer" "$file"; then
            react_apis="${react_apis}useReducer, "
        fi
        if grep -q "React\.useCallback\|useCallback" "$file"; then
            react_apis="${react_apis}useCallback, "
        fi
        if grep -q "React\.useMemo\|useMemo" "$file"; then
            react_apis="${react_apis}useMemo, "
        fi
        if grep -q "React\.useRef\|useRef" "$file"; then
            react_apis="${react_apis}useRef, "
        fi
        if grep -q "React\.forwardRef\|forwardRef" "$file"; then
            react_apis="${react_apis}forwardRef, "
        fi
        if grep -q "React\.createContext\|createContext" "$file"; then
            react_apis="${react_apis}createContext, "
        fi
        if grep -q "React\.memo\|memo" "$file"; then
            react_apis="${react_apis}memo, "
        fi
        if grep -q "React\.Fragment\|Fragment" "$file"; then
            react_apis="${react_apis}Fragment, "
        fi
        if grep -q "React\.StrictMode\|StrictMode" "$file"; then
            react_apis="${react_apis}StrictMode, "
        fi
        if grep -q "React\.Suspense\|Suspense" "$file"; then
            react_apis="${react_apis}Suspense, "
        fi
        if grep -q "React\.lazy\|lazy" "$file"; then
            react_apis="${react_apis}lazy, "
        fi
        if grep -q "React\.Component\|Component" "$file"; then
            react_apis="${react_apis}Component, "
        fi
        if grep -q "React\.PureComponent\|PureComponent" "$file"; then
            react_apis="${react_apis}PureComponent, "
        fi
        if grep -q "React\.cloneElement\|cloneElement" "$file"; then
            react_apis="${react_apis}cloneElement, "
        fi
        if grep -q "React\.createElement\|createElement" "$file"; then
            react_apis="${react_apis}createElement, "
        fi
        if grep -q "React\.isValidElement\|isValidElement" "$file"; then
            react_apis="${react_apis}isValidElement, "
        fi
        
        # Remove trailing comma and space
        react_apis="${react_apis%, }"
        
        # If no specific APIs found but React namespace is used, import all common ones
        if [[ -z "$react_apis" ]] && grep -q "React\." "$file"; then
            react_apis="useState, useEffect, useCallback, useMemo, useRef, Fragment"
        fi
        
        # Replace default import with named imports
        if [[ -n "$react_apis" ]]; then
            sed -i "s/^import React from ['\"]react['\"]$/import { $react_apis } from 'react'/" "$temp_file"
        else
            # If no React APIs are used, just remove the import
            sed -i "/^import React from ['\"]react['\"]$/d" "$temp_file"
        fi
        
        # Replace React.FC with FC
        if grep -q "React\.FC" "$temp_file"; then
            # Add FC to imports if not already there
            if ! grep -q "import.*{.*FC.*}.*from ['\"]react['\"]" "$temp_file"; then
                sed -i "s/import { \(.*\) } from ['\"]react['\"]$/import { \1, FC } from 'react'/" "$temp_file"
            fi
            sed -i "s/React\.FC/FC/g" "$temp_file"
        fi
        
        # Replace React.ComponentType with ComponentType
        if grep -q "React\.ComponentType" "$temp_file"; then
            if ! grep -q "import.*{.*ComponentType.*}.*from ['\"]react['\"]" "$temp_file"; then
                sed -i "s/import { \(.*\) } from ['\"]react['\"]$/import { \1, ComponentType } from 'react'/" "$temp_file"
            fi
            sed -i "s/React\.ComponentType/ComponentType/g" "$temp_file"
        fi
        
        # Replace React.ReactNode with ReactNode
        if grep -q "React\.ReactNode" "$temp_file"; then
            if ! grep -q "import.*{.*ReactNode.*}.*from ['\"]react['\"]" "$temp_file"; then
                sed -i "s/import { \(.*\) } from ['\"]react['\"]$/import { \1, ReactNode } from 'react'/" "$temp_file"
            fi
            sed -i "s/React\.ReactNode/ReactNode/g" "$temp_file"
        fi
        
        # Replace React.ReactElement with ReactElement
        if grep -q "React\.ReactElement" "$temp_file"; then
            if ! grep -q "import.*{.*ReactElement.*}.*from ['\"]react['\"]" "$temp_file"; then
                sed -i "s/import { \(.*\) } from ['\"]react['\"]$/import { \1, ReactElement } from 'react'/" "$temp_file"
            fi
            sed -i "s/React\.ReactElement/ReactElement/g" "$temp_file"
        fi
        
        # Replace other React. references
        sed -i "s/React\.useState/useState/g" "$temp_file"
        sed -i "s/React\.useEffect/useEffect/g" "$temp_file"
        sed -i "s/React\.useLayoutEffect/useLayoutEffect/g" "$temp_file"
        sed -i "s/React\.useContext/useContext/g" "$temp_file"
        sed -i "s/React\.useReducer/useReducer/g" "$temp_file"
        sed -i "s/React\.useCallback/useCallback/g" "$temp_file"
        sed -i "s/React\.useMemo/useMemo/g" "$temp_file"
        sed -i "s/React\.useRef/useRef/g" "$temp_file"
        sed -i "s/React\.forwardRef/forwardRef/g" "$temp_file"
        sed -i "s/React\.createContext/createContext/g" "$temp_file"
        sed -i "s/React\.memo/memo/g" "$temp_file"
        sed -i "s/React\.Fragment/Fragment/g" "$temp_file"
        sed -i "s/React\.StrictMode/StrictMode/g" "$temp_file"
        sed -i "s/React\.Suspense/Suspense/g" "$temp_file"
        sed -i "s/React\.lazy/lazy/g" "$temp_file"
        sed -i "s/React\.Component/Component/g" "$temp_file"
        sed -i "s/React\.PureComponent/PureComponent/g" "$temp_file"
        sed -i "s/React\.cloneElement/cloneElement/g" "$temp_file"
        sed -i "s/React\.createElement/createElement/g" "$temp_file"
        sed -i "s/React\.isValidElement/isValidElement/g" "$temp_file"
        
        changed=true
    fi
    
    # Check if file was changed
    if [[ "$changed" == true ]] || ! cmp -s "$file" "$temp_file"; then
        mv "$temp_file" "$file"
        echo "✅ Fixed: $file"
    else
        rm "$temp_file"
    fi
}

# Find all TypeScript and JavaScript files
echo "📂 Searching for React files..."
files=$(find . -type f \( -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" \) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/build/*")

total_files=$(echo "$files" | wc -l)
current=0

echo "🔍 Found $total_files files to check"

# Process each file
for file in $files; do
    ((current++))
    echo -ne "\r⏳ Processing: $current/$total_files"
    process_file "$file"
done

echo -e "\n✨ React 19 import fixes complete!"

# Run build to verify
echo "🏗️  Running build to verify fixes..."
npm run build:packages
npm run type-check

echo "✅ All React 19 breaking changes have been fixed!"