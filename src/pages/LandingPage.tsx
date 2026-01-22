import { Button } from "@/components/ui/button";
import { FarmMascot } from "@/components/FarmMascot";
import { Layout } from "@/components/Layout";
import { Link, Navigate } from "react-router-dom";
import { useLanguage } from "@/components/LanguageProvider";

export default function LandingPage() {
  const { language, t } = useLanguage();

  return (<Navigate to="/chat" replace />);
  // landing page removed
  return (
    <Layout showFooter={false}>
      <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 text-center">
        <div className="animate-fade-in mb-16 sm:mb-0">
          <FarmMascot />
          
          <h1 className="mt-6 text-4xl font-bold tracking-tight">
            {t("appTitle").toString()}
          </h1>
          
          <p className="mt-4 text-lg text-muted-foreground">
            शेतकऱ्याचा डिजिटल मित्र
            <br />
          </p>
          
          <div className="mt-8 flex flex-col gap-4 items-center">
            <Button asChild size="lg" className="w-full max-w-xs animate-pulse-slow">
              <Link to="/chat">
                {t("askYourQuestion").toString()}
              </Link>
            </Button>
            
            {/* <Button asChild variant="outline" className="w-full max-w-xs">
              <Link to="/login">
                लॉगिन करें
                <br />
                <span className="text-sm font-normal">(Login)</span>
              </Link>
            </Button> */}
          </div>
          
          {/* <div className="mt-12 grid grid-cols-2 gap-4 max-w-sm mx-auto">
            <div className="rounded-lg bg-card p-4 border border-border">
              <h3 className="font-medium">मौसम की जानकारी</h3>
              <p className="text-sm text-muted-foreground">Weather Updates</p>
            </div>
            <div className="rounded-lg bg-card p-4 border border-border">
              <h3 className="font-medium">मंडी भाव</h3>
              <p className="text-sm text-muted-foreground">Market Prices</p>
            </div>
            <div className="rounded-lg bg-card p-4 border border-border">
              <h3 className="font-medium">सरकारी योजनाएँ</h3>
              <p className="text-sm text-muted-foreground">Govt Schemes</p>
            </div>
            <div className="rounded-lg bg-card p-4 border border-border">
              <h3 className="font-medium">फसल सुरक्षा</h3>
              <p className="text-sm text-muted-foreground">Crop Protection</p>
            </div>
          </div> */}
        </div>
      </div>
    </Layout>
  );
}
