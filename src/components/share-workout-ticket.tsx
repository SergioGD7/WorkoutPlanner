import React, { forwardRef } from 'react';
import type { WorkoutExercise, Exercise } from "@/lib/types";
import { Dumbbell, Flame, Trophy } from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface ShareWorkoutTicketProps {
  dateStr: string;
  userName: string;
  dailyExercises: WorkoutExercise[];
  getExerciseDetails: (id: string) => Exercise | undefined;
}

const ShareWorkoutTicket = forwardRef<HTMLDivElement, ShareWorkoutTicketProps>(
  ({ dateStr, userName, dailyExercises, getExerciseDetails }, ref) => {
    const { t, language } = useLanguage();
    
    // Calculate stats
    const totalSets = dailyExercises.reduce((acc, curr) => acc + curr.sets.filter(s => s.completed).length, 0);
    const totalVolume = dailyExercises.reduce((acc, curr) => {
      return acc + curr.sets.filter(s => s.completed).reduce((setAcc, set) => setAcc + (set.weight * set.reps), 0);
    }, 0);
    
    // Find max weight for each exercise
    const getExerciseMaxWeight = (ex: WorkoutExercise) => {
      const completedSets = ex.sets.filter(s => s.completed);
      if (completedSets.length === 0) return 0;
      return Math.max(...completedSets.map(s => s.weight || 0));
    };

    // Calculate muscles worked today for heatmap
    const musclesWorked = new Set<string>();
    dailyExercises.forEach(ex => {
      const details = getExerciseDetails(ex.exerciseId);
      if (details && ex.sets.some(s => s.completed)) {
        musclesWorked.add(details.bodyPart.toLowerCase());
      }
    });

    const getMuscleColor = (muscle: string) => musclesWorked.has(muscle) ? '#f97316' : '#333535';

    return (
      <div 
        className="fixed top-[200vh] left-0 pointer-events-none" // Hide off-screen
        aria-hidden="true"
      >
        <div 
          ref={ref}
          id="share-workout-ticket"
          className="w-[1080px] min-h-[1920px] h-fit bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white p-20 pb-24 flex flex-col items-center justify-between font-sans relative overflow-hidden"
          style={{ 
            fontFamily: "'Inter', 'PT Sans', sans-serif"
          }}
        >
          {/* Decorative background elements */}
          <div className="absolute top-[-10%] left-[-20%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[150px] mix-blend-screen"></div>
          <div className="absolute bottom-[-10%] right-[-20%] w-[1000px] h-[1000px] bg-orange-600/20 rounded-full blur-[150px] mix-blend-screen"></div>
          
          <div className="relative z-10 w-full flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-24 w-full">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center rotate-3 shadow-lg shadow-primary/30">
                  <Dumbbell className="w-10 h-10 text-primary-foreground" />
                </div>
                <h1 className="text-4xl font-bold tracking-tight whitespace-nowrap">{'Workout\u00A0Planner'}</h1>
              </div>
              <div className="bg-white/10 backdrop-blur-md px-8 py-4 rounded-full border border-white/10 shrink-0">
                <p className="text-3xl font-medium tracking-wide text-primary-foreground/90 whitespace-nowrap">{dateStr.replace(/ /g, '\u00A0')}</p>
              </div>
            </div>

            {/* Main Title */}
            <div className="text-center mt-12 mb-32">
              <h2 className="text-8xl font-black tracking-tighter mb-6 bg-gradient-to-r from-primary to-orange-300 bg-clip-text text-transparent">
                {userName 
                  ? (language === 'es' ? `Entrenamiento de ${userName.split(' ')[0]}` : `${userName.split(' ')[0]}'s Workout`) 
                  : (t('myWorkout') || 'My Workout')}
              </h2>
              <p className="text-4xl text-neutral-400 font-medium tracking-wide">
                {language === 'es' ? '¡Entrenamiento superado! 🔥' : 'Crushed it today! 🔥'}
              </p>
            </div>

            {/* Stats row */}
            <div className="flex justify-center gap-12 w-full mb-32">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[3rem] p-12 w-[400px] flex flex-col items-center justify-center relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-50"></div>
                <Flame className="w-20 h-20 text-primary mb-6 relative z-10" />
                <p className="text-7xl font-bold text-white relative z-10">{totalSets}</p>
                <p className="text-2xl text-neutral-400 uppercase tracking-widest mt-4 font-semibold relative z-10">
                  {language === 'es' ? 'Series' : 'Sets'}
                </p>
              </div>
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-[3rem] p-12 w-[400px] flex flex-col items-center justify-center relative overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 to-transparent opacity-50"></div>
                <Trophy className="w-20 h-20 text-orange-400 mb-6 relative z-10" />
                <p className="text-7xl font-bold text-white relative z-10">{totalVolume}<span className="text-4xl text-neutral-500 ml-2">kg</span></p>
                <p className="text-2xl text-neutral-400 uppercase tracking-widest mt-4 font-semibold relative z-10">
                  {t('volume') || 'Volume'}
                </p>
              </div>
            </div>

            {/* Exercises List */}
            <div className="w-full flex-1 flex flex-col justify-center">
              <div className="bg-white/5 backdrop-blur-md rounded-[4rem] border border-white/10 p-16 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                <h3 className="text-4xl font-bold text-white mb-12 flex items-center gap-4">
                  💪 {language === 'es' ? 'Ejercicios Realizados' : 'Exercises Performed'}
                </h3>
                
                <div className="space-y-8">
                  {dailyExercises.map((ex) => {
                    const details = getExerciseDetails(ex.exerciseId);
                    if (!details) return null;
                    const completedSets = ex.sets.filter(s => s.completed);
                    const setsDone = completedSets.length;
                    const maxWeight = getExerciseMaxWeight(ex);
                    
                    return (
                      <div key={ex.id} className="flex items-center justify-between border-b border-white/10 pb-8 last:border-0 last:pb-0">
                        <div className="flex items-center gap-6">
                          <span className="text-6xl bg-white/10 p-4 rounded-2xl shrink-0">{details.emoji}</span>
                          <div className="flex flex-col gap-2">
                            <p className="text-4xl font-bold text-white leading-[1.2]">{t(details.name)}</p>
                            <p className="text-2xl text-neutral-400 uppercase tracking-wider">{t(details.bodyPart.toLowerCase())}</p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="flex items-baseline justify-end gap-2 mb-2">
                            <span className="text-5xl font-black text-primary">{setsDone}</span>
                            <span className="text-2xl text-neutral-400">{t('set').toLowerCase()}s</span>
                          </div>
                          {maxWeight > 0 && (
                            <p className="text-2xl text-orange-400 font-bold uppercase tracking-wider">
                              Max: {maxWeight} kg
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  

                </div>
              </div>
            </div>

            {/* Muscle Heatmap */}
            <div className="w-full flex-1 flex flex-col justify-center items-center mt-16 mb-8">
              <h3 className="text-3xl font-bold text-neutral-300 mb-8 uppercase tracking-widest">
                {language === 'es' ? 'Músculos Trabajados' : 'Muscles Worked'}
              </h3>
              <div className="relative w-[400px] h-[400px]">
                <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                  {/* Torso */}
                  <path d="M30 40 L70 40 L75 100 L25 100 Z" fill="#222323" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                  
                  {/* Back (Simplified as lats) */}
                  <path d="M25 60 Q20 80 25 100 L35 100 Q30 80 35 60 Z" fill={getMuscleColor('back')} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
                  <path d="M75 60 Q80 80 75 100 L65 100 Q70 80 65 60 Z" fill={getMuscleColor('back')} stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

                  {/* Shoulders */}
                  <path d="M30 40 Q50 30 70 40 L85 55 L78 65 Q70 50 65 45 Q50 50 35 45 Q30 50 22 65 L15 55 Z" fill={getMuscleColor('shoulders')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  
                  {/* Chest */}
                  <path d="M35 45 Q50 50 65 45 L62 70 Q50 75 38 70 Z" fill={getMuscleColor('chest')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {/* Core */}
                  <path d="M38 70 Q50 75 62 70 L58 100 Q50 105 42 100 Z" fill={getMuscleColor('core')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {/* Arms */}
                  <path d="M15 55 L22 65 L18 110 L10 105 Z" fill={getMuscleColor('arms')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M85 55 L78 65 L82 110 L90 105 Z" fill={getMuscleColor('arms')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {/* Legs */}
                  <path d="M42 100 Q45 103 50 105 L48 180 L35 180 L38 100 Z" fill={getMuscleColor('legs')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                  <path d="M58 100 Q55 103 50 105 L52 180 L65 180 L62 100 Z" fill={getMuscleColor('legs')} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

                  {/* Head (Neutral) */}
                  <circle cx="50" cy="20" r="12" fill="#333535" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
                </svg>
              </div>
            </div>

            {/* Footer */}
            <div className="w-full flex justify-center items-center mt-20 pt-12 border-t border-white/10">
              <p className="text-3xl text-neutral-500 font-medium tracking-widest uppercase">
                #WorkoutPlannerApp
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

ShareWorkoutTicket.displayName = 'ShareWorkoutTicket';

export default ShareWorkoutTicket;
