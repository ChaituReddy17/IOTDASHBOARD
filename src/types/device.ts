export type DeviceType = 'light' | 'fan' | 'projector' | 'ac';
export type RoomType = 'classroom' | 'lab';

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
