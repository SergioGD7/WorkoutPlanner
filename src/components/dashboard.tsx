"use client";

import { useState } from "react";
import { format, addDays, subDays, isSameDay, isToday, startOfWeek, eachDayOfInterval } from "date-fns";
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';
import { Button } from "@/components/ui/button";
import DailyWorkout from "@/components/daily-workout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/language-context";

export default function Dashboard() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const { language } = useLanguage();

  const weekStartsOn = language === 'es' ? 1 : 0; // Monday for ES, Sunday for EN
  const weekStart = startOfWeek(currentDate, { weekStartsOn });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });
  
  const getLocale = () => {
    return language === 'es' ? es : enUS;
  }

  const handlePrevWeek = () => {
    const newDate = subDays(currentDate, 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };

  const handleNextWeek = () => {
    const newDate = addDays(currentDate, 7);
    setCurrentDate(newDate);
    setSelectedDate(newDate);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between font-headline text-2xl capitalize">
            <span>{format(weekStart, 'MMMM yyyy', { locale: getLocale() })}</span>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={handlePrevWeek} className="rounded-full">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextWeek} className="rounded-full">
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map(day => (
                <Button 
                    key={day.toString()}
                    variant={isSameDay(day, selectedDate) ? 'secondary' : 'ghost'}
                    className={`flex h-auto flex-col gap-1 p-2 rounded-full transition-all duration-200 capitalize ${isToday(day) && !isSameDay(day, selectedDate) ? 'border-2 border-primary/50' : ''}`}
                    onClick={() => setSelectedDate(day)}
                >
                    <span className="text-sm font-medium">{format(day, 'E', { locale: getLocale() })}</span>
                    <span className="text-2xl font-bold">{format(day, 'd')}</span>
                </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <DailyWorkout date={selectedDate} />
    </div>
  );
}
