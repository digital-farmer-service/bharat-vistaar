import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { jwtVerify, importSPKI, JWTPayload } from 'jose';
import { setTelemetryUserData } from '../lib/telemetry';

// Constants
const JWT_STORAGE_KEY = 'auth_jwt';
const JWT_EXPIRY_DAYS = 365; // 1 year expiration

// Location interface that matches the JWT structure
export interface Location {
  location_type: 'registered_location' | 'device_location' | 'agristack_location';
  district: string;
  village: string;
  taluka: string;
  lgd_code: string;
}

// User interface that contains the essential user information
export interface User {
  authenticated: boolean;
  username: string;
  email: string;
  mobile: string;
  is_guest_user?: boolean;
}

// Auth context interface
interface AuthContextType {
  user: User | null;
  locations: Location[];
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  setAuthToken: (token: string) => Promise<boolean>;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  locations: [],
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
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [publicKey, setPublicKey] = useState<CryptoKey | null>(null);

  // JWT validation public key
  const publicKeyPEM = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo
4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u
+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh
kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ
0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg
cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc
mwIDAQAB
-----END PUBLIC KEY-----`;

  // Initialize auth state on component mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        // Import the public key
        const importedPublicKey = await importSPKI(publicKeyPEM, 'RS256');
        setPublicKey(importedPublicKey);

        // Check URL params first for new JWT
        const urlParams = new URLSearchParams(window.location.search);
        const tokenFromUrl = urlParams.get('token');

        // If JWT exists in URL, validate and store it
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
              createUserFromPayload(null);
            }
          } else {
               console.error('Public key not loaded.');
               createUserFromPayload(null);
          }
        }
        // Otherwise, check for JWT in localStorage
        else {
          const storedToken = getStoredJWT();
          if (storedToken) {
             if (importedPublicKey) {
              const result = await validateJWT(storedToken, importedPublicKey);
              if (result.isValid) {
                createUserFromPayload(result.payload);
              } else {
                // Token is invalid or expired, remove it
                localStorage.removeItem(JWT_STORAGE_KEY);
                createUserFromPayload(null);
              }
             } else {
               console.error('Public key not loaded.');
               createUserFromPayload(null);
             }
          } else {
            createUserFromPayload(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        createUserFromPayload(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [publicKeyPEM]);

  // Create a user object from JWT payload
  const createUserFromPayload = (payload: JWTPayload | null) => {
    if (!payload) {
      setUser(null);
      setLocations([]);
      // Clear telemetry data when user is not available
      setTelemetryUserData({});
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
    
    // Extract mobile from payload, use fallback
    const mobile = (payload as any)?.mobile as string || '';
    
    // Extract guest user flag
    const is_guest_user = (payload as any)?.is_guest_user === true;

    // Extract additional user fields
    const role = (payload as any)?.role as string || '';
    const farmer_id = (payload as any)?.farmer_id as string || '';
    const unique_id = (payload as any)?.unique_id as string | number | undefined;
    
    setUser({
      authenticated: true,
      username: name,
      email: email,
      mobile: mobile,
      is_guest_user: is_guest_user
    });

    // Extract locations array from JWT payload
    const locationsData = (payload as any)?.locations as Location[] | undefined;
    const validatedLocations: Location[] = [];
    
    if (Array.isArray(locationsData)) {
      locationsData.forEach((loc) => {
        if (loc && typeof loc === 'object' && 
            typeof loc.location_type === 'string' &&
            typeof loc.district === 'string' &&
            typeof loc.village === 'string' &&
            typeof loc.taluka === 'string' &&
            ['registered_location', 'device_location', 'agristack_location'].includes(loc.location_type)) {
          validatedLocations.push({
            location_type: loc.location_type as 'registered_location' | 'device_location' | 'agristack_location',
            district: loc.district,
            village: loc.village,
            taluka: loc.taluka,
            lgd_code: String((loc as any).lgd_code ?? '')
          });
        }
      });
    }
    
    setLocations(validatedLocations);

    // Set comprehensive telemetry data with all location types
    setTelemetryUserData({
      mobile: mobile,
      username: name,
      email: email,
      role: role,
      farmer_id: farmer_id,
      unique_id: unique_id,
      locations: validatedLocations
    });
  };

  // Store JWT in localStorage with expiration
  const storeJWT = (token: string) => {
    try {
      const now = new Date();
      const expiryDate = new Date(now);
      expiryDate.setDate(now.getDate() + JWT_EXPIRY_DAYS);
      
      const tokenData = {
        token,
        expiry: expiryDate.getTime()
      };
      
      localStorage.setItem(JWT_STORAGE_KEY, JSON.stringify(tokenData));
      return true;
    } catch (error) {
      console.error("Error storing JWT:", error);
      return false;
    }
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
    setLocations([]);
    localStorage.removeItem(JWT_STORAGE_KEY);
    // Clear all telemetry data on logout
    setTelemetryUserData({});
  };

  return (
    <AuthContext.Provider value={{ user, locations, isLoading, login, logout, setAuthToken }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use the auth context
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 