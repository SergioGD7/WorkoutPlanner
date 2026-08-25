"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@/context/language-context';

/**
 * The policy, in one language at a time.
 *
 * It used to stack Spanish and English on a single page so one URL could serve
 * both store listings. That reads badly for everyone: whichever language you
 * speak, half the page is noise you have to scroll past. The language now
 * follows the app — the same stored preference the rest of the app reads — and
 * `?lang=es` / `?lang=en` pins it, which is what the stores want when they ask
 * for a policy URL per localisation.
 *
 * ⚠️ BEFORE SUBMITTING TO THE STORES: fill in the two values below. They are the
 * only things standing between this draft and a publishable policy.
 */
const OWNER = '[TU NOMBRE O EMPRESA — YOUR NAME OR COMPANY]';
const CONTACT_EMAIL = '[TU EMAIL DE CONTACTO — YOUR CONTACT EMAIL]';

type Lang = 'en' | 'es';

interface Section {
  title: string;
  body: ReactNode;
}

interface Policy {
  heading: string;
  lastUpdated: string;
  lastUpdatedLabel: string;
  switchLabel: string;
  sections: Section[];
}

const LIST = 'list-disc space-y-1 pl-5';
const LEAD = 'font-medium text-foreground';

const POLICIES: Record<Lang, Policy> = {
  es: {
    heading: 'Política de privacidad',
    lastUpdated: '25 de agosto de 2026',
    lastUpdatedLabel: 'Última actualización',
    switchLabel: 'Read in English',
    sections: [
      {
        title: 'Quién es responsable',
        body: (
          <p>
            Workout Planner está desarrollada por <strong>{OWNER}</strong>. Para cualquier duda
            sobre esta política o sobre tus datos, escribe a <strong>{CONTACT_EMAIL}</strong>.
          </p>
        ),
      },
      {
        title: 'Qué datos recoge la app',
        body: (
          <>
            <p>
              Workout Planner solo recoge lo que necesita para funcionar como diario de
              entrenamiento.
            </p>
            <p className={LEAD}>Al crear una cuenta</p>
            <ul className={LIST}>
              <li>Tu dirección de correo electrónico, para identificar tu cuenta.</li>
            </ul>
            <p className={LEAD}>Al usar la app</p>
            <ul className={LIST}>
              <li>
                Tus entrenamientos: ejercicios, series, repeticiones, pesos, tiempos aguantados, RPE
                y las notas que escribas.
              </li>
              <li>Tus rutinas y tus ejercicios personalizados.</li>
              <li>
                Tus preferencias: idioma, unidades, tiempos de descanso, regla de progresión e
                incremento de peso.
              </li>
              <li>
                Si decides introducirlos, tus datos corporales: peso, grasa corporal, perímetros y
                el peso objetivo que te marques.
              </li>
            </ul>
            <p className={LEAD}>Qué NO recoge nunca</p>
            <ul className={LIST}>
              <li>Tu ubicación.</li>
              <li>Tus contactos, tus fotos ni tus archivos.</li>
              <li>Datos de Apple Salud ni de Google Fit.</li>
              <li>
                Identificadores de publicidad. La app no tiene anuncios ni SDK de analítica o
                atribución.
              </li>
            </ul>
          </>
        ),
      },
      {
        title: 'Para qué los usamos',
        body: (
          <p>
            Solo para prestar el servicio: guardar tu historial, sincronizarlo entre tus
            dispositivos y calcular las estadísticas y las sugerencias de progresión que ves en la
            app. Tus datos no se usan para perfilarte, no se venden y no se usan con fines
            publicitarios.
          </p>
        ),
      },
      {
        title: 'Dónde se guardan',
        body: (
          <>
            <p>
              En <strong>Google Firebase</strong> (Firebase Authentication y Cloud Firestore), que
              actúa como proveedor de alojamiento y los procesa por cuenta nuestra bajo sus propias
              condiciones. Las transferencias van por HTTPS y Firestore cifra los datos en reposo.
            </p>
            <p>
              Las reglas de seguridad restringen cada documento a su propietario: una persona
              autenticada solo puede leer y escribir sus propios datos.
            </p>
          </>
        ),
      },
      {
        title: 'Con quién se comparten',
        body: (
          <>
            <p>
              Con nadie, más allá del alojamiento en Firebase descrito arriba. No hay anunciantes,
              ni intermediarios de datos, ni proveedores de analítica.
            </p>
            <p>
              Si usas la función de compartir, la imagen generada se entrega a la app que elijas en
              el menú de tu dispositivo. Lo que ocurra después se rige por la política de esa app.
            </p>
          </>
        ),
      },
      {
        title: 'Avisos y recordatorios',
        body: (
          <>
            <p>
              Los avisos del temporizador de descanso, del cronómetro de serie y del recordatorio de
              entreno son <strong>notificaciones locales</strong>: las programa tu propio
              dispositivo y el texto no pasa por ningún servidor. La app no usa notificaciones push
              y no hay ningún servicio de mensajería detrás.
            </p>
            <p>
              El permiso se pide solo cuando activas el aviso, y puedes retirarlo en los ajustes del
              sistema en cualquier momento.
            </p>
          </>
        ),
      },
      {
        title: 'Importar desde otras apps',
        body: (
          <p>
            Si importas tu historial desde Strong, Hevy o FitNotes, el archivo que eliges se lee{' '}
            <strong>en tu dispositivo</strong> y su contenido pasa a ser tu historial en tu cuenta,
            con el mismo trato que el resto de tus datos. El archivo no se envía a ningún otro sitio
            y no nos comunicamos con esas apps ni con sus servidores.
          </p>
        ),
      },
      {
        title: 'El modo de ejemplo',
        body: (
          <p>
            La pantalla de inicio ofrece «Explorar con datos de ejemplo». Ese modo usa datos
            inventados que solo existen en la memoria de tu dispositivo, no envía nada a ningún
            servidor y no guarda nada.
          </p>
        ),
      },
      {
        title: 'Datos sin conexión en tu dispositivo',
        body: (
          <p>
            Para que la app funcione sin conexión, Firestore guarda una copia de tus datos en el
            dispositivo. Al cerrar sesión o desinstalar la app, esa copia se elimina.
          </p>
        ),
      },
      {
        title: 'Cuánto tiempo se conservan',
        body: <p>Mientras exista tu cuenta. Si la eliminas, tus datos se eliminan con ella.</p>,
      },
      {
        title: 'Tus derechos',
        body: (
          <ul className={LIST}>
            <li>
              <strong>Acceso y portabilidad:</strong> la app exporta todo tu historial en un archivo
              JSON, desde Perfil → Ajustes → Gestión de datos.
            </li>
            <li>
              <strong>Rectificación:</strong> cualquier registro se puede editar o borrar en la app.
            </li>
            <li>
              <strong>Supresión:</strong> puedes eliminar tu cuenta y todo su contenido desde Perfil
              → Ajustes → Eliminar cuenta, sin pasar por nosotros.
            </li>
            <li>
              Si estás en la UE, también tienes derecho a oponerte al tratamiento y a reclamar ante
              tu autoridad de protección de datos.
            </li>
          </ul>
        ),
      },
      {
        title: 'Menores',
        body: (
          <p>
            La app no está dirigida a menores de 13 años y no recogemos sus datos de forma
            consciente.
          </p>
        ),
      },
      {
        title: 'Cambios',
        body: (
          <p>
            Si esta política cambia, cambia la fecha del encabezado y la nueva versión se publica en
            esta misma dirección.
          </p>
        ),
      },
    ],
  },

  en: {
    heading: 'Privacy policy',
    lastUpdated: '25 August 2026',
    lastUpdatedLabel: 'Last updated',
    switchLabel: 'Leer en español',
    sections: [
      {
        title: 'Who is responsible',
        body: (
          <p>
            Workout Planner is developed by <strong>{OWNER}</strong>. For any question about this
            policy or your data, write to <strong>{CONTACT_EMAIL}</strong>.
          </p>
        ),
      },
      {
        title: 'What the app collects',
        body: (
          <>
            <p>Workout Planner only collects what it needs to work as a training log.</p>
            <p className={LEAD}>When you create an account</p>
            <ul className={LIST}>
              <li>Your email address, to identify your account.</li>
            </ul>
            <p className={LEAD}>When you use the app</p>
            <ul className={LIST}>
              <li>
                Your workouts: exercises, sets, repetitions, weights, holds, RPE and any notes you
                write.
              </li>
              <li>Your routines and your custom exercises.</li>
              <li>
                Your preferences: language, units, rest times, progression rule and weight
                increment.
              </li>
              <li>
                If you choose to enter them, your body data: weight, body fat, girths and any target
                weight you set.
              </li>
            </ul>
            <p className={LEAD}>What it never collects</p>
            <ul className={LIST}>
              <li>Your location.</li>
              <li>Your contacts, photos or files.</li>
              <li>Data from Apple Health or Google Fit.</li>
              <li>
                Advertising identifiers. There are no ads and no analytics or attribution SDKs in
                the app.
              </li>
            </ul>
          </>
        ),
      },
      {
        title: 'Why we collect it',
        body: (
          <p>
            Only to provide the service: storing your training history, syncing it between your
            devices, and computing the statistics and progression suggestions the app shows you.
            Your data is not used to profile you, is not sold, and is not used for advertising.
          </p>
        ),
      },
      {
        title: 'Where your data is stored',
        body: (
          <>
            <p>
              In <strong>Google Firebase</strong> (Firebase Authentication and Cloud Firestore),
              which acts as the hosting provider and processes it on our behalf under their own
              terms. Transfers use HTTPS and Firestore encrypts data at rest.
            </p>
            <p>
              Security rules restrict every document to its owner: a signed-in user can only read
              and write their own data.
            </p>
          </>
        ),
      },
      {
        title: 'Who we share it with',
        body: (
          <>
            <p>
              Nobody, other than the Firebase hosting described above. There are no advertisers,
              data brokers or analytics providers.
            </p>
            <p>
              If you use the app&apos;s share feature, the image it generates is handed to whichever
              app you pick from your device&apos;s share sheet. What happens next is governed by
              that app&apos;s own policy.
            </p>
          </>
        ),
      },
      {
        title: 'Alerts and reminders',
        body: (
          <>
            <p>
              The rest timer, the set timer and the workout reminder are{' '}
              <strong>local notifications</strong>: your own device schedules them and the text
              never passes through a server. The app uses no push notifications and there is no
              messaging service behind them.
            </p>
            <p>
              Permission is only requested when you switch an alert on, and you can withdraw it in
              your system settings at any time.
            </p>
          </>
        ),
      },
      {
        title: 'Importing from other apps',
        body: (
          <p>
            If you import your history from Strong, Hevy or FitNotes, the file you pick is read{' '}
            <strong>on your device</strong> and its contents become your history in your account,
            treated exactly like the rest of your data. The file is not sent anywhere else, and we
            do not contact those apps or their servers.
          </p>
        ),
      },
      {
        title: 'Demo mode',
        body: (
          <p>
            The sign-in screen offers &ldquo;Explore with sample data&rdquo;. That mode uses invented
            data held only in your device&apos;s memory, sends nothing to any server, and stores
            nothing.
          </p>
        ),
      },
      {
        title: 'Offline data on your device',
        body: (
          <p>
            So the app works without a connection, Firestore caches a copy of your data on your
            device. Signing out or uninstalling the app clears it.
          </p>
        ),
      },
      {
        title: 'How long we keep it',
        body: <p>For as long as your account exists. If you delete it, your data goes with it.</p>,
      },
      {
        title: 'Your rights',
        body: (
          <ul className={LIST}>
            <li>
              <strong>Access and portability:</strong> the app exports your entire history as a JSON
              file, from Profile → Settings → Data management.
            </li>
            <li>
              <strong>Rectification:</strong> every entry can be edited or deleted in the app.
            </li>
            <li>
              <strong>Deletion:</strong> you can delete your account and everything in it from
              Profile → Settings → Delete account, without going through us.
            </li>
            <li>
              If you are in the EU, you also have the right to object to processing and to complain
              to your national data protection authority.
            </li>
          </ul>
        ),
      },
      {
        title: 'Children',
        body: (
          <p>
            The app is not aimed at children under 13 and we do not knowingly collect their data.
          </p>
        ),
      },
      {
        title: 'Changes',
        body: (
          <p>
            If this policy changes, the date at the top changes and the new version is published at
            this same address.
          </p>
        ),
      },
    ],
  },
};

