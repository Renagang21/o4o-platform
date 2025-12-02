import { FC } from 'react';
import { Star, Zap, Shield, Heart, TrendingUp, Award } from 'lucide-react';

const ICON_COMPONENTS = {
  star: Star,
  zap: Zap,
  shield: Shield,
  heart: Heart,
  trending: TrendingUp,
  award: Award,
};

interface FeatureCardBlockProps {
  icon?: keyof typeof ICON_COMPONENTS;
  title?: string;
  description?: string;
  link?: string;
  backgroundColor?: string;
  borderColor?: string;
  iconColor?: string;
  titleColor?: string;
  descriptionColor?: string;
  iconSize?: number;
}

const FeatureCardBlock: FC<FeatureCardBlockProps> = ({
  icon = 'star',
  title = '기능 제목',
  description = '기능 설명',
  link = '',
  backgroundColor = '#ffffff',
  borderColor = '#e5e7eb',
  iconColor = '#0073aa',
  titleColor = '#111827',
  descriptionColor = '#6b7280',
  iconSize = 48,
}) => {
  const IconComponent = ICON_COMPONENTS[icon] || Star;

  const cardContent = (
    <div
      className="feature-card p-6 border rounded-lg hover:shadow-lg transition-shadow"
      style={{
        backgroundColor,
        borderColor,
      }}
    >
      {/* Icon */}
      <div className="mb-4">
        <IconComponent
          style={{
            color: iconColor,
            width: iconSize,
            height: iconSize,
          }}
        />
      </div>

      {/* Title */}
      <h3
        className="text-xl font-bold mb-2"
        style={{ color: titleColor }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-sm whitespace-pre-wrap"
        style={{ color: descriptionColor }}
      >
        {description}
      </p>
    </div>
  );

  if (link) {
    return (
      <a href={link} target="_blank" rel="noopener noreferrer" className="block">
        {cardContent}
      </a>
    );
  }

  return cardContent;
};

export default FeatureCardBlock;
