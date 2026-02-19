import { useEffect, useState, useCallback } from 'react';

export const useBrowserNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (!('Notification' in window)) {
      setSupported(false);
      return;
    }
    setPermission(Notification.permission);
  }, []);

  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'denied' as NotificationPermission;
    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }, []);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        icon: '/favicon.png',
        badge: '/favicon.png',
        requireInteraction: false,
        ...options,
      });
    } catch (err) {
      console.error('Browser notification error:', err);
    }
  }, []);

  return { permission, supported, requestPermission, showNotification };
};
