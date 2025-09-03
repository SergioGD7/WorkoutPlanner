
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from 'lucide-react';

export default function ChangePasswordForm() {
  const { t } = useLanguage();
  const { changePassword } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const formSchema = z.object({
    currentPassword: z.string().min(1, { message: t('fieldRequired') }),
    newPassword: z.string().min(6, { message: t('passwordTooShort', { min: 6 }) }),
    confirmPassword: z.string(),
  }).refine(data => data.newPassword === data.confirmPassword, {
    message: t('passwordsDoNotMatch'),
    path: ['confirmPassword'],
  }).refine(data => data.currentPassword !== data.newPassword, {
    message: t('newPasswordCannotBeSame'),
    path: ['newPassword'],
  });
  
  type FormValues = z.infer<typeof formSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    form.clearErrors();
    const result = await changePassword(values.currentPassword, values.newPassword);
    
    if (result.success) {
      toast({
        title: t('passwordChangedSuccessfully'),
        description: t('passwordChangedSuccessDesc'),
      });
      form.reset();
    } else {
      if (result.messageKey === 'incorrectCurrentPassword') {
        form.setError('currentPassword', {
          type: 'manual',
          message: t('incorrectCurrentPassword'),
        });
      } else {
        toast({
          variant: 'destructive',
          title: t('errorChangingPassword'),
          description: t(result.messageKey || 'unknownError'),
        });
      }
    }

    setIsSubmitting(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('changePassword')}</CardTitle>
        <CardDescription>{t('changePasswordDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('currentPassword')}</FormLabel>
                   <div className="relative">
                      <FormControl>
                        <Input type={showPassword ? "text" : "password"} {...field} disabled={isSubmitting} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                      </Button>
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newPassword')}</FormLabel>
                  <div className="relative">
                      <FormControl>
                        <Input type={showPassword ? "text" : "password"} {...field} disabled={isSubmitting} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                      </Button>
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('confirmNewPassword')}</FormLabel>
                  <div className="relative">
                      <FormControl>
                        <Input type={showPassword ? "text" : "password"} {...field} disabled={isSubmitting} />
                      </FormControl>
                      <Button type="button" variant="ghost" size="icon" className="absolute top-0 right-0 h-full px-3" onClick={() => setShowPassword(!showPassword)} disabled={isSubmitting}>
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        <span className="sr-only">{showPassword ? 'Hide password' : 'Show password'}</span>
                      </Button>
                    </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : t('updatePassword')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
