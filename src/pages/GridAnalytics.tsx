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
import { ArrowLeft, Plug, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import { database } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import { AnalyticsPeriod } from '@/types/analytics';
import LoadManagement from '@/components/LoadManagement';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface GridData {
  timestamp: number;
  used: number;
  sentToGrid: number;
}

const GridAnalytics = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<AnalyticsPeriod>('day');
  const [gridData, setGridData] = useState<GridData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isAuth = localStorage.getItem('isAuthenticated');
    if (!isAuth) {
      navigate('/');
      return;
    }

    // Listen to grid power data from Firebase
    const gridRef = ref(database, 'powerSources/grid/readings');
    onValue(gridRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const readings: GridData[] = Object.values(data).map((reading: any) => ({
          timestamp: reading.timestamp,
          used: reading.used || 0,
          sentToGrid: reading.sentToGrid || 0,
        }));
        setGridData(readings.sort((a, b) => a.timestamp - b.timestamp));
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
    return gridData
      .filter(d => d.timestamp > now - periodMs[period])
      .map(d => ({
        ...d,
        time: new Date(d.timestamp).toLocaleTimeString(),
        date: new Date(d.timestamp).toLocaleDateString(),
        netUsage: d.used - d.sentToGrid,
      }));
  };

  const getTotals = () => {
    const filtered = getFilteredData();
    const totalUsed = filtered.reduce((sum, d) => sum + d.used, 0);
    const totalSentToGrid = filtered.reduce((sum, d) => sum + d.sentToGrid, 0);
    return {
      totalUsed,
      totalSentToGrid,
      netUsage: totalUsed - totalSentToGrid,
    };
  };

  const totals = getTotals();
  const chartData = getFilteredData();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Plug className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading grid analytics...</p>
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
              className="border-blue-500/20"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <Plug className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  Grid Power Analytics
                </h1>
                <p className="text-muted-foreground">Monitor grid power usage and export</p>
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
        <LoadManagement powerSourceType="grid" />

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-card border-red-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowDownRight className="w-4 h-4 text-red-500" />
                Grid Power Used
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-500">{totals.totalUsed.toFixed(2)} kWh</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-green-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowUpRight className="w-4 h-4 text-green-500" />
                Sent to Grid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-500">{totals.totalSentToGrid.toFixed(2)} kWh</p>
            </CardContent>
          </Card>
          
          <Card className="glass-card border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Net Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-3xl font-bold ${totals.netUsage >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {totals.netUsage >= 0 ? '+' : ''}{totals.netUsage.toFixed(2)} kWh
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {totals.netUsage >= 0 ? 'Net consumer from grid' : 'Net exporter to grid'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grid Usage Over Time */}
          <Card className="glass-card border-blue-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowDownRight className="w-5 h-5 text-red-500" />
                Grid Power Used Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gridUsedGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
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
                    dataKey="used"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#gridUsedGradient)"
                    name="Used (kWh)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Export to Grid Over Time */}
          <Card className="glass-card border-green-500/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-green-500" />
                Power Sent to Grid Over Time
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gridExportGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
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
                    dataKey="sentToGrid"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#gridExportGradient)"
                    name="Exported (kWh)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Combined Flow */}
          <Card className="glass-card border-primary/20 lg:col-span-2">
            <CardHeader>
              <CardTitle>Grid Power Flow Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
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
                  <Bar dataKey="used" fill="#EF4444" name="Used from Grid" />
                  <Bar dataKey="sentToGrid" fill="#10B981" name="Sent to Grid" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GridAnalytics;
