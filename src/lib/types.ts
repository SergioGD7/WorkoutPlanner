import type { bodyParts } from './data';

export interface Set {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  exerciseId: string;
  sets: Set[];
}

export interface WorkoutLog {
  [date: string]: WorkoutExercise[];
}

export interface Exercise {
  id: string;
  name: string;
  bodyPart: (typeof bodyParts)[number];
  description: string;
  image: string;
  'data-ai-hint': string;
}
