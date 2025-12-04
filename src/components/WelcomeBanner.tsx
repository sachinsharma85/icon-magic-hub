import { differenceInDays } from 'date-fns';
import { User } from '@supabase/supabase-js';
import { AlertTriangle, CheckCircle, XCircle, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FoodItem {
  id: string;
  name: string;
  category: string;
  purchase_date: string;
  expiry_date: string;
  quantity: number;
  is_consumed: boolean;
}

interface WelcomeBannerProps {
  user: User;
  items: FoodItem[];
}

export const WelcomeBanner = ({ user, items }: WelcomeBannerProps) => {
  const today = new Date();
  const activeItems = items.filter(i => !i.is_consumed);

  const stats = {
    expiringSoon: activeItems.filter(i => {
      const days = differenceInDays(new Date(i.expiry_date), today);
      return days >= 0 && days <= 3;
    }).length,
    expired: activeItems.filter(i => differenceInDays(new Date(i.expiry_date), today) < 0).length,
    safe: activeItems.filter(i => differenceInDays(new Date(i.expiry_date), today) > 3).length,
    total: activeItems.length,
  };

  const getUserName = () => {
    if (user.user_metadata?.full_name) return user.user_metadata.full_name;
    if (user.user_metadata?.name) return user.user_metadata.name;
    if (user.email) return user.email.split('@')[0];
    return 'there';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-4">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-xl p-6 border border-primary/20">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {getGreeting()}, <span className="text-primary">{getUserName()}</span>! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          {stats.expiringSoon > 0 
            ? `You have ${stats.expiringSoon} item${stats.expiringSoon > 1 ? 's' : ''} expiring soon. Check them out!`
            : stats.expired > 0 
            ? `You have ${stats.expired} expired item${stats.expired > 1 ? 's' : ''}. Consider removing them.`
            : stats.total > 0 
            ? "All your items are looking fresh! Great job!"
            : "Start tracking your items by scanning a receipt or adding manually."}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Package className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Items</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.safe}</p>
              <p className="text-xs text-muted-foreground">Safe</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.expiringSoon}</p>
              <p className="text-xs text-muted-foreground">Expiring Soon</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <XCircle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.expired}</p>
              <p className="text-xs text-muted-foreground">Expired</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
