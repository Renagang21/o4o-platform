import { FunctionRegistry } from './function';
import { UIComponentRegistry } from './ui.tsx';

// Combined registry for ViewRenderer
export const ComponentRegistry = {
  ...FunctionRegistry,
  ...UIComponentRegistry,
};

export { FunctionRegistry, UIComponentRegistry };
