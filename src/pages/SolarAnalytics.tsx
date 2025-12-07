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
import { ArrowLeft, Sun, Zap, Battery, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { AnalyticsPeriod } from '@/types/analytics';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#F59E0B', '#06B6D4', '#10B981', '#8B5CF6'];

interface SolarData {
  timestamp: number;
  generated: number;
  sentToGrid: number;
  usedByUser: number;
  sentToBattery: number;
}

const SolarAnalytics = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>('day');
  const [solarData, setSolarData] = useState<SolarData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/');
      return;
    }

    // Listen to solar power data from Firebase
    const solarRef = ref(database, 'powerSources/solar/readings');
    onValue(solarRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings: SolarData[] = Object.values(data).map((reading: any) => ({
          timestamp: reading.timestamp,
          generated: reading.generated || 0,
          sentToGrid: reading.sentToGrid || 0,
          usedByUser: reading.usedByUser || 0,
          sentToBattery: reading.sentToBattery || 0,
        }));
        setSolarData(readings.sort((a, b) => a.timestamp - b.timestamp));
      }
      setLoading(false);
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
    return solarData
      .filter(d => d.timestamp > now - periodMs[period])
      .map(d => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString(),
        date: new Date(d.timestamp).toLocaleDateString(),
      }));
  };

  const getTotals = () => {
    const filtered = getFilteredData();
    return {
      totalGenerated: filtered.reduce((sum, d) => sum + d.generated, 0),
      totalSentToGrid: filtered.reduce((sum, d) => sum + d.sentToGrid, 0),
      totalUsedByUser: filtered.reduce((sum, d) => sum + d.usedByUser, 0),
      totalSentToBattery: filtered.reduce((sum, d) => sum + d.sentToBattery, 0),
    };
  };

  const totals = getTotals();
  const chartData = getFilteredData();

  const pieData = [
    { name: 'Used by User', value: totals.totalUsedByUser },
    { name: 'Sent to Grid', value: totals.totalSentToGrid },
    { name: 'Sent to Battery', value: totals.totalSentToBattery },
  ].filter(d => d.value > 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Sun className="w-12 h-12 text-yellow-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading solar analytics...</p>
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
              className="border-yellow-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Sun className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                  Solar Power Analytics
                </h1>
                <p className="text-muted-foreground">Monitor solar energy generation and distribution</p>
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
        <LoadManagement powerSourceType="solar" />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-yellow-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Sun className="w-4 h-4 text-yellow-500" />
                Power Generated
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-yellow-500">{totals.totalGenerated.toFixed(2)} kWh</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-primary" />
                Sent to Grid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-primary">{totals.totalSentToGrid.toFixed(2)} kWh</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-accent/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" />
                Used by User
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-accent">{totals.totalUsedByUser.toFixed(2)} kWh</p>
            </CardContent>
          </Card>

          <Card className="glass-card border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Battery className="w-4 h-4 text-green-500" />
                Sent to Battery
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">{totals.totalSentToBattery.toFixed(2)} kWh</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Generation Over Time */}
          <Card className="glass-card border-yellow-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                Solar Generation Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="solarGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
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
                  />
                  <Area
                    type="monotone"
                    dataKey="generated"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fill="url(#solarGradient)"
                    name="Generated (kWh)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribution Pie Chart */}
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Power Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `${value.toFixed(2)} kWh`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Detailed Flow Chart */}
          <Card className="glass-card border-primary/20 lg:col-span-2">
            <CardHeader>
              <CardTitle>Power Flow Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="time" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="generated" stroke="#F59E0B" strokeWidth={2} name="Generated" dot={false} />
                  <Line type="monotone" dataKey="usedByUser" stroke="#10B981" strokeWidth={2} name="Used by User" dot={false} />
                  <Line type="monotone" dataKey="sentToGrid" stroke="#06B6D4" strokeWidth={2} name="Sent to Grid" dot={false} />
                  <Line type="monotone" dataKey="sentToBattery" stroke="#8B5CF6" strokeWidth={2} name="Sent to Battery" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SolarAnalytics;
