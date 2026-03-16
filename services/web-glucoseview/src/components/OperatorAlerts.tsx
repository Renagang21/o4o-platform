/**
 * OperatorAlerts — Operator 플랫폼 운영 알림 표시
 *
 * WO-GLYCOPHARM-GLUCOSEVIEW-OPERATOR-ALERT-SYSTEM-V1
 *
 * Rule-based alerts computed by backend.
 * Renders above OperatorDashboardLayout (frozen F1).
 */

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface OperatorAlertItem {
  id: string;
  type: 'network' | 'commerce' | 'care' | 'system';
  level: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
}

interface OperatorAlertsProps {
  alerts: OperatorAlertItem[];
}

const levelConfig = {
  critical: {
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-800',
    sub: 'text-red-600',
    Icon: AlertTriangle,
  },
  warning: {
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-800',
    sub: 'text-amber-600',
    Icon: AlertCircle,
  },
  info: {
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-800',
    sub: 'text-blue-600',
    Icon: Info,
  },
};

export default function OperatorAlerts({ alerts }: OperatorAlertsProps) {
  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2 mb-6">
      {alerts.map((alert) => {
        const cfg = levelConfig[alert.level];
        const Icon = cfg.Icon;
        return (
          <div
            key={alert.id}
            className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.bg}`}
          >
            <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${cfg.sub}`} />
            <div className="min-w-0">
              <p className={`text-sm font-medium ${cfg.text}`}>{alert.title}</p>
              <p className={`text-xs mt-0.5 ${cfg.sub}`}>{alert.message}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
