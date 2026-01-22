import { ReactNode } from 'react';
import { useAuth } from "@/contexts/AuthContext";

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user, isLoading } = useAuth();
  
  // Show loading state while auth is initializing
  if (isLoading) {
    return <div className="bg-foreground/80 flex justify-center items-center h-screen text-background">Loading...</div>;
  }
  
  // All users are authenticated (either JWT or guest), so always render children
  // Note: user will always be present (either real user or guest user)
  return <>{children}</>;
};

export default PrivateRoute;