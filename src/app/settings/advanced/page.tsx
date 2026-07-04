"use client";

import { useLanguage } from '@/context/language-context';
import { useAuth } from '@/context/auth-context';
import ChangePasswordForm from '@/components/change-password-form';
import ImportDataForm from '@/components/import-data-form';
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function AdvancedSettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div className="flex min-h-screen w-full bg-background flex-col overflow-y-auto">
      <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-6">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight font-headline">{t('settings')}</h2>
          </div>

          <div className="space-y-8">
            <section className="bg-card p-6 rounded-xl border border-border/50 shadow-sm glass-effect">
                <h3 className="text-lg font-semibold mb-4 font-headline">{t('security')}</h3>
                <ChangePasswordForm />
            </section>
            
            {user?.email === 'sergio.g.d7@gmail.com' && (
              <section className="bg-card p-6 rounded-xl border border-border/50 shadow-sm glass-effect">
                  <h3 className="text-lg font-semibold mb-4 font-headline">{t('dataManagement')}</h3>
                  <ImportDataForm />
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
