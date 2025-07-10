import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, Copy, FileText, Users, RefreshCw, CheckCircle, Clock, Archive, Tag, Folder, X, ChevronDown } from 'lucide-react';
import { ContentApi } from '@/api/contentApi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
const AllPosts = () => {
    const [loading, setLoading] = useState(true);
    const [posts, setPosts] = useState([]);
    const [filteredPosts, setFilteredPosts] = useState([]);
    const [selectedPosts, setSelectedPosts] = useState([]);
    const [_viewMode, _setViewMode] = useState('list');
    const [_showBulkActions, _setShowBulkActions] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [totalItems, setTotalItems] = useState(0);
    const [filters, setFilters] = useState({
        searchTerm: '',
        status: '',
        category: '',
        author: '',
        dateFrom: '',
        dateTo: '',
        type: 'post'
    });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [categories, setCategories] = useState([]);
    const [authors, setAuthors] = useState([]);
    const [stats, setStats] = useState({
        total: 0,
        published: 0,
        draft: 0,
        archived: 0,
        scheduled: 0
    });
    useEffect(() => {
        loadPosts();
        loadCategories();
        loadAuthors();
    }, [currentPage, pageSize, filters.type]);
    useEffect(() => {
        applyFilters();
    }, [posts, filters]);
    const loadPosts = async () => {
        try {
            setLoading(true);
            const response = await ContentApi.getPosts(currentPage, pageSize, { type: filters.type });
            setPosts(response.data);
            setTotalItems(response.pagination?.totalItems || 0);
            calculateStats(response.data);
        }
        catch (error) {
            console.error('Failed to load posts:', error);
            toast.error('게시물을 불러오는데 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    const loadCategories = async () => {
        try {
            const response = await ContentApi.getCategories();
            setCategories(response.data);
        }
        catch (error) {
            console.error('Failed to load categories:', error);
        }
    };
    const loadAuthors = async () => {
        try {
            const response = await ContentApi.getAuthors();
            setAuthors(response.data);
        }
        catch (error) {
            console.error('Failed to load authors:', error);
        }
    };
    const calculateStats = (postsData) => {
        const stats = {
            total: postsData.length,
            published: postsData.filter(p => p.status === 'published').length,
            draft: postsData.filter(p => p.status === 'draft').length,
            archived: postsData.filter(p => p.status === 'archived').length,
            scheduled: postsData.filter(p => p.status === 'scheduled').length
        };
        setStats(stats);
    };
    const applyFilters = () => {
        let filtered = [...posts];
        if (filters.searchTerm) {
            const term = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(post => post.title.toLowerCase().includes(term) ||
                post.excerpt?.toLowerCase().includes(term) ||
                post.author.toLowerCase().includes(term));
        }
        if (filters.status) {
            filtered = filtered.filter(post => post.status === filters.status);
        }
        if (filters.category) {
            filtered = filtered.filter(post => post.category === filters.category);
        }
        if (filters.author) {
            filtered = filtered.filter(post => post.author === filters.author);
        }
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            filtered = filtered.filter(post => new Date(post.createdAt) >= fromDate);
        }
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            filtered = filtered.filter(post => new Date(post.createdAt) <= toDate);
        }
        setFilteredPosts(filtered);
    };
    const updateFilter = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };
    const clearFilters = () => {
        setFilters({
            searchTerm: '',
            status: '',
            category: '',
            author: '',
            dateFrom: '',
            dateTo: '',
            type: filters.type
        });
    };
    const handleSelectPost = (postId) => {
        setSelectedPosts(prev => prev.includes(postId)
            ? prev.filter(id => id !== postId)
            : [...prev, postId]);
    };
    const handleSelectAll = () => {
        if (selectedPosts.length === filteredPosts.length) {
            setSelectedPosts([]);
        }
        else {
            setSelectedPosts(filteredPosts.map(post => post.id));
        }
    };
    const handleBulkAction = async (action) => {
        if (selectedPosts.length === 0) {
            toast.error('선택된 게시물이 없습니다.');
            return;
        }
        try {
            switch (action) {
                case 'publish':
                    await ContentApi.bulkUpdatePosts(selectedPosts, { status: 'published' });
                    toast.success(`${selectedPosts.length}개 게시물이 발행되었습니다.`);
                    break;
                case 'draft':
                    await ContentApi.bulkUpdatePosts(selectedPosts, { status: 'draft' });
                    toast.success(`${selectedPosts.length}개 게시물이 초안으로 변경되었습니다.`);
                    break;
                case 'archive':
                    await ContentApi.bulkUpdatePosts(selectedPosts, { status: 'archived' });
                    toast.success(`${selectedPosts.length}개 게시물이 보관되었습니다.`);
                    break;
                case 'delete':
                    if (confirm(`선택된 ${selectedPosts.length}개 게시물을 삭제하시겠습니까?`)) {
                        await ContentApi.bulkDeletePosts(selectedPosts);
                        toast.success(`${selectedPosts.length}개 게시물이 삭제되었습니다.`);
                    }
                    break;
            }
            setSelectedPosts([]);
            loadPosts();
        }
        catch (error) {
            console.error('Bulk action failed:', error);
            toast.error('일괄 작업에 실패했습니다.');
        }
    };
    const handleDeletePost = async (postId) => {
        if (confirm('이 게시물을 삭제하시겠습니까?')) {
            try {
                await ContentApi.deletePost(postId);
                toast.success('게시물이 삭제되었습니다.');
                loadPosts();
            }
            catch (error) {
                console.error('Failed to delete post:', error);
                toast.error('삭제에 실패했습니다.');
            }
        }
    };
    const handleClonePost = async (postId) => {
        try {
            await ContentApi.clonePost(postId);
            toast.success('게시물이 복제되었습니다.');
            loadPosts();
        }
        catch (error) {
            console.error('Failed to clone post:', error);
            toast.error('복제에 실패했습니다.');
        }
    };
    const getStatusBadge = (status) => {
        const statusConfig = {
            published: { bg: 'bg-green-100', text: 'text-green-800', label: '발행됨' },
            draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '초안' },
            archived: { bg: 'bg-red-100', text: 'text-red-800', label: '보관됨' },
            scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: '예약됨' },
            private: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '비공개' }
        };
        const config = statusConfig[status] || statusConfig.draft;
        return (_jsx("span", { className: `px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`, children: config.label }));
    };
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };
    const postTypes = [
        { value: 'post', label: '게시물' },
        { value: 'notice', label: '공지사항' },
        { value: 'news', label: '뉴스' }
    ];
    if (loading) {
        return (_jsxs("div", { className: "flex items-center justify-center min-h-96", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uAC8C\uC2DC\uBB3C\uC744 \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uAC8C\uC2DC\uBB3C" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uBE14\uB85C\uADF8 \uAC8C\uC2DC\uBB3C, \uACF5\uC9C0\uC0AC\uD56D \uB4F1\uC744 \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs(Link, { to: "/posts/categories", className: "wp-button-secondary", children: [_jsx(Folder, { className: "w-4 h-4 mr-2" }), "\uCE74\uD14C\uACE0\uB9AC"] }), _jsxs(Link, { to: "/posts/tags", className: "wp-button-secondary", children: [_jsx(Tag, { className: "w-4 h-4 mr-2" }), "\uD0DC\uADF8"] }), _jsxs("button", { onClick: loadPosts, className: "wp-button-secondary", children: [_jsx(RefreshCw, { className: "w-4 h-4 mr-2" }), "\uC0C8\uB85C\uACE0\uCE68"] }), _jsxs(Link, { to: "/posts/new", className: "wp-button-primary", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "\uAC8C\uC2DC\uBB3C \uCD94\uAC00"] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-5 gap-4", children: [_jsx("div", { className: "wp-card border-l-4 border-l-blue-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uC804\uCCB4" }), _jsx("p", { className: "text-xl font-bold text-gray-900", children: stats.total })] }), _jsx(FileText, { className: "w-6 h-6 text-blue-500" })] }) }) }), _jsx("div", { className: "wp-card border-l-4 border-l-green-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uBC1C\uD589\uB428" }), _jsx("p", { className: "text-xl font-bold text-green-600", children: stats.published })] }), _jsx(CheckCircle, { className: "w-6 h-6 text-green-500" })] }) }) }), _jsx("div", { className: "wp-card border-l-4 border-l-gray-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uCD08\uC548" }), _jsx("p", { className: "text-xl font-bold text-gray-600", children: stats.draft })] }), _jsx(FileText, { className: "w-6 h-6 text-gray-500" })] }) }) }), _jsx("div", { className: "wp-card border-l-4 border-l-blue-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uC608\uC57D\uB428" }), _jsx("p", { className: "text-xl font-bold text-blue-600", children: stats.scheduled })] }), _jsx(Clock, { className: "w-6 h-6 text-blue-500" })] }) }) }), _jsx("div", { className: "wp-card border-l-4 border-l-red-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-600", children: "\uBCF4\uAD00\uB428" }), _jsx("p", { className: "text-xl font-bold text-red-600", children: stats.archived })] }), _jsx(Archive, { className: "w-6 h-6 text-red-500" })] }) }) })] }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-header border-b-0", children: _jsx("div", { className: "flex space-x-1", children: postTypes.map((type) => (_jsx("button", { onClick: () => updateFilter('type', type.value), className: `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${filters.type === type.value
                                ? 'text-admin-blue border-admin-blue bg-blue-50'
                                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'}`, children: type.label }, type.value))) }) }) }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex flex-col lg:flex-row gap-4", children: [_jsx("div", { className: "flex-1", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx("input", { type: "text", placeholder: "\uC81C\uBAA9, \uB0B4\uC6A9, \uC791\uC131\uC790\uB85C \uAC80\uC0C9...", value: filters.searchTerm, onChange: (e) => updateFilter('searchTerm', e.target.value), className: "wp-input pl-10" })] }) }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("select", { value: filters.status, onChange: (e) => updateFilter('status', e.target.value), className: "wp-select min-w-[120px]", children: [_jsx("option", { value: "", children: "\uC804\uCCB4 \uC0C1\uD0DC" }), _jsx("option", { value: "published", children: "\uBC1C\uD589\uB428" }), _jsx("option", { value: "draft", children: "\uCD08\uC548" }), _jsx("option", { value: "scheduled", children: "\uC608\uC57D\uB428" }), _jsx("option", { value: "archived", children: "\uBCF4\uAD00\uB428" })] }), _jsxs("select", { value: filters.category, onChange: (e) => updateFilter('category', e.target.value), className: "wp-select min-w-[120px]", children: [_jsx("option", { value: "", children: "\uC804\uCCB4 \uCE74\uD14C\uACE0\uB9AC" }), categories.map(category => (_jsx("option", { value: category.id, children: category.name }, category.id)))] }), _jsxs("button", { onClick: () => setShowAdvancedFilters(!showAdvancedFilters), className: "wp-button-secondary", children: [_jsx(Filter, { className: "w-4 h-4 mr-2" }), "\uACE0\uAE09 \uD544\uD130", _jsx(ChevronDown, { className: `w-4 h-4 ml-1 transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}` })] })] })] }), showAdvancedFilters && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg", children: [_jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC791\uC131\uC790" }), _jsxs("select", { value: filters.author, onChange: (e) => updateFilter('author', e.target.value), className: "wp-select", children: [_jsx("option", { value: "", children: "\uC804\uCCB4 \uC791\uC131\uC790" }), authors.map(author => (_jsx("option", { value: author.id, children: author.name }, author.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC2DC\uC791\uC77C" }), _jsx("input", { type: "date", value: filters.dateFrom, onChange: (e) => updateFilter('dateFrom', e.target.value), className: "wp-input" })] }), _jsxs("div", { children: [_jsx("label", { className: "wp-label", children: "\uC885\uB8CC\uC77C" }), _jsx("input", { type: "date", value: filters.dateTo, onChange: (e) => updateFilter('dateTo', e.target.value), className: "wp-input" })] }), _jsx("div", { className: "flex items-end", children: _jsxs("button", { onClick: clearFilters, className: "wp-button-secondary w-full", children: [_jsx(X, { className: "w-4 h-4 mr-2" }), "\uD544\uD130 \uCD08\uAE30\uD654"] }) })] }))] }) }) }), selectedPosts.length > 0 && (_jsx("div", { className: "wp-card border-l-4 border-l-blue-500", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("span", { className: "text-blue-700", children: [selectedPosts.length, "\uAC1C \uAC8C\uC2DC\uBB3C\uC774 \uC120\uD0DD\uB418\uC5C8\uC2B5\uB2C8\uB2E4"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { onChange: (e) => e.target.value && handleBulkAction(e.target.value), className: "wp-select", value: "", children: [_jsx("option", { value: "", children: "\uC77C\uAD04 \uC791\uC5C5 \uC120\uD0DD" }), _jsx("option", { value: "publish", children: "\uBC1C\uD589" }), _jsx("option", { value: "draft", children: "\uCD08\uC548\uC73C\uB85C \uBCC0\uACBD" }), _jsx("option", { value: "archive", children: "\uBCF4\uAD00" }), _jsx("option", { value: "delete", children: "\uC0AD\uC81C" })] }), _jsx("button", { onClick: () => setSelectedPosts([]), className: "wp-button-secondary", children: "\uC120\uD0DD \uD574\uC81C" })] })] }) }) })), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body p-0", children: filteredPosts.length === 0 ? (_jsxs("div", { className: "text-center py-12 text-gray-500", children: [_jsx(FileText, { className: "w-12 h-12 text-gray-300 mx-auto mb-4" }), _jsx("p", { className: "text-lg font-medium mb-2", children: "\uAC8C\uC2DC\uBB3C\uC774 \uC5C6\uC2B5\uB2C8\uB2E4" }), _jsx("p", { className: "text-sm", children: "\uC0C8\uB85C\uC6B4 \uAC8C\uC2DC\uBB3C\uC744 \uC791\uC131\uD574\uBCF4\uC138\uC694." })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "wp-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { className: "w-8", children: _jsx("input", { type: "checkbox", checked: selectedPosts.length === filteredPosts.length && filteredPosts.length > 0, onChange: handleSelectAll, className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }) }), _jsx("th", { children: "\uC81C\uBAA9" }), _jsx("th", { children: "\uC791\uC131\uC790" }), _jsx("th", { children: "\uCE74\uD14C\uACE0\uB9AC" }), _jsx("th", { children: "\uC870\uD68C\uC218" }), _jsx("th", { children: "\uC0C1\uD0DC" }), _jsx("th", { children: "\uB0A0\uC9DC" }), _jsx("th", { children: "\uC791\uC5C5" })] }) }), _jsx("tbody", { children: filteredPosts.map((post) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { children: _jsx("input", { type: "checkbox", checked: selectedPosts.includes(post.id), onChange: () => handleSelectPost(post.id), className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }) }), _jsx("td", { children: _jsxs("div", { children: [_jsx(Link, { to: `/posts/edit/${post.id}`, className: "font-medium text-gray-900 hover:text-admin-blue", children: post.title }), post.excerpt && (_jsx("div", { className: "text-sm text-gray-500 mt-1 truncate max-w-md", children: post.excerpt }))] }) }), _jsx("td", { children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-sm", children: post.author })] }) }), _jsx("td", { children: post.category && (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded", children: categories.find(c => c.id === post.category)?.name || post.category })) }), _jsx("td", { children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Eye, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-sm", children: post.views })] }) }), _jsx("td", { children: getStatusBadge(post.status) }), _jsx("td", { children: _jsx("div", { className: "text-sm text-gray-600", children: formatDate(post.createdAt) }) }), _jsx("td", { children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Link, { to: `/posts/preview/${post.id}`, className: "text-blue-600 hover:text-blue-700", title: "\uBBF8\uB9AC\uBCF4\uAE30", target: "_blank", children: _jsx(Eye, { className: "w-4 h-4" }) }), _jsx(Link, { to: `/posts/edit/${post.id}`, className: "text-yellow-600 hover:text-yellow-700", title: "\uC218\uC815", children: _jsx(Edit, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleClonePost(post.id), className: "text-green-600 hover:text-green-700", title: "\uBCF5\uC81C", children: _jsx(Copy, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleDeletePost(post.id), className: "text-red-600 hover:text-red-700", title: "\uC0AD\uC81C", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }) })] }, post.id))) })] }) })) }) }), _jsx("div", { className: "wp-card", children: _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-sm text-gray-700", children: [((currentPage - 1) * pageSize) + 1, "-", Math.min(currentPage * pageSize, totalItems), "\uAC1C / \uCD1D ", totalItems, "\uAC1C"] }), _jsxs("select", { value: pageSize, onChange: (e) => setPageSize(parseInt(e.target.value)), className: "wp-select w-20", children: [_jsx("option", { value: 10, children: "10" }), _jsx("option", { value: 20, children: "20" }), _jsx("option", { value: 50, children: "50" }), _jsx("option", { value: 100, children: "100" })] }), _jsx("span", { className: "text-sm text-gray-700", children: "\uAC1C\uC529 \uBCF4\uAE30" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setCurrentPage(Math.max(1, currentPage - 1)), disabled: currentPage === 1, className: "wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed", children: "\uC774\uC804" }), _jsx("div", { className: "flex items-center gap-1", children: Array.from({ length: Math.min(5, Math.ceil(totalItems / pageSize)) }, (_, i) => {
                                            const page = currentPage - 2 + i;
                                            if (page < 1 || page > Math.ceil(totalItems / pageSize))
                                                return null;
                                            return (_jsx("button", { onClick: () => setCurrentPage(page), className: `px-3 py-1 text-sm rounded ${page === currentPage
                                                    ? 'bg-admin-blue text-white'
                                                    : 'text-gray-700 hover:bg-gray-100'}`, children: page }, page));
                                        }) }), _jsx("button", { onClick: () => setCurrentPage(Math.min(Math.ceil(totalItems / pageSize), currentPage + 1)), disabled: currentPage === Math.ceil(totalItems / pageSize), className: "wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed", children: "\uB2E4\uC74C" })] })] }) }) })] }));
};
export default AllPosts;
//# sourceMappingURL=AllPosts.js.map