import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ResponsiveImage from './ResponsiveImage';
import { Image, Video, Music, FileText, File, Check } from 'lucide-react';
const MediaItem = ({ item, view, isSelected, onSelect }) => {
    const getFileIcon = () => {
        switch (item.type) {
            case 'image':
                return _jsx(Image, { className: "w-8 h-8 text-blue-500" });
            case 'video':
                return _jsx(Video, { className: "w-8 h-8 text-purple-500" });
            case 'audio':
                return _jsx(Music, { className: "w-8 h-8 text-green-500" });
            case 'document':
                return _jsx(FileText, { className: "w-8 h-8 text-orange-500" });
            default:
                return _jsx(File, { className: "w-8 h-8 text-gray-500" });
        }
    };
    if (view === 'list') {
        return (_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded overflow-hidden bg-gray-100 flex-shrink-0", children: item.type === 'image' ? (_jsx(ResponsiveImage, { mediaId: item.id, alt: item.altText || item.name, width: 48, height: 48, className: "w-full h-full object-cover" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center", children: getFileIcon() })) }), _jsxs("div", { className: "min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 truncate", children: item.name }), item.altText && (_jsx("p", { className: "text-xs text-gray-500 truncate", children: item.altText }))] })] }));
    }
    return (_jsxs("div", { className: `relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${isSelected
            ? 'border-blue-500 ring-2 ring-blue-200'
            : 'border-gray-200 hover:border-gray-300'}`, onClick: onSelect, children: [_jsx("div", { className: `absolute top-2 left-2 z-10 ${isSelected || 'group-hover:opacity-100 opacity-0'} transition-opacity`, children: _jsx("div", { className: `w-6 h-6 rounded border-2 ${isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : 'bg-white border-gray-300'} flex items-center justify-center`, children: isSelected && _jsx(Check, { className: "w-4 h-4 text-white" }) }) }), _jsx("div", { className: "aspect-square bg-gray-100", children: item.type === 'image' ? (_jsx(ResponsiveImage, { mediaId: item.id, alt: item.altText || item.name, className: "w-full h-full object-cover", sizes: "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw" })) : (_jsx("div", { className: "w-full h-full flex items-center justify-center", children: getFileIcon() })) }), _jsxs("div", { className: "p-2 bg-white", children: [_jsx("p", { className: "text-xs font-medium text-gray-900 truncate", children: item.name }), item.altText && (_jsx("p", { className: "text-xs text-gray-500 truncate mt-1", children: item.altText }))] }), _jsx("div", { className: `absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all pointer-events-none` })] }));
};
export default MediaItem;
//# sourceMappingURL=MediaItem.js.map