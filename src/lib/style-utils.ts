
import { bodyParts } from '@/lib/data';
import type { BodyPart } from '@/lib/types';

const CHART_COLORS_HSL = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export const bodyPartColorMap = new Map<BodyPart, string>();
bodyParts.forEach((part, index) => {
  bodyPartColorMap.set(part, `hsl(${CHART_COLORS_HSL[index % CHART_COLORS_HSL.length]})`);
});

export const bodyPartEmojiMap = new Map<BodyPart, string>([
  ['Chest', '🏋️'],
  ['Back', '🧗'],
  ['Legs', '🏃'],
  ['Shoulders', '🤷'],
  ['Arms', '💪'],
  ['Core', '🧘'],
]);
