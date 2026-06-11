export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' = 'light') => {
  if (typeof window !== 'undefined' && navigator.vibrate) {
    switch (type) {
      case 'light':
        navigator.vibrate(50);
        break;
      case 'medium':
        navigator.vibrate(100);
        break;
      case 'heavy':
        navigator.vibrate(150);
        break;
      case 'success':
        navigator.vibrate([50, 50, 100]);
        break;
      case 'warning':
        navigator.vibrate([100, 50, 100]);
        break;
      default:
        navigator.vibrate(50);
    }
  }
};
