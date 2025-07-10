import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Layout, Grid, Sidebar, Eye, Download, Star, Plus, Filter, Search } from 'lucide-react';
const mockTemplates = [
    {
        id: '1',
        name: '미니멀 개인 블로그',
        description: '깔끔하고 단순한 1단 레이아웃. 개인 블로거에게 최적화된 디자인',
        layoutType: 'personal-blog',
        previewImage: '/api/placeholder/400/300',
        isActive: true,
        isFeatured: true,
        usageCount: 245,
        tags: ['개인', '미니멀', '블로그'],
        createdAt: '2024-01-15'
    },
    {
        id: '2',
        name: '포토 갤러리',
        description: '이미지 중심의 그리드 레이아웃. 사진 블로그와 포트폴리오에 적합',
        layoutType: 'photo-blog',
        previewImage: '/api/placeholder/400/300',
        isActive: true,
        isFeatured: true,
        usageCount: 189,
        tags: ['사진', '갤러리', '그리드'],
        createdAt: '2024-01-20'
    },
    {
        id: '3',
        name: '비즈니스 블로그',
        description: '사이드바가 있는 복합 레이아웃. 기업 블로그와 뉴스 사이트에 최적',
        layoutType: 'complex-blog',
        previewImage: '/api/placeholder/400/300',
        isActive: true,
        isFeatured: false,
        usageCount: 156,
        tags: ['비즈니스', '사이드바', '복합'],
        createdAt: '2024-01-25'
    }
];
const TemplateLayoutManager = () => {
    const [templates, _setTemplates] = useState(mockTemplates);
    const [selectedLayoutType, setSelectedLayoutType] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const getLayoutIcon = (layoutType) => {
        switch (layoutType) {
            case 'personal-blog':
                return _jsx(Layout, { className: "w-5 h-5" });
            case 'photo-blog':
                return _jsx(Grid, { className: "w-5 h-5" });
            case 'complex-blog':
                return _jsx(Sidebar, { className: "w-5 h-5" });
            default:
                return _jsx(Layout, { className: "w-5 h-5" });
        }
    };
    const getLayoutTypeLabel = (layoutType) => {
        switch (layoutType) {
            case 'personal-blog':
                return '개인 블로그';
            case 'photo-blog':
                return '포토 블로그';
            case 'complex-blog':
                return '복합 블로그';
            default:
                return '커스텀';
        }
    };
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            template.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = selectedLayoutType === 'all' || template.layoutType === selectedLayoutType;
        return matchesSearch && matchesType;
    });
    const handleApplyTemplate = (templateId) => {
        setSelectedTemplate(templateId);
        console.log('Applying template:', templateId);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uD15C\uD50C\uB9BF \uB808\uC774\uC544\uC6C3 \uAD00\uB9AC" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uBE14\uB85C\uADF8 \uB808\uC774\uC544\uC6C3 \uD15C\uD50C\uB9BF\uC744 \uC120\uD0DD\uD558\uACE0 \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex flex-col md:flex-row gap-4 items-center justify-between", children: [_jsxs("div", { className: "relative flex-1 max-w-md", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "text", placeholder: "\uD15C\uD50C\uB9BF \uAC80\uC0C9...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Filter, { className: "w-4 h-4 text-gray-500" }), _jsxs("select", { value: selectedLayoutType, onChange: (e) => setSelectedLayoutType(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "all", children: "\uBAA8\uB4E0 \uB808\uC774\uC544\uC6C3" }), _jsx("option", { value: "personal-blog", children: "\uAC1C\uC778 \uBE14\uB85C\uADF8" }), _jsx("option", { value: "photo-blog", children: "\uD3EC\uD1A0 \uBE14\uB85C\uADF8" }), _jsx("option", { value: "complex-blog", children: "\uBCF5\uD569 \uBE14\uB85C\uADF8" }), _jsx("option", { value: "custom", children: "\uCEE4\uC2A4\uD140" })] })] }), _jsxs("button", { className: "flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors", children: [_jsx(Plus, { className: "w-4 h-4" }), "\uC0C8 \uD15C\uD50C\uB9BF"] })] }) }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: filteredTemplates.map((template) => (_jsxs("div", { className: `wp-card overflow-hidden transition-all duration-200 ${selectedTemplate === template.id
                        ? 'ring-2 ring-blue-500 shadow-lg'
                        : 'hover:shadow-lg'}`, children: [_jsxs("div", { className: "relative h-48 bg-gray-100 overflow-hidden", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [getLayoutIcon(template.layoutType), _jsx("p", { className: "text-sm text-gray-600 mt-2", children: getLayoutTypeLabel(template.layoutType) })] }) }), template.isFeatured && (_jsx("div", { className: "absolute top-3 left-3", children: _jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800", children: [_jsx(Star, { className: "w-3 h-3" }), "\uCD94\uCC9C"] }) })), _jsx("div", { className: "absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center", children: _jsxs("button", { className: "opacity-0 hover:opacity-100 transition-opacity duration-200 bg-white text-gray-800 px-4 py-2 rounded-md shadow-lg flex items-center gap-2", children: [_jsx(Eye, { className: "w-4 h-4" }), "\uBBF8\uB9AC\uBCF4\uAE30"] }) })] }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "flex items-start justify-between mb-3", children: _jsxs("div", { className: "flex-1", children: [_jsx("h3", { className: "font-semibold text-lg mb-1", children: template.name }), _jsx("p", { className: "text-gray-600 text-sm line-clamp-2", children: template.description })] }) }), _jsxs("div", { className: "flex items-center gap-2 mb-3", children: [getLayoutIcon(template.layoutType), _jsx("span", { className: "text-sm font-medium text-blue-600", children: getLayoutTypeLabel(template.layoutType) })] }), _jsx("div", { className: "flex flex-wrap gap-1 mb-4", children: template.tags.map((tag) => (_jsx("span", { className: "px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded", children: tag }, tag))) }), _jsxs("div", { className: "flex items-center justify-between text-sm text-gray-500 mb-4", children: [_jsxs("span", { children: ["\uC0AC\uC6A9: ", template.usageCount, "\uD68C"] }), _jsx("span", { children: new Date(template.createdAt).toLocaleDateString('ko-KR') })] }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleApplyTemplate(template.id), className: `flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${selectedTemplate === template.id
                                                ? 'bg-green-600 text-white'
                                                : 'bg-blue-600 text-white hover:bg-blue-700'}`, children: selectedTemplate === template.id ? '적용됨' : '적용하기' }), _jsx("button", { className: "px-3 py-2 text-gray-600 hover:text-gray-800 transition-colors", children: _jsx(Download, { className: "w-4 h-4" }) })] })] })] }, template.id))) }), filteredTemplates.length === 0 && (_jsxs("div", { className: "text-center py-12", children: [_jsx(Layout, { className: "w-16 h-16 text-gray-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-gray-900 mb-2", children: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "text-gray-600", children: "\uB2E4\uB978 \uAC80\uC0C9\uC5B4\uB97C \uC2DC\uB3C4\uD574\uBCF4\uAC70\uB098 \uD544\uD130\uB97C \uBCC0\uACBD\uD574\uBCF4\uC138\uC694." })] })), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("h2", { className: "text-lg font-medium", children: "\uB808\uC774\uC544\uC6C3 \uD0C0\uC785 \uC548\uB0B4" }) }), _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "grid md:grid-cols-3 gap-6", children: [_jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3", children: _jsx(Layout, { className: "w-6 h-6 text-blue-600" }) }), _jsx("h3", { className: "font-semibold mb-2", children: "\uAC1C\uC778 \uBE14\uB85C\uADF8" }), _jsx("p", { className: "text-sm text-gray-600", children: "\uAE54\uB054\uD55C 1\uB2E8 \uB808\uC774\uC544\uC6C3\uC73C\uB85C \uAC1C\uC778 \uBE14\uB85C\uAC70\uC5D0\uAC8C \uCD5C\uC801\uD654\uB41C \uBBF8\uB2C8\uBA40 \uB514\uC790\uC778" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3", children: _jsx(Grid, { className: "w-6 h-6 text-purple-600" }) }), _jsx("h3", { className: "font-semibold mb-2", children: "\uD3EC\uD1A0 \uBE14\uB85C\uADF8" }), _jsx("p", { className: "text-sm text-gray-600", children: "\uC774\uBBF8\uC9C0 \uC911\uC2EC\uC758 \uADF8\uB9AC\uB4DC \uB808\uC774\uC544\uC6C3\uC73C\uB85C \uC0AC\uC9C4\uACFC \uD3EC\uD2B8\uD3F4\uB9AC\uC624 \uCF58\uD150\uCE20\uC5D0 \uC801\uD569" })] }), _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3", children: _jsx(Sidebar, { className: "w-6 h-6 text-green-600" }) }), _jsx("h3", { className: "font-semibold mb-2", children: "\uBCF5\uD569 \uBE14\uB85C\uADF8" }), _jsx("p", { className: "text-sm text-gray-600", children: "\uC0AC\uC774\uB4DC\uBC14\uC640 \uC704\uC82F\uC744 \uD3EC\uD568\uD55C \uBCF5\uD569 \uB808\uC774\uC544\uC6C3\uC73C\uB85C \uBE44\uC988\uB2C8\uC2A4 \uBE14\uB85C\uADF8\uC5D0 \uCD5C\uC801" })] })] }) })] })] }));
};
export default TemplateLayoutManager;
//# sourceMappingURL=TemplateLayoutManager.js.map