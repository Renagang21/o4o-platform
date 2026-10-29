import {authClient} from '@o4o/auth-client';
import {useAuth} from '@o4o/auth-context';
import {FederationManagementPanel} from '@o4o/operator-core-ui/modules/cooperative-federation';
/** Federation duties preserve the existing affiliation, history and cooperative Admin invitation flow. */
export default function CentralFederationOperations({canDecide}: {canDecide:boolean}) {
 const {user}=useAuth();
 return <FederationManagementPanel client={authClient.api} userId={String(user.id)} admin={canDecide} manageCooperativeAdmins={user.roles?.includes('neture:pharmcoop_admin') ?? false} showOperators={false} />;
}
