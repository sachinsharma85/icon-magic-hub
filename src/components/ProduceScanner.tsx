import { useState, useRef, useCallback } from 'react';
import { Camera, Leaf, Thermometer, Droplets, Package, AlertTriangle, Clock, Calendar, Info, X, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { produceDatabase, predictRotDate, StorageConditions, RotPrediction } from '@/utils/rotPrediction';
import { format } from 'date-fns';

export default function ProduceScanner() {
  const [cameraActive, setCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [selectedProduce, setSelectedProduce] = useState<string>('');
  const [conditions, setConditions] = useState<StorageConditions>({
    temperature: 20,
    humidity: 60,
    packaging: 'none',
    damage: 'none',
    ripeness: 'ripe',
  });
  const [prediction, setPrediction] = useState<RotPrediction | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
    }
  }, []);

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
      }
    }
  }, [stopCamera]);

  const resetCapture = () => {
    setCapturedImage(null);
    setPrediction(null);
  };

  const calculatePrediction = () => {
    if (!selectedProduce) return;
    try {
      const result = predictRotDate(selectedProduce, conditions);
      setPrediction(result);
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
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Camera Section */}
          <Card className="overflow-hidden border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Camera Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {!cameraActive && !capturedImage && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <ScanLine className="h-16 w-16 text-muted-foreground/50" />
                    <p className="text-muted-foreground text-sm">Camera preview will appear here</p>
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
                  <div className="relative">
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
                      Capture
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
            </CardContent>
          </Card>

          {/* Input Section */}
          <Card className="border-2 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5" />
                Storage Conditions
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

              {/* Temperature */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Thermometer className="h-4 w-4 text-orange-500" />
                    Temperature
                  </span>
                  <Badge variant="outline">{conditions.temperature}°C</Badge>
                </Label>
                <Slider
                  value={[conditions.temperature]}
                  onValueChange={([v]) => setConditions(c => ({ ...c, temperature: v }))}
                  min={-5}
                  max={40}
                  step={1}
                  className="py-2"
                />
              </div>

              {/* Humidity */}
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    Humidity
                  </span>
                  <Badge variant="outline">{conditions.humidity}%</Badge>
                </Label>
                <Slider
                  value={[conditions.humidity]}
                  onValueChange={([v]) => setConditions(c => ({ ...c, humidity: v }))}
                  min={20}
                  max={100}
                  step={5}
                  className="py-2"
                />
              </div>

              {/* Packaging */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-purple-500" />
                  Packaging
                </Label>
                <Select
                  value={conditions.packaging}
                  onValueChange={(v) => setConditions(c => ({ ...c, packaging: v as StorageConditions['packaging'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Packaging</SelectItem>
                    <SelectItem value="plastic">Plastic Wrap</SelectItem>
                    <SelectItem value="paper">Paper Bag</SelectItem>
                    <SelectItem value="sealed">Sealed Container</SelectItem>
                    <SelectItem value="refrigerated">Refrigerated</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Damage */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Physical Damage
                </Label>
                <Select
                  value={conditions.damage}
                  onValueChange={(v) => setConditions(c => ({ ...c, damage: v as StorageConditions['damage'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Damage</SelectItem>
                    <SelectItem value="minor">Minor Bruising</SelectItem>
                    <SelectItem value="moderate">Moderate Damage</SelectItem>
                    <SelectItem value="severe">Severe Damage</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ripeness */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-green-500" />
                  Ripeness
                </Label>
                <Select
                  value={conditions.ripeness}
                  onValueChange={(v) => setConditions(c => ({ ...c, ripeness: v as StorageConditions['ripeness'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unripe">Unripe</SelectItem>
                    <SelectItem value="ripe">Ripe</SelectItem>
                    <SelectItem value="overripe">Overripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={calculatePrediction}
                disabled={!selectedProduce}
                className="w-full"
                size="lg"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Predict Rot Date
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Prediction Results */}
        {prediction && (
          <Card className="border-2 border-primary/20 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Freshness Prediction Results
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                {/* Days Left */}
                <div className={`rounded-xl p-6 text-center ${getDaysLeftColor(prediction.daysLeft)}`}>
                  <div className="text-5xl font-bold mb-2">{prediction.daysLeft}</div>
                  <div className="text-sm font-medium opacity-90">Days Until Spoilage</div>
                </div>

                {/* Rot Date */}
                <div className="rounded-xl p-6 text-center bg-muted">
                  <div className="text-2xl font-bold mb-2 text-foreground">
                    {format(prediction.rotDate, 'MMM dd, yyyy')}
                  </div>
                  <div className="text-sm text-muted-foreground">Predicted Rot Date</div>
                </div>

                {/* Produce Info */}
                <div className="rounded-xl p-6 text-center bg-primary/10">
                  <div className="text-2xl font-bold mb-2 text-primary">
                    {produceDatabase[selectedProduce]?.name}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Base: {produceDatabase[selectedProduce]?.baseShelfLife} days
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  Analysis Summary
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {prediction.explanation}
                </p>
              </div>

              {/* Factor Breakdown */}
              <div className="space-y-3">
                <h4 className="font-semibold">Factor Breakdown</h4>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Thermometer className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Temperature</div>
                      <div className="text-xs text-muted-foreground">{prediction.factors.temperatureImpact}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Droplets className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Humidity</div>
                      <div className="text-xs text-muted-foreground">{prediction.factors.humidityImpact}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Package className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Packaging</div>
                      <div className="text-xs text-muted-foreground">{prediction.factors.packagingImpact}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Physical Damage</div>
                      <div className="text-xs text-muted-foreground">{prediction.factors.damageImpact}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Clock className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Ripeness</div>
                      <div className="text-xs text-muted-foreground">{prediction.factors.ripenessImpact}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                    <Leaf className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-medium text-sm">Ethylene</div>
                      <div className="text-xs text-muted-foreground">{prediction.factors.ethyleneNote}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
