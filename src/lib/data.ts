import type { Exercise, WorkoutLog } from './types';
import { format, subDays } from 'date-fns';

export const exercises: Exercise[] = [
  // Chest
  { id: 'ex1', name: 'Bench Press', bodyPart: 'Chest', description: 'Lay on a flat bench, lower a barbell to your chest, and press it back up.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'bench press' },
  { id: 'ex2', name: 'Dumbbell Flyes', bodyPart: 'Chest', description: 'Lay on a bench with dumbbells, open your arms wide, and bring them back together over your chest.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'dumbbell flyes' },
  { id: 'ex3', name: 'Push-ups', bodyPart: 'Chest', description: 'Start in a plank position, lower your body until your chest nearly touches the floor, and push back up.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'pushups fitness' },

  // Back
  { id: 'ex4', name: 'Pull-ups', bodyPart: 'Back', description: 'Hang from a bar with an overhand grip and pull your body up until your chin is over the bar.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'pullups fitness' },
  { id: 'ex5', name: 'Bent-over Rows', bodyPart: 'Back', description: 'Bend at your hips and knees, holding a barbell, and pull it towards your stomach.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'barbell row' },
  { id: 'ex6', name: 'Deadlifts', bodyPart: 'Back', description: 'Lift a loaded barbell off the floor to a standing position, then lower it back down.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'deadlift gym' },
  
  // Legs
  { id: 'ex7', name: 'Squats', bodyPart: 'Legs', description: 'Lower your hips from a standing position and then stand back up.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'squat fitness' },
  { id: 'ex8', name: 'Leg Press', bodyPart: 'Legs', description: 'Push a weight away from you using your legs on a leg press machine.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'leg press' },
  { id: 'ex9', name: 'Lunges', bodyPart: 'Legs', description: 'Step forward with one leg and lower your hips until both knees are bent at a 90-degree angle.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'lunge exercise' },

  // Shoulders
  { id: 'ex10', name: 'Overhead Press', bodyPart: 'Shoulders', description: 'Press a barbell or dumbbells from your shoulders up over your head.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'overhead press' },
  { id: 'ex11', name: 'Lateral Raises', bodyPart: 'Shoulders', description: 'Raise dumbbells out to your sides up to shoulder level.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'lateral raise' },

  // Arms
  { id: 'ex12', name: 'Bicep Curls', bodyPart: 'Arms', description: 'Curl dumbbells or a barbell up towards your shoulders, working your biceps.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'bicep curl' },
  { id: 'ex13', name: 'Tricep Dips', bodyPart: 'Arms', description: 'Using parallel bars or a bench, lower and push up your body with your triceps.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'tricep dips' },

  // Core
  { id: 'ex14', name: 'Plank', bodyPart: 'Core', description: 'Hold a push-up position, keeping your body in a straight line.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'plank exercise' },
  { id: 'ex15', name: 'Crunches', bodyPart: 'Core', description: 'Lie on your back and lift your upper body towards your knees.', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'crunches fitness' },
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
    { id: 'we5', exerciseId: 'ex4', sets: [{ reps: 5, weight: 0, completed: false }, { reps: 5, weight: 0, completed: false }, { reps: 5, weight: 0, completed: false }] },
    { id: 'we6', exerciseId: 'ex5', sets: [{ reps: 8, weight: 40, completed: false }, { reps: 8, weight: 40, completed: false }, { reps: 8, weight: 40, completed: false }] },
    { id: 'we7', exerciseId: 'ex12', sets: [{ reps: 12, weight: 12, completed: false }, { reps: 12, weight: 12, completed: false }] },
  ],
};
