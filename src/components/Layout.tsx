import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSelector } from "@/components/LanguageSelector";
import { ReactNode, useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle
} from "@/components/ui/sheet";
import { Menu, User, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/components/LanguageProvider";
interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
}

export function Layout({ children, showFooter = true }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useLanguage();
  // const { user, logout } = useAuth();
  const { user} = useAuth();
  const logout = () => {};
  const headerRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  
  useEffect(() => {
    const updateCssVariables = () => {
      if (headerRef.current) {
        const headerHeight = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
      }
      
      if (footerRef.current && showFooter) {
        const footerHeight = footerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--footer-height', `${footerHeight}px`);
      } else {
        document.documentElement.style.setProperty('--footer-height', '0px');
      }
      
      // Set a reasonable default for input height
      document.documentElement.style.setProperty('--input-height', '4rem');
    };
    
    updateCssVariables();
    window.addEventListener('resize', updateCssVariables);
    
    return () => {
      window.removeEventListener('resize', updateCssVariables);
    };
  }, [showFooter]);
  
  const getInitials = (username: string) => {
    return username?.substring(0, 2).toUpperCase() || "U";
  };

  return (
    <div className="flex flex-col min-h-screen">
      <header ref={headerRef} className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-primary">{t("appTitle").toString()}</span>
        </div>
        
        {/* Desktop menu */}
        <div className="hidden md:flex items-center gap-4">
          <LanguageSelector />
          <ThemeToggle />
          {/* {user?.authenticated && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" alt="User" />
                    <AvatarFallback>
                      {getInitials(user.username)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.username}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {/* <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem> 
                </DropdownMenuContent>
            </DropdownMenu>
          )} */} 
        </div>
        
        {/* Mobile menu */}
        <div className="md:hidden flex items-center">
        <ThemeToggle />
          <LanguageSelector />

          {/* <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[240px] sm:w-[300px] px-0">
              <SheetTitle className="sr-only">Mobile Menu</SheetTitle>
              <div className="flex flex-col gap-4 py-4">
                {user?.authenticated && (
                  <div className="px-4 py-3 border-b">
                    <div className="flex items-center gap-3 mb-2">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src="" alt="User" />
                        <AvatarFallback>
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user.username}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                     <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 flex items-center justify-start"
                      onClick={logout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </Button> 
                  </div>
                )}
                <div className="space-y-3 px-4">
                  <div className="pb-2 border-b">
                    <p className="text-xs text-muted-foreground uppercase font-medium mb-2">{t("settings").toString()}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm">{t("theme").toString()}</p>
                        <ThemeToggle />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet> */}
        </div>
      </header>
      <main className={`flex-1 ${showFooter ? 'pb-20' : 'pb-4'}`}>
        <div className="pt-16">
          {children}
        </div>
      </main>
      {showFooter && (
        <footer ref={footerRef} className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border p-3">
          <div className="max-w-md mx-auto">
            <p className="text-xs text-center text-muted-foreground">
              © {new Date().getFullYear()} MahaVistaar App
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
