import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, Plus, Zap, BarChart3, Building2 } from 'lucide-react';
import RoomCard from '@/components/RoomCard';
import AddDeviceDialog from '@/components/AddDeviceDialog';
import AddRoomDialog from '@/components/AddRoomDialog';
import { Room } from '@/types/device';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';

const Dashboard = () => {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState(false);
  const [isAddRoomOpen, setIsAddRoomOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');

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
          <div className="flex gap-3">
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
