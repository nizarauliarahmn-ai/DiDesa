export const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
};
