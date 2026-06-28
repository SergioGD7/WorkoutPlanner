"use client";

import { useState } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, Plus, Pencil, Trash2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/context/language-context";
import { useExercises } from "@/context/exercise-context";
import { useTemplates } from "@/context/template-context";
import type { WorkoutTemplate } from "@/lib/types";
import { ScrollArea } from "@/components/ui/scroll-area";
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

interface ManageTemplatesSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageTemplatesSheet({ isOpen, onClose }: ManageTemplatesSheetProps) {
  const { t, language } = useLanguage();
  const { templates, addTemplate, updateTemplate, deleteTemplate } = useTemplates();
  const { exercises } = useExercises();

  const [view, setView] = useState<'list' | 'edit'>('list');
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [templateToDelete, setTemplateToDelete] = useState<WorkoutTemplate | null>(null);

  // Form State
  const [nameKey, setNameKey] = useState("");
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      if (view === 'list') {
        onClose();
      } else {
        setView('list');
      }
    }
  };

  const handleCreateNew = () => {
    setEditingTemplate(null);
    setNameKey("");
    setSelectedExercises([]);
    setView('edit');
  };

  const handleEdit = (tpl: WorkoutTemplate) => {
    setEditingTemplate(tpl);
    // Un poco de hack: si es una plantilla por defecto, usará una clave de traducción.
    // Para simplificar para el usuario final, guardaremos el nombre que escriba tal cual en nameKey.
    // Si t(tpl.nameKey) devuelve un valor traducido, usamos ese valor como inicial.
    const translatedName = t(tpl.nameKey);
    setNameKey(translatedName !== tpl.nameKey ? translatedName : tpl.nameKey);
    setSelectedExercises(tpl.exercises);
    setView('edit');
  };

  const handleSave = async () => {
    if (!nameKey.trim()) return;

    if (editingTemplate) {
      await updateTemplate({
        ...editingTemplate,
        nameKey: nameKey.trim(),
        exercises: selectedExercises,
      });
    } else {
      await addTemplate({
        nameKey: nameKey.trim(),
        exercises: selectedExercises,
      });
    }
    setView('list');
  };

  const confirmDelete = async () => {
    if (templateToDelete) {
      await deleteTemplate(templateToDelete.id);
      setTemplateToDelete(null);
    }
  };

  const toggleExercise = (id: string) => {
    setSelectedExercises(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 h-[85vh] bg-card border-t border-border rounded-t-[2rem] shadow-2xl flex flex-col"
          >
            <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing touch-none">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {view === 'list' ? (
              // --- LIST VIEW ---
              <>
                <div className="px-6 pb-4 flex items-center justify-between">
                  <h2 className="text-2xl font-headline font-bold">
                    Gestionar Rutinas
                  </h2>
                  <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="px-6 pb-4">
                  <Button onClick={handleCreateNew} className="w-full rounded-xl">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Nueva Rutina
                  </Button>
                </div>

                <ScrollArea className="flex-1 px-6 pb-8">
                  <div className="space-y-3">
                    {templates.map(tpl => (
                      <div key={tpl.id} className="p-4 rounded-xl border border-border bg-card flex justify-between items-center shadow-sm">
                        <div>
                          <p className="font-bold">{t(tpl.nameKey) || tpl.nameKey}</p>
                          <p className="text-xs text-muted-foreground">{tpl.exercises.length} ejercicios</p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(tpl)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setTemplateToDelete(tpl)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            ) : (
              // --- EDIT VIEW ---
              <>
                <div className="px-6 pb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setView('list')} className="rounded-full -ml-2">
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-xl font-headline font-bold">
                      {editingTemplate ? 'Editar Rutina' : 'Nueva Rutina'}
                    </h2>
                  </div>
                  <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="px-6 space-y-4 pb-4">
                  <div>
                    <label className="text-sm font-semibold mb-1 block">Nombre de la rutina</label>
                    <Input 
                      value={nameKey} 
                      onChange={(e) => setNameKey(e.target.value)} 
                      placeholder="Ej: Torso, Pierna, Pecho y Tríceps..."
                      className="bg-secondary/20"
                    />
                  </div>
                </div>

                <div className="px-6 pb-2">
                  <h3 className="font-semibold text-sm">Selecciona los ejercicios:</h3>
                </div>

                <ScrollArea className="flex-1 px-6 pb-24">
                  <div className="space-y-2">
                    {exercises.map(ex => {
                      const isSelected = selectedExercises.includes(ex.id);
                      return (
                        <div 
                          key={ex.id}
                          onClick={() => toggleExercise(ex.id)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary text-primary' : 'bg-secondary/5 border-transparent text-foreground hover:bg-secondary/10'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground'}`}>
                            {isSelected && <X className="h-3 w-3 text-primary-foreground rotate-45" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{t(ex.name)}</p>
                            <p className="text-xs opacity-70 capitalize">{t(ex.bodyPart.toLowerCase())}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>

                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card via-card to-transparent">
                   <Button onClick={handleSave} disabled={!nameKey.trim() || selectedExercises.length === 0} className="w-full rounded-xl h-12 text-base shadow-lg">
                      Guardar Rutina
                   </Button>
                </div>
              </>
            )}
          </motion.div>

          <AlertDialog open={!!templateToDelete} onOpenChange={(isOpen) => !isOpen && setTemplateToDelete(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Eliminar rutina</AlertDialogTitle>
                <AlertDialogDescription>
                  ¿Seguro que quieres eliminar la rutina "{templateToDelete && (t(templateToDelete.nameKey) || templateToDelete.nameKey)}"? Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Eliminar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </AnimatePresence>
  );
}
