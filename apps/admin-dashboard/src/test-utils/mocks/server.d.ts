export declare const server: import("msw/node").SetupServerApi;
export declare const mswTestUtils: {
    start: () => void;
    stop: () => void;
    reset: () => void;
    use: (...handlers: Parameters<typeof server.use>) => void;
};
//# sourceMappingURL=server.d.ts.map