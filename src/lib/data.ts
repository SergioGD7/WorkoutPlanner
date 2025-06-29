import type { Exercise } from './types';

export const bodyParts = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;

export const initialExercises: Exercise[] = [
  // Chest
  { id: 'ex1', name: 'benchPress', bodyPart: 'Chest', description: 'benchPressDescription' },
  { id: 'ex2', name: 'dumbbellFlyes', bodyPart: 'Chest', description: 'dumbbellFlyesDescription' },
  { id: 'ex3', name: 'pushups', bodyPart: 'Chest', description: 'pushupsDescription' },

  // Back
  { id: 'ex4', name: 'pullups', bodyPart: 'Back', description: 'pullupsDescription' },
  { id: 'ex5', name: 'bentoverRows', bodyPart: 'Back', description: 'bentoverRowsDescription' },
  { id: 'ex6', name: 'deadlifts', bodyPart: 'Back', description: 'deadliftsDescription' },
  
  // Legs
  { id: 'ex7', name: 'squats', bodyPart: 'Legs', description: 'squatsDescription' },
  { id: 'ex8', name: 'legPress', bodyPart: 'Legs', description: 'legPressDescription' },
  { id: 'ex9', name: 'lunges', bodyPart: 'Legs', description: 'lungesDescription' },

  // Shoulders
  { id: 'ex10', name: 'overheadPress', bodyPart: 'Shoulders', description: 'overheadPressDescription' },
  { id: 'ex11', name: 'lateralRaises', bodyPart: 'Shoulders', description: 'lateralRaisesDescription' },

  // Arms
  { id: 'ex12', name: 'bicepCurls', bodyPart: 'Arms', description: 'bicepCurlsDescription' },
  { id: 'ex13', name: 'tricepDips', bodyPart: 'Arms', description: 'tricepDipsDescription' },

  // Core
  { id: 'ex14', name: 'plank', bodyPart: 'Core', description: 'plankDescription' },
  { id: 'ex15', name: 'crunches', bodyPart: 'Core', description: 'crunchesDescription' },
];
