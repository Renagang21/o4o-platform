import { FC, useEffect, useState  } from 'react';
import type { ShortcodeProps, ShortcodeDefinition } from '@o4o/shortcodes';

interface FlashSaleTimerProps {
  endTime: string;
  title?: string;
  productId?: string;
  discountPercent?: number;
  showSeconds?: boolean;
}

const FlashSaleTimerComponent: FC<FlashSaleTimerProps> = ({
  endTime,
  title = 'Flash Sale Ends In:',
  productId: _productId,  // In real app, this would be used for product-specific sales
  discountPercent = 50,
  showSeconds = true
}) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      } else {
        setIsExpired(true);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime]);

  if (isExpired) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg text-center">
        <p className="text-gray-600">This sale has ended</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white p-6 rounded-lg shadow-lg">
      <div className="text-center">
        {discountPercent > 0 && (
          <div className="text-3xl font-bold mb-2">
            {discountPercent}% OFF
          </div>
        )}
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="flex justify-center space-x-4">
          {timeLeft.days > 0 && (
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold">{String(timeLeft.days).padStart(2, '0')}</div>
                <div className="text-xs uppercase">Days</div>
              </div>
            </div>
          )}
          <div className="text-center">
            <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
              <div className="text-2xl font-bold">{String(timeLeft.hours).padStart(2, '0')}</div>
              <div className="text-xs uppercase">Hours</div>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
              <div className="text-2xl font-bold">{String(timeLeft.minutes).padStart(2, '0')}</div>
              <div className="text-xs uppercase">Mins</div>
            </div>
          </div>
          {showSeconds && (
            <div className="text-center">
              <div className="bg-white/20 rounded-lg p-3 min-w-[60px]">
                <div className="text-2xl font-bold">{String(timeLeft.seconds).padStart(2, '0')}</div>
                <div className="text-xs uppercase">Secs</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Wrapper component that accepts ShortcodeProps
export const FlashSaleTimer: FC<ShortcodeProps> = ({ attributes }) => {
  if (!attributes.endTime) {
    return <div className="text-red-500">Error: endTime attribute is required for flash-sale-timer</div>;
  }

  const props: FlashSaleTimerProps = {
    endTime: attributes.endTime as string,
    title: attributes.title as string,
    productId: attributes.productId as string,
    discountPercent: attributes.discountPercent ? Number(attributes.discountPercent) : undefined,
    showSeconds: attributes.showSeconds !== false
  };

  return <FlashSaleTimerComponent {...props} />;
};

export const flashSaleTimerDefinition: ShortcodeDefinition = {
  name: 'flash-sale-timer',
  component: FlashSaleTimer,
  attributes: {
    endTime: { type: 'string', required: true },
    title: { type: 'string' },
    productId: { type: 'string' },
    discountPercent: { type: 'number' },
    showSeconds: { type: 'boolean' }
  }
};