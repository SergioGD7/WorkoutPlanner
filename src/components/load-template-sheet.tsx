"use client";

import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, FileText, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/language-context";
import { useTemplates } from "@/context/template-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import ManageTemplatesSheet from "@/components/manage-templates-sheet";
import { useState } from "react";

interface LoadTemplateSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadTemplate: (exerciseIds: string[]) => void;
}

export default function LoadTemplateSheet({ isOpen, onClose, onLoadTemplate }: LoadTemplateSheetProps) {
  const { t } = useLanguage();
  const { templates } = useTemplates();
  const [isManageOpen, setIsManageOpen] = useState(false);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 500) {
      onClose();
    }
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
            className="fixed bottom-0 left-0 right-0 z-50 h-[70vh] bg-card border-t border-border rounded-t-[2rem] shadow-2xl flex flex-col"
          >
            <div className="w-full flex justify-center py-4 cursor-grab active:cursor-grabbing touch-none">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            <div className="px-6 pb-4 flex items-center justify-between">
              <h2 className="text-2xl font-headline font-bold flex items-center gap-2">
                <FileText className="text-primary" />
                {t('loadTemplate') || 'Cargar Plantilla'}
              </h2>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setIsManageOpen(true)} className="rounded-full">
                  <Settings2 className="h-5 w-5" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <ScrollArea className="flex-1 px-6 pb-8">
              <div className="space-y-4">
                {templates.length === 0 && (
                  <p className="text-muted-foreground text-center py-8">No hay plantillas guardadas.</p>
                )}
                {templates.map((template) => (
                  <div 
                    key={template.id}
                    onClick={() => onLoadTemplate(template.exercises)}
                    className="p-4 rounded-2xl bg-secondary/10 hover:bg-secondary/30 border border-transparent hover:border-border/50 cursor-pointer transition-all active:scale-[0.98]"
                  >
                    <h3 className="font-bold text-lg text-foreground mb-1">
                      {t(template.nameKey) || template.nameKey}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {template.exercises.length} {t('exercises')}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </motion.div>

          <ManageTemplatesSheet 
            isOpen={isManageOpen} 
            onClose={() => setIsManageOpen(false)} 
          />
        </>
      )}
    </AnimatePresence>
  );
}
