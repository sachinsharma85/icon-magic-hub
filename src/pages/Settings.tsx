import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, User as UserIcon, Bell, Clock, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ReminderSettings {
  enableDailyDigest: boolean;
  digestTime: string;
  reminder1Day: boolean;
  reminder3Days: boolean;
  reminder7Days: boolean;
  enableCategoryReminders: boolean;
  categories: string[];
}

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enableDailyDigest: true,
  digestTime: '09:00',
  reminder1Day: true,
  reminder3Days: true,
  reminder7Days: false,
  enableCategoryReminders: true,
  categories: ['Dairy', 'Vegetables', 'Fruits', 'Meat'],
};

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [householdName, setHouseholdName] = useState('');

  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [browserNotifications, setBrowserNotifications] = useState(false);

  // Reminder settings
  const [reminderSettings, setReminderSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserSettings(session.user);
      } else {
        navigate('/auth');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session?.user) {
        navigate('/auth');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadUserSettings = (user: User) => {
    // Load from user metadata
    const metadata = user.user_metadata || {};
    setDisplayName(metadata.display_name || user.email?.split('@')[0] || '');
    setHouseholdName(metadata.household_name || '');

    // Load notification permission status
    if ('Notification' in window) {
      setBrowserNotifications(Notification.permission === 'granted');
    }

    // Load reminder settings from localStorage (could be moved to Supabase later)
    const savedReminders = localStorage.getItem(`reminder_settings_${user.id}`);
    if (savedReminders) {
      setReminderSettings(JSON.parse(savedReminders));
    }

    const savedNotifications = localStorage.getItem(`notifications_enabled_${user.id}`);
    setNotificationsEnabled(savedNotifications === 'true');
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          display_name: displayName,
          household_name: householdName,
        },
      });

      if (error) throw error;

      toast({
        title: 'Profile updated',
        description: 'Your profile settings have been saved.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveReminders = () => {
    if (!user) return;

    localStorage.setItem(`reminder_settings_${user.id}`, JSON.stringify(reminderSettings));
    localStorage.setItem(`notifications_enabled_${user.id}`, String(notificationsEnabled));

    toast({
      title: 'Reminder settings saved',
      description: 'Your notification preferences have been updated.',
    });
  };

  const handleRequestBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      toast({
        title: 'Not supported',
        description: 'Browser notifications are not supported.',
        variant: 'destructive',
      });
      return;
    }

    const permission = await Notification.requestPermission();
    setBrowserNotifications(permission === 'granted');

    toast({
      title: permission === 'granted' ? 'Notifications enabled' : 'Notifications blocked',
      description: permission === 'granted'
        ? 'You will receive browser notifications.'
        : 'Please enable notifications in your browser settings.',
    });
  };

  const updateReminderSetting = <K extends keyof ReminderSettings>(
    key: K,
    value: ReminderSettings[K]
  ) => {
    setReminderSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">Settings</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="w-5 h-5" />
              Profile
            </CardTitle>
            <CardDescription>
              Manage your account information and household settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={user?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="householdName">Household Name</Label>
              <Input
                id="householdName"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="e.g., The Smith Family"
              />
              <p className="text-xs text-muted-foreground">
                Optional: Name your household for shared tracking.
              </p>
            </div>

            <Button onClick={handleSaveProfile} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </Button>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Configure how and when you receive expiry alerts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive alerts about expiring items.
                </p>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={setNotificationsEnabled}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  {browserNotifications ? 'Enabled' : 'Click to enable browser notifications.'}
                </p>
              </div>
              {browserNotifications ? (
                <span className="text-sm text-green-600 font-medium">Enabled</span>
              ) : (
                <Button variant="outline" size="sm" onClick={handleRequestBrowserNotifications}>
                  Enable
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Reminder Rules */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Reminder Rules
            </CardTitle>
            <CardDescription>
              Customize when you receive expiry reminders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Daily Digest */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Daily Summary</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive a daily overview of expiring items.
                  </p>
                </div>
                <Switch
                  checked={reminderSettings.enableDailyDigest}
                  onCheckedChange={(checked) => updateReminderSetting('enableDailyDigest', checked)}
                />
              </div>

              {reminderSettings.enableDailyDigest && (
                <div className="ml-6 space-y-2">
                  <Label>Summary Time</Label>
                  <Select
                    value={reminderSettings.digestTime}
                    onValueChange={(value) => updateReminderSetting('digestTime', value)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="07:00">7:00 AM</SelectItem>
                      <SelectItem value="08:00">8:00 AM</SelectItem>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="18:00">6:00 PM</SelectItem>
                      <SelectItem value="20:00">8:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <Separator />

            {/* Before Expiry Alerts */}
            <div className="space-y-4">
              <Label className="text-base">Before Expiry Alerts</Label>
              <p className="text-sm text-muted-foreground">
                Get notified before items expire.
              </p>

              <div className="space-y-3 ml-2">
                <div className="flex items-center justify-between">
                  <Label className="font-normal">1 day before</Label>
                  <Switch
                    checked={reminderSettings.reminder1Day}
                    onCheckedChange={(checked) => updateReminderSetting('reminder1Day', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">3 days before</Label>
                  <Switch
                    checked={reminderSettings.reminder3Days}
                    onCheckedChange={(checked) => updateReminderSetting('reminder3Days', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="font-normal">7 days before</Label>
                  <Switch
                    checked={reminderSettings.reminder7Days}
                    onCheckedChange={(checked) => updateReminderSetting('reminder7Days', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Category-based Reminders */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Category-based Reminders</Label>
                  <p className="text-sm text-muted-foreground">
                    Get extra reminders for perishable categories.
                  </p>
                </div>
                <Switch
                  checked={reminderSettings.enableCategoryReminders}
                  onCheckedChange={(checked) => updateReminderSetting('enableCategoryReminders', checked)}
                />
              </div>

              {reminderSettings.enableCategoryReminders && (
                <div className="ml-2 grid grid-cols-2 gap-2">
                  {['Dairy', 'Vegetables', 'Fruits', 'Meat', 'Seafood', 'Bakery'].map((category) => (
                    <div key={category} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`cat-${category}`}
                        checked={reminderSettings.categories.includes(category)}
                        onChange={(e) => {
                          const newCategories = e.target.checked
                            ? [...reminderSettings.categories, category]
                            : reminderSettings.categories.filter((c) => c !== category);
                          updateReminderSetting('categories', newCategories);
                        }}
                        className="rounded border-input"
                      />
                      <Label htmlFor={`cat-${category}`} className="font-normal text-sm">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleSaveReminders} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Save Reminder Settings
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Settings;
