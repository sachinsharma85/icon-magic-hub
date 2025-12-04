import { useMemo } from 'react';
import { differenceInDays, format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, PieChart as PieIcon, BarChart3 } from 'lucide-react';

interface FoodItem {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  expiry_date: string;
  quantity: number;
  is_consumed: boolean;
}

interface ExpiryChartsProps {
  items: FoodItem[];
}

const COLORS = {
  safe: 'hsl(142, 76%, 36%)',
  expiringWeek: 'hsl(38, 92%, 50%)',
  expiringMonth: 'hsl(25, 95%, 53%)',
  expired: 'hsl(0, 84%, 60%)',
};

export const ExpiryCharts = ({ items }: ExpiryChartsProps) => {
  const today = new Date();
  const activeItems = items.filter(i => !i.is_consumed);

  // Pie chart data - expiry status breakdown
  const pieData = useMemo(() => {
    const expired = activeItems.filter(i => differenceInDays(new Date(i.expiry_date), today) < 0).length;
    const expiringWeek = activeItems.filter(i => {
      const days = differenceInDays(new Date(i.expiry_date), today);
      return days >= 0 && days <= 7;
    }).length;
    const expiringMonth = activeItems.filter(i => {
      const days = differenceInDays(new Date(i.expiry_date), today);
      return days > 7 && days <= 30;
    }).length;
    const safe = activeItems.filter(i => differenceInDays(new Date(i.expiry_date), today) > 30).length;

    return [
      { name: 'Safe (30+ days)', value: safe, color: COLORS.safe },
      { name: 'Expiring this month', value: expiringMonth, color: COLORS.expiringMonth },
      { name: 'Expiring this week', value: expiringWeek, color: COLORS.expiringWeek },
      { name: 'Expired', value: expired, color: COLORS.expired },
    ].filter(d => d.value > 0);
  }, [activeItems]);

  // Bar chart data - category breakdown
  const barData = useMemo(() => {
    const categoryCount: Record<string, { total: number; expired: number; expiring: number; safe: number }> = {};
    
    activeItems.forEach(item => {
      const cat = item.category || 'Other';
      if (!categoryCount[cat]) {
        categoryCount[cat] = { total: 0, expired: 0, expiring: 0, safe: 0 };
      }
      
      const days = differenceInDays(new Date(item.expiry_date), today);
      categoryCount[cat].total++;
      
      if (days < 0) categoryCount[cat].expired++;
      else if (days <= 7) categoryCount[cat].expiring++;
      else categoryCount[cat].safe++;
    });

    return Object.entries(categoryCount)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [activeItems]);

  // Line chart data - monthly trends (waste reduction)
  const lineData = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(today, 5),
      end: today,
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const consumed = items.filter(i => {
        const purchaseDate = new Date(i.purchase_date);
        return i.is_consumed && purchaseDate >= monthStart && purchaseDate <= monthEnd;
      }).length;

      const wasted = items.filter(i => {
        const expiryDate = new Date(i.expiry_date);
        return !i.is_consumed && expiryDate >= monthStart && expiryDate <= monthEnd && expiryDate < today;
      }).length;

      const added = items.filter(i => {
        const purchaseDate = new Date(i.purchase_date);
        return purchaseDate >= monthStart && purchaseDate <= monthEnd;
      }).length;

      return {
        month: format(month, 'MMM'),
        consumed,
        wasted,
        added,
      };
    });
  }, [items]);

  if (items.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <TrendingUp className="w-5 h-5" />
        Analytics Overview
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart - Expiry Status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieIcon className="w-4 h-4" />
              Expiry Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No active items to display
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart - Category Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Items by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    width={80} 
                    stroke="hsl(var(--muted-foreground))" 
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="safe" stackId="a" fill={COLORS.safe} name="Safe" />
                  <Bar dataKey="expiring" stackId="a" fill={COLORS.expiringWeek} name="Expiring" />
                  <Bar dataKey="expired" stackId="a" fill={COLORS.expired} name="Expired" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No categories to display
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Chart - Monthly Trends */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Monthly Usage Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="added" 
                stroke="hsl(210, 92%, 50%)" 
                strokeWidth={2}
                name="Items Added"
                dot={{ fill: 'hsl(210, 92%, 50%)' }}
              />
              <Line 
                type="monotone" 
                dataKey="consumed" 
                stroke={COLORS.safe} 
                strokeWidth={2}
                name="Consumed"
                dot={{ fill: COLORS.safe }}
              />
              <Line 
                type="monotone" 
                dataKey="wasted" 
                stroke={COLORS.expired} 
                strokeWidth={2}
                name="Wasted"
                dot={{ fill: COLORS.expired }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
