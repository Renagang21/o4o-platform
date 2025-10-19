export declare class ValidationError extends Error {
    details?: any;
    constructor(message: string, details?: any);
}
export declare class NotFoundError extends Error {
    constructor(message: string);
}
export declare class ConflictError extends Error {
    constructor(message: string);
}
export declare class ForbiddenError extends Error {
    constructor(message: string);
}
//# sourceMappingURL=index.d.ts.map