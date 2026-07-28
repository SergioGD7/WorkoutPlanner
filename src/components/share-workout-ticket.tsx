import React, { forwardRef } from 'react';
import { Dumbbell, Flame, Trophy } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import type { Exercise, WeightUnit, WorkoutExercise } from '@/lib/types';
import { fromKg, isCountedSet, resolveExerciseName, trimZeros } from '@/lib/workout-utils';

interface ShareWorkoutTicketProps {
  dateStr: string;
  userName: string;
  dailyExercises: WorkoutExercise[];
  exercises: Exercise[];
  unit: WeightUnit;
}

/**
 * Rendered off-screen at a fixed 1080 px width and rasterised by html-to-image
 * for the native share sheet, so every size here is absolute rather than fluid.
 */
const ShareWorkoutTicket = forwardRef<HTMLDivElement, ShareWorkoutTicketProps>(
  ({ dateStr, userName, dailyExercises, exercises, unit }, ref) => {
    const { t } = useLanguage();

    const completedSets = dailyExercises.reduce(
      (total, exercise) => total + exercise.sets.filter((set) => set.completed && isCountedSet(set)).length,
      0,
    );

    const totalVolume = dailyExercises.reduce(
      (total, exercise) =>
        total +
        exercise.sets
          .filter((set) => set.completed && isCountedSet(set))
          .reduce((sum, set) => sum + set.weight * set.reps, 0),
      0,
    );

    const musclesWorked = new Set<string>();
    dailyExercises.forEach((workoutExercise) => {
      const definition = exercises.find((exercise) => exercise.id === workoutExercise.exerciseId);
      const bodyPart = definition?.bodyPart ?? workoutExercise.bodyPart;
      if (bodyPart && workoutExercise.sets.some((set) => set.completed)) {
        musclesWorked.add(bodyPart.toLowerCase());
      }
    });

    const getMuscleColor = (muscle: string) => (musclesWorked.has(muscle) ? '#f97316' : '#333535');

    return (
      <div className="pointer-events-none fixed left-0 top-[200vh]" aria-hidden="true">
        <div
          ref={ref}
          id="share-workout-ticket"
          className="relative flex h-fit min-h-[1920px] w-[1080px] flex-col items-center justify-between overflow-hidden bg-gradient-to-br from-neutral-900 via-neutral-950 to-black p-20 pb-24 font-sans text-white"
          style={{ fontFamily: "'Inter', 'PT Sans', sans-serif" }}
        >
          <div className="absolute left-[-20%] top-[-10%] h-[800px] w-[800px] rounded-full bg-primary/20 mix-blend-screen blur-[150px]" />
          <div className="absolute bottom-[-10%] right-[-20%] h-[1000px] w-[1000px] rounded-full bg-orange-600/20 mix-blend-screen blur-[150px]" />

          <div className="relative z-10 flex w-full flex-1 flex-col">
            <div className="mb-24 flex w-full items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 rotate-3 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/30">
                  <Dumbbell className="h-10 w-10 text-primary-foreground" />
                </div>
                <h1 className="whitespace-nowrap text-4xl font-bold tracking-tight">
                  {'Workout Planner'}
                </h1>
              </div>
              <div className="shrink-0 rounded-full border border-white/10 bg-white/10 px-8 py-4 backdrop-blur-md">
                <p className="whitespace-nowrap text-3xl font-medium tracking-wide text-primary-foreground/90">
                  {dateStr.replace(/ /g, ' ')}
                </p>
              </div>
            </div>

            <div className="mb-32 mt-12 text-center">
              <h2 className="mb-6 bg-gradient-to-r from-primary to-orange-300 bg-clip-text text-8xl font-black tracking-tighter text-transparent">
                {userName ? t('workoutOf', { name: userName.split(' ')[0] }) : t('myWorkout')}
              </h2>
              <p className="text-4xl font-medium tracking-wide text-neutral-400">{t('crushedIt')}</p>
            </div>

            <div className="mb-32 flex w-full justify-center gap-12">
              <div className="relative flex w-[400px] flex-col items-center justify-center overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-12 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50" />
                <Flame className="relative z-10 mb-6 h-20 w-20 text-primary" />
                <p className="relative z-10 text-7xl font-bold text-white">{completedSets}</p>
                <p className="relative z-10 mt-4 text-2xl font-semibold uppercase tracking-widest text-neutral-400">
                  {t('sets')}
                </p>
              </div>
              <div className="relative flex w-[400px] flex-col items-center justify-center overflow-hidden rounded-[3rem] border border-white/10 bg-white/5 p-12 backdrop-blur-sm">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-transparent opacity-50" />
                <Trophy className="relative z-10 mb-6 h-20 w-20 text-orange-400" />
                <p className="relative z-10 text-7xl font-bold text-white">
                  {Math.round(fromKg(totalVolume, unit))}
                  <span className="ml-2 text-4xl text-neutral-500">{unit}</span>
                </p>
                <p className="relative z-10 mt-4 text-2xl font-semibold uppercase tracking-widest text-neutral-400">
                  {t('volume')}
                </p>
              </div>
            </div>

            <div className="flex w-full flex-1 flex-col justify-center">
              <div className="relative overflow-hidden rounded-[4rem] border border-white/10 bg-white/5 p-16 backdrop-blur-md">
                <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                <h3 className="mb-12 flex items-center gap-4 text-4xl font-bold text-white">
                  💪 {t('exercisesPerformed')}
                </h3>

                <div className="space-y-8">
                  {dailyExercises.map((workoutExercise) => {
                    const done = workoutExercise.sets.filter((set) => set.completed && isCountedSet(set));
                    const maxWeight = done.reduce((max, set) => Math.max(max, set.weight || 0), 0);

                    return (
                      <div
                        key={workoutExercise.id}
                        className="flex items-center justify-between border-b border-white/10 pb-8 last:border-0 last:pb-0"
                      >
                        <div className="flex items-center">
                          <p className="text-4xl font-bold leading-[1.2] text-white">
                            {resolveExerciseName(workoutExercise, exercises, t)}
                          </p>
                        </div>
                        <div className="ml-4 shrink-0 text-right">
                          <div className="mb-2 flex items-baseline justify-end gap-2">
                            <span className="text-5xl font-black text-primary">{done.length}</span>
                            <span className="text-2xl text-neutral-400">{t('sets').toLowerCase()}</span>
                          </div>
                          {maxWeight > 0 && (
                            <p className="text-2xl font-bold uppercase tracking-wider text-orange-400">
                              Max: {trimZeros(fromKg(maxWeight, unit))} {unit}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mb-8 mt-16 flex w-full flex-1 flex-col items-center justify-center">
              <h3 className="mb-8 text-3xl font-bold uppercase tracking-widest text-neutral-300">
                {t('musclesWorked')}
              </h3>
              <div className="relative h-[400px] w-[400px]">
                <svg viewBox="0 0 100 200" className="h-full w-full drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                  <path d="M30 40 L70 40 L75 100 L25 100 Z" fill="#222323" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  <path d="M25 60 Q20 80 25 100 L35 100 Q30 80 35 60 Z" fill={getMuscleColor('back')} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <path d="M75 60 Q80 80 75 100 L65 100 Q70 80 65 60 Z" fill={getMuscleColor('back')} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <path d="M30 40 Q50 30 70 40 L85 55 L78 65 Q70 50 65 45 Q50 50 35 45 Q30 50 22 65 L15 55 Z" fill={getMuscleColor('shoulders')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M35 45 Q50 50 65 45 L62 70 Q50 75 38 70 Z" fill={getMuscleColor('chest')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M38 70 Q50 75 62 70 L58 100 Q50 105 42 100 Z" fill={getMuscleColor('core')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M15 55 L22 65 L18 110 L10 105 Z" fill={getMuscleColor('arms')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M85 55 L78 65 L82 110 L90 105 Z" fill={getMuscleColor('arms')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M42 100 Q45 103 50 105 L48 180 L35 180 L38 100 Z" fill={getMuscleColor('legs')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M58 100 Q55 103 50 105 L52 180 L65 180 L62 100 Z" fill={getMuscleColor('legs')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <circle cx="50" cy="20" r="12" fill="#333535" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                </svg>
              </div>
            </div>

            <div className="mt-20 flex w-full items-center justify-center border-t border-white/10 pt-12">
              <p className="text-3xl font-medium uppercase tracking-widest text-neutral-500">
                #WorkoutPlannerApp
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);

ShareWorkoutTicket.displayName = 'ShareWorkoutTicket';

export default ShareWorkoutTicket;
