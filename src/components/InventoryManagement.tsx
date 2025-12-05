import { useState, useMemo } from 'react';
import { differenceInDays, format, parseISO } from 'date-fns';
import { Search, Filter, TrendingUp, Shield, AlertTriangle, RotateCw, Calendar, Download, FileText, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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

type SortField = 'name' | 'category' | 'status' | 'quantity' | 'purchase_date' | 'expiry_date';
type SortDirection = 'asc' | 'desc';

export const InventoryManagement = ({ items }: InventoryManagementProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('expiry_date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const today = new Date();

  const getItemStatus = (item: FoodItem) => {
    if (item.is_consumed) return 'consumed';
    const days = differenceInDays(new Date(item.expiry_date), today);
    if (days < 0) return 'expired';
    if (days <= 3) return 'expiring';
    return 'fresh';
  };

  const getStatusPriority = (status: string) => {
    switch (status) {
      case 'expired': return 1;
      case 'expiring': return 2;
      case 'fresh': return 3;
      case 'consumed': return 4;
      default: return 5;
    }
  };

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(items.map(i => i.category).filter(Boolean));
    return Array.from(cats).sort();
  }, [items]);

  const filteredAndSortedItems = useMemo(() => {
    let result = items.filter(item => {
      // Search filter
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Status filter
      const status = getItemStatus(item);
      if (statusFilter !== 'all' && status !== statusFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && item.category !== categoryFilter) {
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

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'category':
          comparison = (a.category || '').localeCompare(b.category || '');
          break;
        case 'status':
          comparison = getStatusPriority(getItemStatus(a)) - getStatusPriority(getItemStatus(b));
          break;
        case 'quantity':
          comparison = a.quantity - b.quantity;
          break;
        case 'purchase_date':
          comparison = new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime();
          break;
        case 'expiry_date':
          comparison = new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, searchTerm, statusFilter, categoryFilter, stockFilter, dateFilter, sortField, sortDirection]);

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
        return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium">🟢 Safe</Badge>;
      case 'expiring':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-medium">🟠 Expiring Soon</Badge>;
      case 'expired':
        return <Badge className="bg-red-500 hover:bg-red-600 text-white font-medium">🔴 Expired</Badge>;
      case 'consumed':
        return <Badge className="bg-slate-500 hover:bg-slate-600 text-white font-medium">✓ Consumed</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  const getStatusText = (item: FoodItem) => {
    const status = getItemStatus(item);
    switch (status) {
      case 'fresh': return 'Safe';
      case 'expiring': return 'Expiring Soon';
      case 'expired': return 'Expired';
      case 'consumed': return 'Consumed';
      default: return 'Unknown';
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 text-muted-foreground" />;
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1 text-primary" />
      : <ArrowDown className="w-4 h-4 ml-1 text-primary" />;
  };

  const exportToCSV = () => {
    const headers = ['Item Name', 'Category', 'Status', 'Quantity', 'Manufacture Date', 'Expiry Date'];
    const rows = filteredAndSortedItems.map(item => [
      item.name,
      item.category || 'N/A',
      getStatusText(item),
      item.quantity.toString(),
      format(parseISO(item.purchase_date), 'yyyy-MM-dd'),
      format(parseISO(item.expiry_date), 'yyyy-MM-dd')
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inventory-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Inventory Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated: ${format(new Date(), 'MMM d, yyyy HH:mm')}`, 14, 30);
    
    // Health metrics summary
    doc.setFontSize(12);
    doc.text('Health Metrics:', 14, 42);
    doc.setFontSize(10);
    doc.text(`Stock Coverage: ${healthMetrics.stockCoverage}%`, 14, 50);
    doc.text(`Expiry Ratio: ${healthMetrics.expiryRatio}%`, 14, 56);
    doc.text(`Value at Risk: ${healthMetrics.valueAtRisk}%`, 14, 62);
    doc.text(`Stock Turnover: ${healthMetrics.stockTurnover}`, 14, 68);
    
    const tableData = filteredAndSortedItems.map(item => [
      item.name,
      item.category || 'N/A',
      getStatusText(item),
      item.quantity.toString(),
      format(parseISO(item.purchase_date), 'MMM d, yyyy'),
      format(parseISO(item.expiry_date), 'MMM d, yyyy')
    ]);
    
    autoTable(doc, {
      startY: 76,
      head: [['Item Name', 'Category', 'Status', 'Qty', 'Mfg Date', 'Expiry Date']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });
    
    doc.save(`inventory-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="relative lg:col-span-2">
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
                <SelectItem value="fresh">🟢 Safe</SelectItem>
                <SelectItem value="expiring">🟠 Expiring Soon</SelectItem>
                <SelectItem value="expired">🔴 Expired</SelectItem>
                <SelectItem value="consumed">✓ Consumed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-background border">
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
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

            <Button 
              variant="outline" 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCategoryFilter('all');
                setStockFilter('all');
                setDateFilter('all');
              }}
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Inventory Report ({filteredAndSortedItems.length} items)
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportToCSV}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportToPDF}>
                <FileText className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Item Name {getSortIcon('name')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center">
                      Category {getSortIcon('category')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status {getSortIcon('status')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort('quantity')}
                  >
                    <div className="flex items-center">
                      Qty {getSortIcon('quantity')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort('purchase_date')}
                  >
                    <div className="flex items-center">
                      Mfg Date {getSortIcon('purchase_date')}
                    </div>
                  </TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleSort('expiry_date')}
                  >
                    <div className="flex items-center">
                      Expiry Date {getSortIcon('expiry_date')}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No items match your filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAndSortedItems.map(item => {
                    const status = getItemStatus(item);
                    return (
                      <TableRow 
                        key={item.id}
                        className={`
                          ${status === 'expired' ? 'bg-red-50 dark:bg-red-950/20' : ''}
                          ${status === 'expiring' ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                          ${status === 'fresh' ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}
                          ${status === 'consumed' ? 'bg-slate-50 dark:bg-slate-950/20 opacity-60' : ''}
                        `}
                      >
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="font-medium">{item.quantity}</TableCell>
                        <TableCell>{format(parseISO(item.purchase_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className={status === 'expired' ? 'text-red-600 font-medium' : ''}>
                          {format(parseISO(item.expiry_date), 'MMM d, yyyy')}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
