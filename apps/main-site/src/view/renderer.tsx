import { Suspense, useState, useEffect, useMemo, memo } from 'react';
import { useLocation } from 'react-router-dom';
import { loadView, getRouteParams } from './loader';
import { checkCondition } from './helpers/condition';
import { executeLoop, resolveProps } from './helpers/loop';
import { useFetch } from './helpers/fetch';
import type { ViewSchema, ViewComponentSchema, ViewContext } from './types';
import { FunctionRegistry, UIComponentRegistry } from '@/components/registry';
import { LayoutRegistry } from '@/layouts/registry';

// Performance: Function Component result cache
const functionResultCache = new Map<string, any>();

// Performance: Generate cache key for function components
function generateCacheKey(funcName: string, props: Record<string, any>, context: ViewContext): string {
  return `${funcName}-${JSON.stringify(props)}-${context.router.pathname}`;
}

export function ViewRenderer() {
  const location = useLocation();
  const [view, setView] = useState<ViewSchema | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadView(location.pathname)
      .then(setView)
      .finally(() => setLoading(false));
  }, [location.pathname]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!view) {
    return <div className="flex items-center justify-center min-h-screen">View not found</div>;
  }

  return <ViewContent view={view} />;
}

// Performance: Memoize ViewContent to avoid unnecessary re-renders
const ViewContent = memo(function ViewContent({ view }: { view: ViewSchema }) {
  const location = useLocation();
  const context = useViewContext(location.pathname);

  // Performance: Memoize component rendering
  const rendered = useMemo(() => {
    return view.components.flatMap((component, index) => {
      return renderComponent(component, context, index);
    });
  }, [view.components, context]);

  const Layout = LayoutRegistry[view.layout.type] || LayoutRegistry['DefaultLayout'];

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Layout view={view}>{rendered}</Layout>
    </Suspense>
  );
});

function renderComponent(
  component: ViewComponentSchema,
  context: ViewContext,
  index: number | string
): React.ReactNode {
  // 1. Condition check
  if (component.if && !checkCondition(component.if, context)) {
    return null;
  }

  // 2. Loop handling
  if (component.loop) {
    const data = context.data || {};
    const loops = executeLoop(component.loop, { data });

    return loops.map((loopItem, i) => {
      const subProps = resolveProps(component.props || {}, loopItem.local);
      return renderSingleComponent(component.type, subProps, context, `${index}-${i}`);
    });
  }

  // 3. Single component
  return renderSingleComponent(component.type, component.props || {}, context, index);
}

function renderSingleComponent(
  type: string,
  props: Record<string, any>,
  context: ViewContext,
  key: string | number
): React.ReactNode {
  const componentProps = { ...props };

  // Handle fetch if present
  if (componentProps.fetch) {
    return <ComponentWithFetch type={type} props={componentProps} context={context} key={key} />;
  }

  // Check if it's a Function Component
  const func = FunctionRegistry[type];
  if (func) {
    // Performance: Use cached result if available
    const cacheKey = generateCacheKey(type, componentProps, context);
    let result = functionResultCache.get(cacheKey);

    if (!result) {
      result = func(componentProps, context);
      functionResultCache.set(cacheKey, result);

      // Performance: Clear cache when it gets too large (prevent memory leak)
      if (functionResultCache.size > 100) {
        const firstKey = functionResultCache.keys().next().value;
        if (firstKey) functionResultCache.delete(firstKey);
      }
    }

    const UIComponent = UIComponentRegistry[result.type];

    if (!UIComponent) {
      return (
        <div key={key} className="p-4 text-red-500 border border-red-300 rounded">
          UI Component not found: {result.type}
        </div>
      );
    }

    return <UIComponent key={key} {...result.props} context={context} />;
  }

  // Otherwise, try to get UI component directly
  const Component = UIComponentRegistry[type];

  if (!Component) {
    return (
      <div key={key} className="p-4 text-red-500 border border-red-300 rounded">
        Component not found: {type}
      </div>
    );
  }

  return <Component key={key} {...componentProps} context={context} />;
}

function ComponentWithFetch({
  type,
  props,
  context,
}: {
  type: string;
  props: Record<string, any>;
  context: ViewContext;
  key?: string | number;
}) {
  const { data, isLoading, error } = useFetch(props.fetch);

  if (isLoading) {
    return <div className="p-4">Loading data...</div>;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
      </div>
    );
  }

  // Add data to props
  const propsWithData = { ...props, data };

  // Check if it's a Function Component
  const func = FunctionRegistry[type];
  if (func) {
    // Performance: Use cached result if available
    const cacheKey = generateCacheKey(type, propsWithData, context);
    let result = functionResultCache.get(cacheKey);

    if (!result) {
      result = func(propsWithData, context);
      functionResultCache.set(cacheKey, result);

      // Performance: Clear cache when it gets too large
      if (functionResultCache.size > 100) {
        const firstKey = functionResultCache.keys().next().value;
        if (firstKey) functionResultCache.delete(firstKey);
      }
    }

    const UIComponent = UIComponentRegistry[result.type];

    if (!UIComponent) {
      return <div className="p-4 text-red-500">UI Component not found: {result.type}</div>;
    }

    return <UIComponent {...result.props} context={context} />;
  }

  // Otherwise try direct UI component
  const Component = UIComponentRegistry[type];

  if (!Component) {
    return <div className="p-4 text-red-500">Component not found: {type}</div>;
  }

  return <Component {...propsWithData} context={context} />;
}

function useViewContext(pathname: string): ViewContext {
  const location = useLocation();

  const params = useMemo(() => {
    return getRouteParams(pathname);
  }, [pathname]);

  const query = useMemo(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryObj: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      queryObj[key] = value;
    });
    return queryObj;
  }, [location.search]);

  return {
    user: null, // TODO: Get from auth context
    router: { pathname, search: location.search, hash: location.hash },
    params,
    query,
    data: {},
  };
}
