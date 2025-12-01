# O4O Platform Integration Extension

This VS Code extension integrates the O4O Platform with your development workflow, allowing you to convert React/Tailwind code directly into O4O Blocks and save them to the platform.

## Features

- **Authentication**: Log in to the O4O Platform using your email and password.
- **Conversion**: Automatically convert React JSX code with Tailwind CSS classes into O4O Block JSON structure.
- **Save to Platform**: Upload the converted blocks as a new Page directly to the O4O CMS.
- **Custom Code Support**: Handles complex or unknown components by wrapping them in `o4o/custom-code` blocks.

## Installation

> **Note**: Due to build environment issues, the `.vsix` file could not be generated automatically. Please build manually.

1.  Open this directory in VS Code.
2.  Run `npm install` to install dependencies.
3.  Press `F5` to launch the Extension Development Host.

## Usage Guide

### 1. Login
1.  Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2.  Run **`O4O: Login and Authenticate`**.
3.  Enter your O4O Email and Password.
4.  Upon success, your JWT token is securely stored.

### 2. Convert & Save Page
1.  Open a file containing React/Tailwind code.
2.  Select the JSX code you want to convert.
    *   *Example:*
        ```tsx
        <div className="p-4 bg-white">
          <h1 className="text-2xl text-blue-600">Hello O4O</h1>
          <p className="text-gray-500">Converted content.</p>
        </div>
        ```
3.  Run **`O4O: Convert & Save Page`**.
4.  Enter a **Title** for the new page.
5.  Enter a **Slug** (optional, defaults to title).
6.  The extension will parse the code, map it to blocks, and upload it.
7.  Check the O4O Admin Dashboard to see your new page.

## Supported Mappings

| HTML Tag | Tailwind Class | O4O Block | Attributes |
| :--- | :--- | :--- | :--- |
| `h1`-`h6` | `text-2xl`, etc. | `o4o/heading` | `level`, `fontSize`, `textColor` |
| `p` | `text-gray-500` | `o4o/paragraph` | `content`, `textColor`, `fontSize` |
| `img` | - | `o4o/image` | `url`, `alt` |
| `button` | `bg-blue-500` | `o4o/button` | `text`, `backgroundColor` |
| `div` | `grid` | `o4o/columns` | `innerBlocks` |
| `div` | `flex`, etc. | `o4o/group` | `innerBlocks` |
| *Other* | - | `o4o/custom-code`| `html`, `css`, `javascript` |

## Troubleshooting

- **"Maximum call stack size exceeded" during install**: This is a known environment issue. Try using `pnpm` or cleaning cache.
- **Login Failed**: Check your internet connection and credentials.
