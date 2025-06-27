"use client";

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { initialWorkoutLog, exercises } from '@/lib/data';
import { format } from 'date-fns';
import type { WorkoutLog, Exercise } from '@/lib/types';

const chartConfig = {
  weight: {
    label: "Weight (kg)",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig;

export default function ProgressTracker() {
  const [workoutLog] = useState<WorkoutLog>(initialWorkoutLog);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>(exercises[0].id);

  const selectedExercise = exercises.find(ex => ex.id === selectedExerciseId);

  const chartData = useMemo(() => {
    if (!selectedExerciseId) return [];
    
    const data: { date: string; fullDate: Date, weight: number }[] = [];
    Object.entries(workoutLog).forEach(([dateStr, workoutExercises]) => {
      const date = new Date(dateStr);
      // Ensure we have a valid date to avoid issues with timezones
      date.setUTCHours(0,0,0,0);
      
      workoutExercises.forEach(workoutEx => {
        if (workoutEx.exerciseId === selectedExerciseId) {
          const maxWeight = Math.max(...workoutEx.sets.filter(s => s.completed && s.weight > 0).map(s => s.weight), 0);
          if (maxWeight > 0) {
            data.push({
              date: format(date, "MMM d"),
              fullDate: date,
              weight: maxWeight
            });
          }
        }
      });
    });

    return data.sort((a, b) => a.fullDate.getTime() - b.fullDate.getTime());
  }, [workoutLog, selectedExerciseId]);

  return (
    <div>
      <h2 className="text-3xl font-bold tracking-tight mb-4 font-headline">Progress Tracker</h2>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Exercise Progress</CardTitle>
          <CardDescription>
            Select an exercise to see your weight progression over time.
          </CardDescription>
          <div className="pt-4">
            <Select onValueChange={setSelectedExerciseId} defaultValue={selectedExerciseId}>
              <SelectTrigger className="w-full md:w-[280px]">
                <SelectValue placeholder="Select an exercise" />
              </SelectTrigger>
              <SelectContent>
                {exercises.map((exercise: Exercise) => (
                  <SelectItem key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selectedExercise && (
            <h3 className="text-xl font-semibold mb-4 font-headline">{selectedExercise.name} Progress</h3>
          )}
          {chartData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  tickFormatter={(value) => `${value}kg`}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <Bar dataKey="weight" fill="var(--color-weight)" radius={8} />
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                <p>No completed sets with weight recorded for this exercise yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
