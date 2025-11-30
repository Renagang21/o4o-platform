/**
 * Camera Plugin
 */
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

export interface CameraOptions {
  quality?: number;
  allowEditing?: boolean;
  width?: number;
  height?: number;
}

export async function takePhoto(options?: CameraOptions): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: options?.quality ?? 80,
      allowEditing: options?.allowEditing ?? false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      width: options?.width,
      height: options?.height,
      correctOrientation: true,
    });
    return photo.base64String ?? null;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
}

export async function pickFromGallery(options?: CameraOptions): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: options?.quality ?? 80,
      allowEditing: options?.allowEditing ?? false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Photos,
      width: options?.width,
      height: options?.height,
      correctOrientation: true,
    });
    return photo.base64String ?? null;
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
}

export async function pickImage(options?: CameraOptions): Promise<string | null> {
  try {
    const photo = await Camera.getPhoto({
      quality: options?.quality ?? 80,
      allowEditing: options?.allowEditing ?? false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      width: options?.width,
      height: options?.height,
      correctOrientation: true,
    });
    return photo.base64String ?? null;
  } catch (error) {
    console.error('Image picker error:', error);
    return null;
  }
}

export async function checkCameraPermissions() {
  try {
    const permissions = await Camera.checkPermissions();
    return permissions.camera;
  } catch (error) {
    console.error('Permission check error:', error);
    return 'denied';
  }
}

export async function requestCameraPermissions() {
  try {
    const permissions = await Camera.requestPermissions({ permissions: ['camera', 'photos'] });
    return permissions.camera === 'granted';
  } catch (error) {
    console.error('Permission request error:', error);
    return false;
  }
}
