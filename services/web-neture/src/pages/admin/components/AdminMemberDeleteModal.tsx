import {AdminMemberDeleteModal as Shared} from '@o4o/operator-core-ui/modules/neture-service-operations';
import {api} from '../../../lib/apiClient';
export function AdminMemberDeleteModal(props:Omit<React.ComponentProps<typeof Shared>,'api'>){return <Shared {...props} api={api}/>;}
