import {OperatorProductApprovalPage as Workspace} from '@o4o/operator-core-ui/modules/neture-product-operations';
import {useAuth} from '../../contexts/AuthContext';
import {NetureProductBindings} from './NetureProductBindings';
export default function OperatorProductApprovalPage() {const {user}=useAuth();return <NetureProductBindings user={user}><Workspace /></NetureProductBindings>;}
