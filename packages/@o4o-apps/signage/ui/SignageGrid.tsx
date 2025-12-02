interface StatCard {
  label: string;
  value: number;
  active: number;
  icon: string;
  color: string;
}

interface SignageGridProps {
  title: string;
  stats: StatCard[];
}

export function SignageGrid({ title, stats }: SignageGridProps) {
  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
      purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
      orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Overview of your digital signage system
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const colors = getColorClasses(stat.color);
          return (
            <div
              key={stat.label}
              className={`rounded-lg border-2 ${colors.border} ${colors.bg} p-6`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className={`mt-2 text-3xl font-bold ${colors.text}`}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm text-gray-600">
                    <span className={`font-medium ${colors.text}`}>{stat.active}</span> active
                  </p>
                </div>
                <div className={`rounded-full ${colors.bg} p-3`}>
                  <span className={`text-2xl ${colors.text}`}>
                    {stat.icon === 'Monitor' && '🖥️'}
                    {stat.icon === 'Image' && '🖼️'}
                    {stat.icon === 'List' && '📋'}
                    {stat.icon === 'Calendar' && '📅'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
