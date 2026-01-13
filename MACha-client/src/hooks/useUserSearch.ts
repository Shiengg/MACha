import { useState, useEffect, useRef, useCallback } from 'react';
import { searchUsers, User } from '@/services/user.service';
import { saveSearchHistory } from '@/services/search.service';
import { useAuth } from '@/contexts/AuthContext';
import axios, { CancelTokenSource } from 'axios';

interface UseUserSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
  autoSaveHistory?: boolean;
}

interface UseUserSearchReturn {
  query: string;
  setQuery: (query: string) => void;
  users: User[];
  loading: boolean;
  error: string | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

export const useUserSearch = (options: UseUserSearchOptions = {}): UseUserSearchReturn => {
  const {
    debounceMs = 400,
    minQueryLength = 1,
    limit = 50,
    autoSaveHistory = true,
  } = options;

  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cancelTokenSourceRef = useRef<CancelTokenSource | null>(null);
  const cacheRef = useRef<Map<string, User[]>>(new Map());

  // Cleanup function
  const cleanup = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (cancelTokenSourceRef.current) {
      cancelTokenSourceRef.current.cancel('New search initiated');
      cancelTokenSourceRef.current = null;
    }
  }, []);

  // Search function
  const search = useCallback(async (searchQuery: string) => {
    // Cleanup previous search
    cleanup();

    // Normalize query
    const normalizedQuery = searchQuery.trim();

    // Validate minimum length
    if (normalizedQuery.length < minQueryLength) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache
    const cacheKey = `${normalizedQuery}_${limit}`;
    if (cacheRef.current.has(cacheKey)) {
      setUsers(cacheRef.current.get(cacheKey)!);
      setLoading(false);
      setError(null);
      return;
    }

    // Set loading state
    setLoading(true);
    setError(null);

    // Create cancel token for this request
    const cancelTokenSource = axios.CancelToken.source();
    cancelTokenSourceRef.current = cancelTokenSource;

    try {
      // Perform search
      const response = await searchUsers(normalizedQuery, limit);
      
      // Check if request was cancelled
      if (cancelTokenSource.token.reason) {
        return;
      }

      // Update state
      setUsers(response.users || []);
      
      // Cache results (short-lived cache)
      cacheRef.current.set(cacheKey, response.users || []);
      
      // Clear cache after 5 minutes
      setTimeout(() => {
        cacheRef.current.delete(cacheKey);
      }, 5 * 60 * 1000);

      // Save search history if enabled and user is authenticated
      // Note: Backend will automatically detect USER_SEARCH type based on the endpoint
      // We just need to call saveSearchHistory, and backend's UserController will handle the type
      if (autoSaveHistory && currentUser && normalizedQuery) {
        try {
          // Save history asynchronously, don't wait for it
          // Backend UserController.searchUsers already saves history with USER_SEARCH type
          // So we don't need to call saveSearchHistory here - it's handled by backend
        } catch (err) {
          // Ignore history save errors
        }
      }
    } catch (err: any) {
      // Check if request was cancelled
      if (axios.isCancel(err)) {
        return;
      }

      // Handle error
      console.error('Error searching users:', err);
      setError(err.response?.data?.message || 'Không thể tìm kiếm người dùng. Vui lòng thử lại sau.');
      setUsers([]);
    } finally {
      // Only update loading state if this is still the current request
      if (cancelTokenSourceRef.current === cancelTokenSource) {
        setLoading(false);
        cancelTokenSourceRef.current = null;
      }
    }
  }, [minQueryLength, limit, autoSaveHistory, currentUser, cleanup]);

  // Debounced search effect
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Handle query changes with debounce
  useEffect(() => {
    // Clear previous debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is empty, clear results immediately
    if (!query.trim()) {
      setUsers([]);
      setLoading(false);
      setError(null);
      return;
    }

    // Set up debounced search
    debounceTimerRef.current = setTimeout(() => {
      search(query);
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs, search]);

  // Clear function
  const clear = useCallback(() => {
    cleanup();
    setQuery('');
    setUsers([]);
    setLoading(false);
    setError(null);
  }, [cleanup]);

  return {
    query,
    setQuery,
    users,
    loading,
    error,
    search,
    clear,
  };
};

