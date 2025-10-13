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
import { RoomType } from '@/types/device';
import { database } from '@/lib/firebase';
import { ref, set } from 'firebase/database';
import { useToast } from '@/hooks/use-toast';

interface AddRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AddRoomDialog = ({ open, onOpenChange }: AddRoomDialogProps) => {
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('classroom');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName) {
      toast({
        title: 'Error',
        description: 'Please enter a room name',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    
    const roomId = `${roomType}-${Date.now()}`;
    const roomRef = ref(database, `rooms/${roomId}`);
    
    try {
      await set(roomRef, {
        name: roomName,
        type: roomType,
        devices: {}
      });

      toast({
        title: 'Room Added',
        description: `${roomName} has been added successfully`,
      });

      // Reset form
      setRoomName('');
      setRoomType('classroom');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add room',
        variant: 'destructive',
      });
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-2xl">Add New Room</DialogTitle>
          <DialogDescription>
            Create a new room to manage devices
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="room-name">Room Name</Label>
            <Input
              id="room-name"
              placeholder="e.g., Classroom 13"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              required
              className="bg-muted/50 border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="room-type">Room Type</Label>
            <Select value={roomType} onValueChange={(value) => setRoomType(value as RoomType)}>
              <SelectTrigger className="bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classroom">Classroom</SelectItem>
                <SelectItem value="lab">Lab</SelectItem>
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
              {isSubmitting ? 'Adding...' : 'Add Room'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddRoomDialog;
