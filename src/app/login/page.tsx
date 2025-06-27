"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Dumbbell, AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useLanguage } from '@/context/language-context';
import { auth } from '@/lib/firebase';

const GoogleIcon = () => (
  <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.56 2.03-3.86 0-6.99-3.1-6.99-7.02s3.13-7.02 6.99-7.02c2.2 0 3.66.88 4.5 1.72l2.6-2.58C18.05 3.32 15.61 2 12.48 2 7.18 2 3 6.13 3 11.52s4.18 9.52 9.48 9.52c2.79 0 5.2-1.02 6.9-2.72 1.84-1.84 2.34-4.58 2.34-7.22 0-.75-.08-1.35-.2-1.82z" fill="#4285F4"/>
  </svg>
);


export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, loading, login, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  const formSchema = z.object({
    email: z.string().email({ message: t('invalidEmail') }),
    password: z.string().min(6, { message: t('passwordTooShort', { min: 6 }) }),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleLoginOrSignup = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await login(values.email, values.password);
      // The useEffect will handle the redirect
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        try {
          await signUp(values.email, values.password);
           // The useEffect will handle the redirect
        } catch (signupError: any) {
           toast({
            title: t('signUpError'),
            description: (signupError as Error).message || t('unknownError'),
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: t('loginError'),
          description: error.message || t('unknownError'),
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      // The useEffect will handle the redirect
    } catch (e) {
      // Error is already toasted in the auth context
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isFirebaseConfigured = !!auth;

  if (loading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Dumbbell className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Dumbbell className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Workout Planner</CardTitle>
          <CardDescription>{t('loginToContinue')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!isFirebaseConfigured ? (
             <div className="flex items-center gap-4 p-4 mb-4 text-sm text-destructive-foreground bg-destructive rounded-md">
                <AlertTriangle className="h-6 w-6"/>
                <p>{t('firebaseNotConfigured')}</p>
            </div>
          ) : (
            <>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleLoginOrSignup)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input placeholder={t('emailPlaceholder')} {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('password')}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? <Loader2 className="animate-spin" /> : t('loginOrSignUp')}
                </Button>
              </form>
            </Form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('orContinueWith')}
                </span>
              </div>
            </div>

            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <><GoogleIcon /> <span className="ml-2">{t('signInWithGoogle')}</span></>}
            </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
