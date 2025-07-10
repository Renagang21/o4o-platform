import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Folder, FolderOpen, ChevronRight, ChevronDown, EyeOff, Save, X, AlertCircle, RefreshCw } from 'lucide-react';
import { ContentApi } from '@/api/contentApi';
import toast from 'react-hot-toast';
const Categories = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [categories, setCategories] = useState([]);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [searchTerm, setSearchTerm] = useState('');
    const [draggedCategory, setDraggedCategory] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        parentId: '',
        image: '',
        color: '#3b82f6',
        order: 0,
        isActive: true
    });
    useEffect(() => {
        loadCategories();
    }, []);
    const loadCategories = async () => {
        try {
            setLoading(true);
            const response = await ContentApi.getCategories(true);
            setCategories(response.data);
        }
        catch (error) {
            console.error('Failed to load categories:', error);
            toast.error('카테고리를 불러오는데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    const openModal = (mode, category, parentId) => {
        setModalMode(mode);
        if (category) {
            setSelectedCategory(category);
            setFormData(category);
        }
        else {
            setSelectedCategory(null);
            setFormData({
                name: '',
                slug: '',
                description: '',
                parentId: parentId || '',
                image: '',
                color: '#3b82f6',
                order: 0,
                isActive: true
            });
        }
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setSelectedCategory(null);
        setFormData({});
    };
    const handleSave = async () => {
        try {
            setSaving(true);
            if (!formData.name?.trim()) {
                toast.error('카테고리 이름을 입력해주세요.');
                return;
            }
            if (!formData.slug?.trim()) {
                const slugResponse = await ContentApi.generateSlug(formData.name, 'category');
                formData.slug = slugResponse.data.slug;
            }
            if (modalMode === 'create') {
                await ContentApi.createCategory(formData);
                toast.success('카테고리가 생성되었습니다.');
            }
            else if (modalMode === 'edit' && selectedCategory) {
                await ContentApi.updateCategory(selectedCategory.id, formData);
                toast.success('카테고리가 수정되었습니다.');
            }
            closeModal();
            loadCategories();
        }
        catch (error) {
            console.error('Failed to save category:', error);
            toast.error('저장에 실패했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (categoryId) => {
        const category = findCategoryById(categories, categoryId);
        if (category?.postCount && category.postCount > 0) {
            if (!confirm(`이 카테고리에는 ${category.postCount}개의 게시물이 있습니다. 정말 삭제하시겠습니까?`)) {
                return;
            }
        }
        else if (!confirm('이 카테고리를 삭제하시겠습니까?')) {
            return;
        }
        try {
            await ContentApi.deleteCategory(categoryId);
            toast.success('카테고리가 삭제되었습니다.');
            loadCategories();
        }
        catch (error) {
            console.error('Failed to delete category:', error);
            toast.error('삭제에 실패했습니다.');
        }
    };
    const updateFormData = (key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };
    const toggleExpanded = (categoryId) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(categoryId)) {
                newSet.delete(categoryId);
            }
            else {
                newSet.add(categoryId);
            }
            return newSet;
        });
    };
    const findCategoryById = (categories, id) => {
        for (const category of categories) {
            if (category.id === id)
                return category;
            if (category.children) {
                const found = findCategoryById(category.children, id);
                if (found)
                    return found;
            }
        }
        return null;
    };
    const filterCategories = (categories, searchTerm) => {
        if (!searchTerm)
            return categories;
        return categories.filter(category => {
            const matches = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                category.description?.toLowerCase().includes(searchTerm.toLowerCase());
            if (matches)
                return true;
            if (category.children) {
                const filteredChildren = filterCategories(category.children, searchTerm);
                if (filteredChildren.length > 0) {
                    return true;
                }
            }
            return false;
        }).map(category => ({
            ...category,
            children: category.children ? filterCategories(category.children, searchTerm) : undefined
        }));
    };
    const handleDragStart = (e, categoryId) => {
        setDraggedCategory(categoryId);
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };
    const handleDrop = async (e, targetCategoryId) => {
        e.preventDefault();
        if (!draggedCategory || draggedCategory === targetCategoryId) {
            setDraggedCategory(null);
            return;
        }
        try {
            const draggedCat = findCategoryById(categories, draggedCategory);
            if (draggedCat) {
                await ContentApi.updateCategory(draggedCategory, { parentId: targetCategoryId });
                toast.success('카테고리가 이동되었습니다.');
                loadCategories();
            }
        }
        catch (error) {
            console.error('Failed to move category:', error);
            toast.error('이동에 실패했습니다.');
        }
        setDraggedCategory(null);
    };
    const renderCategory = (category, level = 0) => {
        const hasChildren = category.children && category.children.length > 0;
        const isExpanded = expandedCategories.has(category.id);
        const indent = level * 24;
        return (_jsxs("div", { children: [_jsxs("div", { className: `flex items-center py-2 px-3 hover:bg-gray-50 border-l-2 transition-all ${draggedCategory === category.id ? 'opacity-50' : ''} ${category.isActive ? 'border-l-transparent' : 'border-l-red-300'}`, style: { paddingLeft: `${12 + indent}px` }, draggable: true, onDragStart: (e) => handleDragStart(e, category.id), onDragOver: handleDragOver, onDrop: (e) => handleDrop(e, category.id), children: [_jsx("button", { onClick: () => toggleExpanded(category.id), className: `mr-2 ${hasChildren ? 'visible' : 'invisible'}`, children: hasChildren && isExpanded ? (_jsx(ChevronDown, { className: "w-4 h-4 text-gray-400" })) : (_jsx(ChevronRight, { className: "w-4 h-4 text-gray-400" })) }), _jsx("div", { className: "mr-3", children: hasChildren && isExpanded ? (_jsx(FolderOpen, { className: "w-5 h-5 text-blue-500" })) : (_jsx(Folder, { className: "w-5 h-5 text-gray-500" })) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-gray-900 truncate", children: category.name }), category.color && (_jsx("div", { className: "w-3 h-3 rounded-full border border-gray-300", style: { backgroundColor: category.color } })), _jsx("span", { className: "px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded", children: category.postCount }), !category.isActive && (_jsx(EyeOff, { className: "w-4 h-4 text-red-500" }))] }), category.description && (_jsx("div", { className: "text-sm text-gray-500 truncate mt-1", children: category.description }))] }), _jsxs("div", { className: "flex items-center gap-1 ml-2", children: [_jsx("button", { onClick: () => openModal('create', undefined, category.id), className: "text-green-600 hover:text-green-700 p-1", title: "\uD558\uC704 \uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00", children: _jsx(Plus, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => openModal('edit', category), className: "text-blue-600 hover:text-blue-700 p-1", title: "\uC218\uC815", children: _jsx(Edit, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleDelete(category.id), className: "text-red-600 hover:text-red-700 p-1", title: "\uC0AD\uC81C", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }), hasChildren && isExpanded && category.children && (_jsx("div", { children: category.children.map(child => renderCategory(child, level + 1)) }))] }, category.id));
    };
    const filteredCategories = filterCategories(categories, searchTerm);
    if (loading) {
        return (_jsxs("div", { className: "flex items-center justify-center min-h-96", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uCE74\uD14C\uACE0\uB9AC\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uCE74\uD14C\uACE0\uB9AC" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uACC4\uCE35\uC801 \uCE74\uD14C\uACE0\uB9AC \uAD6C\uC870\uB97C \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: loadCategories, className: "wp-button-secondary", children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "\uC0C8\uB85C\uACE0\uCE68"] }), _jsxs("button", { onClick: () => openModal('create'), className: "wp-button-primary", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "\uCE74\uD14C\uACE0\uB9AC \uCD94\uAC00"] })] })] }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx("input", { type: "text", placeholder: "\uCE74\uD14C\uACE0\uB9AC \uC774\uB984\uC774\uB098 \uC124\uBA85\uC73C\uB85C \uAC80\uC0C9...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "wp-input pl-10" })] }) }) }), _jsx("div", { className: "wp-card border-l-4 border-l-blue-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-blue-500 mt-0.5" }), _jsxs("div", { className: "text-sm text-blue-700", children: [_jsx("p", { className: "font-medium mb-1", children: "\uCE74\uD14C\uACE0\uB9AC \uAD00\uB9AC \uB3C4\uC6C0\uB9D0" }), _jsxs("ul", { className: "list-disc list-inside space-y-1 text-blue-600", children: [_jsx("li", { children: "\uB4DC\uB798\uADF8 \uC564 \uB4DC\uB86D\uC73C\uB85C \uCE74\uD14C\uACE0\uB9AC \uAD6C\uC870\uB97C \uBCC0\uACBD\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4" }), _jsx("li", { children: "\uD558\uC704 \uCE74\uD14C\uACE0\uB9AC\uB97C \uC0DD\uC131\uD558\uB824\uBA74 \uC0C1\uC704 \uCE74\uD14C\uACE0\uB9AC\uC758 + \uBC84\uD2BC\uC744 \uD074\uB9AD\uD558\uC138\uC694" }), _jsx("li", { children: "\uAC8C\uC2DC\uBB3C\uC774 \uC788\uB294 \uCE74\uD14C\uACE0\uB9AC\uB97C \uC0AD\uC81C\uD558\uBA74 \uAC8C\uC2DC\uBB3C\uC774 \uBBF8\uBD84\uB958\uB85C \uC774\uB3D9\uD569\uB2C8\uB2E4" })] })] })] }) }) }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("h2", { className: "wp-card-title", children: "\uCE74\uD14C\uACE0\uB9AC \uAD6C\uC870" }) }), _jsx("div", { className: "wp-card-body p-0", children: filteredCategories.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-gray-500", children: [_jsx(Folder, { className: "w-12 h-12 text-gray-300 mx-auto mb-4" }), _jsx("p", { className: "text-lg font-medium mb-2", children: searchTerm ? '검색 결과가 없습니다' : '카테고리가 없습니다' }), _jsx("p", { className: "text-sm", children: searchTerm ? '다른 검색어를 시도해보세요' : '새로운 카테고리를 추가해보세요' })] })) : (_jsx("div", { className: "divide-y divide-gray-100", children: filteredCategories.map(category => renderCategory(category)) })) })] }), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsx("div", { className: "bg-white rounded-lg max-w-md w-full mx-4", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold", children: modalMode === 'create' ? '카테고리 추가' : '카테고리 수정' }), _jsx("button", { onClick: closeModal, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uCE74\uD14C\uACE0\uB9AC \uC774\uB984 *" }), _jsx("input", { type: "text", value: formData.name || '', onChange: (e) => updateFormData('name', e.target.value), className: "wp-input", placeholder: "\uCE74\uD14C\uACE0\uB9AC \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694", autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC2AC\uB7EC\uADF8" }), _jsx("input", { type: "text", value: formData.slug || '', onChange: (e) => updateFormData('slug', e.target.value), className: "wp-input", placeholder: "\uC790\uB3D9 \uC0DD\uC131\uB429\uB2C8\uB2E4" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "URL\uC5D0 \uC0AC\uC6A9\uB420 \uACE0\uC720\uD55C \uC2DD\uBCC4\uC790\uC785\uB2C8\uB2E4" })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC124\uBA85" }), _jsx("textarea", { value: formData.description || '', onChange: (e) => updateFormData('description', e.target.value), className: "wp-input min-h-[80px]", placeholder: "\uCE74\uD14C\uACE0\uB9AC\uC5D0 \uB300\uD55C \uC124\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694" })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC0C1\uC704 \uCE74\uD14C\uACE0\uB9AC" }), _jsxs("select", { value: formData.parentId || '', onChange: (e) => updateFormData('parentId', e.target.value), className: "wp-select", children: [_jsx("option", { value: "", children: "\uCD5C\uC0C1\uC704 \uCE74\uD14C\uACE0\uB9AC" }), categories.map(category => (_jsx("option", { value: category.id, disabled: selectedCategory?.id === category.id, children: category.name }, category.id)))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC0C9\uC0C1" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "color", value: formData.color || '#3b82f6', onChange: (e) => updateFormData('color', e.target.value), className: "w-10 h-10 rounded border border-gray-300" }), _jsx("input", { type: "text", value: formData.color || '#3b82f6', onChange: (e) => updateFormData('color', e.target.value), className: "wp-input flex-1", placeholder: "#3b82f6" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC815\uB82C \uC21C\uC11C" }), _jsx("input", { type: "number", value: formData.order || 0, onChange: (e) => updateFormData('order', parseInt(e.target.value)), className: "wp-input", min: "0" })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "isActive", checked: formData.isActive || false, onChange: (e) => updateFormData('isActive', e.target.checked), className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }), _jsx("label", { htmlFor: "isActive", className: "text-sm text-gray-700", children: "\uCE74\uD14C\uACE0\uB9AC \uD65C\uC131\uD654" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [_jsx("button", { onClick: closeModal, className: "wp-button-secondary", children: "\uCDE8\uC18C" }), _jsx("button", { onClick: handleSave, disabled: saving, className: "wp-button-primary", children: saving ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "loading-spinner w-4 h-4 mr-2" }), "\uC800\uC7A5 \uC911..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-4 h-4 mr-2" }), "\uC800\uC7A5"] })) })] })] }) }) }))] }));
};
export default Categories;
//# sourceMappingURL=Categories.js.map