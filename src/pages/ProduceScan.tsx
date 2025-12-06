import ProduceScanner from '@/components/ProduceScanner';
import { useEffect } from 'react';

export default function ProduceScan() {
  useEffect(() => {
    document.title = 'Produce Freshness Scanner | Expiry Tracker';
  }, []);

  return <ProduceScanner />;
}
