import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Room } from '@/types/device';
import { Plus, School, FlaskConical } from 'lucide-react';
import DeviceControl from './DeviceControl';

interface RoomCardProps {
  room: Room;
  onAddDevice: (roomId: string) => void;
}

const RoomCard = ({ room, onAddDevice }: RoomCardProps) => {
  return (
    <Card className="glass-card border-primary/20 hover:border-primary/40 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {room.type === 'classroom' ? (
              <School className="w-5 h-5 text-primary" />
            ) : (
              <FlaskConical className="w-5 h-5 text-accent" />
            )}
            <CardTitle className="text-lg">{room.name}</CardTitle>
          </div>
          <Button 
            size="sm" 
            variant="ghost"
            onClick={() => onAddDevice(room.id)}
            className="h-7 w-7 p-0 hover:bg-primary/20"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {room.devices.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No devices added yet
          </p>
        ) : (
          room.devices.map((device) => (
            <DeviceControl 
              key={device.id} 
              device={device}
              roomId={room.id}
              roomName={room.name}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RoomCard;
