import { PushNotifications, PushNotificationSchema, Token, ActionPerformed } from '@capacitor/push-notifications';

export interface PushTokenCallback { (token: string): void; }
export interface PushNotificationCallback { (notification: PushNotificationSchema): void; }
export interface PushActionCallback { (action: ActionPerformed): void; }

let tokenCallback: PushTokenCallback | null = null;
let notificationCallback: PushNotificationCallback | null = null;
let actionCallback: PushActionCallback | null = null;

export async function initPush(onToken?: PushTokenCallback, onNotification?: PushNotificationCallback, onAction?: PushActionCallback): Promise<boolean> {
  try {
    const permStatus = await PushNotifications.requestPermissions();
    if (permStatus.receive !== 'granted') return false;
    if (onToken) tokenCallback = onToken;
    if (onNotification) notificationCallback = onNotification;
    if (onAction) actionCallback = onAction;
    await PushNotifications.register();
    setupListeners();
    return true;
  } catch (error) {
    console.error('Push init error:', error);
    return false;
  }
}

function setupListeners() {
  PushNotifications.addListener('registration', (token: Token) => {
    if (tokenCallback) tokenCallback(token.value);
  });
  PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
    if (notificationCallback) notificationCallback(notification);
  });
  PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
    if (actionCallback) actionCallback(action);
  });
}

export async function checkPushPermissions() {
  try {
    const permissions = await PushNotifications.checkPermissions();
    return permissions.receive;
  } catch (error) {
    return 'denied';
  }
}

export async function requestPushPermissions() {
  try {
    const permissions = await PushNotifications.requestPermissions();
    return permissions.receive === 'granted';
  } catch (error) {
    return false;
  }
}

export async function getDeliveredNotifications() {
  try {
    const notifications = await PushNotifications.getDeliveredNotifications();
    return notifications.notifications;
  } catch (error) {
    return [];
  }
}

export async function removeAllDeliveredNotifications() {
  try {
    await PushNotifications.removeAllDeliveredNotifications();
    return true;
  } catch (error) {
    return false;
  }
}
