import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Device } from '@/types/device';
import { Lightbulb, Fan, Projector, AirVent } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, update, push } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

interface DeviceControlProps {
  device: Device;
  roomId: string;
  roomName?: string;
}

const DeviceControl = ({ device, roomId, roomName = 'Unknown Room' }: DeviceControlProps) => {
  const [isToggling, setIsToggling] = useState(false);
  const { toast } = useToast();

  const getDeviceIcon = () => {
    switch (device.type) {
      case 'light':
        return <Lightbulb className="w-4 h-4" />;
      case 'fan':
        return <Fan className="w-4 h-4" />;
      case 'projector':
        return <Projector className="w-4 h-4" />;
      case 'ac':
        return <AirVent className="w-4 h-4" />;
    }
  };

  const toggleDevice = async () => {
    setIsToggling(true);
    const deviceRef = ref(database, `rooms/${roomId}/devices/${device.id}`);
    const newState = !device.isOn;
    
    try {
      await update(deviceRef, {
        isOn: newState,
        lastUpdated: Date.now()
      });

      // Log the activity for analytics
      const logsRef = ref(database, `deviceLogs/${device.id}`);
      await push(logsRef, {
        deviceId: device.id,
        deviceName: device.name,
        roomId: roomId,
        roomName: roomName,
        action: newState ? 'on' : 'off',
        timestamp: Date.now()
      });
      
      toast({
        title: `${device.name} ${newState ? 'turned ON' : 'turned OFF'}`,
        description: `Device status updated successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update device status',
        variant: 'destructive',
      });
    }
    
    setIsToggling(false);
  };

  return (
    <div className={`flex items-center justify-between p-3 rounded-lg bg-muted/30 border transition-all duration-300 ${
      device.isOn ? 'border-primary device-active' : 'border-border'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded ${device.isOn ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
          {getDeviceIcon()}
        </div>
        <span className="text-sm font-medium">{device.name}</span>
      </div>
      <Button
        size="sm"
        onClick={toggleDevice}
        disabled={isToggling}
        className={device.isOn ? 'bg-accent hover:bg-accent/80' : 'bg-muted hover:bg-muted/80'}
      >
        {device.isOn ? 'ON' : 'OFF'}
      </Button>
    </div>
  );
};

export default DeviceControl;
