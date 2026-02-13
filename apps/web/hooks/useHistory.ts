import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { useChatStore } from '@/lib/store/chat-store';

export function useHistory() {
  const { isAuthenticated } = useAuth();
  const { history, isLoadingHistory, fetchHistory, reset } = useChatStore();

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    } else {
      reset();
    }
  }, [isAuthenticated, fetchHistory, reset]);

  return {
    history,
    isLoading: isLoadingHistory,
    refreshHistory: fetchHistory
  };
}
