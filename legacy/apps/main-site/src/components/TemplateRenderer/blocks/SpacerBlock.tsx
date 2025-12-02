import { FC } from 'react';

interface SpacerBlockProps {
  height?: string;
  settings?: {
    mobileHeight?: string;
  };
}

const SpacerBlock: FC<SpacerBlockProps> = ({ 
  height = '2rem',
  settings = {}
}) => {
  const { mobileHeight = height } = settings;

  return (
    <div 
      className="spacer-block"
      style={{
        height: height,
      }}
      data-mobile-height={mobileHeight}
    />
  );
};

export default SpacerBlock;