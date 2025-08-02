export const useToast = () => {
  const success = (_message: string) => {
    // console.log('Success:', message);
    // TODO: Implement actual toast notification
  };

  const error = (_message: string) => {
    // console.error('Error:', message);
    // TODO: Implement actual toast notification
  };

  return { success, error };
};