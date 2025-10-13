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
import { ArrowLeft, Zap, Clock, TrendingUp, Activity } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
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
} from 'recharts';

const COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

// Power ratings for different devices (in watts)
const DEVICE_POWER_RATINGS = {
  light: 60,
  fan: 75,
  projector: 250,
  ac: 1500,
};

const Analytics = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>('day');
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/');
      return;
    }

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
    const dayData: { [key: string]: number } = {};

    logs.forEach(log => {
      const date = new Date(log.timestamp).toLocaleDateString();
      dayData[date] = (dayData[date] || 0) + 1;
    });

    return Object.entries(dayData)
      .map(([date, count]) => ({ date, activities: count }))
      .slice(-7);
  };

  const getTotalStats = () => {
    const consumption = calculatePowerConsumption();
    const totalRuntime = consumption.reduce((sum, d) => sum + d.runtime, 0);
    const totalPower = consumption.reduce((sum, d) => sum + d.powerUsed, 0);
    const totalActivities = getFilteredLogs().length;

    return { totalRuntime, totalPower, totalActivities };
  };

  const stats = getTotalStats();
  const powerData = calculatePowerConsumption();
  const activityData = getActivityByDay();

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
        <div className="flex items-center justify-between">
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

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Power Consumption by Device */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Power Consumption by Device</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={powerData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="deviceName" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="powerUsed" fill="#06B6D4" />
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

          {/* Activity Timeline */}
          <Card className="glass-card border-primary/20 lg:col-span-2">
            <CardHeader>
              <CardTitle>Device Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={activityData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="date" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
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
