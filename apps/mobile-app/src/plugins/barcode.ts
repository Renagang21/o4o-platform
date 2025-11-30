import { BarcodeScanner, ScanResult } from '@capacitor-community/barcode-scanner';
import { Capacitor } from '@capacitor/core';

export interface BarcodeScanOptions {
  showFlipCameraButton?: boolean;
  showTorchButton?: boolean;
  torchOn?: boolean;
  prompt?: string;
  resultDisplayDuration?: number;
}

export async function scanBarcode(options?: BarcodeScanOptions): Promise<string | null> {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) return null;
    await BarcodeScanner.hideBackground();
    const result: ScanResult = await BarcodeScanner.startScan({ targetedFormats: [] });
    await BarcodeScanner.showBackground();
    return result.hasContent ? result.content : null;
  } catch (error) {
    await BarcodeScanner.showBackground();
    return null;
  }
}

export async function scanQRCode(): Promise<string | null> {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) return null;
    await BarcodeScanner.hideBackground();
    const result = await BarcodeScanner.startScan({ targetedFormats: ['QR_CODE'] });
    await BarcodeScanner.showBackground();
    return result.hasContent ? result.content : null;
  } catch (error) {
    await BarcodeScanner.showBackground();
    return null;
  }
}

export async function scanProductBarcode(): Promise<string | null> {
  try {
    const hasPermission = await checkPermission();
    if (!hasPermission) return null;
    await BarcodeScanner.hideBackground();
    const result = await BarcodeScanner.startScan({
      targetedFormats: ['EAN_13', 'EAN_8', 'UPC_A', 'UPC_E', 'CODE_128', 'CODE_39', 'CODE_93', 'CODABAR', 'ITF'],
    });
    await BarcodeScanner.showBackground();
    return result.hasContent ? result.content : null;
  } catch (error) {
    await BarcodeScanner.showBackground();
    return null;
  }
}

export async function stopScan(): Promise<void> {
  try {
    await BarcodeScanner.stopScan();
    await BarcodeScanner.showBackground();
  } catch (error) {
    console.error('Stop scan error:', error);
  }
}

async function checkPermission(): Promise<boolean> {
  try {
    const status = await BarcodeScanner.checkPermission({ force: true });
    return status.granted;
  } catch (error) {
    return false;
  }
}

export async function checkBarcodePermissions(): Promise<string> {
  try {
    const status = await BarcodeScanner.checkPermission({ force: false });
    if (status.granted) return 'granted';
    if (status.denied) return 'denied';
    if (status.restricted) return 'restricted';
    if (status.neverAsked) return 'prompt';
    return 'unknown';
  } catch (error) {
    return 'denied';
  }
}

export async function requestBarcodePermissions(): Promise<boolean> {
  try {
    const status = await BarcodeScanner.checkPermission({ force: true });
    return status.granted;
  } catch (error) {
    return false;
  }
}

export async function openSettings(): Promise<void> {
  try {
    await BarcodeScanner.openAppSettings();
  } catch (error) {
    console.error('Open settings error:', error);
  }
}

export async function isReady(): Promise<boolean> {
  try {
    if (Capacitor.getPlatform() === 'web') return false;
    const status = await BarcodeScanner.checkPermission({ force: false });
    return status.granted;
  } catch (error) {
    return false;
  }
}
