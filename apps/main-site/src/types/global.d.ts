// Global DOM and JSX type declarations
declare global {
  // Ensure JSX namespace is available
  namespace JSX {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface IntrinsicElements extends globalThis.JSX.IntrinsicElements {}
  }
}

export {};