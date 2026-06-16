"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Dumbbell, HomeIcon, BookOpen, BarChart3, LogOut, CalendarDays, SettingsIcon, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dashboard from "@/components/dashboard";
import ExerciseLibrary from "@/components/exercise-library";
import ProgressTracker from "@/components/progress-tracker";
import CalendarView from "@/components/calendar-view";
import Settings from "@/components/settings";
import { useLanguage } from "@/context/language-context";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { triggerHaptic } from "@/utils/haptics";
import { AnimatePresence, motion, Variants } from "framer-motion";

type View = "dashboard" | "library" | "progress" | "calendar" | "settings";

const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
};

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
    triggerHaptic('medium');
    logout();
    router.push('/login');
  };

  const handleViewChange = (newView: View) => {
    if (view !== newView) {
      triggerHaptic('light');
      setView(newView);
    }
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

  const navItems = [
    { id: "dashboard", icon: HomeIcon, label: t('dashboard') },
    { id: "library", icon: BookOpen, label: t('library') },
    { id: "progress", icon: BarChart3, label: t('progress') },
    { id: "calendar", icon: CalendarDays, label: t('calendar') },
    { id: "settings", icon: User, label: t('profile') || 'Profile' }
  ] as const;

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Dumbbell className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background pb-16 md:pb-0">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Dumbbell className="h-8 w-8 text-primary" />
          <h1 className="ml-2 text-2xl font-bold font-headline whitespace-nowrap">Workout Planner</h1>
        </div>
        <nav className="flex flex-col gap-4 p-4">
          {navItems.map((item) => (
            <Button
              key={item.id}
              variant={view === item.id ? "secondary" : "ghost"}
              onClick={() => handleViewChange(item.id as View)}
              className="justify-start rounded-full"
            >
              <item.icon className="mr-2 h-5 w-5" />
              {item.label}
            </Button>
          ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 shrink-0">
          <div className="flex items-center md:hidden">
            <Dumbbell className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-lg font-bold font-headline">Workout Planner</h1>
          </div>
          <div className="flex-1 hidden md:block">
             <h2 className="text-xl font-semibold capitalize font-headline">{t(view)}</h2>
          </div>
          <div className="flex flex-1 md:flex-none justify-end items-center gap-2">
            <LanguageSwitcher />
            <ThemeSwitcher />
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Logout" className="rounded-full">
              <LogOut className="h-5 w-5" />
              <span className="sr-only">Logout</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area with Animations */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t flex items-center justify-around px-2 z-50 glass-effect">
        {navItems.map((item) => {
          const isActive = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleViewChange(item.id as View)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <item.icon className={`h-6 w-6 ${isActive ? 'fill-primary/20' : ''}`} />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
