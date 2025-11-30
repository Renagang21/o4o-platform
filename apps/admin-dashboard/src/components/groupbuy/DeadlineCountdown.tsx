import { FC, useEffect, useState } from 'react';
import { Tag } from 'antd';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/ko';

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.locale('ko');

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
      const now = dayjs();
      const end = dayjs(deadline);
      const diff = end.diff(now);

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('마감');
        return;
      }

      const duration = dayjs.duration(diff);
      const days = Math.floor(duration.asDays());
      const hours = duration.hours();
      const minutes = duration.minutes();

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

  const getColor = () => {
    if (isExpired) return 'default';

    const now = dayjs();
    const end = dayjs(deadline);
    const diff = end.diff(now);
    const hoursLeft = dayjs.duration(diff).asHours();

    if (hoursLeft <= 24) return 'red';
    if (hoursLeft <= 72) return 'orange';
    return 'green';
  };

  return (
    <Tag color={getColor()} className="font-medium">
      {showIcon && <span className="mr-1">⏰</span>}
      {timeLeft}
    </Tag>
  );
};

export default DeadlineCountdown;
