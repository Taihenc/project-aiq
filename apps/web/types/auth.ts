
export interface User {
  userId: string;
  email: string;
  displayName: string;
}

export interface DecodedToken {
  sub: string;
  email: string;
  displayName?: string;
}

export interface LoginResponse {
  access_token: string;
  user: {
    userId: string;
    email: string;
    displayName: string;
  };
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}
