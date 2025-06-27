import type { Exercise, WorkoutLog } from './types';
import { format, subDays } from 'date-fns';

export const bodyParts: Exercise['bodyPart'][] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];


export const initialExercises: Exercise[] = [
  // Chest
  { id: 'ex1', name: 'benchPress', bodyPart: 'Chest', description: 'benchPressDescription', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'bench press' },
  { id: 'ex2', name: 'dumbbellFlyes', bodyPart: 'Chest', description: 'dumbbellFlyesDescription', image: 'https://images.unsplash.com/photo-1589484193003-7f21a86a342a?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'dumbbell flyes' },
  { id: 'ex3', name: 'pushups', bodyPart: 'Chest', description: 'pushupsDescription', image: 'https://images.unsplash.com/photo-1574680122402-2a69b251a7b8?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'person pushup' },

  // Back
  { id: 'ex4', name: 'pullups', bodyPart: 'Back', description: 'pullupsDescription', image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'man pullup' },
  { id: 'ex5', name: 'bentoverRows', bodyPart: 'Back', description: 'bentoverRowsDescription', image: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'barbell row' },
  { id: 'ex6', name: 'deadlifts', bodyPart: 'Back', description: 'deadliftsDescription', image: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'gym deadlift' },
  
  // Legs
  { id: 'ex7', name: 'squats', bodyPart: 'Legs', description: 'squatsDescription', image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'woman squat' },
  { id: 'ex8', name: 'legPress', bodyPart: 'Legs', description: 'legPressDescription', image: 'https://images.unsplash.com/photo-1534368959876-26bf04f25743?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'leg press' },
  { id: 'ex9', name: 'lunges', bodyPart: 'Legs', description: 'lungesDescription', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'woman lunge' },

  // Shoulders
  { id: 'ex10', name: 'overheadPress', bodyPart: 'Shoulders', description: 'overheadPressDescription', image: 'https://images.unsplash.com/photo-1532029887424-755b6d7a58e2?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'shoulder press' },
  { id: 'ex11', name: 'lateralRaises', bodyPart: 'Shoulders', description: 'lateralRaisesDescription', image: 'https://images.unsplash.com/photo-1620556393598-1a056a299596?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'lateral raise' },

  // Arms
  { id: 'ex12', name: 'bicepCurls', bodyPart: 'Arms', description: 'bicepCurlsDescription', image: 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'bicep curl' },
  { id: 'ex13', name: 'tricepDips', bodyPart: 'Arms', description: 'tricepDipsDescription', image: 'https://images.unsplash.com/photo-1594737695394-3a7a4a242a54?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'tricep dip' },

  // Core
  { id: 'ex14', name: 'plank', bodyPart: 'Core', description: 'plankDescription', image: 'https://images.unsplash.com/photo-1598971434932-5c4250210e34?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'woman plank' },
  { id: 'ex15', name: 'crunches', bodyPart: 'Core', description: 'crunchesDescription', image: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&h=400&fit=crop', 'data-ai-hint': 'woman crunch' },
];

const today = new Date();
const yesterday = subDays(today, 1);
const twoDaysAgo = subDays(today, 2);
const fourDaysAgo = subDays(today, 4);
const fiveDaysAgo = subDays(today, 5);


export const initialWorkoutLog: WorkoutLog = {
  [format(fiveDaysAgo, 'yyyy-MM-dd')]: [
    { id: 'we1a', exerciseId: 'ex1', sets: [{ reps: 8, weight: 55, completed: true }, { reps: 8, weight: 55, completed: true }, { reps: 6, weight: 55, completed: true }] },
    { id: 'we2a', exerciseId: 'ex2', sets: [{ reps: 10, weight: 12, completed: true }, { reps: 10, weight: 12, completed: true }, { reps: 9, weight: 12, completed: true }] },
  ],
  [format(fourDaysAgo, 'yyyy-MM-dd')]: [
    { id: 'we3a', exerciseId: 'ex7', sets: [{ reps: 10, weight: 75, completed: true }, { reps: 10, weight: 75, completed: true }, { reps: 8, weight: 75, completed: true }] },
    { id: 'we4a', exerciseId: 'ex8', sets: [{ reps: 12, weight: 110, completed: true }, { reps: 12, weight: 110, completed: true }, { reps: 10, weight: 110, completed: false }] },
  ],
  [format(twoDaysAgo, 'yyyy-MM-dd')]: [
    { id: 'we1', exerciseId: 'ex1', sets: [{ reps: 8, weight: 60, completed: true }, { reps: 8, weight: 60, completed: true }, { reps: 6, weight: 60, completed: false }] },
    { id: 'we2', exerciseId: 'ex2', sets: [{ reps: 10, weight: 15, completed: true }, { reps: 10, weight: 15, completed: true }, { reps: 9, weight: 15, completed: false }] },
  ],
  [format(yesterday, 'yyyy-MM-dd')]: [
    { id: 'we3', exerciseId: 'ex7', sets: [{ reps: 10, weight: 80, completed: true }, { reps: 10, weight: 80, completed: true }, { reps: 8, weight: 80, completed: true }] },
    { id: 'we4', exerciseId: 'ex8', sets: [{ reps: 12, weight: 120, completed: true }, { reps: 12, weight: 120, completed: true }, { reps: 10, weight: 120, completed: false }] },
  ],
  [format(today, 'yyyy-MM-dd')]: [
    { id: 'we5', exerciseId: 'ex4', sets: [{ reps: 5, weight: 0, completed: true }, { reps: 5, weight: 0, completed: true }, { reps: 5, weight: 0, completed: false }] },
    { id: 'we6', exerciseId: 'ex5', sets: [{ reps: 8, weight: 40, completed: true }, { reps: 8, weight: 40, completed: true }, { reps: 8, weight: 40, completed: false }] },
    { id: 'we7', exerciseId: 'ex12', sets: [{ reps: 12, weight: 12, completed: true }, { reps: 12, weight: 12, completed: false }] },
  ],
};
