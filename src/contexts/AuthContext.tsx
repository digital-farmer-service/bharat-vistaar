import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { jwtVerify, importSPKI, JWTPayload } from 'jose';
import apiService from '@/lib/api';

// Backend auth adapter — single location to change endpoint or response shape.
// Host comes from env (VITE_API_URL, e.g. https://dfsqa.beehyv.com); the auth
// request is routed through our own backend, so it carries no auth token.
const AUTH_TENANT_ID = "br";
const BACKEND_AUTH_ENDPOINT =
  window.__ENV__?.VITE_BACKEND_AUTH_URL ||
  `${window.__ENV__?.VITE_API_URL || "https://dfsqa.beehyv.com"}/dfs-personalization/chat/token/v1/_fetch?tenantId=${AUTH_TENANT_ID}`;

apiService.setBackendAuthAdapter({
  endpoint: BACKEND_AUTH_ENDPOINT,
  // No authToken is required to call our backend; the field is sent empty.
  buildRequestBody: () => ({
    RequestInfo: {
      apiId: "Rainmaker",
      authToken: "",
    },
  }),
  // Response shape: { token, expiresAt, cached }
  extractToken: (data: unknown) => {
    const d = data as Record<string, unknown>;
    return (
      (d?.token as string) ||
      (d?.access_token as string) ||
      ((d?.data as Record<string, unknown>)?.token as string) ||
      ""
    );
  },
  skipJwtValidation: false,
});

// Constants
const JWT_STORAGE_KEY = 'auth_jwt';
const JWT_EXPIRY_DAYS = 365; // fallback expiry for tokens without an exp claim (e.g. guest)
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // renew 5 min before expiry

/**
 * Reads the `exp` claim (seconds since epoch) from a JWT and returns it as
 * epoch milliseconds. Returns null when the token has no decodable exp claim
 * (e.g. the guest placeholder token), so callers can fall back to a default.
 */
function getJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '==='.slice((b64.length + 3) % 4);
    const json = JSON.parse(atob(padded)) as { exp?: number };
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

// User interface that contains the essential user information
export interface User {
  authenticated: boolean;
  username: string;
  email: string;
  isGuest: boolean; // Flag to identify guest users
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAuthToken: (token: string) => Promise<boolean>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  logout: () => {},
  setAuthToken: async () => false,
});

// Props for the AuthProvider component
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component that will wrap the application
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);
  // Epoch ms when the active token expires; drives the proactive renewal timer.
  // null for tokens without an exp claim (guest) → no renewal scheduled.
  const [tokenExpiry, setTokenExpiry] = useState<number | null>(null);

  // JWT validation public key
  const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAoiAT5pkWCk7KgBXDFO6C
