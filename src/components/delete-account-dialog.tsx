"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';

/**
 * Irreversible, so it asks for two independent confirmations: the account
 * password (which also re-authenticates the session, as Firebase requires) and
 * typing the confirmation word, so a stray tap cannot destroy an account.
 */
export default function DeleteAccountDialog() {
  const { t } = useLanguage();
  const { deleteAccount, isDemo } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const requiredWord = t('deleteAccountConfirmWord');
  const canSubmit =
    password.length > 0 && confirmation.trim().toLowerCase() === requiredWord.toLowerCase();

  const handleDelete = async () => {
    if (!canSubmit) return;

    setIsDeleting(true);
    const result = await deleteAccount(password);
    setIsDeleting(false);

    if (result.success) {
      toast({ title: t('accountDeleted'), description: t('accountDeletedDescription') });
      setIsOpen(false);
      router.replace('/login');
      return;
    }

    toast({
      variant: 'destructive',
      title: t('error'),
      description: t(result.messageKey ?? 'unknownError'),
    });
  };

  const close = () => {
    setIsOpen(false);
    setPassword('');
    setConfirmation('');
  };

  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">{t('deleteAccountDescription')}</p>
        <Button
          variant="outline"
          onClick={() => setIsOpen(true)}
          disabled={isDemo}
          className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('deleteAccount')}
        </Button>
        {isDemo && <p className="text-xs text-muted-foreground">{t('deleteAccountDemoDisabled')}</p>}
      </div>

      <Dialog open={isOpen} onOpenChange={(open) => (open ? setIsOpen(true) : close())}>
        <DialogContent className="max-w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              {t('deleteAccount')}
            </DialogTitle>
            <DialogDescription>{t('deleteAccountWarning')}</DialogDescription>
          </DialogHeader>

          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>{t('deleteAccountItemWorkouts')}</li>
            <li>{t('deleteAccountItemExercises')}</li>
            <li>{t('deleteAccountItemBody')}</li>
            <li>{t('deleteAccountItemAccount')}</li>
          </ul>

          <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-foreground">
            {t('deleteAccountBackupHint')}
          </p>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="delete-password">{t('currentPassword')}</Label>
              <Input
                id="delete-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={isDeleting}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delete-confirm">
                {t('deleteAccountTypeToConfirm', { word: requiredWord })}
              </Label>
              <Input
                id="delete-confirm"
                value={confirmation}
                placeholder={requiredWord}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={isDeleting}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={close} disabled={isDeleting} className="flex-1">
              {t('cancel')}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={!canSubmit || isDeleting}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t('deleteAccountConfirm')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
