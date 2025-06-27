"use client";

import { useState } from "react";
import { Dumbbell, Home as HomeIcon, BookOpen, BarChart3, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Dashboard from "@/components/dashboard";
import ExerciseLibrary from "@/components/exercise-library";
import ProgressTracker from "@/components/progress-tracker";

type View = "dashboard" | "library" | "progress";

export default function Home() {
  const [view, setView] = useState<View>("dashboard");

  const renderView = () => {
    switch (view) {
      case "library":
        return <ExerciseLibrary />;
      case "progress":
        return <ProgressTracker />;
      case "dashboard":
      default:
        return <Dashboard />;
    }
  };

  const NavLinks = ({ inSheet = false }: { inSheet?: boolean }) => (
    <nav className="flex flex-col gap-4 p-4">
      <Button
        variant={view === "dashboard" ? "secondary" : "ghost"}
        onClick={() => {
          setView("dashboard");
          if (inSheet && document.querySelector('[data-radix-dialog-trigger-sheet="true"]')) {
            (document.querySelector('[data-radix-dialog-trigger-sheet="true"]') as HTMLElement).click();
          }
        }}
        className="justify-start"
      >
        <HomeIcon className="mr-2 h-5 w-5" />
        Dashboard
      </Button>
      <Button
        variant={view === "library" ? "secondary" : "ghost"}
        onClick={() => setView("library")}
        className="justify-start"
      >
        <BookOpen className="mr-2 h-5 w-5" />
        Exercise Library
      </Button>
      <Button
        variant={view === "progress" ? "secondary" : "ghost"}
        onClick={() => setView("progress")}
        className="justify-start"
      >
        <BarChart3 className="mr-2 h-5 w-5" />
        Progress
      </Button>
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-16 items-center border-b px-6">
          <Dumbbell className="h-8 w-8 text-primary" />
          <h1 className="ml-2 text-2xl font-bold font-headline">Workout Warrior</h1>
        </div>
        <NavLinks />
      </aside>
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <div className="flex h-16 items-center border-b px-6">
                 <Dumbbell className="h-8 w-8 text-primary" />
                 <h1 className="ml-2 text-xl font-bold font-headline">Workout Warrior</h1>
              </div>
              <NavLinks inSheet={true} />
            </SheetContent>
          </Sheet>
          <div className="flex-1">
             <h2 className="text-xl font-semibold capitalize font-headline">{view}</h2>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