FHo1fmVMUHOCDXJ1EcAb11REiSHgxlP9TPLCs8qPSe5eeJAHGn9sqB0p0jC8cWzh
RvnrCqRhNXhmOyqrCTudBT8ePnMYU7H/dpoqF1zpYctDVkaYOf0l/H+uWk55f+Zy
zZVcpQAi2lTwNQP2teIHqt4YNsOKmX9J2BvczRj4wdCpp84+UkFJ+lVftHbEoxYM
OnCObibmuJDPvwrkHtACJZFy1Dc371evaaTN3dGE/P7MLXRA+XtInY5lYfsB23/Q
a37S+srKe59wFypSMOU+ZMvgFA2oK0zA1WEC93000n5HEQMJU8r7pCgKhq7oD8QJ
hwIDAQAB
-----END PUBLIC KEY-----`;

  // Hardcoded placeholder JWT for guest users
  // This is a placeholder token that will be used until a real JWT is requested
  const GUEST_JWT_PLACEHOLDER = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJndWVzdCIsInVzZXJuYW1lIjoiZ3Vlc3QiLCJlbWFpbCI6Imd1ZXN0QGV4YW1wbGUuY29tIiwiaXNHdWVzdCI6dHJ1ZX0.guest_signature';

  // Store JWT in localStorage, using the token's own exp claim as the expiry.
  // Tokens without an exp claim (guest placeholder) fall back to JWT_EXPIRY_DAYS.
  const storeJWT = (token: string) => {
    try {
      const expFromToken = getJwtExpiryMs(token);
      const expiry =
        expFromToken ??
        new Date().getTime() + JWT_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      localStorage.setItem(JWT_STORAGE_KEY, JSON.stringify({ token, expiry }));
      // Drive the renewal timer; null (no exp) means "don't schedule a refresh".
      setTokenExpiry(expFromToken);
      return true;
    } catch (error) {
      console.error("Error storing JWT:", error);
      return false;
    }
  };

  // Create a guest user when no token is available
  const createGuestUser = useCallback(() => {
    // Store the hardcoded placeholder JWT token
    storeJWT(GUEST_JWT_PLACEHOLDER);
    
    // Set guest user state
    setUser({
      username: 'guest',
      email: 'guest@example.com',
      authenticated: false,
      isGuest: true,
    });
  }, []);

  // Fetch new token from backend and store it
  const fetchAndStoreNewToken = useCallback(async (importedPublicKey: CryptoKey | null) => {
    try {
      const newToken = await apiService.fetchAuthToken();
      const adapter = apiService.getBackendAuthAdapter();
      const shouldValidate = !adapter?.skipJwtValidation && importedPublicKey;

      if (shouldValidate) {
        const result = await validateJWT(newToken, importedPublicKey!);
        if (result.isValid) {
          storeJWT(newToken);
          apiService.updateAuthToken();
          createUserFromPayload(result.payload);
        } else {
          console.error('Received invalid token from backend auth endpoint');
          createGuestUser();
        }
      } else {
        storeJWT(newToken);
        apiService.updateAuthToken();
        setUser({
          username: 'user',
          email: 'user@example.com',
          authenticated: true,
          isGuest: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch auth token:', error);
      createGuestUser();
    }
  }, [createGuestUser]);

  // Initialize auth state on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        // Import the public key
        const importedPublicKey = await importSPKI(publicKeyPEM, 'RS256');
        setPublicKey(importedPublicKey);

        // Check URL params first for new JWT (backward compatibility)
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        // If JWT exists in URL, validate and store it (backward compatibility)
        if (tokenFromUrl) {
          if (importedPublicKey) {
            const result = await validateJWT(tokenFromUrl, importedPublicKey);
            if (result.isValid) {
              storeJWT(tokenFromUrl);
              createUserFromPayload(result.payload);
              // Clean up URL by removing the JWT parameter
              const newUrl = window.location.pathname + window.location.hash;
              window.history.replaceState({}, document.title, newUrl);
            } else {
              // Invalid token from URL, try to get new token
              await fetchAndStoreNewToken(importedPublicKey);
            }
          } else {
               console.error('Public key not loaded.');
               await fetchAndStoreNewToken(importedPublicKey);
          }
        }
        // Otherwise, check for JWT in localStorage
        else {
          const storedToken = getStoredJWT();
          if (storedToken) {
             if (importedPublicKey) {
              const result = await validateJWT(storedToken, importedPublicKey);
              if (result.isValid) {
                // Schedule renewal for the already-stored, still-valid token.
                setTokenExpiry(getJwtExpiryMs(storedToken));
                createUserFromPayload(result.payload);
              } else {
                // Token is invalid or expired, fetch new token from /chat/auth
                localStorage.removeItem(JWT_STORAGE_KEY);
                await fetchAndStoreNewToken(importedPublicKey);
              }
             } else {
               console.error('Public key not loaded.');
               await fetchAndStoreNewToken(importedPublicKey);
             }
          } else {
            // No token found, fetch new token from /chat/auth
            await fetchAndStoreNewToken(importedPublicKey);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        createGuestUser();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [publicKeyPEM, createGuestUser, fetchAndStoreNewToken]);

  // Handle token refresh signals from ApiService
  useEffect(() => {
    const handleProactiveRefresh = async () => {
      try {
        await fetchAndStoreNewToken(publicKey);
      } catch {
        // Keep using the nearly-expired token until hard expiry
      } finally {
        apiService.resetRefreshFlag();
      }
    };

    const handleTokenRefreshed = (event: Event) => {
      const token = (event as CustomEvent<{ token: string }>).detail?.token;
      if (token) storeJWT(token); // persist to localStorage; user state is unchanged
    };

    window.addEventListener("auth:proactive-refresh", handleProactiveRefresh);
    window.addEventListener("auth:token-refreshed", handleTokenRefreshed);
    return () => {
      window.removeEventListener("auth:proactive-refresh", handleProactiveRefresh);
      window.removeEventListener("auth:token-refreshed", handleTokenRefreshed);
    };
  }, [publicKey, fetchAndStoreNewToken]);

  // Proactively renew the token shortly before it expires. With short-lived
  // (~15 min) tokens this covers idle tabs where no API call would otherwise
  // trigger a refresh. The 403 interceptor in ApiService remains the fallback.
  //
  // Note: if the backend returns a cached token with an identical `exp`,
  // setTokenExpiry stores the same value and this effect won't re-run, so the
  // next timer isn't scheduled — the token then rides to hard expiry and the
  // 403 interceptor renews it. Acceptable given that fallback.
  useEffect(() => {
    if (!tokenExpiry) return;
    const delay = Math.max(
      0,
      tokenExpiry - new Date().getTime() - TOKEN_REFRESH_THRESHOLD_MS
    );
    const timerId = window.setTimeout(() => {
      fetchAndStoreNewToken(publicKey);
    }, delay);
    return () => window.clearTimeout(timerId);
  }, [tokenExpiry, publicKey, fetchAndStoreNewToken]);

  // Create a user object from JWT payload
  const createUserFromPayload = (payload: JWTPayload | null) => {
    if (!payload) {
      setUser(null);
      return;
    }
    
    // Extract name from payload, use fallbacks
    const name = payload.name as string || 'Anonymous User';
    
    // For email, try to get from payload or use fallback
    // let email = 'user@example.com';
    let email = '';
    if (payload.email) {
      email = payload.email as string;
    } else if (payload.sub) {
      email = `${payload.sub}@example.com`;
    }
    
    setUser({
      authenticated: true,
      username: name,
      email: email,
      isGuest: false
    });
  };

  // Retrieve JWT from localStorage
  const getStoredJWT = (): string | null => {
    try {
      const tokenData = localStorage.getItem(JWT_STORAGE_KEY);
      if (!tokenData) return null;
      
      const parsedData = JSON.parse(tokenData);
      const now = new Date().getTime();
      
      // Check if token is expired
      if (now > parsedData.expiry) {
        localStorage.removeItem(JWT_STORAGE_KEY);
        return null;
      }
      
      return parsedData.token;
    } catch (error) {
      console.error("Error retrieving JWT:", error);
      return null;
    }
  };

  // Function to validate JWT and extract payload
  async function validateJWT(token: string, key: CryptoKey): Promise<{ isValid: boolean; payload: JWTPayload | null }> {
    try {
      const { payload } = await jwtVerify(token, key);
      return { isValid: true, payload };
    } catch (e) {
      console.error('JWT verification failed:', e);
      return { isValid: false, payload: null };
    }
  }

  // Public method to set auth token
  const setAuthToken = async (token: string): Promise<boolean> => {
    try {
      if (publicKey) {
        const result = await validateJWT(token, publicKey);
        if (result.isValid) {
          storeJWT(token);
          createUserFromPayload(result.payload);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error setting auth token:", error);
      return false;
    }
  };

  // Login function - to be implemented with actual API call
  const login = async (username: string, password: string): Promise<boolean> => {
    // This should be implemented with actual API call
    setIsLoading(true);
    try {
      // In a real implementation, this would call your authentication API
      // and get back a real JWT token
      console.log('Login called with:', username, password);
      return false; // Return false since we're not implementing real login yet
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    // Clear user data and token
    setUser(null);
    localStorage.removeItem(JWT_STORAGE_KEY);
  };

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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 