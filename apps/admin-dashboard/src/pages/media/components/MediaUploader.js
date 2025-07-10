import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, File, Image, Video, Music, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { formatFileSize } from '@/utils/format';
const MediaUploader = ({ onUpload, onClose, currentFolder, maxFiles = 20, maxFileSize = 100 * 1024 * 1024, allowedTypes = ['image/*', 'video/*', 'audio/*', 'application/pdf'] }) => {
    const [uploadingFiles, setUploadingFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            rejectedFiles.forEach(({ file, errors }) => {
                errors.forEach((error) => {
                    let message = '업로드할 수 없는 파일입니다.';
                    if (error.code === 'file-too-large') {
                        message = `파일 크기가 너무 큽니다. (최대 ${formatFileSize(maxFileSize)})`;
                    }
                    else if (error.code === 'file-invalid-type') {
                        message = '지원하지 않는 파일 형식입니다.';
                    }
                    setUploadingFiles(prev => [...prev, {
                            file,
                            progress: 0,
                            status: 'error',
                            error: message
                        }]);
                });
            });
        }
        const newFiles = acceptedFiles.map(file => ({
            file,
            progress: 0,
            status: 'pending'
        }));
        setUploadingFiles(prev => [...prev, ...newFiles]);
    }, [maxFileSize]);
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        maxFiles,
        maxSize: maxFileSize,
        accept: allowedTypes.reduce((acc, type) => {
            const [category, extension] = type.split('/');
            if (extension === '*') {
                if (category === 'image') {
                    acc[type] = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg'];
                }
                else if (category === 'video') {
                    acc[type] = ['.mp4', '.webm', '.ogg', '.mov'];
                }
                else if (category === 'audio') {
                    acc[type] = ['.mp3', '.wav', '.ogg', '.m4a'];
                }
            }
            else {
                acc[type] = [`.${extension}`];
            }
            return acc;
        }, {})
    });
    const startUpload = async () => {
        const pendingFiles = uploadingFiles.filter(f => f.status === 'pending');
        if (pendingFiles.length === 0)
            return;
        setIsUploading(true);
        setUploadingFiles(prev => prev.map(f => f.status === 'pending' ? { ...f, status: 'uploading' } : f));
        try {
            const progressInterval = setInterval(() => {
                setUploadingFiles(prev => prev.map(f => {
                    if (f.status === 'uploading' && f.progress < 90) {
                        return { ...f, progress: f.progress + 10 };
                    }
                    return f;
                }));
            }, 300);
            await onUpload(pendingFiles.map(f => f.file));
            clearInterval(progressInterval);
            setUploadingFiles(prev => prev.map(f => f.status === 'uploading' ? { ...f, status: 'success', progress: 100 } : f));
            setTimeout(() => {
                onClose();
            }, 1000);
        }
        catch (error) {
            setUploadingFiles(prev => prev.map(f => f.status === 'uploading'
                ? { ...f, status: 'error', error: '업로드 실패' }
                : f));
        }
        finally {
            setIsUploading(false);
        }
    };
    const removeFile = (index) => {
        setUploadingFiles(prev => prev.filter((_, i) => i !== index));
    };
    const getFileIcon = (file) => {
        const type = file.type.split('/')[0];
        switch (type) {
            case 'image':
                return _jsx(Image, { className: "w-8 h-8 text-blue-500" });
            case 'video':
                return _jsx(Video, { className: "w-8 h-8 text-purple-500" });
            case 'audio':
                return _jsx(Music, { className: "w-8 h-8 text-green-500" });
            default:
                if (file.type === 'application/pdf') {
                    return _jsx(FileText, { className: "w-8 h-8 text-red-500" });
                }
                return _jsx(File, { className: "w-8 h-8 text-gray-500" });
        }
    };
    const canUpload = uploadingFiles.some(f => f.status === 'pending') && !isUploading;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-900", children: "\uD30C\uC77C \uC5C5\uB85C\uB4DC" }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600", disabled: isUploading, children: _jsx(X, { className: "w-6 h-6" }) })] }), currentFolder && (_jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["\uC5C5\uB85C\uB4DC \uC704\uCE58: ", currentFolder] }))] }), _jsx("div", { className: "p-6", children: _jsxs("div", { ...getRootProps(), className: `border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive
                            ? 'border-blue-400 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'}`, children: [_jsx("input", { ...getInputProps() }), _jsx(Upload, { className: "w-12 h-12 text-gray-400 mx-auto mb-4" }), isDragActive ? (_jsx("p", { className: "text-lg text-blue-600", children: "\uD30C\uC77C\uC744 \uC5EC\uAE30\uC5D0 \uB193\uC73C\uC138\uC694..." })) : (_jsxs(_Fragment, { children: [_jsx("p", { className: "text-lg text-gray-700 mb-2", children: "\uD30C\uC77C\uC744 \uB4DC\uB798\uADF8\uD558\uAC70\uB098 \uD074\uB9AD\uD558\uC5EC \uC120\uD0DD\uD558\uC138\uC694" }), _jsxs("p", { className: "text-sm text-gray-500", children: ["\uCD5C\uB300 ", maxFiles, "\uAC1C, \uD30C\uC77C\uB2F9 \uCD5C\uB300 ", formatFileSize(maxFileSize)] })] }))] }) }), uploadingFiles.length > 0 && (_jsxs("div", { className: "flex-1 overflow-y-auto px-6 pb-6", children: [_jsxs("h3", { className: "text-sm font-medium text-gray-900 mb-3", children: ["\uC5C5\uB85C\uB4DC \uD30C\uC77C (", uploadingFiles.length, "\uAC1C)"] }), _jsx("div", { className: "space-y-2", children: uploadingFiles.map((item, index) => (_jsxs("div", { className: `flex items-center gap-3 p-3 rounded-lg border ${item.status === 'error'
                                    ? 'border-red-200 bg-red-50'
                                    : 'border-gray-200 bg-gray-50'}`, children: [_jsx("div", { className: "flex-shrink-0", children: getFileIcon(item.file) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "text-sm font-medium text-gray-900 truncate", children: item.file.name }), _jsx("p", { className: "text-xs text-gray-500", children: formatFileSize(item.file.size) }), item.status === 'uploading' && (_jsx("div", { className: "mt-2", children: _jsx("div", { className: "bg-gray-200 rounded-full h-1.5", children: _jsx("div", { className: "bg-blue-500 h-1.5 rounded-full transition-all duration-300", style: { width: `${item.progress}%` } }) }) })), item.error && (_jsx("p", { className: "text-xs text-red-600 mt-1", children: item.error }))] }), _jsxs("div", { className: "flex-shrink-0", children: [item.status === 'pending' && !isUploading && (_jsx("button", { onClick: () => removeFile(index), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })), item.status === 'uploading' && (_jsx(Loader, { className: "w-5 h-5 text-blue-500 animate-spin" })), item.status === 'success' && (_jsx(CheckCircle, { className: "w-5 h-5 text-green-500" })), item.status === 'error' && (_jsx(AlertCircle, { className: "w-5 h-5 text-red-500" }))] })] }, index))) })] })), _jsx("div", { className: "p-6 border-t border-gray-200 bg-gray-50", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("p", { className: "text-sm text-gray-600", children: [uploadingFiles.filter(f => f.status === 'pending').length, "\uAC1C \uB300\uAE30 \uC911"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: onClose, disabled: isUploading, className: "wp-button-secondary", children: "\uCDE8\uC18C" }), _jsx("button", { onClick: startUpload, disabled: !canUpload, className: "wp-button-primary disabled:opacity-50 disabled:cursor-not-allowed", children: isUploading ? (_jsxs(_Fragment, { children: [_jsx(Loader, { className: "w-4 h-4 mr-2 animate-spin" }), "\uC5C5\uB85C\uB4DC \uC911..."] })) : (_jsxs(_Fragment, { children: [_jsx(Upload, { className: "w-4 h-4 mr-2" }), "\uC5C5\uB85C\uB4DC"] })) })] })] }) })] }) }));
};
export default MediaUploader;
//# sourceMappingURL=MediaUploader.js.map