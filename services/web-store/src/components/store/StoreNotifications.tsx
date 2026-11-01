import { NotificationBell, useNotifications, resolveNotificationTarget, type NotificationApiClient } from '@o4o/account-ui';
import { useNavigate } from 'react-router-dom';
import { authClient } from '../../lib/apiClient';
const client:NotificationApiClient={
  getUnreadCount:async(params)=>{try{const response=await authClient.api.get('/notifications/unread-count',{params});if(!response.data?.success)throw new Error('UNCONFIRMED');return response.data.data.count;}catch(error){if((error as {response?:{status?:number}}).response?.status===401)return 0;throw error;}},
  list:async(params)=>{try{const response=await authClient.api.get('/notifications',{params});if(!response.data?.success)throw new Error('UNCONFIRMED');return response.data.data;}catch(error){if((error as {response?:{status?:number}}).response?.status===401)return{notifications:[],total:0,page:1,limit:params?.limit??10,totalPages:0,hasMore:false};throw error;}},
  markAsRead:async(notificationIds)=>{await authClient.api.post('/notifications/read',{notificationIds});},
  markAllAsRead:async()=>{await authClient.api.post('/notifications/read',{all:true});},
};
/** Existing personal notification system, scoped to the selected store and reset on account changes. */
export function StoreNotifications({organizationId}:Readonly<{organizationId:string}>){
  const navigate=useNavigate();const data=useNotifications(client,{enabled:!!organizationId,organizationId,pollIntervalMs:30000});
  return <NotificationBell unreadCount={data.unreadCount} notifications={data.notifications} loading={data.loading} onOpen={data.refetchList} onMarkAsRead={data.markAsRead} onMarkAllAsRead={data.markAllAsRead} onItemClick={item=>{void data.markAsRead(item.id);const target=resolveNotificationTarget(item);if(target)navigate(target);}}/>;
}
