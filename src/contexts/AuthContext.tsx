import {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import apiService from "@/lib/api";

// Minimal user shape kept only so existing consumers (`user?.username`,
// `user?.email`, `user?.authenticated`) keep compiling. No identity is derived
// from the token anymore — the token is an opaque bearer credential.
export interface User {
  authenticated: boolean;
  username: string;
  email: string;
  isGuest: boolean;
}

// Fixed stub user. There is no login/identity concept in this app now.
const STUB_USER: User = {
  authenticated: true,
  username: "",
  email: "",
  isGuest: false,
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAuthToken: (token: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType>({
  user: STUB_USER,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  setAuthToken: async () => true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const user = STUB_USER;

  // On mount, make sure we have a valid backend token before rendering the app.
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      try {
        await apiService.ensureToken();
      } catch (error) {
        console.error("Failed to acquire auth token:", error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  // Login is a no-op: there is no interactive auth in this app.
  const login = async (): Promise<boolean> => false;

  // Logout just drops the cached token.
  const logout = () => {
    apiService.clearToken();
  };

  // Kept for API compatibility with existing consumers; tokens are managed
  // internally by ApiService, so this is a no-op success.
  const setAuthToken = async (): Promise<boolean> => true;

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, setAuthToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
