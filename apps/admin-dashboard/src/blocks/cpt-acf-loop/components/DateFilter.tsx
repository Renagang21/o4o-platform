/**
 * Date Filter Component
 * 
 * Filter posts by date ranges with preset options
 */

// import { useState } from '@wordpress/element';
import {
  PanelBody,
  DateTimePicker,
  SelectControl,
  Button,
  ToggleControl,
} from '@wordpress/components';
import { calendar } from '@wordpress/icons';

interface DateFilterProps {
  dateFilter: {
    type: 'none' | 'relative' | 'absolute';
    relative?: string;
    startDate?: string;
    endDate?: string;
    includeTime?: boolean;
  };
  onDateFilterChange: (filter: DateFilterProps['dateFilter']) => void;
}

export default function DateFilter({
  dateFilter,
  onDateFilterChange,
}: DateFilterProps) {
  // const [showCustomRange, setShowCustomRange] = useState(false);

  // Relative date options
  const relativeOptions = [
    { label: 'Select a period', value: '' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This week', value: 'this_week' },
    { label: 'Last week', value: 'last_week' },
    { label: 'This month', value: 'this_month' },
    { label: 'Last month', value: 'last_month' },
    { label: 'This year', value: 'this_year' },
    { label: 'Last year', value: 'last_year' },
    { label: 'Last 7 days', value: 'last_7_days' },
    { label: 'Last 30 days', value: 'last_30_days' },
    { label: 'Last 90 days', value: 'last_90_days' },
    { label: 'Last 365 days', value: 'last_365_days' },
  ];

  // Filter type options
  const filterTypeOptions = [
    { label: 'No date filter', value: 'none' },
    { label: 'Relative date', value: 'relative' },
    { label: 'Custom date range', value: 'absolute' },
  ];

  // Handle filter type change
  const handleFilterTypeChange = (type: string) => {
    onDateFilterChange({
      ...dateFilter,
      type: type as 'none' | 'relative' | 'absolute',
      relative: type === 'relative' ? relativeOptions[1].value : undefined,
      startDate: undefined,
      endDate: undefined,
    });
  };

  // Calculate date range from relative option
  const getDateRangeFromRelative = (relative: string): { start: Date; end: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    switch (relative) {
      case 'today':
        return { start: today, end: now };
      
      case 'yesterday':
        return { start: yesterday, end: today };
      
      case 'this_week': {
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay());
        return { start: firstDay, end: now };
      }
      
      case 'last_week': {
        const firstDay = new Date(today);
        firstDay.setDate(today.getDate() - today.getDay() - 7);
        const lastDay = new Date(firstDay);
        lastDay.setDate(lastDay.getDate() + 6);
        lastDay.setHours(23, 59, 59, 999);
        return { start: firstDay, end: lastDay };
      }
      
      case 'this_month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: firstDay, end: now };
      }
      
      case 'last_month': {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        lastDay.setHours(23, 59, 59, 999);
        return { start: firstDay, end: lastDay };
      }
      
      case 'this_year': {
        const firstDay = new Date(today.getFullYear(), 0, 1);
        return { start: firstDay, end: now };
      }
      
      case 'last_year': {
        const firstDay = new Date(today.getFullYear() - 1, 0, 1);
        const lastDay = new Date(today.getFullYear() - 1, 11, 31);
        lastDay.setHours(23, 59, 59, 999);
        return { start: firstDay, end: lastDay };
      }
      
      case 'last_7_days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        return { start, end: now };
      }
      
      case 'last_30_days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 30);
        return { start, end: now };
      }
      
      case 'last_90_days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 90);
        return { start, end: now };
      }
      
      case 'last_365_days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 365);
        return { start, end: now };
      }
      
      default:
        return { start: today, end: now };
    }
  };

  // Format date for display
  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Get preview text for current filter
  const getFilterPreview = (): string => {
    if (dateFilter.type === 'none') {
      return 'All dates';
    }

    if (dateFilter.type === 'relative' && dateFilter.relative) {
      const option = relativeOptions.find((opt: any) => opt.value === dateFilter.relative);
      if (option) {
        const range = getDateRangeFromRelative(dateFilter.relative);
        return `${option.label} (${formatDateDisplay(range.start)} - ${formatDateDisplay(range.end)})`;
      }
    }

    if (dateFilter.type === 'absolute' && dateFilter.startDate && dateFilter.endDate) {
      return `${formatDateDisplay(new Date(dateFilter.startDate))} - ${formatDateDisplay(new Date(dateFilter.endDate))}`;
    }

    return 'Configure date filter';
  };

  return (
    <PanelBody 
      title={'Date Filter'} 
      initialOpen={false}
      icon={calendar}
    >
      <div style={{ marginBottom: '16px' }}>
        <p style={{ 
          margin: '0 0 8px 0',
          padding: '8px',
          background: '#f0f8ff',
          border: '1px solid #0073aa',
          borderRadius: '4px',
          fontSize: '13px',
        }}>
          {getFilterPreview()}
        </p>
      </div>

      <SelectControl
        label={'Filter Type'}
        value={dateFilter.type}
        options={filterTypeOptions}
        onChange={handleFilterTypeChange}
      />

      {dateFilter.type === 'relative' && (
        <SelectControl
          label={'Time Period'}
          value={dateFilter.relative || ''}
          options={relativeOptions}
          onChange={(relative: any) => onDateFilterChange({
            ...dateFilter,
            relative,
          })}
        />
      )}

      {dateFilter.type === 'absolute' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>{'Start Date'}</h4>
            <DateTimePicker
              currentDate={dateFilter.startDate}
              onChange={(startDate: any) => onDateFilterChange({
                ...dateFilter,
                startDate: startDate || undefined,
              })}
              is12Hour={true}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0' }}>{'End Date'}</h4>
            <DateTimePicker
              currentDate={dateFilter.endDate}
              onChange={(endDate: any) => onDateFilterChange({
                ...dateFilter,
                endDate: endDate || undefined,
              })}
              is12Hour={true}
            />
          </div>

          <ToggleControl
            label={'Include time in filter'}
            checked={dateFilter.includeTime || false}
            onChange={(includeTime: any) => onDateFilterChange({
              ...dateFilter,
              includeTime,
            })}
            help={'When disabled, only dates are compared (time is ignored)'}
            disabled={false}
          />
        </>
      )}

      {dateFilter.type !== 'none' && (
        <Button
          variant="tertiary"
          isDestructive
          onClick={() => onDateFilterChange({
            type: 'none',
          })}
          style={{ marginTop: '8px' }}
        >
          {'Clear date filter'}
        </Button>
      )}

      {/* Presets for quick selection */}
      {dateFilter.type === 'absolute' && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ margin: '0 0 8px 0' }}>{'Quick Presets'}</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            <Button
              variant="secondary"
              size={"small" as any}
              onClick={() => {
                const today = new Date();
                const lastWeek = new Date(today);
                lastWeek.setDate(lastWeek.getDate() - 7);
                onDateFilterChange({
                  ...dateFilter,
                  startDate: lastWeek.toISOString(),
                  endDate: today.toISOString(),
                });
              }}
            >
              {'Last 7 days'}
            </Button>
            
            <Button
              variant="secondary"
              size={"small" as any}
              onClick={() => {
                const today = new Date();
                const lastMonth = new Date(today);
                lastMonth.setMonth(lastMonth.getMonth() - 1);
                onDateFilterChange({
                  ...dateFilter,
                  startDate: lastMonth.toISOString(),
                  endDate: today.toISOString(),
                });
              }}
            >
              {'Last 30 days'}
            </Button>
            
            <Button
              variant="secondary"
              size={"small" as any}
              onClick={() => {
                const today = new Date();
                const thisYear = new Date(today.getFullYear(), 0, 1);
                onDateFilterChange({
                  ...dateFilter,
                  startDate: thisYear.toISOString(),
                  endDate: today.toISOString(),
                });
              }}
            >
              {'This year'}
            </Button>
          </div>
        </div>
      )}
    </PanelBody>
  );
}