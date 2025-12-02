import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ReceiptScanner } from '@/components/ReceiptScanner';
import { FoodItemCard } from '@/components/FoodItemCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Bell } from 'lucide-react';
import { requestNotificationPermission, checkExpiringItems } from '@/utils/notifications';

interface ScannedItem {
  name: string;
  category: string;
  expiryDate: Date;
}

interface FoodItem {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  expiry_date: string;
  quantity: number;
  is_consumed: boolean;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchFoodItems();
      requestNotificationPermission();
    }
  }, [user]);

  useEffect(() => {
    if (foodItems.length > 0) {
      checkExpiringItems(foodItems);
    }
  }, [foodItems]);

  const fetchFoodItems = async () => {
    try {
      const { data, error } = await supabase
        .from('food_items')
        .select('*')
        .order('expiry_date', { ascending: true });

      if (error) throw error;
      setFoodItems(data || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleItemsScanned = async (scannedItems: ScannedItem[]) => {
    try {
      const itemsToInsert = scannedItems.map(item => ({
        user_id: user!.id,
        name: item.name,
        category: item.category,
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: item.expiryDate.toISOString().split('T')[0],
        quantity: 1,
      }));

      const { error } = await supabase.from('food_items').insert(itemsToInsert);
      if (error) throw error;

      await fetchFoodItems();
      toast({
        title: 'Items added!',
        description: `${scannedItems.length} items added to your tracker`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from('food_items').delete().eq('id', id);
      if (error) throw error;
      setFoodItems(foodItems.filter(item => item.id !== id));
      toast({ title: 'Item deleted' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleConsumed = async (id: string, isConsumed: boolean) => {
    try {
      const { error } = await supabase
        .from('food_items')
        .update({ is_consumed: isConsumed })
        .eq('id', id);
      if (error) throw error;
      
      setFoodItems(foodItems.map(item => 
        item.id === id ? { ...item, is_consumed: isConsumed } : item
      ));
      toast({ title: isConsumed ? 'Marked as consumed' : 'Marked as unconsumed' });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const handleNotificationRequest = async () => {
    const granted = await requestNotificationPermission();
    toast({
      title: granted ? 'Notifications Enabled' : 'Notifications Denied',
      description: granted 
        ? 'You will receive alerts for expiring items' 
        : 'Please enable notifications in browser settings',
    });
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Expiry Tracker</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleNotificationRequest}>
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <ReceiptScanner onItemsScanned={handleItemsScanned} />

        <div>
          <h2 className="text-xl font-semibold mb-4">Your Items ({foodItems.length})</h2>
          {foodItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">
              No items yet. Scan a receipt to get started!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {foodItems.map(item => (
                <FoodItemCard
                  key={item.id}
                  item={item}
                  onDelete={handleDelete}
                  onToggleConsumed={handleToggleConsumed}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
