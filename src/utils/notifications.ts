export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const showNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
    });
  }
};

export const checkExpiringItems = (items: Array<{ name: string; expiry_date: string }>) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiringSoon = items.filter(item => {
    const expiryDate = new Date(item.expiry_date);
    expiryDate.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry >= 0 && daysUntilExpiry <= 2;
  });

  if (expiringSoon.length > 0) {
    const itemNames = expiringSoon.map(item => item.name).join(', ');
    showNotification(
      'Food Items Expiring Soon!',
      `These items are expiring soon: ${itemNames}`
    );
  }
};
