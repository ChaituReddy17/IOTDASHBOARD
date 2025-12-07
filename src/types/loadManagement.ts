export type LoadType = 'essential' | 'non-essential';

export interface LoadItem {
  id: string;
  deviceId: string;
  deviceName: string;
  roomId: string;
  roomName: string;
  loadType: LoadType;
  priority: number;
}

export interface LoadSettings {
  mode: 'automatic' | 'manual';
  activePowerSource: 'solar' | 'grid' | 'battery' | null;
  batteryThreshold: number; // Percentage at which to switch to essential-only
  solarThreshold: number;
  gridThreshold: number;
  essentialLoads: LoadItem[];
  nonEssentialLoads: LoadItem[];
  savePowerActive: boolean;
}
