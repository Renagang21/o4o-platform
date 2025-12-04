/**
 * Marketing Block - StatsCounter
 *
 * Statistics counter with number, label, and optional suffix
 */

export interface StatsCounterProps {
  number: string;
  label: string;
  suffix?: string;
  prefix?: string;
  icon?: string;
  textColor?: string;
  numberColor?: string;
}

export default function StatsCounter({
  number = '10K+',
  label = 'Happy Customers',
  suffix,
  prefix,
  icon,
  textColor = '#374151',
  numberColor = '#3b82f6',
}: StatsCounterProps) {
  return (
    <div className="text-center py-6">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <div className="mb-2">
        <span style={{ color: numberColor }} className="text-4xl md:text-5xl font-bold">
          {prefix}
          {number}
          {suffix}
        </span>
      </div>
      <div style={{ color: textColor }} className="text-lg font-medium">
        {label}
      </div>
    </div>
  );
}
