import { Layout } from "@/components/Layout";

const ErrorPage = () => {
  return (
    <Layout showFooter={false}>
      <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 text-center">
        <h1 className="text-4xl font-bold text-primary">Not Authenticated</h1>
        <p className="mt-4 text-lg">
          You need to be logged in to access this page.
        </p>
      </div>
    </Layout>
  );
};

export default ErrorPage;
