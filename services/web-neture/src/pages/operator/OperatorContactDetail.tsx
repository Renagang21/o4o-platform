import { OperatorContactDetail as Workspace } from '@o4o/operator-core-ui/modules/neture-service-operations';
import { NetureServiceBindings } from './NetureServiceBindings';
import type { ComponentProps } from 'react';
export default function OperatorContactDetail(props: ComponentProps<typeof Workspace>) { return <NetureServiceBindings><Workspace {...props} /></NetureServiceBindings>; }
