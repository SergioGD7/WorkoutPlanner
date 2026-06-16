"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, X, Plus, Minus } from "lucide-react";
import { triggerHaptic } from "@/utils/haptics";
import { Button } from "./ui/button";

export default function RestTimer({ initialSeconds = 90, isActive, onClose }: { initialSeconds?: number, isActive: boolean, onClose: () => void }) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (isActive) {
      setTimeLeft(initialSeconds);
    }
  }, [isActive, initialSeconds]);

  useEffect(() => {
    if (!isActive) return;

    if (timeLeft <= 0) {
      triggerHaptic("heavy");
      setTimeout(() => triggerHaptic("success"), 500);
      onClose();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onClose]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const addTime = () => setTimeLeft(prev => prev + 30);
  const subTime = () => setTimeLeft(prev => Math.max(0, prev - 30));

  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-background/90 backdrop-blur-xl border border-primary/20 shadow-2xl shadow-primary/10 rounded-full px-4 py-2 flex items-center gap-3"
        >
          <Timer className="h-5 w-5 text-primary animate-pulse" />
          
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-white/10" onClick={subTime}>
             <Minus className="h-3 w-3" />
          </Button>
          
          <span className="font-mono text-xl font-bold w-16 text-center">{formatTime(timeLeft)}</span>
          
          <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-white/10" onClick={addTime}>
             <Plus className="h-3 w-3" />
          </Button>

          <div className="w-px h-6 bg-border mx-1" />
          
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-destructive/20 hover:text-destructive" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
