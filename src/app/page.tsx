"use client";

import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Dumbbell, HomeIcon, BookOpen, BarChart3, LogOut, CalendarDays, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Dashboard from "@/components/dashboard";
import ExerciseLibrary from "@/components/exercise-library";
import ProgressTracker from "@/components/progress-tracker";
import CalendarView from "@/components/calendar-view";
import { useLanguage } from "@/context/language-context";
import { useIsOverlayOpen } from "@/context/overlay-context";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { triggerHaptic } from "@/utils/haptics";
import RestTimer from "@/components/rest-timer";
import WorkTimer from "@/components/work-timer";
import { AnimatePresence, motion, Variants } from "framer-motion";

type View = "dashboard" | "library" | "progress" | "calendar";

const pageVariants: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: "easeOut" } },
  exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2, ease: "easeIn" } }
};

export default function HomePage() {
  const [view, setView] = useState<View>("dashboard");
  const { t } = useLanguage();
  const { user, loading, logout, isDemo } = useAuth();
  const isOverlayOpen = useIsOverlayOpen();
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

  const handleViewChange = (newView: string) => {
    if (newView === "settings") {
      router.push('/settings');
      return;
    }
    if (view !== newView) {
      triggerHaptic('light');
      setView(newView as View);
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
    // Not a view: navigates to the standalone /settings route.
    { id: "settings", icon: User, label: t('profile') }
  ] as const;

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Dumbbell className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background">
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
              onClick={() => handleViewChange(item.id)}
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
        <header
          className="flex items-center gap-4 border-b bg-card px-4 md:px-6 shrink-0"
          style={{ minHeight: "4rem", paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center md:hidden">
            <Dumbbell className="h-6 w-6 text-primary mr-2" />
            <h1 className="text-lg font-bold font-headline whitespace-nowrap">Workout Planner</h1>
          </div>
          <div className="flex-1 hidden md:block">
             <h2 className="text-xl font-semibold capitalize font-headline">{t(view)}</h2>
          </div>
          <div className="flex flex-1 md:flex-none justify-end items-center gap-2">
            {isDemo && (
              <Badge
                variant="outline"
                className="border-primary/40 bg-primary/10 text-[10px] uppercase text-primary"
                title={t('demoBanner')}
              >
                {t('demoMode')}
              </Badge>
            )}
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <LanguageSwitcher />
              <ThemeSwitcher />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              aria-label={isDemo ? t('exitDemo') : t('logout')}
              className="rounded-full"
            >
              <LogOut className="h-5 w-5" />
              <span className="sr-only">{isDemo ? t('exitDemo') : t('logout')}</span>
            </Button>
          </div>
        </header>

        {/* Main Content Area with Animations */}
        <main className="flex-1 overflow-y-auto p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-6 relative">
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

      {/* Rest timer lives at the shell level so it survives navigation between views. */}
      <RestTimer />
      <WorkTimer />

      {/* Floating pill navigation, iOS style: detached from the bottom edge,
          icons only, with the active item marked by a filled capsule.

          It drops out of the way whenever a sheet is up: floating above
          everything is what makes it reachable while scrolling, and also what
          made it cover a sheet's own buttons and eat taps meant for them. */}
      <AnimatePresence>
        {!isOverlayOpen && (
          <motion.nav
            // `x` is animated rather than set with `-translate-x-1/2`: framer
            // writes `transform` outright and would wipe the class, leaving the
            // pill half a width to the right of centre.
            initial={{ opacity: 0, y: 24, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 24, x: '-50%' }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="md:hidden fixed left-1/2 z-50"
            style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
            aria-label={t('dashboard')}
          >
            <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/80 p-1.5 shadow-2xl shadow-black/30 backdrop-blur-xl">
              {navItems.map((item) => {
                const isActive = view === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleViewChange(item.id)}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    title={item.label}
                    className={`flex h-12 w-14 items-center justify-center rounded-full transition-colors ${
                      isActive
                        ? 'bg-primary/15 text-primary'
                        : 'text-muted-foreground hover:bg-secondary/40 hover:text-foreground'
                    }`}
                  >
                    <item.icon className="h-6 w-6" />
                  </button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}
