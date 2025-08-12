// Helper utility functions
export const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
export const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
export const throttle = (func, wait) => {
    let isThrottled = false;
    let lastArgs = null;
    return (...args) => {
        if (isThrottled) {
            lastArgs = args;
            return;
        }
        func(...args);
        isThrottled = true;
        setTimeout(() => {
            isThrottled = false;
            if (lastArgs !== null) {
                func(...lastArgs);
                lastArgs = null;
            }
        }, wait);
    };
};
export const parseQueryString = (query) => {
    const params = new URLSearchParams(query);
    const result = {};
    params.forEach((value, key) => {
        result[key] = value;
    });
    return result;
};
export const buildQueryString = (params) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            searchParams.append(key, String(value));
        }
    });
    return searchParams.toString();
};
export const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
export const isValidPhone = (phone) => {
    const phoneRegex = /^(\+82|0)1[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
    return phoneRegex.test(phone);
};
export const generateId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
export const truncateText = (text, maxLength, suffix = '...') => {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
};
export const groupBy = (array, key) => {
    return array.reduce((result, item) => {
        const groupKey = String(item[key]);
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
};
export const sortBy = (array, key, order = 'asc') => {
    return [...array].sort((a, b) => {
        const aValue = a[key];
        const bValue = b[key];
        if (aValue < bValue)
            return order === 'asc' ? -1 : 1;
        if (aValue > bValue)
            return order === 'asc' ? 1 : -1;
        return 0;
    });
};
export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
export const range = (start, end, step = 1) => {
    const result = [];
    for (let i = start; i < end; i += step) {
        result.push(i);
    }
    return result;
};
