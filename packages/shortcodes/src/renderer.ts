import { ReactElement, Fragment } from 'react';
import { 
  ShortcodeRenderer, 
  ParsedShortcode, 
  ShortcodeParser, 
  ShortcodeRegistry,
  ShortcodeProps
} from './types';

/**
 * 숏코드 렌더러 구현
 * 파싱된 숏코드를 React 컴포넌트로 렌더링합니다.
 */
export class DefaultShortcodeRenderer implements ShortcodeRenderer {
  constructor(
    private parser: ShortcodeParser,
    private registry: ShortcodeRegistry
  ) {}

  /**
   * 콘텐츠 내의 모든 숏코드를 렌더링
   */
  render(content: string, context?: any): ReactElement | null {
    if (!content) {
      return null;
    }

    // 숏코드 파싱
    const shortcodes = this.parser.parse(content);

    if (shortcodes.length === 0) {
      // 숏코드가 없으면 원본 텍스트 반환
      return React.createElement(Fragment, null, content);
    }

    // 콘텐츠를 숏코드와 일반 텍스트로 분리하여 렌더링
    const elements: (string | ReactElement)[] = [];
    let lastIndex = 0;

    shortcodes.forEach((shortcode, index) => {
      const startIndex = content.indexOf(shortcode.fullMatch, lastIndex);
      
      // 숏코드 이전의 텍스트 추가
      if (startIndex > lastIndex) {
        elements.push(content.substring(lastIndex, startIndex));
      }

      // 숏코드 렌더링
      const rendered = this.renderShortcode(shortcode, context);
      if (rendered) {
        elements.push(React.cloneElement(rendered, { key: `shortcode-${index}` }));
      } else {
        // 렌더링 실패 시 원본 텍스트 유지
        elements.push(shortcode.fullMatch);
      }

      lastIndex = startIndex + shortcode.fullMatch.length;
    });

    // 마지막 텍스트 추가
    if (lastIndex < content.length) {
      elements.push(content.substring(lastIndex));
    }

    return React.createElement(Fragment, null, ...elements);
  }

  /**
   * 단일 숏코드 렌더링
   */
  renderShortcode(shortcode: ParsedShortcode, context?: any): ReactElement | null {
    const definition = this.registry.get(shortcode.name);

    if (!definition) {
      console.warn(`Shortcode "${shortcode.name}" is not registered`);
      return null;
    }

    const { component: Component, defaultAttributes, validate } = definition;

    // 속성 병합 (기본값 + 사용자 정의)
    const attributes = {
      ...defaultAttributes,
      ...shortcode.attributes
    };

    // 속성 유효성 검사
    if (validate && !validate(attributes)) {
      console.error(`Invalid attributes for shortcode "${shortcode.name}":`, attributes);
      return null;
    }

    // props 생성
    const props: ShortcodeProps = {
      attributes,
      content: shortcode.content,
      context
    };

    try {
      return React.createElement(Component, props);
    } catch (error) {
      console.error(`Error rendering shortcode "${shortcode.name}":`, error);
      return null;
    }
  }
}

/**
 * React Hook: useShortcodes
 * 컴포넌트에서 숏코드를 쉽게 사용할 수 있도록 하는 Hook
 */
export function useShortcodes(
  parser: ShortcodeParser,
  registry: ShortcodeRegistry
) {
  const renderer = React.useMemo(
    () => new DefaultShortcodeRenderer(parser, registry),
    [parser, registry]
  );

  const render = React.useCallback(
    (content: string, context?: any) => renderer.render(content, context),
    [renderer]
  );

  const renderShortcode = React.useCallback(
    (shortcode: ParsedShortcode, context?: any) => renderer.renderShortcode(shortcode, context),
    [renderer]
  );

  return { render, renderShortcode };
}