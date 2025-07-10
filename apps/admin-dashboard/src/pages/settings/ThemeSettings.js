import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Check, Palette, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../shared/components/theme/MultiThemeContext';
const themes = {
    light: { name: 'light', displayName: 'Light', description: '밝고 깨끗한 테마' },
    dark: { name: 'dark', displayName: 'Dark', description: '어두운 색상의 테마' },
    evening: { name: 'evening', displayName: 'Evening', description: '저녁 분위기의 테마' },
    noon: { name: 'noon', displayName: 'Noon', description: '한낮의 밝은 테마' },
    dusk: { name: 'dusk', displayName: 'Dusk', description: '황혼의 따뜻한 테마' },
    afternoon: { name: 'afternoon', displayName: 'Afternoon', description: '오후의 부드러운 테마' },
    twilight: { name: 'twilight', displayName: 'Twilight', description: '어스름한 테마' }
};
const ThemeSettings = () => {
    const { theme: currentThemeName, setTheme } = useTheme();
    const currentTheme = themes[currentThemeName] || themes.light;
    const [selectedTheme, setSelectedTheme] = useState(currentTheme.name);
    const [isApplying, setIsApplying] = useState(false);
    const handleApplyTheme = () => {
        setIsApplying(true);
        setTheme(selectedTheme);
        setTimeout(() => {
            setIsApplying(false);
        }, 500);
    };
    const getThemeColors = (themeName) => {
        const colorMappings = {
            light: { bg: '#ffffff', accent: '#3b82f6', text: '#1a1a1a' },
            dark: { bg: '#1a1a1a', accent: '#60a5fa', text: '#f5f5f5' },
            evening: { bg: '#1a1625', accent: '#ff6b9d', text: '#e8e3f5' },
            noon: { bg: '#fefefe', accent: '#ffd93d', text: '#1a1a1a' },
            dusk: { bg: '#2b2d42', accent: '#ee6c4d', text: '#edf2f4' },
            afternoon: { bg: '#faf7f0', accent: '#dda15e', text: '#3e3e3e' },
            twilight: { bg: '#0f0e17', accent: '#a685e2', text: '#e7f6f2' }
        };
        return colorMappings[themeName];
    };
    const getThemeIcon = (themeName) => {
        if (themeName === 'light' || themeName === 'noon' || themeName === 'afternoon') {
            return _jsx(Sun, { className: "w-5 h-5" });
        }
        return _jsx(Moon, { className: "w-5 h-5" });
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-900", children: "\uD14C\uB9C8 \uC124\uC815" }), _jsx("p", { className: "text-gray-600 mt-1", children: "\uC2DC\uC2A4\uD15C \uC804\uCCB4\uC758 \uC2DC\uAC01\uC801 \uD14C\uB9C8\uB97C \uC120\uD0DD\uD558\uACE0 \uAD00\uB9AC\uD569\uB2C8\uB2E4" })] }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsxs("h2", { className: "text-lg font-medium flex items-center gap-2", children: [_jsx(Palette, { className: "w-5 h-5" }), "\uD14C\uB9C8 \uC120\uD0DD"] }) }), _jsxs("div", { className: "wp-card-body", children: [_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: Object.values(themes).map((theme) => {
                                    const colors = getThemeColors(theme.name);
                                    const isSelected = selectedTheme === theme.name;
                                    const isCurrent = currentTheme.name === theme.name;
                                    return (_jsxs("div", { onClick: () => setSelectedTheme(theme.name), className: `
                    relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200
                    ${isSelected
                                            ? 'border-blue-500 shadow-lg transform scale-105'
                                            : 'border-gray-200 hover:border-gray-300 hover:shadow-md'}
                  `, children: [isCurrent && (_jsx("div", { className: "absolute -top-2 -right-2 z-10", children: _jsx("span", { className: "inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800", children: "\uD604\uC7AC \uC0AC\uC6A9 \uC911" }) })), _jsx("div", { className: "mb-4", children: _jsx("div", { className: "w-full h-24 rounded-md shadow-inner relative overflow-hidden", style: { backgroundColor: colors.bg }, children: _jsxs("div", { className: "absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2", children: [_jsx("div", { className: "w-6 h-6 rounded-full shadow-sm", style: { backgroundColor: colors.bg } }), _jsx("div", { className: "w-6 h-6 rounded-full shadow-sm", style: { backgroundColor: colors.accent } }), _jsx("div", { className: "w-6 h-6 rounded-full shadow-sm", style: { backgroundColor: colors.text } })] }) }) }), _jsxs("div", { className: "text-center", children: [_jsxs("div", { className: "flex items-center justify-center gap-1 mb-1", children: [getThemeIcon(theme.name), _jsx("h3", { className: "font-semibold text-sm", children: theme.displayName })] }), _jsx("p", { className: "text-xs text-gray-500", children: theme.description })] }), isSelected && (_jsx("div", { className: "absolute top-2 right-2", children: _jsx("div", { className: "bg-blue-500 text-white rounded-full p-1", children: _jsx(Check, { className: "w-3 h-3" }) }) }))] }, theme.name));
                                }) }), _jsxs("div", { className: "mt-6 flex justify-end gap-3", children: [_jsx("button", { onClick: () => setSelectedTheme(currentTheme.name), className: "px-4 py-2 text-sm text-gray-700 hover:text-gray-900", disabled: isApplying, children: "\uCDE8\uC18C" }), _jsx("button", { onClick: handleApplyTheme, disabled: selectedTheme === currentTheme.name || isApplying, className: `
                px-6 py-2 text-sm font-medium rounded-md transition-colors
                ${selectedTheme === currentTheme.name
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 text-white hover:bg-blue-700'}
              `, children: isApplying ? '적용 중...' : '테마 적용' })] })] })] }), _jsxs("div", { className: "wp-card", children: [_jsx("div", { className: "wp-card-header", children: _jsx("h2", { className: "text-lg font-medium", children: "\uD14C\uB9C8 \uC815\uBCF4" }) }), _jsx("div", { className: "wp-card-body", children: _jsxs("div", { className: "prose prose-sm max-w-none", children: [_jsx("p", { className: "text-gray-600", children: "\uD14C\uB9C8\uB294 \uC2DC\uC2A4\uD15C \uC804\uCCB4\uC758 \uC0C9\uC0C1 \uC2A4\uD0B4\uC744 \uBCC0\uACBD\uD569\uB2C8\uB2E4. \uAC01 \uD14C\uB9C8\uB294 \uB2E4\uC74C\uACFC \uAC19\uC740 \uD2B9\uC9D5\uC744 \uAC00\uC9D1\uB2C8\uB2E4:" }), _jsxs("ul", { className: "text-gray-600", children: [_jsxs("li", { children: [_jsx("strong", { children: "Light / Noon / Afternoon" }), ": \uBC1D\uC740 \uBC30\uACBD\uC758 \uD14C\uB9C8\uB85C \uC8FC\uAC04 \uC0AC\uC6A9\uC5D0 \uC801\uD569\uD569\uB2C8\uB2E4."] }), _jsxs("li", { children: [_jsx("strong", { children: "Dark / Evening / Dusk / Twilight" }), ": \uC5B4\uB450\uC6B4 \uBC30\uACBD\uC758 \uD14C\uB9C8\uB85C \uC57C\uAC04 \uC0AC\uC6A9\uC774\uB098 \uB208\uC758 \uD53C\uB85C\uB97C \uC904\uC774\uB294\uB370 \uC801\uD569\uD569\uB2C8\uB2E4."] })] }), _jsx("p", { className: "text-gray-600", children: "\uC120\uD0DD\uD55C \uD14C\uB9C8\uB294 \uBE0C\uB77C\uC6B0\uC800\uC5D0 \uC800\uC7A5\uB418\uBA70, \uB2E4\uC74C \uBC29\uBB38 \uC2DC\uC5D0\uB3C4 \uC720\uC9C0\uB429\uB2C8\uB2E4." })] }) })] })] }));
};
export default ThemeSettings;
//# sourceMappingURL=ThemeSettings.js.map