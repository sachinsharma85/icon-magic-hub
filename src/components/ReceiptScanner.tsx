import { useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { createWorker } from 'tesseract.js';
import { findExpiryRule, calculateExpiryDate } from '@/utils/expiryRules';

interface ScannedItem {
  name: string;
  category: string;
  expiryDate: Date;
}

interface ReceiptScannerProps {
  onItemsScanned: (items: ScannedItem[]) => void;
}

export const ReceiptScanner = ({ onItemsScanned }: ReceiptScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();

  const processImage = async (file: File) => {
    setIsScanning(true);
    setProgress(0);

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(file);
      await worker.terminate();

      // Parse text to extract items
      const lines = text.split('\n').filter(line => line.trim().length > 0);
      const scannedItems: ScannedItem[] = [];

      lines.forEach(line => {
        const rule = findExpiryRule(line);
        if (rule) {
          scannedItems.push({
            name: line.trim(),
            category: rule.category,
            expiryDate: calculateExpiryDate(line),
          });
        }
      });

      if (scannedItems.length > 0) {
        onItemsScanned(scannedItems);
        toast({
          title: 'Receipt Scanned!',
          description: `Found ${scannedItems.length} perishable items`,
        });
      } else {
        toast({
          title: 'No items found',
          description: 'Could not detect any perishable items in the receipt',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('OCR Error:', error);
      toast({
        title: 'Scan Failed',
        description: 'Failed to process the receipt image',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
      setProgress(0);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const handleCameraCapture = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        processImage(file);
      }
    };
    input.click();
  };

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">Scan Receipt</h2>
      
      {isScanning ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Processing receipt... {progress}%
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Button
            onClick={handleCameraCapture}
            className="h-32 flex flex-col gap-2"
            variant="outline"
          >
            <Camera className="w-8 h-8" />
            <span>Take Photo</span>
          </Button>
          
          <label className="cursor-pointer">
            <Button
              asChild
              className="h-32 flex flex-col gap-2 w-full"
              variant="outline"
            >
              <div>
                <Upload className="w-8 h-8" />
                <span>Upload Receipt</span>
              </div>
            </Button>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      )}
    </Card>
  );
};
