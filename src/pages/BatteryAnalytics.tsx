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
import { ArrowLeft, Battery, BatteryCharging, Clock, Heart, Zap } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { AnalyticsPeriod } from '@/types/analytics';
import { Progress } from '@/components/ui/progress';
import LoadManagement from '@/components/LoadManagement';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface BatteryData {
  timestamp: number;
  chargeLevel: number; // percentage
  voltage: number;
  current: number;
  temperature: number;
}

interface BatteryStatus {
  capacity: number; // Wh total capacity
  currentCharge: number; // Wh current
  health: number; // percentage
  estimatedHours: number;
  chargingStatus: 'charging' | 'discharging' | 'idle';
  avgPowerDraw: number; // W average power draw
}

const BatteryAnalytics = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>('day');
  const [batteryHistory, setBatteryHistory] = useState<BatteryData[]>([]);
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus>({
    capacity: 5000,
    currentCharge: 3500,
    health: 95,
    estimatedHours: 8,
    chargingStatus: 'idle',
    avgPowerDraw: 450,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/');
      return;
    }

    // Listen to battery status from Firebase
    const statusRef = ref(database, 'powerSources/battery/status');
    onValue(statusRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setBatteryStatus({
          capacity: data.capacity || 5000,
          currentCharge: data.currentCharge || 0,
          health: data.health || 100,
          estimatedHours: data.estimatedHours || 0,
          chargingStatus: data.chargingStatus || 'idle',
          avgPowerDraw: data.avgPowerDraw || 0,
        });
      }
      setLoading(false);
    });

    // Listen to battery history readings from Firebase
    const historyRef = ref(database, 'powerSources/battery/readings');
    onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings: BatteryData[] = Object.values(data).map((reading: any) => ({
          timestamp: reading.timestamp,
          chargeLevel: reading.chargeLevel || 0,
          voltage: reading.voltage || 0,
          current: reading.current || 0,
          temperature: reading.temperature || 25,
        }));
        setBatteryHistory(readings.sort((a, b) => a.timestamp - b.timestamp));
      }
    });
  }, [navigate]);

  const getFilteredData = () => {
    const now = Date.now();
    const periodMs = {
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000,
      month: 30 * 24 * 60 * 60 * 1000,
      year: 365 * 24 * 60 * 60 * 1000,
    };
    return batteryHistory
      .filter(d => d.timestamp > now - periodMs[period])
      .map(d => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString(),
        date: new Date(d.timestamp).toLocaleDateString(),
      }));
  };

  const chargePercentage = (batteryStatus.currentCharge / batteryStatus.capacity) * 100;
  const chartData = getFilteredData();

  const getBatteryColor = () => {
    if (chargePercentage > 60) return 'text-green-500';
    if (chargePercentage > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getHealthColor = () => {
    if (batteryStatus.health > 80) return 'text-green-500';
    if (batteryStatus.health > 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Battery className="w-12 h-12 text-green-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading battery analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="border-green-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                <Battery className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                  Battery Analytics
                </h1>
                <p className="text-muted-foreground">Monitor battery status and backup capacity</p>
              </div>
            </div>
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

        {/* Load Management Section - At Top */}
        <LoadManagement powerSourceType="battery" />

        {/* Battery Status Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Battery Card */}
          <Card className="glass-card border-green-500/20 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {batteryStatus.chargingStatus === 'charging' ? (
                  <BatteryCharging className="w-5 h-5 text-green-500" />
                ) : (
                  <Battery className="w-5 h-5 text-green-500" />
                )}
                Battery Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <p className={`text-6xl font-bold ${getBatteryColor()}`}>
                  {chargePercentage.toFixed(0)}%
                </p>
                <p className="text-muted-foreground mt-2">
                  {batteryStatus.currentCharge.toFixed(0)} / {batteryStatus.capacity} Wh
                </p>
                <p className={`text-sm mt-1 ${
                  batteryStatus.chargingStatus === 'charging' ? 'text-green-500' :
                  batteryStatus.chargingStatus === 'discharging' ? 'text-yellow-500' : 'text-muted-foreground'
                }`}>
                  {batteryStatus.chargingStatus.charAt(0).toUpperCase() + batteryStatus.chargingStatus.slice(1)}
                </p>
              </div>
              <Progress value={chargePercentage} className="h-4" />
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-4">
            <Card className="glass-card border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" />
                  Estimated Backup Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">{batteryStatus.estimatedHours.toFixed(1)} hrs</p>
                <p className="text-xs text-muted-foreground mt-1">
                  At current {batteryStatus.avgPowerDraw}W draw
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-accent/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Heart className={`w-4 h-4 ${getHealthColor()}`} />
                  Battery Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl font-bold ${getHealthColor()}`}>{batteryStatus.health}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {batteryStatus.health > 80 ? 'Excellent condition' : 
                   batteryStatus.health > 50 ? 'Good condition' : 'Consider replacement'}
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-yellow-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  Total Capacity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-yellow-500">{batteryStatus.capacity} Wh</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {(batteryStatus.capacity / 1000).toFixed(1)} kWh total
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-orange-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Avg Power Draw
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-500">{batteryStatus.avgPowerDraw} W</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Current load on battery
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Charge Level Over Time */}
          <Card className="glass-card border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Battery className="w-5 h-5 text-green-500" />
                Charge Level Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chargeGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}%`, 'Charge']}
                  />
                  <Area
                    type="monotone"
                    dataKey="chargeLevel"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#chargeGradient)"
                    name="Charge Level"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Voltage & Current */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Voltage & Current</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis yAxisId="left" stroke="#94a3b8" />
                  <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="voltage" stroke="#F59E0B" strokeWidth={2} name="Voltage (V)" dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="current" stroke="#06B6D4" strokeWidth={2} name="Current (A)" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Temperature */}
          <Card className="glass-card border-orange-500/20 lg:col-span-2">
            <CardHeader>
              <CardTitle>Battery Temperature Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value}°C`, 'Temperature']}
                  />
                  <Area
                    type="monotone"
                    dataKey="temperature"
                    stroke="#F97316"
                    strokeWidth={2}
                    fill="url(#tempGradient)"
                    name="Temperature"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BatteryAnalytics;
