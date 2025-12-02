import { Suspense, useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { loadView, getRouteParams } from './loader';
import { checkCondition } from './helpers/condition';
import { executeLoop, resolveProps } from './helpers/loop';
import { useFetch } from './helpers/fetch';
import type { ViewSchema, ViewComponentSchema, ViewContext } from './types';
import { FunctionRegistry, UIComponentRegistry } from '@/components/registry';
import { LayoutRegistry } from '@/layouts/registry';

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

function ViewContent({ view }: { view: ViewSchema }) {
  const location = useLocation();
  const context = useViewContext(location.pathname);

  const rendered = view.components.flatMap((component, index) => {
    return renderComponent(component, context, index);
  });

  const Layout = LayoutRegistry[view.layout.type] || LayoutRegistry['DefaultLayout'];

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Layout view={view}>{rendered}</Layout>
    </Suspense>
  );
}

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
    const result = func(componentProps, context);
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
    const result = func(propsWithData, context);
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
