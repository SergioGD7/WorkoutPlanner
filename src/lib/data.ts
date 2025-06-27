import type { Exercise } from './types';

export const bodyParts: Exercise['bodyPart'][] = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'];

export const initialExercises: Exercise[] = [
  // Chest
  { id: 'ex1', name: 'benchPress', bodyPart: 'Chest', description: 'benchPressDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'bench press' },
  { id: 'ex2', name: 'dumbbellFlyes', bodyPart: 'Chest', description: 'dumbbellFlyesDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'dumbbell flyes' },
  { id: 'ex3', name: 'pushups', bodyPart: 'Chest', description: 'pushupsDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'person pushup' },

  // Back
  { id: 'ex4', name: 'pullups', bodyPart: 'Back', description: 'pullupsDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'man pullup' },
  { id: 'ex5', name: 'bentoverRows', bodyPart: 'Back', description: 'bentoverRowsDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'barbell row' },
  { id: 'ex6', name: 'deadlifts', bodyPart: 'Back', description: 'deadliftsDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'gym deadlift' },
  
  // Legs
  { id: 'ex7', name: 'squats', bodyPart: 'Legs', description: 'squatsDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'woman squat' },
  { id: 'ex8', name: 'legPress', bodyPart: 'Legs', description: 'legPressDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'leg press' },
  { id: 'ex9', name: 'lunges', bodyPart: 'Legs', description: 'lungesDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'woman lunge' },

  // Shoulders
  { id: 'ex10', name: 'overheadPress', bodyPart: 'Shoulders', description: 'overheadPressDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'shoulder press' },
  { id: 'ex11', name: 'lateralRaises', bodyPart: 'Shoulders', description: 'lateralRaisesDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'lateral raise' },

  // Arms
  { id: 'ex12', name: 'bicepCurls', bodyPart: 'Arms', description: 'bicepCurlsDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'bicep curl' },
  { id: 'ex13', name: 'tricepDips', bodyPart: 'Arms', description: 'tricepDipsDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'tricep dip' },

  // Core
  { id: 'ex14', name: 'plank', bodyPart: 'Core', description: 'plankDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'woman plank' },
  { id: 'ex15', name: 'crunches', bodyPart: 'Core', description: 'crunchesDescription', image: 'https://placehold.co/600x400.png', 'data-ai-hint': 'woman crunch' },
];
