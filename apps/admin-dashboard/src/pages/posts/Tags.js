import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Tag as TagIcon, Hash, Save, X, RefreshCw, Merge, CheckCircle, ArrowRight } from 'lucide-react';
import { ContentApi } from '@/api/contentApi';
import toast from 'react-hot-toast';
const Tags = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tags, setTags] = useState([]);
    const [filteredTags, setFilteredTags] = useState([]);
    const [selectedTags, setSelectedTags] = useState([]);
    const [selectedTag, setSelectedTag] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [showMergeModal, setShowMergeModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [searchTerm, setSearchTerm] = useState('');
    const [quickAddMode, setQuickAddMode] = useState(false);
    const [quickTagName, setQuickTagName] = useState('');
    const [mergeFromTag, setMergeFromTag] = useState(null);
    const [mergeToTag, setMergeToTag] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        color: '#3b82f6'
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(50);
    const [sortBy, setSortBy] = useState('name');
    const [sortOrder, setSortOrder] = useState('asc');
    useEffect(() => {
        loadTags();
    }, []);
    useEffect(() => {
        applyFilters();
    }, [tags, searchTerm, sortBy, sortOrder]);
    const loadTags = async () => {
        try {
            setLoading(true);
            const response = await ContentApi.getTags();
            setTags(response.data);
        }
        catch (error) {
            console.error('Failed to load tags:', error);
            toast.error('태그를 불러오는데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    const applyFilters = () => {
        let filtered = [...tags];
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(tag => tag.name.toLowerCase().includes(term) ||
                tag.description?.toLowerCase().includes(term) ||
                tag.slug.toLowerCase().includes(term));
        }
        filtered.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case 'name':
                    comparison = a.name.localeCompare(b.name);
                    break;
                case 'postCount':
                    comparison = a.postCount - b.postCount;
                    break;
                case 'createdAt':
                    comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
            }
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        setFilteredTags(filtered);
    };
    const openModal = (mode, tag) => {
        setModalMode(mode);
        if (tag) {
            setSelectedTag(tag);
            setFormData(tag);
        }
        else {
            setSelectedTag(null);
            setFormData({
                name: '',
                slug: '',
                description: '',
                color: '#3b82f6'
            });
        }
        setShowModal(true);
    };
    const closeModal = () => {
        setShowModal(false);
        setSelectedTag(null);
        setFormData({});
    };
    const handleSave = async () => {
        try {
            setSaving(true);
            if (!formData.name?.trim()) {
                toast.error('태그 이름을 입력해주세요.');
                return;
            }
            if (!formData.slug?.trim()) {
                const slugResponse = await ContentApi.generateSlug(formData.name, 'tag');
                formData.slug = slugResponse.data.slug;
            }
            if (modalMode === 'create') {
                await ContentApi.createTag(formData);
                toast.success('태그가 생성되었습니다.');
            }
            else if (modalMode === 'edit' && selectedTag) {
                await ContentApi.updateTag(selectedTag.id, formData);
                toast.success('태그가 수정되었습니다.');
            }
            closeModal();
            loadTags();
        }
        catch (error) {
            console.error('Failed to save tag:', error);
            toast.error('저장에 실패했습니다.');
        }
        finally {
            setSaving(false);
        }
    };
    const handleDelete = async (tagId) => {
        const tag = tags.find(t => t.id === tagId);
        if (tag?.postCount && tag.postCount > 0) {
            if (!confirm(`이 태그는 ${tag.postCount}개의 게시물에서 사용 중입니다. 정말 삭제하시겠습니까?`)) {
                return;
            }
        }
        else if (!confirm('이 태그를 삭제하시겠습니까?')) {
            return;
        }
        try {
            await ContentApi.deleteTag(tagId);
            toast.success('태그가 삭제되었습니다.');
            loadTags();
        }
        catch (error) {
            console.error('Failed to delete tag:', error);
            toast.error('삭제에 실패했습니다.');
        }
    };
    const handleQuickAdd = async (e) => {
        e.preventDefault();
        if (!quickTagName.trim())
            return;
        try {
            const slugResponse = await ContentApi.generateSlug(quickTagName, 'tag');
            await ContentApi.createTag({
                name: quickTagName.trim(),
                slug: slugResponse.data.slug,
                description: '',
                color: '#3b82f6'
            });
            toast.success('태그가 추가되었습니다.');
            setQuickTagName('');
            setQuickAddMode(false);
            loadTags();
        }
        catch (error) {
            console.error('Failed to create tag:', error);
            toast.error('태그 생성에 실패했습니다.');
        }
    };
    const handleSelectTag = (tagId) => {
        setSelectedTags(prev => prev.includes(tagId)
            ? prev.filter(id => id !== tagId)
            : [...prev, tagId]);
    };
    const handleSelectAll = () => {
        if (selectedTags.length === filteredTags.length) {
            setSelectedTags([]);
        }
        else {
            setSelectedTags(filteredTags.map(tag => tag.id));
        }
    };
    const handleBulkDelete = async () => {
        if (selectedTags.length === 0) {
            toast.error('선택된 태그가 없습니다.');
            return;
        }
        const tagsWithPosts = selectedTags
            .map(id => tags.find(t => t.id === id))
            .filter(tag => tag && tag.postCount > 0);
        if (tagsWithPosts.length > 0) {
            const totalPosts = tagsWithPosts.reduce((sum, tag) => sum + (tag?.postCount || 0), 0);
            if (!confirm(`선택된 태그 중 ${tagsWithPosts.length}개가 총 ${totalPosts}개의 게시물에서 사용 중입니다. 정말 삭제하시겠습니까?`)) {
                return;
            }
        }
        try {
            await Promise.all(selectedTags.map(id => ContentApi.deleteTag(id)));
            toast.success(`${selectedTags.length}개 태그가 삭제되었습니다.`);
            setSelectedTags([]);
            loadTags();
        }
        catch (error) {
            console.error('Failed to bulk delete tags:', error);
            toast.error('일괄 삭제에 실패했습니다.');
        }
    };
    const openMergeModal = (fromTag) => {
        setMergeFromTag(fromTag);
        setMergeToTag(null);
        setShowMergeModal(true);
    };
    const handleMergeTags = async () => {
        if (!mergeFromTag || !mergeToTag) {
            toast.error('병합할 태그를 선택해주세요.');
            return;
        }
        if (mergeFromTag.id === mergeToTag.id) {
            toast.error('같은 태그는 병합할 수 없습니다.');
            return;
        }
        try {
            await ContentApi.mergeTags(mergeFromTag.id, mergeToTag.id);
            toast.success(`"${mergeFromTag.name}" 태그가 "${mergeToTag.name}" 태그로 병합되었습니다.`);
            setShowMergeModal(false);
            setMergeFromTag(null);
            setMergeToTag(null);
            loadTags();
        }
        catch (error) {
            console.error('Failed to merge tags:', error);
            toast.error('태그 병합에 실패했습니다.');
        }
    };
    const updateFormData = (key, value) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    const getDisplayedTags = () => {
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        return filteredTags.slice(startIndex, endIndex);
    };
    const totalPages = Math.ceil(filteredTags.length / pageSize);
    if (loading) {
        return (_jsxs("div", { className: "flex items-center justify-center min-h-96", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uD0DC\uADF8\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uD0DC\uADF8" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uAC8C\uC2DC\uBB3C \uD0DC\uADF8\uB97C \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => setQuickAddMode(!quickAddMode), className: "wp-button-secondary", children: [_jsx(Hash, { className: "w-4 h-4 mr-2" }), "\uBE60\uB978 \uCD94\uAC00"] }), _jsxs("button", { onClick: loadTags, className: "wp-button-secondary", children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "\uC0C8\uB85C\uACE0\uCE68"] }), _jsxs("button", { onClick: () => openModal('create'), className: "wp-button-primary", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "\uD0DC\uADF8 \uCD94\uAC00"] })] })] }), quickAddMode && (_jsx("div", { className: "wp-card border-l-4 border-l-green-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("form", { onSubmit: handleQuickAdd, className: "flex items-center gap-2", children: [_jsx(Hash, { className: "w-5 h-5 text-green-500" }), _jsx("input", { type: "text", value: quickTagName, onChange: (e) => setQuickTagName(e.target.value), placeholder: "\uD0DC\uADF8 \uC774\uB984\uC744 \uC785\uB825\uD558\uACE0 Enter\uB97C \uB204\uB974\uC138\uC694", className: "wp-input flex-1", autoFocus: true }), _jsx("button", { type: "submit", className: "wp-button-primary", disabled: !quickTagName.trim(), children: "\uCD94\uAC00" }), _jsx("button", { type: "button", onClick: () => {
                                    setQuickAddMode(false);
                                    setQuickTagName('');
                                }, className: "wp-button-secondary", children: _jsx(X, { className: "w-4 h-4" }) })] }) }) })), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex flex-col lg:flex-row gap-4", children: [_jsx("div", { className: "flex-1", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx("input", { type: "text", placeholder: "\uD0DC\uADF8 \uC774\uB984, \uC124\uBA85, \uC2AC\uB7EC\uADF8\uB85C \uAC80\uC0C9...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "wp-input pl-10" })] }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { value: sortBy, onChange: (e) => setSortBy(e.target.value), className: "wp-select", children: [_jsx("option", { value: "name", children: "\uC774\uB984\uC21C" }), _jsx("option", { value: "postCount", children: "\uC0AC\uC6A9\uD69F\uC218\uC21C" }), _jsx("option", { value: "createdAt", children: "\uC0DD\uC131\uC77C\uC21C" })] }), _jsx("button", { onClick: () => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc'), className: "wp-button-secondary", title: sortOrder === 'asc' ? '오름차순' : '내림차순', children: sortOrder === 'asc' ? '↑' : '↓' })] })] }) }) }), selectedTags.length > 0 && (_jsx("div", { className: "wp-card border-l-4 border-l-blue-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-blue-700", children: [selectedTags.length, "\uAC1C \uD0DC\uADF8\uAC00 \uC120\uD0DD\uB418\uC5C8\uC2B5\uB2C8\uB2E4"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: handleBulkDelete, className: "wp-button-secondary text-red-600 hover:text-red-700", children: [_jsx(Trash2, { className: "w-4 h-4 mr-2" }), "\uC120\uD0DD \uC0AD\uC81C"] }), _jsx("button", { onClick: () => setSelectedTags([]), className: "wp-button-secondary", children: "\uC120\uD0DD \uD574\uC81C" })] })] }) }) })), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body p-0", children: filteredTags.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-gray-500", children: [_jsx(TagIcon, { className: "w-12 h-12 text-gray-300 mx-auto mb-4" }), _jsx("p", { className: "text-lg font-medium mb-2", children: searchTerm ? '검색 결과가 없습니다' : '태그가 없습니다' }), _jsx("p", { className: "text-sm", children: searchTerm ? '다른 검색어를 시도해보세요' : '새로운 태그를 추가해보세요' })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "wp-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "w-8", children: _jsx("input", { type: "checkbox", checked: selectedTags.length === filteredTags.length && filteredTags.length > 0, onChange: handleSelectAll, className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }) }), _jsx("th", { children: "\uC774\uB984" }), _jsx("th", { children: "\uC2AC\uB7EC\uADF8" }), _jsx("th", { children: "\uC124\uBA85" }), _jsx("th", { children: "\uC0AC\uC6A9\uD69F\uC218" }), _jsx("th", { children: "\uC0DD\uC131\uC77C" }), _jsx("th", { children: "\uC791\uC5C5" })] }) }), _jsx("tbody", { children: getDisplayedTags().map((tag) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: selectedTags.includes(tag.id), onChange: () => handleSelectTag(tag.id), className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }) }), _jsx("td", { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full border border-gray-300", style: { backgroundColor: tag.color } }), _jsx("span", { className: "font-medium text-gray-900", children: tag.name })] }) }), _jsx("td", { children: _jsx("code", { className: "text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded", children: tag.slug }) }), _jsx("td", { children: _jsx("div", { className: "max-w-48 truncate text-sm text-gray-600", children: tag.description || '-' }) }), _jsx("td", { children: _jsx("span", { className: "px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded", children: tag.postCount }) }), _jsx("td", { children: _jsx("span", { className: "text-sm text-gray-600", children: formatDate(tag.createdAt) }) }), _jsx("td", { children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => openModal('edit', tag), className: "text-blue-600 hover:text-blue-700", title: "\uC218\uC815", children: _jsx(Edit, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => openMergeModal(tag), className: "text-purple-600 hover:text-purple-700", title: "\uBCD1\uD569", children: _jsx(Merge, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleDelete(tag.id), className: "text-red-600 hover:text-red-700", title: "\uC0AD\uC81C", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }) })] }, tag.id))) })] }) })) }) }), totalPages > 1 && (_jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-sm text-gray-700", children: [((currentPage - 1) * pageSize) + 1, "-", Math.min(currentPage * pageSize, filteredTags.length), "\uAC1C / \uCD1D ", filteredTags.length, "\uAC1C"] }), _jsxs("select", { value: pageSize, onChange: (e) => setPageSize(parseInt(e.target.value)), className: "wp-select w-20", children: [_jsx("option", { value: 25, children: "25" }), _jsx("option", { value: 50, children: "50" }), _jsx("option", { value: 100, children: "100" })] }), _jsx("span", { className: "text-sm text-gray-700", children: "\uAC1C\uC529 \uBCF4\uAE30" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setCurrentPage(Math.max(1, currentPage - 1)), disabled: currentPage === 1, className: "wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed", children: "\uC774\uC804" }), _jsx("div", { className: "flex items-center gap-1", children: Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                            const page = currentPage - 2 + i;
                                            if (page < 1 || page > totalPages)
                                                return null;
                                            return (_jsx("button", { onClick: () => setCurrentPage(page), className: `px-3 py-1 text-sm rounded ${page === currentPage
                                                    ? 'bg-admin-blue text-white'
                                                    : 'text-gray-700 hover:bg-gray-100'}`, children: page }, page));
                                        }) }), _jsx("button", { onClick: () => setCurrentPage(Math.min(totalPages, currentPage + 1)), disabled: currentPage === totalPages, className: "wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed", children: "\uB2E4\uC74C" })] })] }) }) })), showModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsx("div", { className: "bg-white rounded-lg max-w-md w-full mx-4", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold", children: modalMode === 'create' ? '태그 추가' : '태그 수정' }), _jsx("button", { onClick: closeModal, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uD0DC\uADF8 \uC774\uB984 *" }), _jsx("input", { type: "text", value: formData.name || '', onChange: (e) => updateFormData('name', e.target.value), className: "wp-input", placeholder: "\uD0DC\uADF8 \uC774\uB984\uC744 \uC785\uB825\uD558\uC138\uC694", autoFocus: true })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC2AC\uB7EC\uADF8" }), _jsx("input", { type: "text", value: formData.slug || '', onChange: (e) => updateFormData('slug', e.target.value), className: "wp-input", placeholder: "\uC790\uB3D9 \uC0DD\uC131\uB429\uB2C8\uB2E4" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "URL\uC5D0 \uC0AC\uC6A9\uB420 \uACE0\uC720\uD55C \uC2DD\uBCC4\uC790\uC785\uB2C8\uB2E4" })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC124\uBA85" }), _jsx("textarea", { value: formData.description || '', onChange: (e) => updateFormData('description', e.target.value), className: "wp-input min-h-[80px]", placeholder: "\uD0DC\uADF8\uC5D0 \uB300\uD55C \uC124\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694" })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC0C9\uC0C1" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("input", { type: "color", value: formData.color || '#3b82f6', onChange: (e) => updateFormData('color', e.target.value), className: "w-10 h-10 rounded border border-gray-300" }), _jsx("input", { type: "text", value: formData.color || '#3b82f6', onChange: (e) => updateFormData('color', e.target.value), className: "wp-input flex-1", placeholder: "#3b82f6" })] })] })] }), _jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [_jsx("button", { onClick: closeModal, className: "wp-button-secondary", children: "\uCDE8\uC18C" }), _jsx("button", { onClick: handleSave, disabled: saving, className: "wp-button-primary", children: saving ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "loading-spinner w-4 h-4 mr-2" }), "\uC800\uC7A5 \uC911..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-4 h-4 mr-2" }), "\uC800\uC7A5"] })) })] })] }) }) })), showMergeModal && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsx("div", { className: "bg-white rounded-lg max-w-md w-full mx-4", children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h3", { className: "text-lg font-semibold", children: "\uD0DC\uADF8 \uBCD1\uD569" }), _jsx("button", { onClick: () => setShowMergeModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "p-4 bg-yellow-50 border border-yellow-200 rounded-lg", children: _jsx("p", { className: "text-sm text-yellow-800", children: "\uCCAB \uBC88\uC9F8 \uD0DC\uADF8\uC758 \uBAA8\uB4E0 \uAC8C\uC2DC\uBB3C\uC774 \uB450 \uBC88\uC9F8 \uD0DC\uADF8\uB85C \uC774\uB3D9\uB418\uACE0, \uCCAB \uBC88\uC9F8 \uD0DC\uADF8\uB294 \uC0AD\uC81C\uB429\uB2C8\uB2E4." }) }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uBCD1\uD569\uD560 \uD0DC\uADF8 (\uC0AD\uC81C\uB428)" }), _jsx("div", { className: "p-3 border border-gray-300 rounded bg-gray-50", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "w-3 h-3 rounded-full border border-gray-300", style: { backgroundColor: mergeFromTag?.color } }), _jsx("span", { className: "font-medium", children: mergeFromTag?.name }), _jsxs("span", { className: "text-sm text-gray-600", children: ["(", mergeFromTag?.postCount, "\uAC1C \uAC8C\uC2DC\uBB3C)"] })] }) })] }), _jsx("div", { className: "flex justify-center", children: _jsx(ArrowRight, { className: "w-6 h-6 text-gray-400" }) }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uB300\uC0C1 \uD0DC\uADF8 (\uC720\uC9C0\uB428)" }), _jsxs("select", { value: mergeToTag?.id || '', onChange: (e) => {
                                                    const selectedTag = tags.find(t => t.id === e.target.value);
                                                    setMergeToTag(selectedTag || null);
                                                }, className: "wp-select", children: [_jsx("option", { value: "", children: "\uD0DC\uADF8\uB97C \uC120\uD0DD\uD558\uC138\uC694" }), tags
                                                        .filter(tag => tag.id !== mergeFromTag?.id)
                                                        .map(tag => (_jsxs("option", { value: tag.id, children: [tag.name, " (", tag.postCount, "\uAC1C \uAC8C\uC2DC\uBB3C)"] }, tag.id)))] })] }), mergeToTag && (_jsx("div", { className: "p-3 border border-gray-300 rounded bg-green-50", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-4 h-4 text-green-600" }), _jsxs("span", { className: "text-sm text-green-800", children: ["\uBCD1\uD569 \uD6C4 \"", mergeToTag.name, "\" \uD0DC\uADF8\uB294 \uCD1D ", (mergeFromTag?.postCount || 0) + mergeToTag.postCount, "\uAC1C\uC758 \uAC8C\uC2DC\uBB3C\uC744 \uAC00\uC9C0\uAC8C \uB429\uB2C8\uB2E4."] })] }) }))] }), _jsxs("div", { className: "flex justify-end gap-2 mt-6", children: [_jsx("button", { onClick: () => setShowMergeModal(false), className: "wp-button-secondary", children: "\uCDE8\uC18C" }), _jsxs("button", { onClick: handleMergeTags, disabled: !mergeToTag, className: "wp-button-primary bg-red-600 hover:bg-red-700 disabled:opacity-50", children: [_jsx(Merge, { className: "w-4 h-4 mr-2" }), "\uBCD1\uD569"] })] })] }) }) }))] }));
};
export default Tags;
//# sourceMappingURL=Tags.js.map