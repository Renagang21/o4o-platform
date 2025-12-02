/**
 * Signage Schedule Function Component
 * Displays list of digital signage schedules
 */
export const signageSchedule = (props: any) => {
  const schedules = props.data || [];

  const daysOfWeekMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return {
    type: 'ScheduleCard',
    props: {
      schedules: schedules.map((schedule: any) => ({
        id: schedule.id,
        deviceId: schedule.deviceId,
        playlistId: schedule.playlistId,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        daysOfWeek: schedule.daysOfWeek,
        daysOfWeekLabels: schedule.daysOfWeek?.map((day: number) => daysOfWeekMap[day]) || [],
        startDate: schedule.startDate,
        endDate: schedule.endDate,
        active: schedule.active,
        priority: schedule.priority,
        createdAt: schedule.createdAt,
        updatedAt: schedule.updatedAt,
      })),
    },
  };
};
