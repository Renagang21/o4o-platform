import {useEffect,useState} from 'react';
import {OperatorProductApprovalPage as Workspace} from '@o4o/operator-core-ui/modules/neture-product-operations';
import {useAuth} from '../../contexts/AuthContext';
import {productCleanupApi} from '../../lib/api/operatorProductCleanup';
import {NetureProductBindings} from './NetureProductBindings';
export default function OperatorProductApprovalPage() {
 const {user}=useAuth();
 const scope=`${user?.id}:${user?.roles?.join(',')}`;
 const [access,setAccess]=useState<{scope:string;allowed:boolean}|null>(null);
 useEffect(()=>{
  if(!user?.id)return;
  let current=true;
  // Central menu restrictions also apply on native hosts. A service role alone is not evidence of trash access.
  productCleanupApi.getRecycleBin(1,1).then(()=>{if(current)setAccess({scope,allowed:true});})
   .catch(()=>{if(current)setAccess({scope,allowed:false});});
  return()=>{current=false;};
 },[scope,user?.id]);
 return <NetureProductBindings user={user} canOpenProductTrash={access?.scope===scope && access.allowed}><Workspace /></NetureProductBindings>;
}
