import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";

const ErrorPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const reason = searchParams.get("reason");
  const isGuestLimit = reason === "guest_limit";

  const title = isGuestLimit ? "Guest Access Limit Reached" : "Not Authenticated";
  const description = isGuestLimit
    ? "Please signup you have exhausted your free usage."
    : "You need to be logged in to access this page.";

  return (
    <Layout showFooter={false}>
      <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
        <h1 className="text-4xl font-bold text-primary">{title}</h1>
        <p className="mt-4 text-lg">{description}</p>
        {isGuestLimit && (
          <Button
            className="mt-6"
            onClick={() => (window.location.href = "https://vistaar.maharashtra.gov.in/index.php")}
          >
            Sign Up / Login
          </Button>
        )}
      </div>
    </Layout>
  );
};

export default ErrorPage;
