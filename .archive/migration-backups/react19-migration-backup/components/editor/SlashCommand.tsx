// 🎯 Slash Commands Extension (Tiptap 공식 패턴 사용)

import { Extension } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';
import { CommandsList } from './CommandsList';

export interface CommandItem {
  title: string;
  description: string;
  icon: string;
  command: ({ editor, range }: any) => void;
}

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

// Slash Commands 설정
export const suggestion = {
  items: ({ query }: { query: string }): CommandItem[] => {
    const items: CommandItem[] = [
      {
        title: '텍스트',
        description: '일반 텍스트 단락을 시작하세요',
        icon: '📝',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setParagraph()
            .run();
        },
      },
      {
        title: '제목 1',
        description: '큰 제목',
        icon: 'H1',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode('heading', { level: 1 })
            .run();
        },
      },
      {
        title: '제목 2', 
        description: '중간 제목',
        icon: 'H2',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode('heading', { level: 2 })
            .run();
        },
      },
      {
        title: '제목 3',
        description: '작은 제목',
        icon: 'H3',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setNode('heading', { level: 3 })
            .run();
        },
      },
      {
        title: '불릿 리스트',
        description: '불릿 포인트가 있는 리스트',
        icon: '•',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .toggleBulletList()
            .run();
        },
      },
      {
        title: '번호 리스트',
        description: '번호가 있는 리스트',
        icon: '1.',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .toggleOrderedList()
            .run();
        },
      },
      {
        title: '인용문',
        description: '인용문 블록',
        icon: '"',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setBlockquote()
            .run();
        },
      },
      {
        title: '구분선',
        description: '가로 구분선',
        icon: '—',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setHorizontalRule()
            .run();
        },
      },
      {
        title: '이미지',
        description: '이미지 업로드 또는 URL',
        icon: '🖼️',
        command: ({ editor, range }: any) => {
          const url = prompt('이미지 URL을 입력하세요:');
          if (url) {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .setImage({ src: url })
              .run();
          }
        },
      },
      {
        title: '테이블',
        description: '표 삽입',
        icon: '📊',
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
        },
      },
      {
        title: '코드 블록',
        description: '코드 블록',
        icon: '</>', 
        command: ({ editor, range }: any) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .setCodeBlock()
            .run();
        },
      },
    ];

    return items.filter(item => 
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
    );
  },

  render: () => {
    let component: ReactRenderer | null = null;
    let popup: any = null;

    return {
      onStart: (props: any) => {
        component = new ReactRenderer(CommandsList, {
          props,
          editor: props.editor,
        });

        if (!props.clientRect) {
          return;
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        });
      },

      onUpdate(props: any) {
        component?.updateProps(props);

        if (!props.clientRect) {
          return;
        }

        popup?.[0]?.setProps({
          getReferenceClientRect: props.clientRect,
        });
      },

      onKeyDown(props: any) {
        if (props.event.key === 'Escape') {
          popup?.[0]?.hide();
          return true;
        }

        return component?.ref?.onKeyDown(props);
      },

      onExit() {
        popup?.[0]?.destroy();
        component?.destroy();
      },
    };
  },
};
