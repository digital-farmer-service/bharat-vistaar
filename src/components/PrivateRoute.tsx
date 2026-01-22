import { ReactNode } from 'react';
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface PrivateRouteProps {
  children: ReactNode;
}

const PrivateRoute = ({ children }: PrivateRouteProps) => {
  const { user } = useAuth();
  const isLoggedIn = user?.authenticated;

  return isLoggedIn ? children : <Navigate to="/error" />;
};

export default PrivateRoute;