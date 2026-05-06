import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, PanelLeft } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          {/* Professional header */}
          <header className="glass-header h-14 flex items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
              <div className="hidden sm:block h-5 w-px bg-border" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60 border border-border/50">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <span className="text-xs text-muted-foreground font-medium max-w-[200px] truncate">{user?.email}</span>
              </div>
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={signOut} title="Sair" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <ImpersonationBanner />

          {/* Main content with subtle background pattern */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
            <div className="max-w-[1400px] mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
