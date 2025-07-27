import { FC } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { 
  Bold, 
  Italic, 
  List, 
  ListOrdered, 
  Quote, 
  Undo, 
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  Code,
  Heading1,
  Heading2,
  Heading3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface PostEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const PostEditor: FC<PostEditorProps> = ({ 
  content = '', 
  onChange,
  placeholder = '내용을 입력하세요...',
  className
}) => {

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Placeholder.configure({
        placeholder,
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[400px] px-4 py-3',
      },
    },
  });

  const addImage = useCallback(() => {
    const url = window.prompt('이미지 URL을 입력하세요:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href;
    const url = window.prompt('링크 URL을 입력하세요:', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '' && editor) {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (editor) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg overflow-hidden bg-white', className)}>
      {/* Toolbar */}
      <div className="border-b bg-gray-50 p-2 flex flex-wrap gap-1">
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('bold') && 'bg-gray-200'
          )}
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('italic') && 'bg-gray-200'
          )}
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleCode().run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('code') && 'bg-gray-200'
          )}
        >
          <Code className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('heading', { level: 1 }) && 'bg-gray-200'
          )}
        >
          <Heading1 className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('heading', { level: 2 }) && 'bg-gray-200'
          )}
        >
          <Heading2 className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('heading', { level: 3 }) && 'bg-gray-200'
          )}
        >
          <Heading3 className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('bulletList') && 'bg-gray-200'
          )}
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('orderedList') && 'bg-gray-200'
          )}
        >
          <ListOrdered className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={cn(
            'p-2 h-auto',
            editor.isActive('blockquote') && 'bg-gray-200'
          )}
        >
          <Quote className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={setLink}
          className={cn(
            'p-2 h-auto',
            editor.isActive('link') && 'bg-gray-200'
          )}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={addImage}
          className="p-2 h-auto"
        >
          <ImageIcon className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="mx-1 h-8" />

        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 h-auto"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 h-auto"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
};

export default PostEditor;