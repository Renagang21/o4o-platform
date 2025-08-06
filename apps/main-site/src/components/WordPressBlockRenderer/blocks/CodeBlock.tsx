import { FC } from 'react';
import { MainSiteBlock } from '../../../utils/wordpress-block-parser';

interface CodeBlockProps {
  block: MainSiteBlock;
}

export const CodeBlock: FC<CodeBlockProps> = ({ block }) => {
  const { data } = block;
  
  if (!data?.content) return null;
  
  return (
    <pre className="wp-block-code">
      <code>{data.content}</code>
    </pre>
  );
};