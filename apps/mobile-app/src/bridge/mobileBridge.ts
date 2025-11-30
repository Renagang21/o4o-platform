import { takePhoto, pickFromGallery, pickImage, checkCameraPermissions, requestCameraPermissions } from '../plugins/camera';
import { initPush, checkPushPermissions, requestPushPermissions, getDeliveredNotifications, removeAllDeliveredNotifications } from '../plugins/push';
import { getLocation, getSimpleLocation, checkLocationPermissions, requestLocationPermissions, getDistanceFromTarget, calculateDistance, watchLocation, clearLocationWatch } from '../plugins/geolocation';
import { scanBarcode, scanQRCode, scanProductBarcode, stopScan, checkBarcodePermissions, requestBarcodePermissions, isReady as isBarcodeReady } from '../plugins/barcode';
import { writeTextFile, readTextFile, writeImageFile, deleteFile, fileExists, listFiles, createDirectory, deleteDirectory, getFileInfo, getCacheDirectory, getDataDirectory, clearCache } from '../plugins/filesystem';
import { Capacitor } from '@capacitor/core';
import type { Coordinates } from '../plugins/geolocation';
import type { CameraOptions } from '../plugins/camera';
import type { PushTokenCallback, PushNotificationCallback, PushActionCallback } from '../plugins/push';

export const MobileBridge = {
  platform: {
    getPlatform: () => Capacitor.getPlatform(),
    isNative: () => Capacitor.isNativePlatform(),
    isIOS: () => Capacitor.getPlatform() === 'ios',
    isAndroid: () => Capacitor.getPlatform() === 'android',
  },
  camera: {
    takePhoto: (options?: CameraOptions) => takePhoto(options),
    pickFromGallery: (options?: CameraOptions) => pickFromGallery(options),
    pickImage: (options?: CameraOptions) => pickImage(options),
    checkPermissions: () => checkCameraPermissions(),
    requestPermissions: () => requestCameraPermissions(),
  },
  push: {
    init: (onToken?: PushTokenCallback, onNotification?: PushNotificationCallback, onAction?: PushActionCallback) => initPush(onToken, onNotification, onAction),
    checkPermissions: () => checkPushPermissions(),
    requestPermissions: () => requestPushPermissions(),
    getDeliveredNotifications: () => getDeliveredNotifications(),
    removeAllDeliveredNotifications: () => removeAllDeliveredNotifications(),
  },
  location: {
    getLocation: (enableHighAccuracy?: boolean, timeout?: number) => getLocation(enableHighAccuracy, timeout),
    getSimpleLocation: () => getSimpleLocation(),
    checkPermissions: () => checkLocationPermissions(),
    requestPermissions: () => requestLocationPermissions(),
    getDistanceFromTarget: (targetLat: number, targetLng: number) => getDistanceFromTarget(targetLat, targetLng),
    calculateDistance: (lat1: number, lng1: number, lat2: number, lng2: number) => calculateDistance(lat1, lng1, lat2, lng2),
    watchLocation: (callback: (position: any) => void) => watchLocation(callback),
    clearWatch: (watchId: string) => clearLocationWatch(watchId),
  },
  barcode: {
    scan: () => scanBarcode(),
    scanQR: () => scanQRCode(),
    scanProduct: () => scanProductBarcode(),
    stop: () => stopScan(),
    checkPermissions: () => checkBarcodePermissions(),
    requestPermissions: () => requestBarcodePermissions(),
    isReady: () => isBarcodeReady(),
  },
  file: {
    writeText: (fileName: string, content: string) => writeTextFile(fileName, content),
    readText: (fileName: string) => readTextFile(fileName),
    writeImage: (fileName: string, base64Data: string) => writeImageFile(fileName, base64Data),
    delete: (fileName: string) => deleteFile(fileName),
    exists: (fileName: string) => fileExists(fileName),
    list: (path?: string) => listFiles(path),
    createDir: (path: string) => createDirectory(path),
    deleteDir: (path: string) => deleteDirectory(path),
    getInfo: (fileName: string) => getFileInfo(fileName),
    getCacheDir: () => getCacheDirectory(),
    getDataDir: () => getDataDirectory(),
    clearCache: () => clearCache(),
  },
  utils: {
    vibrate: async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
          await Haptics.impact({ style: ImpactStyle.Medium });
        } catch (error) {
          console.warn('Haptics not available:', error);
        }
      }
    },
    getAppInfo: async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { App } = await import('@capacitor/app');
          return await App.getInfo();
        } catch (error) {
          console.warn('App plugin not available:', error);
          return null;
        }
      }
      return null;
    },
    getNetworkStatus: async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { Network } = await import('@capacitor/network');
          return await Network.getStatus();
        } catch (error) {
          console.warn('Network plugin not available:', error);
          return null;
        }
      }
      return null;
    },
  },
};

export type MobileBridgeType = typeof MobileBridge;
