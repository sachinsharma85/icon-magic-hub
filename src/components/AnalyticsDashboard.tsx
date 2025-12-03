import { differenceInDays } from 'date-fns';
import { Package, AlertTriangle, CheckCircle, XCircle, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FoodItem {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  expiry_date: string;
  quantity: number;
  is_consumed: boolean;
}

interface AnalyticsDashboardProps {
  items: FoodItem[];
}

export const AnalyticsDashboard = ({ items }: AnalyticsDashboardProps) => {
  const today = new Date();

  const stats = {
    total: items.length,
    consumed: items.filter(i => i.is_consumed).length,
    expired: items.filter(i => !i.is_consumed && differenceInDays(new Date(i.expiry_date), today) < 0).length,
    expiringSoon: items.filter(i => {
      const days = differenceInDays(new Date(i.expiry_date), today);
      return !i.is_consumed && days >= 0 && days <= 3;
    }).length,
    fresh: items.filter(i => {
      const days = differenceInDays(new Date(i.expiry_date), today);
      return !i.is_consumed && days > 3;
    }).length,
  };

  // Category breakdown
  const categoryCount: Record<string, number> = {};
  items.forEach(item => {
    const cat = item.category || 'Other';
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const sortedCategories = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <PieChart className="w-5 h-5" />
        Analytics
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expiringSoon}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.consumed}</p>
                <p className="text-xs text-muted-foreground">Consumed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.expired}</p>
                <p className="text-xs text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {sortedCategories.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">By Category</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {sortedCategories.map(([category, count]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="text-sm">{category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(count / stats.total) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
