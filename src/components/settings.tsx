"use client";

import { useState, useEffect } from 'react';
import { useLanguage } from '@/context/language-context';
import ChangePasswordForm from './change-password-form';
import ImportDataForm from './import-data-form';
import { useAuth } from '@/context/auth-context';
import { useExercises } from '@/context/exercise-context';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Settings as SettingsIcon, Trophy, Target, TrendingUp, Edit2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { doc, onSnapshot, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { WorkoutLog } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { enUS } from 'date-fns/locale/en-US';

export default function Settings() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  
  const { exercises } = useExercises();
  
  const [workoutLog, setWorkoutLog] = useState<WorkoutLog>({});
  const [isEditingWeight, setIsEditingWeight] = useState(false);
  const [isEditingFat, setIsEditingFat] = useState(false);
  
  const [weightInput, setWeightInput] = useState("67.5");
  const [fatInput, setFatInput] = useState("");
  
  const [profileStats, setProfileStats] = useState<{ weight: number, fat: number | null }>({
     weight: 67.5,
     fat: null
  });

  const getLocale = () => language === 'es' ? es : enUS;

  useEffect(() => {
    if (user) {
        // Load workout logs for PRs
        const logRef = doc(db, `users/${user.uid}/workout_logs/all`);
        const unsubscribeLogs = onSnapshot(logRef, (docSnap) => {
            if (docSnap.exists()) {
                setWorkoutLog(docSnap.data() as WorkoutLog);
            } else {
                setWorkoutLog({});
            }
        });

        // Load profile stats
        const statsRef = doc(db, `users/${user.uid}/profile/stats`);
        const loadStats = async () => {
           const snap = await getDoc(statsRef);
           if (snap.exists()) {
              const data = snap.data();
              setProfileStats({ weight: data.weight || 67.5, fat: data.fat || null });
              setWeightInput(data.weight?.toString() || "67.5");
              setFatInput(data.fat?.toString() || "");
           }
        };
        loadStats();

        return () => unsubscribeLogs();
    }
  }, [user]);

  const saveStats = async (field: 'weight' | 'fat', value: number) => {
     if (!user) return;
     const newStats = { ...profileStats, [field]: value };
     setProfileStats(newStats);
     const statsRef = doc(db, `users/${user.uid}/profile/stats`);
     await setDoc(statsRef, newStats, { merge: true });
  };

  const handleSaveWeight = () => {
     const val = parseFloat(weightInput);
     if (!isNaN(val)) saveStats('weight', val);
     setIsEditingWeight(false);
  };

  const handleSaveFat = () => {
     const val = parseFloat(fatInput);
     if (!isNaN(val)) saveStats('fat', val);
     setIsEditingFat(false);
  };

  const getPR = (exerciseId: string) => {
     let maxWeight = 0;
     let prDateStr = "";

     Object.entries(workoutLog).forEach(([dateStr, exercises]) => {
        const exLogs = exercises.filter(e => e.exerciseId === exerciseId);
        exLogs.forEach(log => {
           log.sets.forEach(set => {
              if (set.weight > maxWeight) {
                 maxWeight = set.weight;
                 prDateStr = dateStr;
              }
           });
        });
     });

     return {
        weight: maxWeight,
        date: prDateStr ? format(parseISO(prDateStr), 'MMM d, yyyy', { locale: getLocale() }) : null
     };
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight font-headline">{t('profile') || 'Profile'}</h2>
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon" className="rounded-full">
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>{t('settings')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 pt-4">
              <section>
                  <h3 className="text-lg font-semibold mb-3 font-headline">{t('security')}</h3>
                  <ChangePasswordForm />
              </section>
              {user?.email === 'sergio.g.d7@gmail.com' && (
                <section>
                    <h3 className="text-lg font-semibold mb-3 font-headline">{t('dataManagement')}</h3>
                    <ImportDataForm />
                </section>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-effect border-primary/20 text-center py-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
            <div className="mx-auto w-24 h-24 rounded-full bg-background flex items-center justify-center border-2 border-primary mb-4 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <User className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="font-headline text-2xl uppercase tracking-wider">{user?.email?.split('@')[0] || 'Athlete'}</CardTitle>
            <p className="text-primary font-medium mt-1">{t('level12Lifter') || 'Level 12 Lifter'}</p>
            <div className="w-64 h-2 bg-muted rounded-full mx-auto mt-3 overflow-hidden">
            <div className="h-full bg-primary w-[70%]" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">XP: 45,670 / 50,000</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         <Card className="glass-effect">
            <CardHeader className="pb-2 flex flex-row justify-between items-center">
               <CardTitle className="font-headline text-lg">{t('bodyWeight') || 'Body Weight'}</CardTitle>
               <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2">
                  {isEditingWeight ? (
                     <>
                        <Input 
                           type="number" 
                           value={weightInput} 
                           onChange={(e) => setWeightInput(e.target.value)} 
                           className="w-24 text-xl font-bold h-10" 
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveWeight}><Check className="h-4 w-4 text-green-500"/></Button>
                     </>
                  ) : (
                     <>
                        <div className="text-3xl font-bold">{profileStats.weight} <span className="text-sm font-normal text-muted-foreground">kg</span></div>
                        <Button size="icon" variant="ghost" onClick={() => setIsEditingWeight(true)} className="h-8 w-8 ml-2 opacity-50 hover:opacity-100"><Edit2 className="h-4 w-4"/></Button>
                     </>
                  )}
               </div>
               <div className="h-16 w-full mt-4 flex items-end opacity-50">
                  <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                     <path d="M0 25 L20 20 L40 22 L60 15 L80 18 L100 10" fill="none" stroke="#f97316" strokeWidth="2" />
                  </svg>
               </div>
            </CardContent>
         </Card>
         <Card className="glass-effect">
            <CardHeader className="pb-2 flex flex-row justify-between items-center">
               <CardTitle className="font-headline text-lg">{t('bodyFat') || 'Body Fat'}</CardTitle>
               <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
               <div className="flex items-center gap-2">
                  {isEditingFat ? (
                     <>
                        <Input 
                           type="number" 
                           value={fatInput} 
                           onChange={(e) => setFatInput(e.target.value)} 
                           className="w-24 text-xl font-bold h-10" 
                        />
                        <Button size="icon" variant="ghost" onClick={handleSaveFat}><Check className="h-4 w-4 text-green-500"/></Button>
                     </>
                  ) : (
                     <>
                        <div className="text-3xl font-bold">{profileStats.fat ?? '--'} <span className="text-sm font-normal text-muted-foreground">%</span></div>
                        <Button size="icon" variant="ghost" onClick={() => setIsEditingFat(true)} className="h-8 w-8 ml-2 opacity-50 hover:opacity-100"><Edit2 className="h-4 w-4"/></Button>
                     </>
                  )}
               </div>
               <div className="h-16 w-full mt-4 flex items-end opacity-50">
                  <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
                     <path d="M0 20 L20 18 L40 19 L60 15 L80 12 L100 10" fill="none" stroke="#f97316" strokeWidth="2" />
                  </svg>
               </div>
            </CardContent>
         </Card>
      </div>

      <div>
        <h3 className="text-xl font-bold font-headline mb-4 flex items-center gap-2"><Trophy className="h-5 w-5 text-primary" /> {t('personalRecords') || 'Personal Records'}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {exercises.map(ex => {
              const pr = getPR(ex.id);
              return (
                 <Card key={ex.id} className="glass-effect hover:border-primary/50 transition-colors">
                    <CardContent className="p-4">
                       <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold truncate" title={t(ex.name)}>{t(ex.name)}</p>
                       <p className="text-2xl font-bold mt-1">{pr.weight > 0 ? pr.weight : '--'} <span className="text-sm font-normal">kg</span></p>
                       <p className="text-xs text-muted-foreground mt-2">{pr.date || '--'}</p>
                    </CardContent>
                 </Card>
              );
           })}
        </div>
      </div>
    </div>
  );
}
