export interface DeviceLog {
  deviceId: string;
  deviceName: string;
  roomId: string;
  roomName: string;
  action: 'on' | 'off';
  timestamp: number;
  powerRating?: number; // watts
}

export interface PowerConsumption {
  deviceId: string;
  deviceName: string;
  totalRuntime: number; // in minutes
  powerUsed: number; // in kWh
  timestamp: number;
}

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year';
