declare module 'zustand/middleware' {
  export { persist } from 'zustand/middleware/persist';
  export { devtools } from 'zustand/middleware/devtools';
  export { subscribeWithSelector } from 'zustand/middleware/subscribeWithSelector';
  export { combine } from 'zustand/middleware/combine';
  export { redux } from 'zustand/middleware/redux';
  export { createJSONStorage } from 'zustand/middleware/persist';
  export type { StateStorage, StorageValue, PersistStorage, PersistOptions } from 'zustand/middleware/persist';
  export type { DevtoolsOptions, NamedSet } from 'zustand/middleware/devtools';
}