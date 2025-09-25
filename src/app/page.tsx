"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Dumbbell, HomeIcon, BookOpen, BarChart3, Menu, LogOut, CalendarDays, SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import Dashboard from "@/components/dashboard";
import ExerciseLibrary from "@/components/exercise-library";
import ProgressTracker from "@/components/progress-tracker";
import CalendarView from "@/components/calendar-view";
import Settings from "@/components/settings";
import { useLanguage } from "@/context/language-context";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";

type View = "dashboard" | "library" | "progress" | "calendar" | "settings";

export default function HomePage() {
  const [view, setView] = useState<View>("dashboard");
  const { t } = useLanguage();
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const renderView = () => {
    switch (view) {
      case "library":
        return <ExerciseLibrary />;
      case "progress":
        return <ProgressTracker />;
      case "calendar":
        return <CalendarView />;
      case "settings":
        return <Settings />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  const NavLinks = ({ inSheet = false }: { inSheet?: boolean }) => {
    const handleViewChange = (newView: View) => {
      setView(newView);
      if (inSheet) {
        const trigger = document.querySelector('[data-radix-dialog-trigger-sheet="true"]');
        if (trigger instanceof HTMLElement) {
          trigger.click();
        }
      }
    };
  
    return (
      <nav className="flex flex-col gap-4 p-4">
        <Button
          variant={view === "dashboard" ? "secondary" : "ghost"}
          onClick={() => handleViewChange("dashboard")}
          className="justify-start rounded-full"
        >
          <HomeIcon className="mr-2 h-5 w-5" />
          {t('dashboard')}
        </Button>
        <Button
          variant={view === "library" ? "secondary" : "ghost"}
          onClick={() => handleViewChange("library")}
          className="justify-start rounded-full"
        >
          <BookOpen className="mr-2 h-5 w-5" />
          {t('library')}
        </Button>
        <Button
          variant={view === "progress" ? "secondary" : "ghost"}
          onClick={() => handleViewChange("progress")}
          className="justify-start rounded-full"
        >
          <BarChart3 className="mr-2 h-5 w-5" />
          {t('progress')}
        </Button>
        <Button
          variant={view === "calendar" ? "secondary" : "ghost"}
          onClick={() => handleViewChange("calendar")}
          className="justify-start rounded-full"
        >
          <CalendarDays className="mr-2 h-5 w-5" />
          {t('calendar')}
        </Button>
        <Button
          variant={view === "settings" ? "secondary" : "ghost"}
          onClick={() => handleViewChange("settings")}
          className="justify-start rounded-full"
        >
          <SettingsIcon className="mr-2 h-5 w-5" />
          {t('settings')}
        </Button>
      </nav>
    );
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Dumbbell className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Dumbbell className="h-8 w-8 text-primary" />
          <h1 className="ml-2 text-2xl font-bold font-headline">Workout Planner</h1>
        </div>
        <NavLinks />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden" data-radix-dialog-trigger-sheet="true">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <SheetHeader className="flex h-16 flex-row items-center border-b px-6 space-y-0">
                 <Dumbbell className="h-8 w-8 text-primary" />
                 <SheetTitle className="ml-2 text-xl font-bold font-headline">Workout Planner</SheetTitle>
                 <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
               </SheetHeader>
              <NavLinks inSheet={true} />
            </SheetContent>
          </Sheet>
          <div className="flex-1">
             <h2 className="text-xl font-semibold capitalize font-headline">{t(view)}</h2>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout" className="rounded-full">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
