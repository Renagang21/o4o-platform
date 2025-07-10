import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route } from 'react-router-dom';
import Library from './Library';
const Media = () => {
    return (_jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Library, {}) }), _jsx(Route, { path: "/library", element: _jsx(Library, {}) })] }));
};
export default Media;
//# sourceMappingURL=Media.js.map