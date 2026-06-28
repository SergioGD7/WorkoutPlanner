import type { Exercise } from './types';

export const bodyParts = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;

export const initialExercises: Exercise[] = [
  // Chest
  { id: 'ex1', name: 'benchPress', bodyPart: 'Chest', description: 'benchPressDescription', emoji: '🏋️' },
  { id: 'ex2', name: 'dumbbellFlyes', bodyPart: 'Chest', description: 'dumbbellFlyesDescription', emoji: '🏋️' },
  { id: 'ex3', name: 'pushups', bodyPart: 'Chest', description: 'pushupsDescription', emoji: '🏋️' },

  // Back
  { id: 'ex4', name: 'pullups', bodyPart: 'Back', description: 'pullupsDescription', emoji: '🧗' },
  { id: 'ex5', name: 'bentoverRows', bodyPart: 'Back', description: 'bentoverRowsDescription', emoji: '🧗' },
  { id: 'ex6', name: 'deadlifts', bodyPart: 'Back', description: 'deadliftsDescription', emoji: '🧗' },
  
  // Legs
  { id: 'ex7', name: 'squats', bodyPart: 'Legs', description: 'squatsDescription', emoji: '🏃' },
  { id: 'ex8', name: 'legPress', bodyPart: 'Legs', description: 'legPressDescription', emoji: '🏃' },
  { id: 'ex9', name: 'lunges', bodyPart: 'Legs', description: 'lungesDescription', emoji: '🏃' },

  // Shoulders
  { id: 'ex10', name: 'overheadPress', bodyPart: 'Shoulders', description: 'overheadPressDescription', emoji: '🤷' },
  { id: 'ex11', name: 'lateralRaises', bodyPart: 'Shoulders', description: 'lateralRaisesDescription', emoji: '🤷' },

  // Arms
  { id: 'ex12', name: 'bicepCurls', bodyPart: 'Arms', description: 'bicepCurlsDescription', emoji: '💪' },
  { id: 'ex13', name: 'tricepDips', bodyPart: 'Arms', description: 'tricepDipsDescription', emoji: '💪' },

  // Core
  { id: 'ex14', name: 'plank', bodyPart: 'Core', description: 'plankDescription', emoji: '🧘' },
  { id: 'ex15', name: 'crunches', bodyPart: 'Core', description: 'crunchesDescription', emoji: '🧘' },
];

export const workoutTemplates = [
  {
    id: 'tpl1',
    nameKey: 'templatePush',
    exercises: ['ex1', 'ex2', 'ex10', 'ex11', 'ex13']
  },
  {
    id: 'tpl2',
    nameKey: 'templatePull',
    exercises: ['ex4', 'ex5', 'ex6', 'ex12']
  },
  {
    id: 'tpl3',
    nameKey: 'templateLegs',
    exercises: ['ex7', 'ex8', 'ex9', 'ex14', 'ex15']
  },
  {
    id: 'tpl4',
    nameKey: 'templateFullBody',
    exercises: ['ex1', 'ex4', 'ex7', 'ex10', 'ex12']
  }
];
