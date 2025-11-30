# O4O Platform Integration Extension

AI-powered React to O4O Block converter and page creator for VS Code.

## Features

- **JWT Authentication**: Secure login to O4O Platform
- **React → Block Conversion**: Automatically converts React/Tailwind JSX to O4O blocks
- **Page Creation**: Creates pages directly in O4O Platform from your IDE
- **Smart Mapping**: Maps 31+ O4O block types from React components
- **Placeholder Handling**: Unmappable custom components saved as placeholders for manual review

## Supported O4O Blocks

### Text Blocks
- Heading (h1-h6)
- Paragraph
- List (ul, ol)
- Quote (blockquote)

### Media Blocks
- Image

### Layout Blocks
- Columns (grid layouts)
- Group (flex/div containers)

### Design Blocks
- Button

### Custom Components
- Unmappable components → `o4o/placeholder` (with original JSX preserved)

## Installation

### From .vsix File
1. Download `o4o-integration-1.0.0.vsix`
2. Open VS Code
3. Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
4. Type "Install from VSIX"
5. Select the downloaded `.vsix` file

### From Source
```bash
cd extensions/o4o-integration
npm install
npm run compile
```

## Usage

### 1. Login to O4O Platform

1. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
2. Type "O4O: Login"
3. Enter your email and password

### 2. Convert JSX to O4O Page

1. Open a `.jsx` or `.tsx` file with React code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
3. Type "O4O: Convert & Save Page"
4. Enter a page title
5. Wait for conversion and page creation
6. Click "Open in Browser" to view the created page

## Example

**Input (JSX):**
```jsx
<div className="container">
  <h1 className="text-3xl text-center">AI Generated Page</h1>
  <p className="text-lg text-gray-600">This is a paragraph.</p>
  <div className="grid grid-cols-2 gap-4">
    <div className="p-4 bg-blue-100">Column 1</div>
    <div className="p-4 bg-green-100">Column 2</div>
  </div>
  <button className="px-6 py-3 bg-blue-600 text-white rounded-lg">
    Click Me
  </button>
</div>
```

**Output (O4O Blocks):**
- Group container
  - Heading (level 1, center aligned)
  - Paragraph (18px, gray text)
  - Columns (2 columns)
    - Column 1 (Group with blue background)
    - Column 2 (Group with green background)
  - Button (blue background, white text, rounded)

## Tailwind Class Support

The extension automatically parses common Tailwind utility classes:

- **Typography**: `text-xs`, `text-sm`, `text-lg`, `text-xl`, etc.
- **Colors**: `text-blue-600`, `bg-gray-100`, etc.
- **Spacing**: `p-4`, `px-6`, `py-3`, `gap-4`, etc.
- **Layout**: `flex`, `grid`, `grid-cols-3`, `gap-4`, etc.
- **Alignment**: `text-center`, `justify-center`, `items-center`, etc.
- **Borders**: `rounded`, `rounded-lg`, `rounded-full`, etc.

## Limitations

1. **Custom Components**: Components not mappable to O4O blocks are saved as placeholders
2. **Complex Logic**: Only static JSX structure is converted (no state/props evaluation)
3. **Inline Styles**: Only Tailwind classes are parsed (inline styles ignored)
4. **Authentication**: Requires valid O4O Platform account

## Troubleshooting

### "Not authenticated. Please login first."
- Run `O4O: Login` command and enter your credentials

### "No JSX elements found in the file."
- Ensure your file contains valid JSX code
- Check for syntax errors

### "Failed to create page: ..."
- Check your internet connection
- Verify your O4O Platform account is active
- Ensure API server is running

### Placeholder Blocks Created
- Custom components that don't map to O4O blocks are saved as placeholders
- Review placeholders in O4O Admin Dashboard
- Manually replace with appropriate O4O blocks

## API Endpoints

- **Base URL**: `https://api.neture.co.kr`
- **Login**: `POST /api/v1/auth/login`
- **Create Page**: `POST /api/admin/pages`

## Development

### Build
```bash
npm run compile
```

### Watch Mode
```bash
npm run watch
```

### Package
```bash
npm run package
```

## Reference

Based on **O4O Platform Integration Spec v1.0.0**

## License

MIT

## Support

For issues or questions, contact: dev@neture.co.kr
