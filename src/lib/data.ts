import type { Exercise, WorkoutTemplate } from './types';

export const bodyParts = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;

export const initialExercises: Exercise[] = [
  // Chest
  { id: 'ex1', name: 'benchPress', bodyPart: 'Chest', description: 'benchPressDescription', emoji: '🏋️', tracking: 'weight', illustration: 'bench-press' },
  { id: 'ex2', name: 'dumbbellFlyes', bodyPart: 'Chest', description: 'dumbbellFlyesDescription', emoji: '🏋️', tracking: 'weight', illustration: 'dumbbell-fly' },
  { id: 'ex3', name: 'pushups', bodyPart: 'Chest', description: 'pushupsDescription', emoji: '🏋️', tracking: 'bodyweight', illustration: 'push-up' },

  // Back
  { id: 'ex4', name: 'pullups', bodyPart: 'Back', description: 'pullupsDescription', emoji: '🧗', tracking: 'bodyweight', illustration: 'pull-up' },
  { id: 'ex5', name: 'bentoverRows', bodyPart: 'Back', description: 'bentoverRowsDescription', emoji: '🧗', tracking: 'weight', illustration: 'barbell-row' },
  { id: 'ex6', name: 'deadlifts', bodyPart: 'Back', description: 'deadliftsDescription', emoji: '🧗', tracking: 'weight', illustration: 'deadlift' },

  // Legs
  { id: 'ex7', name: 'squats', bodyPart: 'Legs', description: 'squatsDescription', emoji: '🏃', tracking: 'weight', illustration: 'squat' },
  { id: 'ex8', name: 'legPress', bodyPart: 'Legs', description: 'legPressDescription', emoji: '🏃', tracking: 'weight', illustration: 'leg-press' },
  { id: 'ex9', name: 'lunges', bodyPart: 'Legs', description: 'lungesDescription', emoji: '🏃', tracking: 'weight', perSide: true, illustration: 'forward-lunge' },

  // Shoulders
  { id: 'ex10', name: 'overheadPress', bodyPart: 'Shoulders', description: 'overheadPressDescription', emoji: '🤷', tracking: 'weight', illustration: 'overhead-press' },
  { id: 'ex11', name: 'lateralRaises', bodyPart: 'Shoulders', description: 'lateralRaisesDescription', emoji: '🤷', tracking: 'weight', illustration: 'lateral-raise' },

  // Arms
  { id: 'ex12', name: 'bicepCurls', bodyPart: 'Arms', description: 'bicepCurlsDescription', emoji: '💪', tracking: 'weight', illustration: 'bicep-curl' },
  { id: 'ex13', name: 'tricepDips', bodyPart: 'Arms', description: 'tricepDipsDescription', emoji: '💪', tracking: 'bodyweight', illustration: 'bench-dip' },

  // Core
  { id: 'ex14', name: 'plank', bodyPart: 'Core', description: 'plankDescription', emoji: '🧘', tracking: 'duration', illustration: 'plank' },
  { id: 'ex15', name: 'crunches', bodyPart: 'Core', description: 'crunchesDescription', emoji: '🧘', tracking: 'bodyweight', illustration: 'crunch' },
];

export const DEFAULT_TEMPLATE_REPS = 10;
export const DEFAULT_TEMPLATE_SETS = 3;

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'tpl1',
    nameKey: 'templatePush',
    days: [
      {
        id: 'tpl1-d1',
        name: 'templatePush',
        exercises: [
          { exerciseId: 'ex1', sets: 4, reps: 8, restSeconds: 120 },
          { exerciseId: 'ex2', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseId: 'ex10', sets: 4, reps: 8, restSeconds: 120 },
          { exerciseId: 'ex11', sets: 3, reps: 15, restSeconds: 60 },
          { exerciseId: 'ex13', sets: 3, reps: 12, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'tpl2',
    nameKey: 'templatePull',
    days: [
      {
        id: 'tpl2-d1',
        name: 'templatePull',
        exercises: [
          { exerciseId: 'ex4', sets: 4, reps: 8, restSeconds: 120 },
          { exerciseId: 'ex5', sets: 4, reps: 10, restSeconds: 120 },
          { exerciseId: 'ex6', sets: 3, reps: 5, restSeconds: 180 },
          { exerciseId: 'ex12', sets: 3, reps: 12, restSeconds: 60 },
        ],
      },
    ],
  },
  {
    id: 'tpl3',
    nameKey: 'templateLegs',
    days: [
      {
        id: 'tpl3-d1',
        name: 'templateLegs',
        exercises: [
          { exerciseId: 'ex7', sets: 4, reps: 8, restSeconds: 180 },
          { exerciseId: 'ex8', sets: 3, reps: 12, restSeconds: 120 },
          { exerciseId: 'ex9', sets: 3, reps: 12, restSeconds: 90 },
          { exerciseId: 'ex14', sets: 3, reps: 0, restSeconds: 60 },
          { exerciseId: 'ex15', sets: 3, reps: 20, restSeconds: 45 },
        ],
      },
    ],
  },
  {
    id: 'tpl4',
    nameKey: 'templateFullBody',
    days: [
      {
        id: 'tpl4-d1',
        name: 'templateFullBodyDayA',
        exercises: [
          { exerciseId: 'ex1', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseId: 'ex5', sets: 3, reps: 10, restSeconds: 120 },
          { exerciseId: 'ex7', sets: 3, reps: 8, restSeconds: 180 },
        ],
      },
      {
        id: 'tpl4-d2',
        name: 'templateFullBodyDayB',
        exercises: [
          { exerciseId: 'ex10', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseId: 'ex4', sets: 3, reps: 8, restSeconds: 120 },
          { exerciseId: 'ex6', sets: 3, reps: 5, restSeconds: 180 },
          { exerciseId: 'ex12', sets: 3, reps: 12, restSeconds: 60 },
        ],
      },
    ],
  },
];
