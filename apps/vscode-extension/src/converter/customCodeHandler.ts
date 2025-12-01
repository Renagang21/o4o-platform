export function handleCustomCode(code: string): any {
    // The spec requires separating HTML, CSS, and JS.
    // Since we are receiving a React JSX snippet, it's mostly JS/HTML combined.
    // We will store the JSX code in the 'html' field for now as a representation,
    // and leave css/javascript empty unless we can parse them out.
    // In a future iteration, we could use a more advanced parser to separate styled-components or inline styles.

    return {
        type: 'o4o/custom-code',
        attributes: {
            html: code,
            css: '',
            javascript: ''
        }
    };
}
