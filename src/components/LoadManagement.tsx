import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Zap, ZapOff, Settings, AlertTriangle, Power } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';
import { LoadItem, LoadSettings } from '@/types/loadManagement';
import { Device, Room } from '@/types/device';
import { toast } from 'sonner';

interface LoadManagementProps {
  powerSourceType: 'solar' | 'grid' | 'battery';
}

const LoadManagement = ({ powerSourceType }: LoadManagementProps) => {
  const [settings, setSettings] = useState<LoadSettings>({
    mode: 'manual',
    activePowerSource: null,
    batteryThreshold: 40,
    solarThreshold: 20,
    gridThreshold: 10,
    essentialLoads: [],
    nonEssentialLoads: [],
    savePowerActive: false,
  });
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addToList, setAddToList] = useState<'essential' | 'non-essential'>('essential');
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [selectedDevice, setSelectedDevice] = useState<string>('');

  useEffect(() => {
    // Load settings from Firebase
    const settingsRef = ref(database, 'loadSettings');
    onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings({
          mode: data.mode || 'manual',
          activePowerSource: data.activePowerSource || null,
          batteryThreshold: data.batteryThreshold || 40,
          solarThreshold: data.solarThreshold || 20,
          gridThreshold: data.gridThreshold || 10,
          essentialLoads: data.essentialLoads ? Object.values(data.essentialLoads) : [],
          nonEssentialLoads: data.nonEssentialLoads ? Object.values(data.nonEssentialLoads) : [],
          savePowerActive: data.savePowerActive || false,
        });
      }
    });

    // Load rooms for adding devices
    const roomsRef = ref(database, 'rooms');
    onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const roomsArray = Object.entries(data).map(([id, room]: [string, any]) => ({
          id,
          name: room.name,
          type: room.type,
          devices: room.devices ? Object.values(room.devices).map((d: any) => ({
            id: d.id,
            name: d.name,
            type: d.type,
            roomId: d.roomId,
            isOn: d.isOn,
          })) : []
        }));
        setRooms(roomsArray);
      }
    });
  }, []);

  const saveSettings = async (newSettings: Partial<LoadSettings>) => {
    const updated = { ...settings, ...newSettings };
    
    // Convert arrays to objects for Firebase
    const firebaseData: any = {
      mode: updated.mode,
      activePowerSource: updated.activePowerSource,
      batteryThreshold: updated.batteryThreshold,
      solarThreshold: updated.solarThreshold,
      gridThreshold: updated.gridThreshold,
      savePowerActive: updated.savePowerActive,
      essentialLoads: {},
      nonEssentialLoads: {},
    };

    updated.essentialLoads.forEach((load) => {
      firebaseData.essentialLoads[load.id] = load;
    });
    updated.nonEssentialLoads.forEach((load) => {
      firebaseData.nonEssentialLoads[load.id] = load;
    });

    await set(ref(database, 'loadSettings'), firebaseData);
    toast.success('Settings saved');
  };

  const handleAddDevice = () => {
    if (!selectedRoom || !selectedDevice) {
      toast.error('Please select a room and device');
      return;
    }

    const room = rooms.find(r => r.id === selectedRoom);
    const device = room?.devices.find(d => d.id === selectedDevice);

    if (!room || !device) return;

    const newLoad: LoadItem = {
      id: `${selectedRoom}-${selectedDevice}`,
      deviceId: device.id,
      deviceName: device.name,
      roomId: room.id,
      roomName: room.name,
      loadType: addToList,
      priority: addToList === 'essential' ? settings.essentialLoads.length + 1 : settings.nonEssentialLoads.length + 1,
    };

    // Check if already exists
    const allLoads = [...settings.essentialLoads, ...settings.nonEssentialLoads];
    if (allLoads.find(l => l.id === newLoad.id)) {
      toast.error('Device already in a load list');
      return;
    }

    if (addToList === 'essential') {
      saveSettings({ essentialLoads: [...settings.essentialLoads, newLoad] });
    } else {
      saveSettings({ nonEssentialLoads: [...settings.nonEssentialLoads, newLoad] });
    }

    setIsAddDialogOpen(false);
    setSelectedRoom('');
    setSelectedDevice('');
  };

  const handleRemoveLoad = (loadId: string, loadType: 'essential' | 'non-essential') => {
    if (loadType === 'essential') {
      saveSettings({ essentialLoads: settings.essentialLoads.filter(l => l.id !== loadId) });
    } else {
      saveSettings({ nonEssentialLoads: settings.nonEssentialLoads.filter(l => l.id !== loadId) });
    }
  };

  const handleSavePower = async () => {
    // Turn off all non-essential loads
    const promises = settings.nonEssentialLoads.map(async (load) => {
      const deviceRef = ref(database, `rooms/${load.roomId}/devices/${load.deviceId}`);
      await update(deviceRef, { isOn: false, lastUpdated: Date.now() });
    });

    await Promise.all(promises);
    await saveSettings({ savePowerActive: true });
    toast.success('Power saving mode activated - Non-essential loads turned off');
  };

  const handleSetActive = async () => {
    await saveSettings({ activePowerSource: powerSourceType });
    toast.success(`${powerSourceType.charAt(0).toUpperCase() + powerSourceType.slice(1)} set as active power source`);
  };

  const selectedRoomData = rooms.find(r => r.id === selectedRoom);
  const availableDevices = selectedRoomData?.devices || [];

  const getThresholdForSource = () => {
    switch (powerSourceType) {
      case 'battery': return settings.batteryThreshold;
      case 'solar': return settings.solarThreshold;
      case 'grid': return settings.gridThreshold;
    }
  };

  const setThresholdForSource = (value: number) => {
    switch (powerSourceType) {
      case 'battery': return saveSettings({ batteryThreshold: value });
      case 'solar': return saveSettings({ solarThreshold: value });
      case 'grid': return saveSettings({ gridThreshold: value });
    }
  };

  return (
    <div className="space-y-6">
      {/* Set Active & Save Power Buttons */}
      <div className="flex flex-wrap gap-4">
        <Button
          onClick={handleSetActive}
          variant={settings.activePowerSource === powerSourceType ? 'default' : 'outline'}
          className={settings.activePowerSource === powerSourceType ? 'tech-gradient text-white' : ''}
        >
          <Power className="w-4 h-4 mr-2" />
          {settings.activePowerSource === powerSourceType ? 'Active Source' : 'Set Active'}
        </Button>
        
        <Button
          onClick={handleSavePower}
          variant="outline"
          className="border-orange-500/50 text-orange-500 hover:bg-orange-500 hover:text-white"
        >
          <ZapOff className="w-4 h-4 mr-2" />
          Save Power
        </Button>
      </div>

      {/* Threshold Setting */}
      <Card className="glass-card border-yellow-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Essential Load Only Threshold
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            When {powerSourceType} reaches {getThresholdForSource()}%, switch to essential loads only
          </p>
          <div className="flex items-center gap-4">
            <Slider
              value={[getThresholdForSource()]}
              onValueChange={(value) => setThresholdForSource(value[0])}
              min={5}
              max={80}
              step={5}
              className="flex-1"
            />
            <span className="text-lg font-bold text-yellow-500 w-16 text-right">
              {getThresholdForSource()}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Load Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Essential Loads */}
        <Card className="glass-card border-green-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-green-500" />
                Essential Loads
              </CardTitle>
              <Dialog open={isAddDialogOpen && addToList === 'essential'} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (open) setAddToList('essential');
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-green-500/30">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border">
                  <DialogHeader>
                    <DialogTitle>Add to Essential Loads</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Room</Label>
                      <Select value={selectedRoom} onValueChange={(value) => {
                        setSelectedRoom(value);
                        setSelectedDevice('');
                      }}>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder="Choose a room" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Device</Label>
                      <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={!selectedRoom}>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder="Choose a device" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {availableDevices.map((device) => (
                            <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddDevice} className="w-full tech-gradient text-white">
                      Add Device
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {settings.essentialLoads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No essential loads configured
              </p>
            ) : (
              <ul className="space-y-2">
                {settings.essentialLoads.map((load) => (
                  <li
                    key={load.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                  >
                    <div>
                      <p className="font-medium text-foreground">{load.deviceName}</p>
                      <p className="text-xs text-muted-foreground">{load.roomName}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveLoad(load.id, 'essential')}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Non-Essential Loads */}
        <Card className="glass-card border-orange-500/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ZapOff className="w-5 h-5 text-orange-500" />
                Non-Essential Loads
              </CardTitle>
              <Dialog open={isAddDialogOpen && addToList === 'non-essential'} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (open) setAddToList('non-essential');
              }}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="border-orange-500/30">
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-background border-border">
                  <DialogHeader>
                    <DialogTitle>Add to Non-Essential Loads</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Select Room</Label>
                      <Select value={selectedRoom} onValueChange={(value) => {
                        setSelectedRoom(value);
                        setSelectedDevice('');
                      }}>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder="Choose a room" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {rooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Select Device</Label>
                      <Select value={selectedDevice} onValueChange={setSelectedDevice} disabled={!selectedRoom}>
                        <SelectTrigger className="bg-muted/50 border-border">
                          <SelectValue placeholder="Choose a device" />
                        </SelectTrigger>
                        <SelectContent className="bg-background border-border">
                          {availableDevices.map((device) => (
                            <SelectItem key={device.id} value={device.id}>{device.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddDevice} className="w-full tech-gradient text-white">
                      Add Device
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {settings.nonEssentialLoads.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No non-essential loads configured
              </p>
            ) : (
              <ul className="space-y-2">
                {settings.nonEssentialLoads.map((load) => (
                  <li
                    key={load.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-orange-500/10 border border-orange-500/20"
                  >
                    <div>
                      <p className="font-medium text-foreground">{load.deviceName}</p>
                      <p className="text-xs text-muted-foreground">{load.roomName}</p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveLoad(load.id, 'non-essential')}
                      className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoadManagement;
