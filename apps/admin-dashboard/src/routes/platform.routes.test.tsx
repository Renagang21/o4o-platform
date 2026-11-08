import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { expect, it } from 'vitest';
import { PlatformRoutes } from './platform.routes';

// 같은 화면 컴포넌트를 prop 만 바꿔 쓰는 형제 경로는 서로 다른 key 가 있어야 다시 마운트된다.
// key 가 없으면 React 가 인스턴스를 재사용해, 「강좌 삭제」 제목 아래에 이전 「게시판 삭제」 목록 · 삭제 대상이 남는다(#986 Codex P1).
function collect(node: ReactNode, out: Map<string, ReactElement>) {
  Children.forEach(node, child => {
    if (!isValidElement(child)) return;
    const props = child.props as { path?: string; element?: ReactElement; children?: ReactNode };
    if (props.path && isValidElement(props.element)) out.set(props.path, props.element);
    if (props.children) collect(props.children, out);
  });
}

it('gives each platform route that reuses a page component its own key', () => {
  const routes = new Map<string, ReactElement>();
  collect(PlatformRoutes(), routes);
  const groups = [
    ['users', 'member-erasure'],
    ['board-deletion', 'course-deletion', 'resource-deletion'],
  ];
  for (const paths of groups) {
    const elements = paths.map(path => routes.get(path));
    elements.forEach((element, i) => expect(element, paths[i]).toBeTruthy());
    expect(new Set(elements.map(element => element!.type)).size).toBe(1);
    const keys = elements.map(element => element!.key);
    keys.forEach((key, i) => expect(key, paths[i]).not.toBeNull());
    expect(new Set(keys).size).toBe(keys.length);
  }
});
