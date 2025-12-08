import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LogOut, Plus, Zap, BarChart3, Building2, Sun, Plug, Battery, Settings, Bot, Hand } from 'lucide-react';
import RoomCard from '@/components/RoomCard';
import AddDeviceDialog from '@/components/AddDeviceDialog';
import AddRoomDialog from '@/components/AddRoomDialog';
import { Room, PowerSourceData } from '@/types/device';
import { LoadSettings } from '@/types/loadManagement';
import { database } from '@/lib/firebase';
import { ref, onValue, set, update } from 'firebase/database';
import { toast } from 'sonner';
import { useAutoLoadController } from '@/hooks/useAutoLoadController';

const Dashboard = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [powerSources, setPowerSources] = useState<PowerSourceData>({
    solar: { generated: 0, sentToGrid: 0, usedByUser: 0, sentToBattery: 0, percentage: 0 },
    grid: { used: 0, sentToGrid: 0, percentage: 0 },
    battery: { capacity: 5000, currentCharge: 0, percentage: 0, estimatedHours: 0, health: 100 },
  });
  const [loadSettings, setLoadSettings] = useState<LoadSettings>({
    mode: 'manual',
    activePowerSource: null,
    batteryThreshold: 40,
    solarThreshold: 20,
    gridThreshold: 10,
    essentialLoads: [],
    nonEssentialLoads: [],
    savePowerActive: false,
  });

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/');
      return;
    }

    // Initialize rooms if not exists
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
            lastUpdated: d.lastUpdated
          })) : []
        }));
        setRooms(roomsArray);
      } else {
        // Initialize with default rooms
        initializeRooms();
      }
    });

    // Listen to power sources data
    const powerRef = ref(database, 'powerSources');
    onValue(powerRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const totalPower = (data.solar?.current?.generated || 0) + 
                          (data.grid?.current?.used || 0);
        
        setPowerSources({
          solar: {
            generated: data.solar?.current?.generated || 0,
            sentToGrid: data.solar?.current?.sentToGrid || 0,
            usedByUser: data.solar?.current?.usedByUser || 0,
            sentToBattery: data.solar?.current?.sentToBattery || 0,
            percentage: totalPower > 0 
              ? Math.round((data.solar?.current?.generated || 0) / totalPower * 100) 
              : 0,
          },
          grid: {
            used: data.grid?.current?.used || 0,
            sentToGrid: data.grid?.current?.sentToGrid || 0,
            percentage: totalPower > 0 
              ? Math.round((data.grid?.current?.used || 0) / totalPower * 100) 
              : 0,
          },
          battery: {
            capacity: data.battery?.status?.capacity || 5000,
            currentCharge: data.battery?.status?.currentCharge || 0,
            percentage: data.battery?.status?.capacity > 0 
              ? Math.round((data.battery?.status?.currentCharge || 0) / (data.battery?.status?.capacity || 5000) * 100) 
              : 0,
            estimatedHours: data.battery?.status?.estimatedHours || 0,
            health: data.battery?.status?.health || 100,
          },
        });
      }
    });

    // Listen to load settings
    const loadSettingsRef = ref(database, 'loadSettings');
    onValue(loadSettingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setLoadSettings({
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
  }, [navigate]);

  const initializeRooms = () => {
    const initialRooms: any = {};
    
    // Create 12 classrooms
    for (let i = 1; i <= 12; i++) {
      const roomId = `classroom-${i}`;
      initialRooms[roomId] = {
        name: `Classroom ${i}`,
        type: 'classroom',
        devices: {}
      };
    }
    
    // Create 7 labs
    for (let i = 1; i <= 7; i++) {
      const roomId = `lab-${i}`;
      initialRooms[roomId] = {
        name: `Lab ${i}`,
        type: 'lab',
        devices: {}
      };
    }

    set(ref(database, 'rooms'), initialRooms);
  };

  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    navigate('/');
  };

  const handleAddDevice = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsAddDeviceOpen(true);
  };

  const getBatteryColor = () => {
    if (powerSources.battery.percentage > 60) return 'text-green-500';
    if (powerSources.battery.percentage > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handlePowerSourceToggle = async (source: 'solar' | 'grid' | 'battery') => {
    const newActiveSource = loadSettings.activePowerSource === source ? null : source;
    await set(ref(database, 'loadSettings/activePowerSource'), newActiveSource);
    toast.success(newActiveSource ? `${source.charAt(0).toUpperCase() + source.slice(1)} set as active` : 'Power source deactivated');
  };

  const handleModeToggle = async () => {
    const newMode = loadSettings.mode === 'automatic' ? 'manual' : 'automatic';
    await set(ref(database, 'loadSettings/mode'), newMode);
    toast.success(`Switched to ${newMode} mode`);
  };

  // Initialize auto load controller
  useAutoLoadController();

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full tech-gradient flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                IoT Control Dashboard
              </h1>
              <p className="text-muted-foreground">Manage your smart infrastructure</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {/* Mode Toggle Button */}
            <Button 
              variant={loadSettings.mode === 'automatic' ? 'default' : 'outline'}
              onClick={handleModeToggle}
              className={loadSettings.mode === 'automatic' 
                ? 'tech-gradient text-white' 
                : 'border-primary/50 text-primary hover:bg-primary hover:text-white'
              }
            >
              {loadSettings.mode === 'automatic' ? (
                <>
                  <Bot className="w-4 h-4 mr-2" />
                  Automatic
                </>
              ) : (
                <>
                  <Hand className="w-4 h-4 mr-2" />
                  Manual
                </>
              )}
            </Button>
            <Button 
              variant="outline"
              onClick={() => navigate('/analytics')}
              className="border-primary/50 text-primary hover:bg-primary hover:text-white"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Analytics
            </Button>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="border-destructive/50 text-destructive hover:bg-destructive hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Power Sources - 3 Clickable Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Solar Power Card */}
          <Card 
            className={`glass-card border-yellow-500/30 cursor-pointer transition-all hover:scale-[1.02] hover:border-yellow-500/60 hover:shadow-lg hover:shadow-yellow-500/10 ${
              loadSettings.activePowerSource === 'solar' ? 'ring-2 ring-yellow-500' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2" onClick={() => navigate('/solar-analytics')}>
                  <Sun className="w-5 h-5 text-yellow-500" />
                  Solar Power
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-yellow-500 text-lg font-bold">{powerSources.solar.percentage}%</span>
                  {loadSettings.mode === 'manual' && (
                    <Switch
                      checked={loadSettings.activePowerSource === 'solar'}
                      onCheckedChange={() => handlePowerSourceToggle('solar')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent onClick={() => navigate('/solar-analytics')}>
              <p className="text-3xl font-bold text-yellow-500">{powerSources.solar.generated.toFixed(2)} kW</p>
              <p className="text-xs text-muted-foreground mt-1">Click to view solar analytics</p>
            </CardContent>
          </Card>

          {/* Grid Power Card */}
          <Card 
            className={`glass-card border-blue-500/30 cursor-pointer transition-all hover:scale-[1.02] hover:border-blue-500/60 hover:shadow-lg hover:shadow-blue-500/10 ${
              loadSettings.activePowerSource === 'grid' ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2" onClick={() => navigate('/grid-analytics')}>
                  <Plug className="w-5 h-5 text-blue-500" />
                  Grid Voltage
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-500 text-lg font-bold">{powerSources.grid.percentage}%</span>
                  {loadSettings.mode === 'manual' && (
                    <Switch
                      checked={loadSettings.activePowerSource === 'grid'}
                      onCheckedChange={() => handlePowerSourceToggle('grid')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent onClick={() => navigate('/grid-analytics')}>
              <p className="text-3xl font-bold text-blue-500">{powerSources.grid.used.toFixed(2)} kW</p>
              <p className="text-xs text-muted-foreground mt-1">Click to view grid analytics</p>
            </CardContent>
          </Card>

          {/* Battery Power Card */}
          <Card 
            className={`glass-card border-green-500/30 cursor-pointer transition-all hover:scale-[1.02] hover:border-green-500/60 hover:shadow-lg hover:shadow-green-500/10 ${
              loadSettings.activePowerSource === 'battery' ? 'ring-2 ring-green-500' : ''
            }`}
          >
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-2" onClick={() => navigate('/battery-analytics')}>
                  <Battery className="w-5 h-5 text-green-500" />
                  Battery Voltage
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getBatteryColor()}`}>{powerSources.battery.percentage}%</span>
                  {loadSettings.mode === 'manual' && (
                    <Switch
                      checked={loadSettings.activePowerSource === 'battery'}
                      onCheckedChange={() => handlePowerSourceToggle('battery')}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent onClick={() => navigate('/battery-analytics')}>
              <p className={`text-3xl font-bold ${getBatteryColor()}`}>{powerSources.battery.estimatedHours.toFixed(1)} hrs</p>
              <p className="text-xs text-muted-foreground mt-1">Backup remaining • Click for details</p>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Rooms</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{rooms.length}</p>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">
                {rooms.reduce((acc, room) => acc + room.devices.filter(d => d.isOn).length, 0)}
              </p>
            </CardContent>
          </Card>
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Devices</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-secondary">
                {rooms.reduce((acc, room) => acc + room.devices.length, 0)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Rooms Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Rooms</h2>
            <div className="flex gap-3">
              <Button 
                variant="outline"
                onClick={() => setIsAddRoomOpen(true)}
                className="border-accent/50 text-accent hover:bg-accent hover:text-white"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Add Room
              </Button>
              <Button 
                onClick={() => setIsAddDeviceOpen(true)}
                className="tech-gradient text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Device
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {rooms.map((room) => (
              <RoomCard 
                key={room.id} 
                room={room}
                onAddDevice={handleAddDevice}
              />
            ))}
          </div>
        </div>
      </div>

      <AddRoomDialog 
        open={isAddRoomOpen}
        onOpenChange={setIsAddRoomOpen}
      />

      <AddDeviceDialog 
        open={isAddDeviceOpen}
        onOpenChange={setIsAddDeviceOpen}
        rooms={rooms}
        selectedRoomId={selectedRoomId}
      />
    </div>
  );
};

export default Dashboard;

