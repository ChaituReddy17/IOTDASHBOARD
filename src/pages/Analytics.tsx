import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Zap, Clock, TrendingUp, Activity, Gauge, Settings } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue, set } from 'firebase/database';
import { toast } from 'sonner';
import { DeviceLog, AnalyticsPeriod } from '@/types/analytics';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

const COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Power ratings for different devices (in watts) - CURRENT METHOD
const DEVICE_POWER_RATINGS = {
  light: 60,
  fan: 75,
  projector: 250,
  ac: 1500,
};

// ===========================================
// FUTURE REFERENCE: VOLTAGE & CURRENT SENSOR BASED POWER CALCULATION
// ===========================================
// This section calculates power using real-time voltage and current sensor data
// from Firebase instead of estimated power ratings.
// 
// Firebase structure for sensor data:
// /sensorData/{roomId}/{deviceId}
//   - voltage: number (in Volts)
//   - current: number (in Amperes)
//   - timestamp: number
//
// To enable this feature:
// 1. Uncomment the useSensorData state and useEffect below
// 2. Uncomment the calculateRealPower function
// 3. Replace calculatePowerConsumption() calls with calculateRealPower()
// 4. Ensure ESP8266 sends voltage/current data to Firebase
//
// interface SensorReading {
//   voltage: number;
//   current: number;
//   timestamp: number;
//   deviceId: string;
//   roomId: string;
// }
//
// const [sensorData, setSensorData] = useState<SensorReading[]>([]);
//
// useEffect(() => {
//   const sensorRef = ref(database, 'sensorData');
//   onValue(sensorRef, (snapshot) => {
//     const data = snapshot.val();
//     if (data) {
//       const readings: SensorReading[] = [];
//       Object.entries(data).forEach(([roomId, devices]: [string, any]) => {
//         Object.entries(devices).forEach(([deviceId, reading]: [string, any]) => {
//           readings.push({
//             ...reading,
//             deviceId,
//             roomId,
//           });
//         });
//       });
//       setSensorData(readings.sort((a, b) => b.timestamp - a.timestamp));
//     }
//   });
// }, []);
//
// const calculateRealPower = () => {
//   // P = V × I (Power = Voltage × Current)
//   return sensorData.map(reading => ({
//     deviceId: reading.deviceId,
//     roomId: reading.roomId,
//     voltage: reading.voltage,
//     current: reading.current,
//     power: reading.voltage * reading.current, // Watts
//     powerKW: (reading.voltage * reading.current) / 1000, // kW
//     timestamp: reading.timestamp,
//   }));
// };
//
// const getTotalRealPower = () => {
//   const readings = calculateRealPower();
//   return readings.reduce((sum, r) => sum + r.power, 0);
// };
// ===========================================
// END FUTURE REFERENCE
// ===========================================

// Voltage and Current data types for graphs
interface VoltageCurrentData {
  timestamp: number;
  voltage: number;
  current: number;
  power: number;
  time: string;
  deviceId: string;
  deviceName: string;
  roomId: string;
  roomName: string;
}

interface DeviceSensorInfo {
  deviceId: string;
  deviceName: string;
  roomName: string;
}

