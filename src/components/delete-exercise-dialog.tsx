"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";

interface DeleteExerciseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  exerciseName?: string;
}

export default function DeleteExerciseDialog({
  isOpen,
  onClose,
  onConfirm,
  exerciseName,
}: DeleteExerciseDialogProps) {
  const { t } = useLanguage();

  const handleDelete = () => {
    onConfirm();
    onClose();
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("deleteExercise")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("deleteConfirmation", { exerciseName: exerciseName || "" })}
            <br />
            <span className="font-semibold">{t("deleteWarning")}</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {t("delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
