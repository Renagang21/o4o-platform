import SignageScheduler from '../../components/signage/SignageScheduler';

export default function ScheduleManager() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Schedule Management</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage content schedules for your digital displays
        </p>
      </div>
      <SignageScheduler />
    </div>
  );
}