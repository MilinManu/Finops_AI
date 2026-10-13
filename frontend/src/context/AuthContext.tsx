import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { User, AuthState, RegisterInput } from '../types/auth';
import { api } from '../services/api';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: false,
    isLoading: true,
  });

  const refetchUser = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
      return;
    }

    try {
      const response = await api.get('/api/auth/me');
      const { user } = response.data.data;

      setState({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      const status = error.response?.status;

      if (status === 401 || status === 403) {
        // Backend invalidated or rejected the token
        localStorage.removeItem('token');
        setState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      } else {
        // Network failure; keep token in localStorage so user isn't abruptly logged out
        setState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    }
  };

  useEffect(() => {
    refetchUser();
  }, []);

  // Listen to 401 events emitted by axios response interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setState({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
      });
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', {
      email,
      password,
    });

    const { token, user } = response.data.data;
    localStorage.setItem('token', token);

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const register = async (data: RegisterInput) => {
    const response = await api.post('/api/auth/register', data);
    const { token, user } = response.data.data;

    localStorage.setItem('token', token);

    setState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  const logout = () => {
    localStorage.removeItem('token');
    setState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
