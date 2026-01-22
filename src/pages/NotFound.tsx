
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <Layout showFooter={false}>
      <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
        <h1 className="text-6xl font-bold text-primary">404</h1>
        <p className="mt-4 text-xl">
          यह पेज उपलब्ध नहीं है 
          <br />
          <span className="text-muted-foreground">
            (This page is not available)
          </span>
        </p>
        <Button asChild className="mt-8">
          <a href="/">वापस मुख्य पृष्ठ पर जाएं (Return to Home)</a>
        </Button>
      </div>
    </Layout>
  );
}

export default NotFound;
