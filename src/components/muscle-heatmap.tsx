"use client";

import { useMemo } from "react";
import { parseISO, isValid, differenceInDays, startOfDay, format } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/context/language-context";
import type { WorkoutLog } from '@/lib/types';
import { useExercises } from '@/context/exercise-context';
import { Activity } from "lucide-react";

interface MuscleHeatmapProps {
  workoutLog: WorkoutLog;
}

type DurationType = "7" | "30" | "all";

export default function MuscleHeatmap({ workoutLog }: MuscleHeatmapProps) {
  const { exercises } = useExercises();
  const { t } = useLanguage();

  const muscleRecovery = useMemo(() => {
    const lastTrained: Record<string, number | null> = {
      chest: null,
      back: null,
      shoulders: null,
      arms: null,
      core: null,
      legs: null,
    };

    const sortedDates = Object.keys(workoutLog)
      .map(d => parseISO(d))
      .filter(isValid)
      .sort((a, b) => b.getTime() - a.getTime());

    sortedDates.forEach(date => {
      const dateStr = format(date, "yyyy-MM-dd");
      const workoutExercises = workoutLog[dateStr];
      if (!workoutExercises) return;

      workoutExercises.forEach(workoutEx => {
        const exerciseDetails = exercises.find(ex => ex.id === workoutEx.exerciseId);
        if (!exerciseDetails) return;

        let bp = exerciseDetails.bodyPart.toLowerCase();
        if (['upper arms', 'lower arms'].includes(bp)) bp = 'arms';
        if (['upper legs', 'lower legs'].includes(bp)) bp = 'legs';
        if (['waist'].includes(bp)) bp = 'core';
        if (['chest', 'back', 'shoulders', 'arms', 'core', 'legs'].includes(bp)) {
          if (lastTrained[bp] === null) {
             const diff = differenceInDays(startOfDay(new Date()), startOfDay(date));
             lastTrained[bp] = Math.max(0, diff);
          }
        }
      });
    });

    const recoveryStats: Record<string, { percent: number, daysAgo: number | null }> = {};
    const FULLY_RECOVERED_DAYS = 4; // 4 days to fully recover

    Object.keys(lastTrained).forEach(bp => {
      const days = lastTrained[bp];
      if (days === null) {
        recoveryStats[bp] = { percent: 100, daysAgo: null };
      } else {
        const pct = Math.min(100, (days / FULLY_RECOVERED_DAYS) * 100);
        recoveryStats[bp] = { percent: Math.round(pct), daysAgo: days };
      }
    });

    return recoveryStats;
  }, [workoutLog, exercises]);
  
  const getColor = (percent: number) => {
    if (percent >= 80) return "#22c55e"; // Green (Recovered)
    if (percent >= 40) return "#f97316"; // Orange (Recovering)
    return "#ef4444"; // Red (Fatigued)
  };

  const renderTooltip = (part: string, stat: {percent: number, daysAgo: number|null}, children: React.ReactNode) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-help outline-none transition-opacity hover:opacity-80">
            {children}
          </g>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-background border-border">
          <p className="font-semibold capitalize text-center mb-1">{t(part)}</p>
          <p className="text-xs text-muted-foreground">
            {stat.daysAgo === null 
              ? '100% Recovered (No recent logs)' 
              : `${stat.percent}% Recovered (${stat.daysAgo} days ago)`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <Card className="glass-effect overflow-hidden relative">
      <CardHeader className="pb-2">
        <div className="flex flex-row items-center justify-between gap-4">
          <CardTitle className="font-headline text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {t('muscleRecovery') || 'Muscle Recovery'}
          </CardTitle>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Track muscle readiness based on rest days.</p>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
        
        {/* SVG Silhouette */}
        <div className="relative w-48 h-64 mx-auto flex-shrink-0">
          <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md">
            
            {/* Back (Lats behind chest) */}
            {renderTooltip('back', muscleRecovery.back, (
              <>
                <path d="M35 45 Q25 60 38 70 Z" fill={getColor(muscleRecovery.back.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <path d="M65 45 Q75 60 62 70 Z" fill={getColor(muscleRecovery.back.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              </>
            ))}

            {renderTooltip('shoulders', muscleRecovery.shoulders, (
              <path d="M30 40 Q50 30 70 40 L85 55 L78 65 Q70 50 65 45 Q50 50 35 45 Q30 50 22 65 L15 55 Z" fill={getColor(muscleRecovery.shoulders.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            ))}
            
            {renderTooltip('chest', muscleRecovery.chest, (
              <path d="M35 45 Q50 50 65 45 L62 70 Q50 75 38 70 Z" fill={getColor(muscleRecovery.chest.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            ))}

            {renderTooltip('core', muscleRecovery.core, (
              <path d="M38 70 Q50 75 62 70 L58 100 Q50 105 42 100 Z" fill={getColor(muscleRecovery.core.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            ))}

            {renderTooltip('arms', muscleRecovery.arms, (
              <>
                <path d="M15 55 L22 65 L18 110 L10 105 Z" fill={getColor(muscleRecovery.arms.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <path d="M85 55 L78 65 L82 110 L90 105 Z" fill={getColor(muscleRecovery.arms.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </>
            ))}

            {renderTooltip('legs', muscleRecovery.legs, (
              <>
                <path d="M42 100 Q45 103 50 105 L48 180 L35 180 L38 100 Z" fill={getColor(muscleRecovery.legs.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <path d="M58 100 Q55 103 50 105 L52 180 L65 180 L62 100 Z" fill={getColor(muscleRecovery.legs.percent)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </>
            ))}

            {/* Head (Neutral) */}
            <circle cx="50" cy="20" r="12" fill="#333535" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {Object.entries(muscleRecovery).map(([part, stat]) => (
            <TooltipProvider key={part}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between cursor-help p-1 rounded-md hover:bg-surface-variant/30 transition-colors">
                    <span className="capitalize text-sm font-medium">{t(part)}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2.5 rounded-full bg-muted overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${stat.percent}%`,
                            backgroundColor: getColor(stat.percent)
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {stat.percent}%
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="bg-background border-border">
                   <p className="text-xs">
                     {stat.daysAgo === null ? 'Fully recovered' : `Last trained ${stat.daysAgo} days ago`}
                   </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
