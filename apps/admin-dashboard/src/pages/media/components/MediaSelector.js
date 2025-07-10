import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { X, Search, Grid3X3, List, Check, Upload } from 'lucide-react';
import { ContentApi } from '@/api/contentApi';
import MediaGrid from './MediaGrid';
import MediaList from './MediaList';
import MediaUploader from './MediaUploader';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';
const MediaSelector = ({ multiple = true, allowedTypes = ['image'], onSelect, onClose, maxFiles = 10, initialSelection = [] }) => {
    const [selectedFiles, setSelectedFiles] = useState(initialSelection);
    const [viewMode, setViewMode] = useState('grid');
    const [showUploader, setShowUploader] = useState(false);
    const [filters, setFilters] = useState({
        searchTerm: '',
        fileType: allowedTypes.length === 1 ? allowedTypes[0] : ''
    });
    const { ref: loadMoreRef, inView } = useInView();
    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, refetch } = useInfiniteQuery({
        queryKey: ['mediaFiles', filters],
        queryFn: async ({ pageParam = 1 }) => {
            const response = await ContentApi.getMediaFiles(pageParam, 50, undefined, filters.fileType, filters.searchTerm);
            return response;
        },
        getNextPageParam: (lastPage) => {
            const { pagination } = lastPage;
            if (pagination && pagination.currentPage < pagination.totalPages) {
                return pagination.currentPage + 1;
            }
            return undefined;
        },
        initialPageParam: 1
    });
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
    const allFiles = data?.pages.flatMap(page => page.data) || [];
    const selectedFileObjects = allFiles.filter(file => selectedFiles.includes(file.id));
    const handleFileSelect = (fileId) => {
        if (multiple) {
            setSelectedFiles(prev => {
                if (prev.includes(fileId)) {
                    return prev.filter(id => id !== fileId);
                }
                if (prev.length >= maxFiles) {
                    toast.error(`최대 ${maxFiles}개까지 선택할 수 있습니다.`);
                    return prev;
                }
                return [...prev, fileId];
            });
        }
        else {
            setSelectedFiles([fileId]);
        }
    };
    const handleSelectAll = () => {
        if (selectedFiles.length === allFiles.length) {
            setSelectedFiles([]);
        }
        else {
            const fileIds = allFiles.slice(0, maxFiles).map(file => file.id);
            setSelectedFiles(fileIds);
            if (allFiles.length > maxFiles) {
                toast.error(`최대 ${maxFiles}개까지 선택할 수 있습니다.`);
            }
        }
    };
    const handleConfirmSelection = () => {
        onSelect(selectedFileObjects);
    };
    const handleUploadComplete = async (files) => {
        try {
            await ContentApi.uploadFiles(files);
            toast.success(`${files.length}개 파일이 업로드되었습니다.`);
            refetch();
        }
        catch (error) {
            console.error('Upload failed:', error);
            toast.error('업로드에 실패했습니다.');
        }
    };
    const updateFilter = (key, value) => {
        setFilters(prev => ({
            ...prev,
            [key]: value
        }));
    };
    return (_jsxs("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: [_jsxs("div", { className: "bg-white rounded-lg max-w-6xl w-full mx-4 h-[90vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "\uBBF8\uB514\uC5B4 \uC120\uD0DD" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [_jsx("div", { className: "flex-1", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx("input", { type: "text", placeholder: "\uD30C\uC77C\uBA85\uC73C\uB85C \uAC80\uC0C9...", value: filters.searchTerm, onChange: (e) => updateFilter('searchTerm', e.target.value), className: "wp-input pl-10" })] }) }), _jsxs("div", { className: "flex gap-2", children: [allowedTypes.length > 1 && (_jsxs("select", { value: filters.fileType, onChange: (e) => updateFilter('fileType', e.target.value), className: "wp-select", children: [_jsx("option", { value: "", children: "\uBAA8\uB4E0 \uD30C\uC77C" }), allowedTypes.map(type => (_jsx("option", { value: type, children: type }, type)))] })), _jsxs("div", { className: "flex items-center bg-gray-100 rounded-lg p-1", children: [_jsx("button", { onClick: () => setViewMode('grid'), className: `p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`, title: "\uADF8\uB9AC\uB4DC \uBDF0", children: _jsx(Grid3X3, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => setViewMode('list'), className: `p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`, title: "\uB9AC\uC2A4\uD2B8 \uBDF0", children: _jsx(List, { className: "w-4 h-4" }) })] }), _jsxs("button", { onClick: () => setShowUploader(true), className: "wp-button-secondary", children: [_jsx(Upload, { className: "w-4 h-4 mr-2" }), "\uC5C5\uB85C\uB4DC"] })] })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto", children: isLoading ? (_jsxs("div", { className: "flex items-center justify-center h-full", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uBBF8\uB514\uC5B4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] })) : (_jsxs(_Fragment, { children: [viewMode === 'grid' ? (_jsx(MediaGrid, { files: allFiles, selectedFiles: selectedFiles, onFileSelect: handleFileSelect, onSelectAll: handleSelectAll })) : (_jsx(MediaList, { files: allFiles, selectedFiles: selectedFiles, onFileSelect: handleFileSelect, onSelectAll: handleSelectAll })), hasNextPage && (_jsx("div", { ref: loadMoreRef, className: "p-4 text-center", children: isFetchingNextPage && (_jsxs(_Fragment, { children: [_jsx("div", { className: "loading-spinner inline-block" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uB354 \uBD88\uB7EC\uC624\uB294 \uC911..." })] })) }))] })) }), _jsx("div", { className: "p-6 border-t border-gray-200 bg-gray-50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-sm text-gray-600", children: selectedFiles.length > 0 ? (_jsxs("span", { children: [selectedFiles.length, "\uAC1C \uC120\uD0DD\uB428"] })) : (_jsx("span", { children: "\uD30C\uC77C\uC744 \uC120\uD0DD\uD558\uC138\uC694" })) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: onClose, className: "wp-button-secondary", children: "\uCDE8\uC18C" }), _jsxs("button", { onClick: handleConfirmSelection, disabled: selectedFiles.length === 0, className: "wp-button-primary disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(Check, { className: "w-4 h-4 mr-2" }), "\uC120\uD0DD \uC644\uB8CC"] })] })] }) })] }), showUploader && (_jsx(MediaUploader, { onUpload: handleUploadComplete, onClose: () => setShowUploader(false), allowedTypes: allowedTypes.map(type => `${type}/*`) }))] }));
};
export default MediaSelector;
//# sourceMappingURL=MediaSelector.js.map