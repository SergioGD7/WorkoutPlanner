"use client";

import { useMemo, useState } from "react";
import { parseISO, isValid, subDays, isAfter, startOfDay } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [duration, setDuration] = useState<DurationType>("7");

  const bodyPartVolumes = useMemo(() => {
    const volumes: Record<string, number> = {
      chest: 0,
      back: 0,
      shoulders: 0,
      arms: 0,
      core: 0,
      legs: 0,
    };

    const startDate = duration === "all" 
        ? new Date(0) // beginning of time
        : startOfDay(subDays(new Date(), parseInt(duration)));

    Object.entries(workoutLog).forEach(([dateStr, workoutExercises]) => {
      const date = parseISO(dateStr);
      if (!isValid(date)) return;

      if (duration === "all" || isAfter(date, startDate) || date.getTime() === startDate.getTime()) {
        workoutExercises.forEach(workoutEx => {
          const exerciseDetails = exercises.find(ex => ex.id === workoutEx.exerciseId);
          if (!exerciseDetails) return;

          // Normalize body parts
          let bp = exerciseDetails.bodyPart.toLowerCase();
          if (['upper arms', 'lower arms'].includes(bp)) bp = 'arms';
          if (['upper legs', 'lower legs'].includes(bp)) bp = 'legs';
          if (['waist'].includes(bp)) bp = 'core';
          if (['chest', 'back', 'shoulders', 'arms', 'core', 'legs'].includes(bp)) {
            const exerciseVolume = workoutEx.sets.reduce((total, set) => total + (set.reps * set.weight), 0);
            volumes[bp] += exerciseVolume;
          }
        });
      }
    });

    return volumes;
  }, [workoutLog, exercises, duration]);

  // Determine intensity colors (Red = High fatigue/usage, Orange = Medium, Green = Low, Gray = None)
  const maxVolume = Math.max(...Object.values(bodyPartVolumes), 1);
  
  const getColor = (volume: number) => {
    if (volume === 0) return "#333535"; // surface-variant
    const ratio = volume / maxVolume;
    if (ratio > 0.7) return "#ef4444"; // Red
    if (ratio > 0.3) return "#f97316"; // Orange
    return "#22c55e"; // Green
  };

  const renderTooltip = (part: string, volume: number, children: React.ReactNode) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-help outline-none">
            {children}
          </g>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-semibold capitalize text-center mb-1">{t(part)}</p>
          <p className="text-xs text-muted-foreground">{t('volumeDetails')} {volume.toLocaleString()} kg</p>
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
            {t('muscleFatigue')}
          </CardTitle>
          <Select value={duration} onValueChange={(val) => setDuration(val as DurationType)}>
            <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
              <SelectValue placeholder={t('timeRange')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('last7Days')}</SelectItem>
              <SelectItem value="30">{t('last30Days')}</SelectItem>
              <SelectItem value="all">{t('allTime')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">{t('heatmapExplanation')}</p>
      </CardHeader>
      <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
        
        {/* SVG Silhouette */}
        <div className="relative w-48 h-64 mx-auto flex-shrink-0">
          <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-md">
            
            {/* Back (Lats behind chest) */}
            {renderTooltip('back', bodyPartVolumes.back, (
              <>
                <path d="M35 45 Q25 60 38 70 Z" fill={getColor(bodyPartVolumes.back)} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                <path d="M65 45 Q75 60 62 70 Z" fill={getColor(bodyPartVolumes.back)} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
              </>
            ))}

            {renderTooltip('shoulders', bodyPartVolumes.shoulders, (
              <path d="M30 40 Q50 30 70 40 L85 55 L78 65 Q70 50 65 45 Q50 50 35 45 Q30 50 22 65 L15 55 Z" fill={getColor(bodyPartVolumes.shoulders)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            ))}
            
            {renderTooltip('chest', bodyPartVolumes.chest, (
              <path d="M35 45 Q50 50 65 45 L62 70 Q50 75 38 70 Z" fill={getColor(bodyPartVolumes.chest)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            ))}

            {renderTooltip('core', bodyPartVolumes.core, (
              <path d="M38 70 Q50 75 62 70 L58 100 Q50 105 42 100 Z" fill={getColor(bodyPartVolumes.core)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            ))}

            {renderTooltip('arms', bodyPartVolumes.arms, (
              <>
                <path d="M15 55 L22 65 L18 110 L10 105 Z" fill={getColor(bodyPartVolumes.arms)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <path d="M85 55 L78 65 L82 110 L90 105 Z" fill={getColor(bodyPartVolumes.arms)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </>
            ))}

            {renderTooltip('legs', bodyPartVolumes.legs, (
              <>
                <path d="M42 100 Q45 103 50 105 L48 180 L35 180 L38 100 Z" fill={getColor(bodyPartVolumes.legs)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                <path d="M58 100 Q55 103 50 105 L52 180 L65 180 L62 100 Z" fill={getColor(bodyPartVolumes.legs)} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              </>
            ))}

            {/* Head (Neutral) */}
            <circle cx="50" cy="20" r="12" fill="#333535" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
          </svg>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-3 w-full">
          {Object.entries(bodyPartVolumes).map(([part, volume]) => (
            <TooltipProvider key={part}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-between cursor-help p-1 rounded-md hover:bg-surface-variant/30 transition-colors">
                    <span className="capitalize text-sm font-medium">{t(part)}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 rounded-full bg-surface-variant overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500" 
                          style={{ 
                            width: `${maxVolume > 0 ? (volume / maxVolume) * 100 : 0}%`,
                            backgroundColor: getColor(volume)
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground w-12 text-right">
                        {volume > 0 ? `${(volume/1000).toFixed(1)}k` : '0'}
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                   <p className="text-xs">{volume.toLocaleString()} kg {t('totalVolume').toLowerCase()}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>

      </CardContent>
    </Card>
  );
}
