import { Activity, UserPlus, MessageSquare } from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'registration' | 'reading' | 'coaching';
  patientName?: string;
  description: string;
  timestamp: string;
}

const ACTIVITY_CONFIG: Record<string, { icon: typeof Activity; bg: string; color: string }> = {
  registration: { icon: UserPlus, bg: 'bg-blue-50', color: 'text-blue-600' },
  reading: { icon: Activity, bg: 'bg-emerald-50', color: 'text-emerald-600' },
  coaching: { icon: MessageSquare, bg: 'bg-purple-50', color: 'text-purple-600' },
};

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  return new Date(timestamp).toLocaleDateString('ko-KR');
}

interface PatientActivitySectionProps {
  activities: ActivityItem[];
}

export default function PatientActivitySection({ activities }: PatientActivitySectionProps) {
  return (
    <section className="py-8 px-4 sm:px-6 max-w-7xl mx-auto">
      <h2 className="text-lg font-bold text-slate-800 mb-4">최근 활동</h2>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        {activities.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">최근 활동이 없습니다</p>
        ) : (
          <div className="space-y-4">
            {activities.map((a) => {
              const config = ACTIVITY_CONFIG[a.type] || ACTIVITY_CONFIG.reading;
              const Icon = config.icon;
              return (
                <div key={a.id} className="flex items-start gap-3">
                  <div
                    className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center flex-shrink-0`}
                  >
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{a.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {formatRelativeTime(a.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
