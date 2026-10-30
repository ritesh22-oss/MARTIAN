import { useState, useEffect } from 'react';
import { networkManager, NetworkStatusSnapshot } from '../services/networkManager';

export function useNetworkStatus(): NetworkStatusSnapshot & {
  retry: () => Promise<NetworkStatusSnapshot>;
} {
  const [status, setStatus] = useState<NetworkStatusSnapshot>(networkManager.getStatus());

  useEffect(() => {
    const unsubscribe = networkManager.subscribe((newStatus) => {
      setStatus(newStatus);
    });
    return () => unsubscribe();
  }, []);

  return {
    ...status,
    retry: () => networkManager.retryConnection()
  };
}
