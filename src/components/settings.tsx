
"use client";

import { useLanguage } from '@/context/language-context';
import ChangePasswordForm from './change-password-form';
import ImportDataForm from './import-data-form';
import { useAuth } from '@/context/auth-context';

export default function Settings() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
       <h2 className="text-xl md:text-2xl font-bold tracking-tight font-headline">{t('settings')}</h2>
       <div className="space-y-8">
            <section>
                <h3 className="text-xl font-semibold mb-4 font-headline">{t('security')}</h3>
                <ChangePasswordForm />
            </section>
            {user?.email === 'sergio.g.d7@gmail.com' && (
              <section>
                  <h3 className="text-xl font-semibold mb-4 font-headline">{t('dataManagement')}</h3>
                  <ImportDataForm />
              </section>
            )}
       </div>
    </div>
  );
}
