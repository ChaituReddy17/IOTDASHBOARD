import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Room, DeviceType } from '@/types/device';
import { database } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

interface AddDeviceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rooms: Room[];
  selectedRoomId?: string;
}

const AddDeviceDialog = ({ open, onOpenChange, rooms, selectedRoomId }: AddDeviceDialogProps) => {
  const [deviceName, setDeviceName] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceType>('light');
  const [roomId, setRoomId] = useState(selectedRoomId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!deviceName || !roomId) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    const deviceId = `${deviceType}-${Date.now()}`;
    const deviceRef = ref(database, `rooms/${roomId}/devices/${deviceId}`);
    
    try {
      await set(deviceRef, {
        id: deviceId,
        name: deviceName,
        type: deviceType,
        roomId: roomId,
        isOn: false,
        lastUpdated: Date.now()
      });

      toast({
        title: 'Device Added',
        description: `${deviceName} has been added successfully`,
      });

      // Reset form
      setDeviceName('');
      setDeviceType('light');
      setRoomId('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add device',
        variant: 'destructive',
      });
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Device</DialogTitle>
          <DialogDescription>
            Add a new device to monitor and control
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="device-name">Device Name</Label>
            <Input
              id="device-name"
              placeholder="e.g., Front Light"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              required
              className="bg-muted/50 border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="device-type">Device Type</Label>
            <Select value={deviceType} onValueChange={(value) => setDeviceType(value as DeviceType)}>
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="fan">Fan</SelectItem>
                <SelectItem value="projector">Projector</SelectItem>
                <SelectItem value="ac">AC Unit</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="room">Room</Label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue placeholder="Select a room" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {rooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 tech-gradient text-white"
            >
              {isSubmitting ? 'Adding...' : 'Add Device'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddDeviceDialog;
