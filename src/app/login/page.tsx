"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dumbbell, Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/auth-context';
import { useLanguage } from '@/context/language-context';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const router = useRouter();
  const { user, loading, login, signUp, resetPassword, enterDemoMode } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && user) router.push('/');
  }, [user, loading, router]);

  const formSchema = useMemo(
    () =>
      z.object({
        email: z.string().email({ message: t('invalidEmail') }),
        password: z.string().min(6, { message: t('passwordTooShort', { min: 6 }) }),
      }),
    [t],
  );

  type FormValues = z.infer<typeof formSchema>;

  const loginForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleAction = async (values: FormValues, action: 'login' | 'signup') => {
    setIsSubmitting(true);
    const result = await (action === 'login'
      ? login(values.email, values.password)
      : signUp(values.email, values.password));

    if (!result.success && result.messageKey) {
      toast({
        variant: 'destructive',
        title: t(action === 'login' ? 'loginError' : 'signUpError'),
        description: t(result.messageKey),
      });
    }
    setIsSubmitting(false);
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) return;
    setIsResetting(true);
    const result = await resetPassword(resetEmail.trim());
    setIsResetting(false);

    if (result.success) {
      toast({ title: t('resetEmailSent'), description: t('resetEmailSentDescription') });
      setIsResetOpen(false);
      setResetEmail('');
    } else {
      toast({
        variant: 'destructive',
        title: t('error'),
        description: t(result.messageKey ?? 'unknownError'),
      });
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Dumbbell className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const renderPasswordField = (form: typeof loginForm) => (
    <FormField
      control={form.control}
      name="password"
      render={({ field }) => (
        <FormItem>
          <FormLabel>{t('password')}</FormLabel>
          <div className="relative">
            <FormControl>
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                {...field}
                disabled={isSubmitting}
              />
            </FormControl>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setShowPassword((previous) => !previous)}
              disabled={isSubmitting}
              aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="mx-4 w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Workout Planner</CardTitle>
          <CardDescription>{t('loginToContinue')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">{t('login')}</TabsTrigger>
              <TabsTrigger value="signup">{t('signUp')}</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Form {...loginForm}>
                <form
                  onSubmit={loginForm.handleSubmit((values) => handleAction(values, 'login'))}
                  className="space-y-4 pt-4"
                >
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('email')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('emailPlaceholder')}
                            autoComplete="email"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {renderPasswordField(loginForm)}
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : t('login')}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto w-full p-0 text-xs"
                    onClick={() => {
                      setResetEmail(loginForm.getValues('email'));
                      setIsResetOpen(true);
                    }}
                  >
                    {t('forgotPassword')}
                  </Button>
                </form>
              </Form>
            </TabsContent>

            <TabsContent value="signup">
              <Form {...signUpForm}>
                <form
                  onSubmit={signUpForm.handleSubmit((values) => handleAction(values, 'signup'))}
                  className="space-y-4 pt-4"
                >
                  <FormField
                    control={signUpForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('email')}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={t('emailPlaceholder')}
                            autoComplete="email"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {renderPasswordField(signUpForm)}
                  <Button type="submit" disabled={isSubmitting} className="w-full">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : t('signUp')}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">{t('orContinueWith')}</span>
            </div>
          </div>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={enterDemoMode}
            disabled={isSubmitting}
          >
            {t('tryDemo')}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={isResetOpen} onOpenChange={setIsResetOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('resetPassword')}</DialogTitle>
            <DialogDescription>{t('resetPasswordDescription')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">{t('email')}</Label>
            <Input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={resetEmail}
              placeholder={t('emailPlaceholder')}
              onChange={(event) => setResetEmail(event.target.value)}
            />
          </div>
          <Button onClick={handleReset} disabled={isResetting || !resetEmail.trim()} className="w-full">
            {isResetting ? <Loader2 className="animate-spin" /> : t('sendResetLink')}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
