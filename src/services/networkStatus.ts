import { useState, useEffect } from 'react';

type NetworkListener = (online: boolean) => void;

class NetworkStatusService {
  private listeners: Set<NetworkListener> = new Set();
  private isOnlineStatus: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  private handleOnline = () => {
    this.isOnlineStatus = true;
    this.notify();
  };

  private handleOffline = () => {
    this.isOnlineStatus = false;
    this.notify();
  };

  private notify() {
    for (const listener of this.listeners) {
      try {
        listener(this.isOnlineStatus);
      } catch {
        // ignore listener errors
      }
    }
  }

  public isOnline(): boolean {
    return typeof navigator !== 'undefined' ? navigator.onLine : this.isOnlineStatus;
  }

  public subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const networkStatus = new NetworkStatusService();

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(() => networkStatus.isOnline());

  useEffect(() => {
    const unsub = networkStatus.subscribe((online) => {
      setIsOnline(online);
    });
    return unsub;
  }, []);

  return isOnline;
}
