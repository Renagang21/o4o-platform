import { FC, useEffect, useState } from 'react';

interface DeadlineCountdownProps {
  deadline: string | Date;
  showIcon?: boolean;
  format?: 'text' | 'compact';
}

export const DeadlineCountdown: FC<DeadlineCountdownProps> = ({
  deadline,
  showIcon = true,
  format = 'text'
}) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const diff = end - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('마감');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (format === 'compact') {
        if (days > 0) {
          setTimeLeft(`D-${days}`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}시간 ${minutes}분`);
        } else {
          setTimeLeft(`${minutes}분`);
        }
      } else {
        if (days > 0) {
          setTimeLeft(`${days}일 ${hours}시간 남음`);
        } else if (hours > 0) {
          setTimeLeft(`${hours}시간 ${minutes}분 남음`);
        } else {
          setTimeLeft(`${minutes}분 남음`);
        }
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [deadline, format]);

  const getColorClass = () => {
    if (isExpired) return 'bg-gray-100 text-gray-800';

    const now = new Date().getTime();
    const end = new Date(deadline).getTime();
    const diff = end - now;
    const hoursLeft = diff / (1000 * 60 * 60);

    if (hoursLeft <= 24) return 'bg-red-100 text-red-800';
    if (hoursLeft <= 72) return 'bg-orange-100 text-orange-800';
    return 'bg-green-100 text-green-800';
  };

  return (
    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getColorClass()}`}>
      {showIcon && <span className="mr-1">⏰</span>}
      {timeLeft}
    </span>
  );
};

export default DeadlineCountdown;
