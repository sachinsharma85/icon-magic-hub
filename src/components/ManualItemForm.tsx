import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateExpiryDate } from '@/utils/expiryRules';

interface ManualItemFormProps {
  onItemAdded: (item: {
    name: string;
    category: string;
    expiryDate: Date;
    quantity: number;
  }) => void;
}

const categories = ['Dairy', 'Vegetables', 'Fruits', 'Meat', 'Bakery', 'Eggs', 'Other'];

export const ManualItemForm = ({ onItemAdded }: ManualItemFormProps) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [useAutoExpiry, setUseAutoExpiry] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const calculatedExpiry = useAutoExpiry || !expiryDate
      ? calculateExpiryDate(name)
      : new Date(expiryDate);

    onItemAdded({
      name: name.trim(),
      category: category || 'Other',
      expiryDate: calculatedExpiry,
      quantity,
    });

    // Reset form
    setName('');
    setCategory('');
    setQuantity(1);
    setExpiryDate('');
    setUseAutoExpiry(true);
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Item Manually
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Milk, Tomatoes"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiry">
                Expiry Date
                <span className="text-xs text-muted-foreground ml-2">
                  (auto-calculated if empty)
                </span>
              </Label>
              <Input
                id="expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => {
                  setExpiryDate(e.target.value);
                  setUseAutoExpiry(!e.target.value);
                }}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <Button type="submit" className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
