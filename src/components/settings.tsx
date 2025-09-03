
"use client";

import { useLanguage } from '@/context/language-context';
import ChangePasswordForm from './change-password-form';
import ImportDataForm from './import-data-form';

export default function Settings() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
       <h2 className="text-2xl md:text-3xl font-bold tracking-tight font-headline">{t('settings')}</h2>
       <div className="space-y-8">
            <section>
                <h3 className="text-xl font-semibold mb-4 font-headline">{t('security')}</h3>
                <ChangePasswordForm />
            </section>
            <section>
                <h3 className="text-xl font-semibold mb-4 font-headline">{t('dataManagement')}</h3>
                <ImportDataForm />
            </section>
       </div>
    </div>
  );
}
