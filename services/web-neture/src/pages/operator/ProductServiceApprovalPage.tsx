import { useAuth } from '../../contexts/AuthContext';
import { ProductServiceApprovalPage as Workspace } from '@o4o/operator-core-ui/modules/neture-product-operations';
import { NetureProductBindings } from './NetureProductBindings';
export default function ProductServiceApprovalPage() {const {user}=useAuth();return <NetureProductBindings user={user}><Workspace /></NetureProductBindings>;}
