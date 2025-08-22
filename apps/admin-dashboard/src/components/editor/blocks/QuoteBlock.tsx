import React from 'react';
import { Quote } from 'lucide-react';
import type { Block } from '../types';

interface QuoteBlockProps {
  block: Block;
  updateBlock: (updates: Partial<Block>) => void;
  isSelected: boolean;
}

export const QuoteBlock: React.FC<QuoteBlockProps> = ({
  block,
  updateBlock,
  isSelected
}) => {
  const content = block.content as {
    text?: string;
    citation?: string;
    style?: 'default' | 'large' | 'pullquote';
  };

  const quoteStyles = {
    default: {
      borderLeft: '4px solid #007cba',
      paddingLeft: '20px',
      marginLeft: '0',
      fontStyle: 'italic',
      fontSize: '1.1em',
      color: '#555'
    },
    large: {
      fontSize: '1.5em',
      fontWeight: '300',
      textAlign: 'center' as const,
      padding: '30px',
      position: 'relative' as const
    },
    pullquote: {
      borderTop: '4px solid #007cba',
      borderBottom: '4px solid #007cba',
      padding: '25px 0',
      margin: '30px 0',
      fontSize: '1.3em',
      fontWeight: '400',
      textAlign: 'center' as const
    }
  };

  const currentStyle = content.style || 'default';

  return (
    <blockquote
      className={`quote-block quote-${currentStyle}`}
      style={{
        ...quoteStyles[currentStyle],
        margin: '20px 0',
        position: 'relative'
      }}
    >
      {/* ��|  �0 -  � ��� \� */}
      {isSelected && (
        <div
          style={{
            position: 'absolute',
            top: '-35px',
            right: '0',
            display: 'flex',
            gap: '4px',
            background: 'white',
            padding: '4px',
            borderRadius: '4px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          {(['default', 'large', 'pullquote'] as const).map((style) => (
            <button
              key={style}
              onClick={() => updateBlock({ content: { ...content, style } })}
              style={{
                padding: '4px 8px',
                background: currentStyle === style ? '#007cba' : '#f0f0f0',
                color: currentStyle === style ? 'white' : '#333',
                border: 'none',
                borderRadius: '2px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {style === 'default' ? '0�' : style === 'large' ? 'l�' : 'p'}
            </button>
          ))}
        </div>
      )}

      {/* p 04\ DtX (large ��|) */}
      {currentStyle === 'large' && (
        <Quote
          size={32}
          style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            opacity: 0.2,
            color: '#007cba'
          }}
        />
      )}

      {/* x�8 M�� */}
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          updateBlock({
            content: {
              ...content,
              text: e.currentTarget.textContent || ''
            }
          });
        }}
        style={{
          outline: 'none',
          minHeight: '1.5em',
          position: 'relative',
          zIndex: 1
        }}
        data-placeholder="x�8D �%X8�..."
      >
        {content.text}
      </div>

      {/* �� */}
      <cite
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          updateBlock({
            content: {
              ...content,
              citation: e.currentTarget.textContent || ''
            }
          });
        }}
        style={{
          display: 'block',
          marginTop: '10px',
          fontSize: '0.9em',
          color: '#777',
          fontStyle: 'normal',
          outline: 'none',
          minHeight: '1.2em',
          textAlign: currentStyle === 'pullquote' ? 'center' : 'right'
        }}
        data-placeholder=" �� ( ݬm)"
      >
        {content.citation && ` ${content.citation}`}
      </cite>
    </blockquote>
  );
};