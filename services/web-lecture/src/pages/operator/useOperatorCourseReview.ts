import { useOperatorCourseReview as useShared } from '@o4o/operator-core-ui/modules/lecture-operations';
import { operatorApi } from '../../api/lecture';
import { useToast } from '../../components/Toast';
export function useOperatorCourseReview(courseId: string, onComplete: () => void) {
  return useShared(courseId, onComplete, { api: operatorApi, toast: useToast() });
}
