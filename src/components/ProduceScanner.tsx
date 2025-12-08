import { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, Leaf, Clock, Calendar, Info, X, ScanLine, Upload, ImageIcon, Bell, Save, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { produceDatabase, predictRotDate, RotPrediction } from '@/utils/rotPrediction';
import { requestNotificationPermission, showNotification } from '@/utils/notifications';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Default storage conditions for automatic prediction
const DEFAULT_CONDITIONS = {
  temperature: 20,
  humidity: 60,
  packaging: 'none' as const,
  damage: 'none' as const,
  ripeness: 'ripe' as const,
};

export default function ProduceScanner() {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedProduce, setSelectedProduce] = useState<string>('');
  const [prediction, setPrediction] = useState<RotPrediction | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Auto-start camera on mount and check notification permission
  useEffect(() => {
    startCamera();
    checkNotificationPermission();
    
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const checkNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    if (granted) {
      toast({
        title: 'Notifications Enabled',
        description: 'You will receive expiry reminders for your produce.',
      });
    }
  };

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access denied:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const captureImage = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setCapturedImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
        toast({
          title: 'Photo Captured!',
          description: 'Now select the produce type.',
        });
      }
    }
  }, [stopCamera, toast]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target?.result as string);
        toast({
          title: 'Image Uploaded!',
          description: 'Now select the produce type.',
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const resetCapture = () => {
    setCapturedImage(null);
    setPrediction(null);
    setSelectedProduce('');
    setIsSaved(false);
  };

  const saveToInventory = async () => {
    if (!prediction || !selectedProduce) return;

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: 'Login Required',
          description: 'Please log in to save items to your inventory.',
          variant: 'destructive',
        });
        setIsSaving(false);
        return;
      }

      const produce = produceDatabase[selectedProduce];
      const { error } = await supabase.from('food_items').insert({
        name: produce.name,
        category: 'Produce',
        purchase_date: new Date().toISOString().split('T')[0],
        expiry_date: prediction.rotDate.toISOString().split('T')[0],
        user_id: user.id,
        notes: `Predicted via Freshness Scanner. ${prediction.explanation}`,
      });

      if (error) throw error;

      setIsSaved(true);
      toast({
        title: 'Saved to Inventory!',
        description: `${produce.name} added with expiry date ${format(prediction.rotDate, 'MMM dd, yyyy')}`,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save Failed',
        description: 'Unable to save item to inventory.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const calculatePrediction = () => {
    if (!selectedProduce) return;
    try {
      const result = predictRotDate(selectedProduce, DEFAULT_CONDITIONS);
      setPrediction(result);
      
      // Send notification if enabled
      if (notificationsEnabled && result.daysLeft <= 3) {
        const produce = produceDatabase[selectedProduce];
        showNotification(
          `${produce.name} Expiring Soon!`,
          `Your ${produce.name} will expire in ${result.daysLeft} day${result.daysLeft !== 1 ? 's' : ''} (${format(result.rotDate, 'MMM dd, yyyy')})`
        );
      }
    } catch (error) {
      console.error('Prediction error:', error);
    }
  };

  const produceOptions = Object.entries(produceDatabase).map(([key, value]) => ({
    key,
    name: value.name,
  }));

  const getDaysLeftColor = (days: number) => {
    if (days <= 2) return 'bg-destructive text-destructive-foreground';
    if (days <= 5) return 'bg-warning text-warning-foreground';
    return 'bg-success text-success-foreground';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Leaf className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Produce Freshness Scanner
            </h1>
          </div>
          <p className="text-muted-foreground">
            Scan your fruits & vegetables to predict their shelf life
          </p>
          
          {/* Notification Toggle */}
          {!notificationsEnabled && (
            <Button variant="outline" size="sm" onClick={enableNotifications} className="mt-2">
              <Bell className="h-4 w-4 mr-2" />
              Enable Expiry Notifications
            </Button>
          )}
          {notificationsEnabled && (
            <Badge variant="secondary" className="mt-2">
              <Bell className="h-3 w-3 mr-1" />
              Notifications Enabled
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Camera Section */}
          <Card className="overflow-hidden border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Scan & Capture
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <Tabs defaultValue="photo" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="photo" className="flex items-center gap-1">
                    <ImageIcon className="h-4 w-4" />
                    Photo
                  </TabsTrigger>
                  <TabsTrigger value="upload" className="flex items-center gap-1">
                    <Upload className="h-4 w-4" />
                    Upload
                  </TabsTrigger>
                </TabsList>

                {/* Photo Capture Tab */}
                <TabsContent value="photo" className="mt-4 space-y-4">
                  <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {!cameraActive && !capturedImage && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                        <ScanLine className="h-16 w-16 text-muted-foreground/50" />
                        <p className="text-muted-foreground text-sm">Capture produce photo</p>
                      </div>
                    )}
                    {cameraActive && (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    )}
                    {capturedImage && (
                      <div className="relative h-full">
                        <img src={capturedImage} alt="Captured produce" className="w-full h-full object-cover" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2"
                          onClick={resetCapture}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {!cameraActive && !capturedImage && (
                      <Button onClick={startCamera} className="flex-1">
                        <Camera className="h-4 w-4 mr-2" />
                        Start Camera
                      </Button>
                    )}
                    {cameraActive && (
                      <>
                        <Button onClick={captureImage} className="flex-1">
                          <Camera className="h-4 w-4 mr-2" />
                          Capture Photo
                        </Button>
                        <Button variant="outline" onClick={stopCamera}>
                          Cancel
                        </Button>
                      </>
                    )}
                    {capturedImage && (
                      <Button variant="outline" onClick={() => { resetCapture(); startCamera(); }} className="flex-1">
                        <Camera className="h-4 w-4 mr-2" />
                        Retake
                      </Button>
                    )}
                  </div>
                </TabsContent>

                {/* Upload Tab */}
                <TabsContent value="upload" className="mt-4 space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {!capturedImage ? (
                    <div 
                      className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-2">
                        Click to upload produce image
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Supports JPG, PNG, WebP
                      </p>
                    </div>
                  ) : (
                    <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                      <img src={capturedImage} alt="Uploaded produce" className="w-full h-full object-cover" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={resetCapture}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Input Section */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                Select Produce
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {/* Produce Type */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Leaf className="h-4 w-4 text-primary" />
                  Produce Type
                </Label>
                <Select value={selectedProduce} onValueChange={setSelectedProduce}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select fruit or vegetable" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Fruits</div>
                    {produceOptions.filter(p => ['apple', 'banana', 'orange', 'mango', 'grapes', 'strawberry', 'watermelon', 'papaya', 'pineapple', 'avocado'].includes(p.key)).map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                    ))}
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground mt-2">Vegetables</div>
                    {produceOptions.filter(p => !['apple', 'banana', 'orange', 'mango', 'grapes', 'strawberry', 'watermelon', 'papaya', 'pineapple', 'avocado'].includes(p.key)).map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Predict Button */}
              <Button
                onClick={calculatePrediction}
                disabled={!selectedProduce}
                className="w-full"
                size="lg"
              >
                <Clock className="h-5 w-5 mr-2" />
                Predict Expiry Date
              </Button>

              {/* Info Note */}
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                <Info className="h-4 w-4 inline mr-2" />
                Predictions are based on typical room temperature storage conditions.
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Prediction Results */}
        {prediction && (
          <Card className="border-2 border-primary/30 bg-gradient-to-br from-background to-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-6 w-6 text-primary" />
                Freshness Prediction
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-background border">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${getDaysLeftColor(prediction.daysLeft)} mb-2`}>
                    <span className="text-2xl font-bold">{prediction.daysLeft}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">Days Until Spoilage</p>
                </div>
                <div className="text-center p-4 rounded-xl bg-background border">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 text-primary mb-2">
                    <Calendar className="h-8 w-8" />
                  </div>
                  <p className="font-semibold">{format(prediction.rotDate, 'MMM dd, yyyy')}</p>
                  <p className="text-sm text-muted-foreground">Predicted Expiry</p>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Analysis
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {prediction.explanation}
                </p>
              </div>

              {/* Factors */}
              <div className="space-y-3">
                <h4 className="font-semibold">Key Factors</h4>
                <div className="grid gap-2">
                  {prediction.factors.ethyleneNote && (
                    <div className="flex items-start gap-2 text-sm p-2 rounded bg-warning/10 border border-warning/20">
                      <Leaf className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                      <span>{prediction.factors.ethyleneNote}</span>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground p-2 rounded bg-muted/30">
                    Based on room temperature (~20°C) and average humidity (~60%) storage conditions.
                  </div>
                </div>
              </div>

              {/* Save to Inventory Button */}
              <div className="pt-2">
                {isSaved ? (
                  <Button disabled className="w-full" size="lg" variant="outline">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                    Saved to Inventory
                  </Button>
                ) : (
                  <Button 
                    onClick={saveToInventory} 
                    disabled={isSaving}
                    className="w-full" 
                    size="lg"
                  >
                    <Save className="h-5 w-5 mr-2" />
                    {isSaving ? 'Saving...' : 'Save to Inventory'}
                  </Button>
                )}
              </div>

              {/* Notification Reminder */}
              {!notificationsEnabled && prediction.daysLeft <= 5 && (
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Enable notifications to get expiry reminders</p>
                      <p className="text-xs text-muted-foreground">We'll remind you before your produce spoils</p>
                    </div>
                    <Button size="sm" onClick={enableNotifications}>
                      Enable
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
