import type { Exercise } from './types';

export const bodyParts = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] as const;

export const initialExercises: Exercise[] = [
  // Chest
  { id: 'ex1', name: 'benchPress', bodyPart: 'Chest', description: 'benchPressDescription', image: 'https://images.unsplash.com/photo-1594882645126-14020914d58d?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'bench press' },
  { id: 'ex2', name: 'dumbbellFlyes', bodyPart: 'Chest', description: 'dumbbellFlyesDescription', image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8e?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'dumbbell flyes' },
  { id: 'ex3', name: 'pushups', bodyPart: 'Chest', description: 'pushupsDescription', image: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'person pushup' },

  // Back
  { id: 'ex4', name: 'pullups', bodyPart: 'Back', description: 'pullupsDescription', image: 'https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'man pullup' },
  { id: 'ex5', name: 'bentoverRows', bodyPart: 'Back', description: 'bentoverRowsDescription', image: 'https://images.unsplash.com/photo-1532029837206-afa2b0470e69?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'barbell row' },
  { id: 'ex6', name: 'deadlifts', bodyPart: 'Back', description: 'deadliftsDescription', image: 'https://images.unsplash.com/photo-1584863265045-f9d10ca7fa61?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'gym deadlift' },
  
  // Legs
  { id: 'ex7', name: 'squats', bodyPart: 'Legs', description: 'squatsDescription', image: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'woman squat' },
  { id: 'ex8', name: 'legPress', bodyPart: 'Legs', description: 'legPressDescription', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'leg press' },
  { id: 'ex9', name: 'lunges', bodyPart: 'Legs', description: 'lungesDescription', image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'woman lunge' },

  // Shoulders
  { id: 'ex10', name: 'overheadPress', bodyPart: 'Shoulders', description: 'overheadPressDescription', image: 'https://images.unsplash.com/photo-1598266663439-2056e4373444?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'shoulder press' },
  { id: 'ex11', name: 'lateralRaises', bodyPart: 'Shoulders', description: 'lateralRaisesDescription', image: 'https://images.unsplash.com/photo-1616279967983-2da001a18035?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'lateral raise' },

  // Arms
  { id: 'ex12', name: 'bicepCurls', bodyPart: 'Arms', description: 'bicepCurlsDescription', image: 'https://images.unsplash.com/photo-1581009137052-5a498ddc392f?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'bicep curl' },
  { id: 'ex13', name: 'tricepDips', bodyPart: 'Arms', description: 'tricepDipsDescription', image: 'https://images.unsplash.com/photo-1596357395217-e0413333c823?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'tricep dip' },

  // Core
  { id: 'ex14', name: 'plank', bodyPart: 'Core', description: 'plankDescription', image: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'woman plank' },
  { id: 'ex15', name: 'crunches', bodyPart: 'Core', description: 'crunchesDescription', image: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?q=80&w=600&h=400&auto=format&fit=crop', 'data-ai-hint': 'woman crunch' },
];