export default function PrivacyPolicy() {
  const { language } = useLanguage();
  /** `?lang=` wins over the app's setting, for per-locale store listings. */
  const [pinned, setPinned] = useState<Lang | null>(null);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get('lang');
    if (requested === 'en' || requested === 'es') setPinned(requested);
  }, []);

  const lang = pinned ?? language;
  const policy = POLICIES[lang];
  const other: Lang = lang === 'es' ? 'en' : 'es';

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-background px-5 py-10 md:px-8">
      <header className="border-b border-border pb-6">
        <h1 className="font-headline text-3xl font-bold">Workout Planner</h1>
        <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {policy.lastUpdatedLabel}: {policy.lastUpdated}
          </p>
          <button
            type="button"
            onClick={() => setPinned(other)}
            className="text-sm text-primary underline"
          >
            {policy.switchLabel}
          </button>
        </div>
      </header>

      <article lang={lang}>
        <h2 className="mt-10 font-headline text-2xl font-bold">{policy.heading}</h2>

        {policy.sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h3 className="mb-2 font-headline text-lg font-semibold text-foreground">
              {section.title}
            </h3>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </div>
          </section>
        ))}
      </article>

      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        <a href="./" className="text-primary underline">
          Workout Planner
        </a>
      </footer>
    </main>
  );
}
