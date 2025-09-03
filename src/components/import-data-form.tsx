
"use client";

import { useState, useRef } from 'react';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileUp } from 'lucide-react';
import type { WorkoutLog, Exercise } from '@/lib/types';

export default function ImportDataForm() {
  const { t } = useLanguage();
  const { importWorkoutLogs, importExercises } = useAuth();
  const { toast } = useToast();
  
  const [isImportingLogs, setIsImportingLogs] = useState(false);
  const [isImportingExercises, setIsImportingExercises] = useState(false);

  const [logsFile, setLogsFile] = useState<File | null>(null);
  const [exercisesFile, setExercisesFile] = useState<File | null>(null);
  
  const logsFileRef = useRef<HTMLInputElement>(null);
  const exercisesFileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, setter: (file: File | null) => void) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.type === 'application/json') {
        setter(file);
      } else {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('invalidFileType'),
        });
        setter(null);
      }
    } else {
      setter(null);
    }
  };

  const handleImport = async (
    file: File | null, 
    importer: (data: any) => Promise<{success: boolean, messageKey?: string}>, 
    setLoading: (loading: boolean) => void,
    successMessageKey: string
  ) => {
    if (!file) {
      toast({ variant: 'destructive', title: t('error'), description: t('noFileSelected') });
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error('File could not be read');
        }
        const data = JSON.parse(text);
        
        const result = await importer(data);

        if (result.success) {
          toast({
            title: t('success'),
            description: t(successMessageKey),
          });
        } else {
          toast({
            variant: 'destructive',
            title: t('error'),
            description: t(result.messageKey || 'unknownError'),
          });
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: t('error'),
          description: t('invalidJsonFormat'),
        });
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', title: t('error'), description: t('fileReadError')});
        setLoading(false);
    };
    reader.readAsText(file);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importDataFromFile')}</CardTitle>
        <CardDescription>{t('importDataDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Workout Logs Importer */}
        <div className="space-y-2">
            <h4 className="font-medium">{t('importWorkoutLogsTitle')}</h4>
            <div className="flex gap-2">
                <Input
                    ref={logsFileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setLogsFile)}
                />
                <Button variant="outline" onClick={() => logsFileRef.current?.click()}>
                    {t('selectFile')}
                </Button>
                <div className="flex-1 self-center text-sm text-muted-foreground truncate">
                    {logsFile ? logsFile.name : t('noFileChosen')}
                </div>
            </div>
             <Button 
                onClick={() => handleImport(logsFile, importWorkoutLogs, setIsImportingLogs, 'logsImportedSuccess')}
                disabled={isImportingLogs || !logsFile}
             >
                {isImportingLogs ? <Loader2 className="animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                {t('importWorkoutLogsButton')}
            </Button>
        </div>

        {/* Exercises Importer */}
        <div className="space-y-2">
            <h4 className="font-medium">{t('importExercisesTitle')}</h4>
             <div className="flex gap-2">
                <Input
                    ref={exercisesFileRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => handleFileChange(e, setExercisesFile)}
                />
                <Button variant="outline" onClick={() => exercisesFileRef.current?.click()}>
                    {t('selectFile')}
                </Button>
                 <div className="flex-1 self-center text-sm text-muted-foreground truncate">
                    {exercisesFile ? exercisesFile.name : t('noFileChosen')}
                </div>
            </div>
             <Button 
                onClick={() => handleImport(exercisesFile, importExercises, setIsImportingExercises, 'exercisesImportedSuccess')}
                disabled={isImportingExercises || !exercisesFile}
             >
                {isImportingExercises ? <Loader2 className="animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                {t('importExercisesButton')}
            </Button>
        </div>
      </CardContent>
    </Card>
  );
}
