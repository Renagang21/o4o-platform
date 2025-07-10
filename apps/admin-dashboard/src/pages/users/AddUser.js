import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, ArrowLeft, User, Mail, Building } from 'lucide-react';
import { ROLE_LABELS, BUSINESS_TYPES } from '@/types/user';
import { UserApi } from '@/api/userApi';
import toast from 'react-hot-toast';
const AddUser = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const isEditMode = Boolean(userId);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: 'customer',
        password: '',
        sendWelcomeEmail: true
    });
    useEffect(() => {
        if (isEditMode && userId) {
            loadUser(userId);
        }
    }, [userId, isEditMode]);
    const loadUser = async (id) => {
        try {
            setLoading(true);
            const response = await UserApi.getUser(id);
            const user = response.data;
            setFormData({
                name: user.name,
                email: user.email,
                role: user.role,
                businessInfo: user.businessInfo,
                sendWelcomeEmail: false
            });
        }
        catch (error) {
            console.error('Failed to load user:', error);
            toast.error('사용자 정보를 불러오는데 실패했습니다.');
            navigate('/users');
        }
        finally {
            setLoading(false);
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.email.trim()) {
            toast.error('이름과 이메일을 입력해주세요.');
            return;
        }
        if (!isEditMode && !formData.password) {
            toast.error('비밀번호를 입력해주세요.');
            return;
        }
        try {
            setLoading(true);
            if (isEditMode && userId) {
                await UserApi.updateUser(userId, formData);
                toast.success('사용자 정보가 수정되었습니다.');
            }
            else {
                await UserApi.createUser(formData);
                toast.success('사용자가 생성되었습니다.');
            }
            navigate('/users');
        }
        catch (error) {
            console.error('Failed to save user:', error);
            toast.error(error.response?.data?.message || '저장에 실패했습니다.');
        }
        finally {
            setLoading(false);
        }
    };
    const updateFormData = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };
    const updateBusinessInfo = (field, value) => {
        setFormData(prev => ({
            ...prev,
            businessInfo: {
                ...prev.businessInfo,
                [field]: value
            }
        }));
    };
    const needsBusinessInfo = formData.role === 'business' || formData.role === 'affiliate';
    if (loading && isEditMode) {
        return (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx("div", { className: "loading-spinner" }), _jsx("span", { className: "ml-2 text-gray-600", children: "\uC0AC\uC6A9\uC790 \uC815\uBCF4\uB97C \uBD88\uB7EC\uC624\uB294 \uC911..." })] }));
    }
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("button", { onClick: () => navigate('/users'), className: "wp-button-secondary", children: [_jsx(ArrowLeft, { className: "w-4 h-4 mr-2" }), "\uB3CC\uC544\uAC00\uAE30"] }), _jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: isEditMode ? '사용자 수정' : '새 사용자 추가' }), _jsx("p", { className: "text-gray-600 mt-1", children: isEditMode ? '사용자 정보를 수정합니다' : '새로운 사용자를 추가합니다' })] })] }), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "wp-card-title", children: [_jsx(User, { className: "w-5 h-5 mr-2" }), "\uAE30\uBCF8 \uC815\uBCF4"] }) }), _jsxs("div", { className: "wp-card-body space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "name", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC774\uB984 *" }), _jsx("input", { id: "name", type: "text", value: formData.name, onChange: (e) => updateFormData('name', e.target.value), className: "wp-input", required: true })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "email", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC774\uBA54\uC77C *" }), _jsx("input", { id: "email", type: "email", value: formData.email, onChange: (e) => updateFormData('email', e.target.value), className: "wp-input", required: true })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "role", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC5ED\uD560 *" }), _jsx("select", { id: "role", value: formData.role, onChange: (e) => updateFormData('role', e.target.value), className: "wp-select", required: true, children: Object.entries(ROLE_LABELS).map(([role, label]) => (_jsx("option", { value: role, children: label }, role))) })] }), !isEditMode && (_jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uBE44\uBC00\uBC88\uD638 *" }), _jsx("input", { id: "password", type: "password", value: formData.password || '', onChange: (e) => updateFormData('password', e.target.value), className: "wp-input", required: !isEditMode, minLength: 8 }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "\uCD5C\uC18C 8\uC790 \uC774\uC0C1 \uC785\uB825\uD574\uC8FC\uC138\uC694" })] }))] })] })] }), needsBusinessInfo && (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "wp-card-title", children: [_jsx(Building, { className: "w-5 h-5 mr-2" }), "\uC0AC\uC5C5\uCCB4 \uC815\uBCF4"] }) }), _jsxs("div", { className: "wp-card-body space-y-4", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "businessName", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC0AC\uC5C5\uCCB4\uBA85 *" }), _jsx("input", { id: "businessName", type: "text", value: formData.businessInfo?.businessName || '', onChange: (e) => updateBusinessInfo('businessName', e.target.value), className: "wp-input", required: needsBusinessInfo })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "businessType", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC0AC\uC5C5\uCCB4 \uC720\uD615 *" }), _jsxs("select", { id: "businessType", value: formData.businessInfo?.businessType || '', onChange: (e) => updateBusinessInfo('businessType', e.target.value), className: "wp-select", required: needsBusinessInfo, children: [_jsx("option", { value: "", children: "\uC0AC\uC5C5\uCCB4 \uC720\uD615 \uC120\uD0DD" }), BUSINESS_TYPES.map((type) => (_jsx("option", { value: type, children: type }, type)))] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "businessNumber", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC0AC\uC5C5\uC790\uB4F1\uB85D\uBC88\uD638" }), _jsx("input", { id: "businessNumber", type: "text", value: formData.businessInfo?.businessNumber || '', onChange: (e) => updateBusinessInfo('businessNumber', e.target.value), className: "wp-input", placeholder: "000-00-00000" })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "representativeName", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uB300\uD45C\uC790\uBA85" }), _jsx("input", { id: "representativeName", type: "text", value: formData.businessInfo?.representativeName || '', onChange: (e) => updateBusinessInfo('representativeName', e.target.value), className: "wp-input" })] })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "businessAddress", className: "block text-sm font-medium text-gray-700 mb-1", children: "\uC0AC\uC5C5\uC7A5 \uC8FC\uC18C" }), _jsx("input", { id: "businessAddress", type: "text", value: formData.businessInfo?.businessAddress || '', onChange: (e) => updateBusinessInfo('businessAddress', e.target.value), className: "wp-input" })] })] })] })), !isEditMode && (_jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h3", { className: "wp-card-title", children: [_jsx(Mail, { className: "w-5 h-5 mr-2" }), "\uC774\uBA54\uC77C \uC124\uC815"] }) }), _jsx("div", { className: "wp-card-body", children: _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: formData.sendWelcomeEmail, onChange: (e) => updateFormData('sendWelcomeEmail', e.target.checked), className: "rounded border-gray-300 text-admin-blue focus:ring-admin-blue" }), _jsx("span", { className: "text-sm text-gray-700", children: "\uD658\uC601 \uC774\uBA54\uC77C \uBC1C\uC1A1 (\uB85C\uADF8\uC778 \uC815\uBCF4 \uD3EC\uD568)" })] }) })] })), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("button", { type: "button", onClick: () => navigate('/users'), className: "wp-button-secondary", children: "\uCDE8\uC18C" }), _jsx("button", { type: "submit", disabled: loading, className: "wp-button-primary", children: loading ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "loading-spinner w-4 h-4 mr-2" }), "\uC800\uC7A5 \uC911..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-4 h-4 mr-2" }), isEditMode ? '수정하기' : '추가하기'] })) })] })] })] }));
};
export default AddUser;
//# sourceMappingURL=AddUser.js.map