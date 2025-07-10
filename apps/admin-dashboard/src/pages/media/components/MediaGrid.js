import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import MediaItem from './MediaItem';
const MediaGrid = ({ files, selectedFiles, onFileSelect, onSelectAll }) => {
    const allSelected = files.length > 0 && files.every(file => selectedFiles.includes(file.id));
    return (_jsxs("div", { className: "p-6", children: [_jsx("div", { className: "mb-4", children: _jsxs("label", { className: "flex items-center gap-2 text-sm text-gray-600", children: [_jsx("input", { type: "checkbox", checked: allSelected, onChange: onSelectAll, className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }), allSelected ? '모두 선택 해제' : '모두 선택'] }) }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4", children: files.map((file) => (_jsx(MediaItem, { item: file, view: "grid", isSelected: selectedFiles.includes(file.id), onSelect: () => onFileSelect(file.id) }, file.id))) }), files.length === 0 && (_jsx("div", { className: "col-span-full text-center py-12 text-gray-500", children: _jsx("p", { children: "\uC120\uD0DD\uB41C \uC870\uAC74\uC5D0 \uB9DE\uB294 \uD30C\uC77C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." }) }))] }));
};
export default MediaGrid;
//# sourceMappingURL=MediaGrid.js.map