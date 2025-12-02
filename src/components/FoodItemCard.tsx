import { format, differenceInDays } from 'date-fns';
import { Trash2, Calendar, Package } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

interface FoodItemCardProps {
  item: FoodItem;
  onDelete: (id: string) => void;
  onToggleConsumed: (id: string, isConsumed: boolean) => void;
}

export const FoodItemCard = ({ item, onDelete, onToggleConsumed }: FoodItemCardProps) => {
  const daysUntilExpiry = differenceInDays(new Date(item.expiry_date), new Date());
  
  const getExpiryStatus = () => {
    if (item.is_consumed) return { label: 'Consumed', color: 'bg-muted text-muted-foreground' };
    if (daysUntilExpiry < 0) return { label: 'Expired', color: 'bg-destructive text-destructive-foreground' };
    if (daysUntilExpiry === 0) return { label: 'Expires Today', color: 'bg-destructive text-destructive-foreground' };
    if (daysUntilExpiry <= 2) return { label: `${daysUntilExpiry}d left`, color: 'bg-yellow-500 text-white' };
    return { label: `${daysUntilExpiry}d left`, color: 'bg-primary text-primary-foreground' };
  };

  const status = getExpiryStatus();

  return (
    <Card className={`p-4 transition-all ${item.is_consumed ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-lg">{item.name}</h3>
          <p className="text-sm text-muted-foreground">{item.category}</p>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Package className="w-4 h-4" />
          <span>Qty: {item.quantity}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Expires: {format(new Date(item.expiry_date), 'MMM dd, yyyy')}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => onToggleConsumed(item.id, !item.is_consumed)}
        >
          {item.is_consumed ? 'Mark Unconsumed' : 'Mark Consumed'}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};