const Analytics = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>('day');
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [voltageCurrentData, setVoltageCurrentData] = useState<VoltageCurrentData[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('all');
  const [devicesList, setDevicesList] = useState<DeviceSensorInfo[]>([]);
  const [operationMode, setOperationMode] = useState<'automatic' | 'manual'>('manual');

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/');
      return;
    }

    // Listen to load settings for mode
    const settingsRef = ref(database, 'loadSettings/mode');
    onValue(settingsRef, (snapshot) => {
      const mode = snapshot.val();
      if (mode) {
        setOperationMode(mode);
      }
    });

    // Listen to device logs
    const logsRef = ref(database, 'deviceLogs');
    onValue(logsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const logsArray: DeviceLog[] = [];
        Object.values(data).forEach((deviceLogs: any) => {
          Object.values(deviceLogs).forEach((log: any) => {
            logsArray.push(log);
          });
        });
        setDeviceLogs(logsArray.sort((a, b) => b.timestamp - a.timestamp));
      }
      setLoading(false);
    });

    // Listen to voltage/current sensor data from Firebase
    // Expected structure: /sensorData/{roomId}/{deviceId}/{readingId}
    const sensorRef = ref(database, 'sensorData');
    onValue(sensorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings: VoltageCurrentData[] = [];
        const devices: DeviceSensorInfo[] = [];
        const seenDevices = new Set<string>();

        Object.entries(data).forEach(([roomId, roomData]: [string, any]) => {
          const roomName = roomData.roomName || roomId;
          Object.entries(roomData).forEach(([deviceId, deviceData]: [string, any]) => {
            if (deviceId === 'roomName') return; // Skip metadata
            
            const deviceName = deviceData.deviceName || deviceId;
            
            // Track unique devices
            if (!seenDevices.has(deviceId)) {
              seenDevices.add(deviceId);
              devices.push({ deviceId, deviceName, roomName });
            }

            // Get readings - can be single object or array of readings
            if (deviceData.readings) {
              Object.values(deviceData.readings).forEach((reading: any) => {
                if (reading.voltage !== undefined && reading.current !== undefined) {
                  readings.push({
                    voltage: reading.voltage,
                    current: reading.current,
                    power: reading.voltage * reading.current,
                    timestamp: reading.timestamp || Date.now(),
                    time: new Date(reading.timestamp || Date.now()).toLocaleTimeString(),
                    deviceId,
                    deviceName,
                    roomId,
                    roomName,
                  });
                }
              });
            } else if (deviceData.voltage !== undefined && deviceData.current !== undefined) {
              // Single reading format
              readings.push({
                voltage: deviceData.voltage,
                current: deviceData.current,
                power: deviceData.voltage * deviceData.current,
                timestamp: deviceData.timestamp || Date.now(),
                time: new Date(deviceData.timestamp || Date.now()).toLocaleTimeString(),
                deviceId,
                deviceName,
                roomId,
                roomName,
              });
            }
          });
        });

        setDevicesList(devices);
        // Sort by timestamp ascending for proper graph display
        setVoltageCurrentData(readings.sort((a, b) => a.timestamp - b.timestamp));
      }
    });
  }, [navigate]);

  const getFilteredLogs = () => {
    const now = Date.now();
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    return deviceLogs.filter(log => log.timestamp > now - periodMs[period]);
  };

  const getFilteredSensorData = () => {
    const now = Date.now();
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };

    let filtered = voltageCurrentData.filter(data => data.timestamp > now - periodMs[period]);
    
    // Filter by selected device if not "all"
    if (selectedDevice !== 'all') {
      filtered = filtered.filter(data => data.deviceId === selectedDevice);
    }

    return filtered;
  };

  // Get latest readings per device for the stats cards
  const getLatestDeviceReadings = () => {
    const latestByDevice: { [key: string]: VoltageCurrentData } = {};
    voltageCurrentData.forEach(reading => {
      if (!latestByDevice[reading.deviceId] || reading.timestamp > latestByDevice[reading.deviceId].timestamp) {
        latestByDevice[reading.deviceId] = reading;
      }
    });
    return Object.values(latestByDevice);
  };

  const calculatePowerConsumption = () => {
    const logs = getFilteredLogs();
    const deviceRuntimes: { [key: string]: { name: string; runtime: number; type: string } } = {};

    logs.forEach((log, index) => {
      if (log.action === 'on') {
        const nextLog = logs.find(
          (l, i) => i > index && l.deviceId === log.deviceId && l.action === 'off'
        );
        
        if (nextLog) {
          const runtime = (nextLog.timestamp - log.timestamp) / (1000 * 60); // minutes
          if (!deviceRuntimes[log.deviceId]) {
            deviceRuntimes[log.deviceId] = {
              name: log.deviceName,
              runtime: 0,
              type: log.deviceName.toLowerCase().includes('light') ? 'light' :
                    log.deviceName.toLowerCase().includes('fan') ? 'fan' :
                    log.deviceName.toLowerCase().includes('projector') ? 'projector' : 'ac'
            };
          }
          deviceRuntimes[log.deviceId].runtime += runtime;
        }
      }
    });

    return Object.entries(deviceRuntimes).map(([id, data]) => ({
      deviceId: id,
      deviceName: data.name,
      runtime: Math.round(data.runtime),
      powerUsed: Number(((data.runtime / 60) * (DEVICE_POWER_RATINGS[data.type as keyof typeof DEVICE_POWER_RATINGS] / 1000)).toFixed(2)),
    }));
  };

  const getActivityByDay = () => {
    const logs = getFilteredLogs();
    const dayData: { [key: string]: { count: number; timestamp: number } } = {};

    logs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString();
      if (!dayData[date]) {
        dayData[date] = { count: 0, timestamp: log.timestamp };
      }
      dayData[date].count += 1;
    });

    // Sort by timestamp ascending (oldest first) for correct graph display
    return Object.entries(dayData)
      .map(([date, data]) => ({ date, activities: data.count, timestamp: data.timestamp }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-7);
  };

  const getTotalStats = () => {
    const consumption = calculatePowerConsumption();
    const totalRuntime = consumption.reduce((sum, d) => sum + d.runtime, 0);
    const totalPower = consumption.reduce((sum, d) => sum + d.powerUsed, 0);
    const totalActivities = getFilteredLogs().length;

    // Get latest sensor readings for display
    const sensorData = getFilteredSensorData();
    const latestVoltage = sensorData.length > 0 ? sensorData[sensorData.length - 1].voltage : 0;
    const latestCurrent = sensorData.length > 0 ? sensorData[sensorData.length - 1].current : 0;

    return { totalRuntime, totalPower, totalActivities, latestVoltage, latestCurrent };
  };

  const stats = getTotalStats();
  const powerData = calculatePowerConsumption();
  const activityData = getActivityByDay();
  const sensorGraphData = getFilteredSensorData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="border-primary/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-muted-foreground">Monitor energy usage and device activity</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* Auto/Manual Mode Toggle */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="mode-toggle" className="text-sm font-medium">
                {operationMode === 'automatic' ? 'Automatic' : 'Manual'}
              </Label>
              <Switch
                id="mode-toggle"
                checked={operationMode === 'automatic'}
                onCheckedChange={(checked) => {
                  const newMode = checked ? 'automatic' : 'manual';
                  setOperationMode(newMode);
                  set(ref(database, 'loadSettings/mode'), newMode);
                  toast.success(`Switched to ${newMode} mode`);
                }}
              />
            </div>
            <Select value={period} onValueChange={(value) => setPeriod(value as AnalyticsPeriod)}>
              <SelectTrigger className="w-32 bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="year">Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Total Power Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{stats.totalPower.toFixed(2)} kWh</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent" />
                Total Runtime
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">{Math.round(stats.totalRuntime)} min</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-secondary" />
                Total Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-secondary">{stats.totalActivities}</p>
            </CardContent>
          </Card>

          {/* Voltage Display */}
          <Card className="glass-card border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Gauge className="w-4 h-4 text-yellow-500" />
                Current Voltage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">{stats.latestVoltage.toFixed(1)} V</p>
            </CardContent>
          </Card>

          {/* Current Display */}
          <Card className="glass-card border-orange-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Current Amperage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-500">{stats.latestCurrent.toFixed(2)} A</p>
            </CardContent>
          </Card>
        </div>

        {/* Device Selector for Sensor Data */}
        <Card className="glass-card border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-primary" />
                Device Sensor Data
              </span>
              <Select value={selectedDevice} onValueChange={setSelectedDevice}>
                <SelectTrigger className="w-48 bg-muted/50 border-border">
                  <SelectValue placeholder="Select Device" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Devices</SelectItem>
                  {devicesList.map((device) => (
                    <SelectItem key={device.deviceId} value={device.deviceId}>
                      {device.deviceName} ({device.roomName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Latest readings per device */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
              {getLatestDeviceReadings().map((reading) => (
                <div
                  key={reading.deviceId}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedDevice === reading.deviceId
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-muted/30 hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedDevice(reading.deviceId)}
                >
                  <p className="font-medium text-sm">{reading.deviceName}</p>
                  <p className="text-xs text-muted-foreground mb-2">{reading.roomName}</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-yellow-500">{reading.voltage.toFixed(1)} V</span>
                    <span className="text-orange-500">{reading.current.toFixed(2)} A</span>
                    <span className="text-primary">{reading.power.toFixed(1)} W</span>
                  </div>
                </div>
              ))}
              {devicesList.length === 0 && (
                <p className="text-muted-foreground col-span-full text-center py-4">
                  No devices with sensor data found. Add sensor data to Firebase.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Voltage & Current Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Voltage Over Time */}
          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-yellow-500" />
                Voltage Over Time {selectedDevice !== 'all' && `- ${devicesList.find(d => d.deviceId === selectedDevice)?.deviceName || ''}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={sensorGraphData}>
                  <defs>
                    <linearGradient id="voltageGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EAB308" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#94a3b8" reversed={false} />
                  <YAxis stroke="#94a3b8" orientation="left" reversed={false} domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(1)} V`, 'Voltage']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload?.deviceName) {
                        return `${payload[0].payload.deviceName} - ${label}`;
                      }
                      return label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="voltage"
                    stroke="#EAB308"
                    strokeWidth={2}
                    fill="url(#voltageGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              {sensorGraphData.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No voltage data available. Connect voltage sensors to Firebase.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Current Over Time */}
          <Card className="glass-card border-orange-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-500" />
                Current Over Time {selectedDevice !== 'all' && `- ${devicesList.find(d => d.deviceId === selectedDevice)?.deviceName || ''}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={sensorGraphData}>
                  <defs>
                    <linearGradient id="currentGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#94a3b8" reversed={false} />
                  <YAxis stroke="#94a3b8" orientation="left" reversed={false} domain={['dataMin', 'dataMax']} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} A`, 'Current']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload?.deviceName) {
                        return `${payload[0].payload.deviceName} - ${label}`;
                      }
                      return label;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="current"
                    stroke="#F97316"
                    strokeWidth={2}
                    fill="url(#currentGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
              {sensorGraphData.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No current data available. Connect current sensors to Firebase.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Real-time Power from Sensors */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Real-time Power (V × I) {selectedDevice !== 'all' && `- ${devicesList.find(d => d.deviceId === selectedDevice)?.deviceName || ''}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={sensorGraphData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="time" stroke="#94a3b8" reversed={false} />
                <YAxis stroke="#94a3b8" orientation="left" reversed={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [`${value.toFixed(2)} W`, 'Power']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]?.payload?.deviceName) {
                      return `${payload[0].payload.deviceName} - ${label}`;
                    }
                    return label;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="power"
                  name="Power (W)"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={{ fill: '#06B6D4' }}
                />
              </LineChart>
            </ResponsiveContainer>
            {sensorGraphData.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                No sensor data available. Power = Voltage × Current will be calculated automatically.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Original Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Power Consumption by Device */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Power Consumption by Device (Estimated)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={powerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="deviceName" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" orientation="left" reversed={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="powerUsed" fill="#06B6D4" name="Power (kWh)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Runtime Distribution */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Runtime Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={powerData}
                    dataKey="runtime"
                    nameKey="deviceName"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {powerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Activity Timeline - FIXED: Now sorted ascending */}
          <Card className="glass-card border-primary/20 lg:col-span-2">
            <CardHeader>
              <CardTitle>Device Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#94a3b8" reversed={false} />
                  <YAxis stroke="#94a3b8" orientation="left" reversed={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="activities"
                    stroke="#06B6D4"
                    strokeWidth={2}
                    dot={{ fill: '#06B6D4' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Log */}
        <Card className="glass-card border-primary/20">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {getFilteredLogs().slice(0, 20).map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${log.action === 'on' ? 'bg-accent' : 'bg-muted-foreground'}`} />
                    <div>
                      <p className="font-medium">{log.deviceName}</p>
                      <p className="text-xs text-muted-foreground">{log.roomName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${log.action === 'on' ? 'text-accent' : 'text-muted-foreground'}`}>
                      {log.action.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {getFilteredLogs().length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No activity recorded for this period
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Analytics;
