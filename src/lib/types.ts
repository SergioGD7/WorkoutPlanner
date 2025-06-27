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
  bodyPart: 'Chest' | 'Back' | 'Legs' | 'Shoulders' | 'Arms' | 'Core';
  description: string;
  image: string;
  'data-ai-hint': string;
}
