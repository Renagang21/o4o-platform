import { Geolocation, Position, PermissionStatus } from '@capacitor/geolocation';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
}

export async function getLocation(enableHighAccuracy = true, timeout = 10000): Promise<Coordinates | null> {
  try {
    const position = await Geolocation.getCurrentPosition({ enableHighAccuracy, timeout });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
    };
  } catch (error) {
    return null;
  }
}

export async function getSimpleLocation(): Promise<{ lat: number; lng: number } | null> {
  try {
    const position = await Geolocation.getCurrentPosition();
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch (error) {
    return null;
  }
}

export async function checkLocationPermissions(): Promise<PermissionStatus | null> {
  try {
    return await Geolocation.checkPermissions();
  } catch (error) {
    return null;
  }
}

export async function requestLocationPermissions(): Promise<boolean> {
  try {
    const permissions = await Geolocation.requestPermissions();
    return permissions.location === 'granted';
  } catch (error) {
    return false;
  }
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function getDistanceFromTarget(targetLat: number, targetLng: number): Promise<number | null> {
  try {
    const current = await getSimpleLocation();
    if (!current) return null;
    return calculateDistance(current.lat, current.lng, targetLat, targetLng);
  } catch (error) {
    return null;
  }
}

export async function watchLocation(callback: (position: Position) => void): Promise<string> {
  return await Geolocation.watchPosition({ enableHighAccuracy: true, timeout: 10000 }, callback);
}

export async function clearLocationWatch(watchId: string): Promise<void> {
  await Geolocation.clearWatch({ id: watchId });
}
