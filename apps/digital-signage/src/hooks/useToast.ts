export const useToast = () => {
  const success = (message: string) => {
    console.log('Success:', message);
    // TODO: Implement actual toast notification
  };

  const error = (message: string) => {
    console.error('Error:', message);
    // TODO: Implement actual toast notification
  };

  return { success, error };
};