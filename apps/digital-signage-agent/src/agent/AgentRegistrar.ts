/**
 * Agent Registrar
 *
 * Handles Display registration and re-connection with Core
 * Phase 7: Device Agent
 */

import { v4 as uuidv4 } from 'uuid';
import { AgentConfig } from './AgentConfig';
import { AgentLogger } from './AgentLogger';

export interface DisplayRegistration {
  displayId: string;
  hardwareId: string;
  name: string;
  status: 'online' | 'offline' | 'unknown';
  slots: SlotInfo[];
  registeredAt: Date;
}

export interface SlotInfo {
  id: string;
  name: string;
  position?: string;
  status: 'idle' | 'playing' | 'paused' | 'error';
}

export interface RegistrationResult {
  success: boolean;
  displayId?: string;
  slots?: SlotInfo[];
  error?: string;
}

export class AgentRegistrar {
  private config: AgentConfig;
  private logger: AgentLogger;
  private registration: DisplayRegistration | null = null;

  constructor(config: AgentConfig, logger: AgentLogger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Get or generate hardware ID
   */
  getHardwareId(): string {
    if (this.config.hardwareId) {
      return this.config.hardwareId;
    }

    // Generate a persistent hardware ID based on system info
    // In production, this should use OS-specific identifiers
    const generatedId = this.generateHardwareId();
    this.logger.info('Generated hardware ID', { hardwareId: generatedId });
    return generatedId;
  }

  /**
   * Generate a hardware ID (UUID-based for now)
   * In production, should use MAC address or other persistent identifiers
   */
  private generateHardwareId(): string {
    // Try to load from local storage/file first
    // For now, generate new UUID
    return `device-${uuidv4().substring(0, 8)}`;
  }

  /**
   * Get device name
   */
  getDeviceName(): string {
    return this.config.deviceName || `Display-${this.getHardwareId().substring(0, 8)}`;
  }

  /**
   * Register display with Core server
   */
  async registerDisplay(
    httpClient: { post: (url: string, data: any) => Promise<any> }
  ): Promise<RegistrationResult> {
    const hardwareId = this.getHardwareId();
    const deviceName = this.getDeviceName();

    this.logger.info('Registering display with Core', { hardwareId, deviceName });

    try {
      const response = await httpClient.post('/api/digital-signage/displays/register', {
        hardwareId,
        name: deviceName,
        deviceId: hardwareId,
      });

      if (response.success && response.data) {
        this.registration = {
          displayId: response.data.id,
          hardwareId,
          name: response.data.name,
          status: 'online',
          slots: response.data.slots || [],
          registeredAt: new Date(),
        };

        this.logger.info('Display registered successfully', {
          displayId: this.registration.displayId,
          slots: this.registration.slots.length,
        });

        return {
          success: true,
          displayId: this.registration.displayId,
          slots: this.registration.slots,
        };
      }

      return {
        success: false,
        error: response.error || 'Registration failed',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Display registration failed', { error: errorMessage });

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Get current registration
   */
  getRegistration(): DisplayRegistration | null {
    return this.registration;
  }

  /**
   * Get display ID
   */
  getDisplayId(): string | null {
    return this.registration?.displayId || null;
  }

  /**
   * Get slot IDs
   */
  getSlotIds(): string[] {
    return this.registration?.slots.map(s => s.id) || [];
  }

  /**
   * Update slot status
   */
  updateSlotStatus(slotId: string, status: SlotInfo['status']): void {
    if (!this.registration) return;

    const slot = this.registration.slots.find(s => s.id === slotId);
    if (slot) {
      slot.status = status;
      this.logger.debug('Slot status updated', { slotId, status });
    }
  }

  /**
   * Clear registration (on disconnect)
   */
  clearRegistration(): void {
    this.registration = null;
    this.logger.info('Registration cleared');
  }
}
