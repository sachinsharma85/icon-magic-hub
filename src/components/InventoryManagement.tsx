import { useState, useMemo } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Search, Filter, TrendingUp, Shield, AlertTriangle, RotateCw, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface FoodItem {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  expiry_date: string;
  quantity: number;
  is_consumed: boolean;
}

interface InventoryManagementProps {
  items: FoodItem[];
}

export const InventoryManagement = ({ items }: InventoryManagementProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const today = new Date();

  const getItemStatus = (item: FoodItem) => {
    if (item.is_consumed) return 'consumed';
    const days = differenceInDays(new Date(item.expiry_date), today);
    if (days < 0) return 'expired';
    if (days <= 3) return 'expiring';
    return 'fresh';
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Search filter
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Status filter
      const status = getItemStatus(item);
      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      // Stock level filter
      if (stockFilter === 'low' && item.quantity > 2) return false;
      if (stockFilter === 'medium' && (item.quantity <= 2 || item.quantity > 5)) return false;
      if (stockFilter === 'high' && item.quantity <= 5) return false;

      // Date filter
      if (dateFilter !== 'all') {
        const days = differenceInDays(today, new Date(item.purchase_date));
        if (dateFilter === 'week' && days > 7) return false;
        if (dateFilter === 'month' && days > 30) return false;
        if (dateFilter === 'quarter' && days > 90) return false;
      }

      return true;
    });
  }, [items, searchTerm, statusFilter, stockFilter, dateFilter]);

  // Health metrics calculations
  const healthMetrics = useMemo(() => {
    const activeItems = items.filter(i => !i.is_consumed);
    const totalQuantity = activeItems.reduce((sum, i) => sum + i.quantity, 0);
    const expiredItems = activeItems.filter(i => differenceInDays(new Date(i.expiry_date), today) < 0);
    const expiringItems = activeItems.filter(i => {
      const days = differenceInDays(new Date(i.expiry_date), today);
      return days >= 0 && days <= 3;
    });

    const stockCoverage = activeItems.length > 0 ? 100 : 0;
    const expiryRatio = activeItems.length > 0 
      ? Math.round(((activeItems.length - expiredItems.length) / activeItems.length) * 100) 
      : 100;
    const valueAtRisk = activeItems.length > 0
      ? Math.round(((expiredItems.length + expiringItems.length) / activeItems.length) * 100)
      : 0;
    const stockTurnover = items.filter(i => i.is_consumed).length;

    return { stockCoverage, expiryRatio, valueAtRisk, stockTurnover, totalQuantity };
  }, [items]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'fresh':
        return <Badge className="bg-green-500 hover:bg-green-600">Fresh</Badge>;
      case 'expiring':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Expiring Soon</Badge>;
      case 'expired':
        return <Badge className="bg-red-500 hover:bg-red-600">Expired</Badge>;
      case 'consumed':
        return <Badge className="bg-gray-500 hover:bg-gray-600">Consumed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="space-y-6">
      {/* Health Metrics */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5" />
          Inventory Health Metrics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="bg-emerald-500 border-emerald-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{healthMetrics.stockCoverage}%</p>
                  <p className="text-xs text-emerald-100">Stock Coverage</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyan-500 border-cyan-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{healthMetrics.expiryRatio}%</p>
                  <p className="text-xs text-cyan-100">Expiry Ratio</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500 border-amber-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{healthMetrics.valueAtRisk}%</p>
                  <p className="text-xs text-amber-100">Value at Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-violet-500 border-violet-600">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/20">
                  <RotateCw className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{healthMetrics.stockTurnover}</p>
                  <p className="text-xs text-violet-100">Stock Turnover</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filters Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Inventory Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="fresh">Fresh</SelectItem>
                <SelectItem value="expiring">Expiring Soon</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="consumed">Consumed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Stock Level" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="low">Low (1-2)</SelectItem>
                <SelectItem value="medium">Medium (3-5)</SelectItem>
                <SelectItem value="high">High (5+)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
                <SelectItem value="quarter">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setStockFilter('all');
                setDateFilter('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Inventory Report ({filteredItems.length} items)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Purchase Date</TableHead>
                  <TableHead>Expiry Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No items match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(getItemStatus(item))}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{format(parseISO(item.purchase_date), 'MMM d, yyyy')}</TableCell>
                      <TableCell>{format(parseISO(item.expiry_date), 'MMM d, yyyy')}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
