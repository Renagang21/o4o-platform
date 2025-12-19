/**
 * Member-Yaksa Lifecycle Exports
 */

export { install } from './install.js';
export { activate } from './activate.js';
export { deactivate } from './deactivate.js';

// Lifecycle object for module loader
export const lifecycle = {
  install: async (dataSource: any) => {
    const { install } = await import('./install.js');
    return install(dataSource);
  },
  activate: async (dataSource: any) => {
    const { activate } = await import('./activate.js');
    return activate(dataSource);
  },
  deactivate: async (dataSource: any) => {
    const { deactivate } = await import('./deactivate.js');
    return deactivate(dataSource);
  },
};

export default lifecycle;
