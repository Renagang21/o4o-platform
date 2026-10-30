import { LegacyEducationRequestsPanel as SharedPanel } from '@o4o/operator-core-ui/modules/contact-inquiry';
import { api } from '../../lib/apiClient';
export default function LegacyEducationRequestsPanel() { return <SharedPanel client={api} />; }
