import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { authApi } from '@/lib/api/auth';
import { Cookies } from '@/lib/utils/cookies';
import type { User, DecodedToken, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('auth_token');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setUser({
          userId: decoded.sub,
          email: decoded.email,
          displayName: decoded.displayName || decoded.email.split('@')[0],
        });
      } catch {
        Cookies.remove('auth_token');
      }
    }
    setIsLoading(false);
  }, []);



  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    console.log('[AuthContext] Login successful. Tokens received:', !!res.access_token, !!res.refresh_token);

    // Store access token (1 hour on backend, matches 1 day here roughly or we can be precise)
    Cookies.set('auth_token', res.access_token, 1);
    // Store refresh token (7 days)
    Cookies.set('refresh_token', res.refresh_token, 7);

    setUser(res.user);
  };

  const register = async (email: string, pass: string, name?: string) => {
    await authApi.register(email, pass, name);
    await login(email, pass);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error('Logout error:', e);
    }
    Cookies.remove('auth_token');
    Cookies.remove('refresh_token');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
