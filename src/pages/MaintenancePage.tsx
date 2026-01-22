import { useLanguage } from "@/components/LanguageProvider";
import { Layout } from "@/components/Layout";
import { Wrench } from "lucide-react";

export default function MaintenancePage() {
  const { t } = useLanguage();
  
  const maintenance = t("maintenance") as Record<string, string>;

  return (
    <Layout showFooter={false}>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-var(--header-height))] px-4 text-center">
        <div className="animate-fade-in max-w-md mx-auto space-y-8">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
              <div className="relative bg-card p-6 rounded-full border border-border shadow-sm">
                <Wrench className="w-12 h-12 text-primary animate-bounce-slow" />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {maintenance.heading || "MahaVISTAAR AI App"}
            </h1>
            
            {/* <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
              {maintenance.subheading || "Under Maintenance"}
            </div> */}

            <p className="text-lg text-muted-foreground leading-relaxed">
              {maintenance.message || "We're currently performing scheduled maintenance to improve your experience. We'll be back shortly."}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
