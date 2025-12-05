import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode, Camera, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface QRScannerProps {
  onScanSuccess: (data: {
    name: string;
    category: string;
    expiryDate?: Date;
    quantity: number;
    manufacturingDate?: Date;
  }) => void;
}

interface ProductData {
  name?: string;
  category?: string;
  expiry?: string;
  mfg?: string;
  qty?: number;
  brand?: string;
}

export const QRScanner = ({ onScanSuccess }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const parseQRData = (rawData: string): ProductData | null => {
    try {
      // Try to parse as JSON first
      const jsonData = JSON.parse(rawData);
      return jsonData;
    } catch {
      // If not JSON, try to parse as key-value pairs
      // Format: name=Product|category=Dairy|expiry=2025-12-31|mfg=2025-01-01|qty=1
      if (rawData.includes('=')) {
        const data: ProductData = {};
        const pairs = rawData.split('|');
        pairs.forEach(pair => {
          const [key, value] = pair.split('=');
          if (key && value) {
            const k = key.trim().toLowerCase();
            if (k === 'name') data.name = value.trim();
            else if (k === 'category') data.category = value.trim();
            else if (k === 'expiry') data.expiry = value.trim();
            else if (k === 'mfg') data.mfg = value.trim();
            else if (k === 'qty') data.qty = parseInt(value.trim()) || 1;
            else if (k === 'brand') data.brand = value.trim();
          }
        });
        if (Object.keys(data).length > 0) return data;
      }
      
      // If it's just a plain text, use it as the product name
      if (rawData.trim()) {
        return { name: rawData.trim() };
      }
      
      return null;
    }
  };

  const startScanning = async () => {
    setIsLoading(true);
    try {
      const html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // QR code not found - this is normal, keep scanning
        }
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error('QR Scanner error:', err);
      toast({
        title: 'Camera Error',
        description: err.message || 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (decodedText: string) => {
    await stopScanning();
    
    const productData = parseQRData(decodedText);
    
    if (productData && productData.name) {
      const itemData = {
        name: productData.brand ? `${productData.brand} ${productData.name}` : productData.name,
        category: productData.category || 'Other',
        quantity: productData.qty || 1,
        expiryDate: productData.expiry ? new Date(productData.expiry) : undefined,
        manufacturingDate: productData.mfg ? new Date(productData.mfg) : undefined,
      };
      
      onScanSuccess(itemData);
      
      toast({
        title: 'Product Scanned!',
        description: `Added: ${itemData.name}`,
      });
    } else {
      toast({
        title: 'Invalid QR Code',
        description: 'Could not extract product information from this QR code.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Scan Product QR Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {!isScanning ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-primary" />
              </div>
              <p className="text-muted-foreground mb-4">
                Scan product QR code to automatically fill item details
              </p>
              <Button onClick={startScanning} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 mr-2" />
                    Start Scanning
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div 
                id="qr-reader" 
                className="w-full rounded-lg overflow-hidden bg-black"
                style={{ minHeight: '300px' }}
              />
              <Button 
                variant="destructive" 
                onClick={stopScanning}
                className="w-full"
              >
                <X className="w-4 h-4 mr-2" />
                Stop Scanning
              </Button>
            </div>
          )}
          
          <div className="text-xs text-muted-foreground border-t pt-4 mt-4">
            <p className="font-medium mb-2">Supported QR formats:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>JSON: {`{\\"name\\":\\"Product\\",\\"category\\":\\"Dairy\\",\\"expiry\\":\\"2025-12-31\\"}`}</li>
              <li>Key-Value: name=Product|category=Dairy|expiry=2025-12-31</li>
              <li>Plain text product name</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
