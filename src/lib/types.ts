import type { bodyParts } from './data';

export type BodyPart = (typeof bodyParts)[number];

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
  bodyPart: BodyPart;
  description: string;
  image: string;
  'data-ai-hint': string;
}
