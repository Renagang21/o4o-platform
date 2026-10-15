import { Children, isValidElement, type ReactNode, type ReactElement } from 'react';
import { createRoutesFromElements, matchRoutes, Routes } from 'react-router-dom';
import { expect, it } from 'vitest';
import App from '../../App';

type TreeElement = ReactElement<{ children?: ReactNode }>;
function routeTree(element: TreeElement): TreeElement | undefined {
  if (element.type === Routes) return element;
  for (const child of Children.toArray(element.props.children)) {
    if (!isValidElement(child)) continue;
    const found = routeTree(child as TreeElement);
    if (found) return found;
  }
}
it.each(['content', 'multilingual-product-contents', 'multilingual-product-contents/my'])(
  'matches the actual common source-library tree for %s ahead of the /store wildcard',
  (child) => {
    const tree = routeTree(App() as TreeElement);
    expect(tree).toBeTruthy();
    const matches = matchRoutes(createRoutesFromElements(tree!.props.children), `/store/library/${child}`);
    expect(matches?.some(match => match.route.path === '/store/library')).toBe(true);
    expect(matches?.[matches.length - 1]?.route.path).toBe(child);
    expect(matches?.some(match => match.route.path === '/store')).toBe(false);
  },
);
