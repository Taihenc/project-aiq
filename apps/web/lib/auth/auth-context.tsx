import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { jwtDecode } from 'jwt-decode';
import { authApi } from '@/lib/api/auth';
import type { User, DecodedToken, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded = jwtDecode<DecodedToken>(token);
        setUser({
          userId: decoded.sub,
          email: decoded.email,
          displayName: decoded.displayName || decoded.email.split('@')[0],
        });
      } catch {
        localStorage.removeItem('access_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    localStorage.setItem('access_token', res.access_token);
    setUser(res.user);
  };

  const register = async (email: string, pass: string, name?: string) => {
    await authApi.register(email, pass, name);
    await login(email, pass);
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
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
