import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { ReceiptScanner } from '@/components/ReceiptScanner';
import { ManualItemForm } from '@/components/ManualItemForm';
import { QRScanner } from '@/components/QRScanner';
import { WelcomeBanner } from '@/components/WelcomeBanner';
import { ExpiryCharts } from '@/components/ExpiryCharts';
import { InventoryManagement } from '@/components/InventoryManagement';
import { FoodItemCard } from '@/components/FoodItemCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LogOut, Bell, Plus, ScanLine, Settings, QrCode, Package } from 'lucide-react';
import { requestNotificationPermission, checkExpiringItems } from '@/utils/notifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { calculateExpiryDate } from '@/utils/expiryRules';

interface ScannedItem {
  name: string;
  category: string;
  expiryDate: Date;
  quantity?: number;
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
        quantity: item.quantity || 1,
      }));

      const { error } = await supabase.from('food_items').insert(itemsToInsert);
      if (error) throw error;

      await fetchFoodItems();
      toast({
        title: 'Items added!',
        description: `${scannedItems.length} item(s) added to your tracker`,
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleManualItemAdded = async (item: ScannedItem) => {
    await handleItemsScanned([item]);
  };

  const handleQRScanSuccess = async (data: {
    name: string;
    category: string;
    expiryDate?: Date;
    quantity: number;
    manufacturingDate?: Date;
  }) => {
    try {
      const expiryDate = data.expiryDate || calculateExpiryDate(data.name);
      const mfgDate = data.manufacturingDate || new Date();
      
      const { error } = await supabase.from('food_items').insert({
        user_id: user!.id,
        name: data.name,
        category: data.category,
        purchase_date: mfgDate.toISOString().split('T')[0],
        expiry_date: expiryDate.toISOString().split('T')[0],
        quantity: data.quantity,
      });
      
      if (error) throw error;
      
      await fetchFoodItems();
      toast({
        title: 'Item added from QR!',
        description: `${data.name} added to your tracker`,
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading your items...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-primary">Expiry Tracker</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={handleNotificationRequest}>
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigate('/settings')}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Welcome Banner with Quick Stats */}
        {user && <WelcomeBanner user={user} items={foodItems} />}

        {/* Add Items Section */}
        <Tabs defaultValue="manual" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="qr" className="flex items-center gap-2">
              <QrCode className="w-4 h-4" />
              QR Scan
            </TabsTrigger>
            <TabsTrigger value="receipt" className="flex items-center gap-2">
              <ScanLine className="w-4 h-4" />
              Receipt
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="mt-4">
            <ManualItemForm onItemAdded={handleManualItemAdded} />
          </TabsContent>
          <TabsContent value="qr" className="mt-4">
            <QRScanner onScanSuccess={handleQRScanSuccess} />
          </TabsContent>
          <TabsContent value="receipt" className="mt-4">
            <ReceiptScanner onItemsScanned={handleItemsScanned} />
          </TabsContent>
        </Tabs>

        {/* Charts Section */}
        <ExpiryCharts items={foodItems} />

        {/* Inventory Management */}
        <InventoryManagement items={foodItems} />

        {/* Items Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Items ({foodItems.length})</h2>
          {foodItems.length === 0 ? (
            <div className="text-center py-12 bg-muted/30 rounded-xl border border-dashed">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                No items yet. Scan a receipt or add items manually!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      </main>
    </div>
  );
};

export default Index;
