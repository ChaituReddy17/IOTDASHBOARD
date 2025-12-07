export type DeviceType = 'light' | 'fan' | 'projector' | 'ac';
export type RoomType = 'classroom' | 'lab' | 'office' | 'auditorium' | 'custom';

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  isOn: boolean;
  lastUpdated?: number;
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  devices: Device[];
}

// Power source types for solar/grid/battery system
export type PowerSourceType = 'solar' | 'grid' | 'battery';

export interface PowerSourceData {
  solar: {
    generated: number; // kW currently generated
    sentToGrid: number; // kWh sent to grid
    usedByUser: number; // kWh used directly
    sentToBattery: number; // kWh sent to battery
    percentage: number; // % of total power
  };
  grid: {
    used: number; // kWh drawn from grid
    sentToGrid: number; // kWh exported to grid
    percentage: number; // % of total power
  };
  battery: {
    capacity: number; // Total Wh capacity
    currentCharge: number; // Current Wh stored
    percentage: number; // % charged
    estimatedHours: number; // Hours of backup remaining
    health: number; // Battery health %
  };
}
