import type { Metadata } from 'next';

/**
 * Public privacy policy. Both stores refuse a listing without a reachable URL,
 * so it lives inside the app and ships with the existing GitHub Pages deploy:
 * https://sergiogd7.github.io/WorkoutPlanner/privacy
 *
 * Deliberately a static server component: no auth, no language context, no
 * client JavaScript. Both languages are on the page so one URL serves both
 * store listings.
 *
 * ⚠️ BEFORE SUBMITTING TO THE STORES: replace the two values below. They are the
 * only things standing between this draft and a publishable policy.
 */
const OWNER = '[TU NOMBRE O EMPRESA — YOUR NAME OR COMPANY]';
const CONTACT_EMAIL = '[TU EMAIL DE CONTACTO — YOUR CONTACT EMAIL]';

/** Shown at the top of the policy and in both language sections. */
const LAST_UPDATED_ES = '4 de agosto de 2026';
const LAST_UPDATED_EN = '4 August 2026';

export const metadata: Metadata = {
  title: 'Privacidad · Workout Planner',
  description: 'Política de privacidad de Workout Planner / Workout Planner privacy policy.',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h3 className="mb-2 font-headline text-lg font-semibold text-foreground">{title}</h3>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl bg-background px-5 py-10 md:px-8">
      <header className="border-b border-border pb-6">
        <h1 className="font-headline text-3xl font-bold">Workout Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Política de privacidad · Privacy policy
        </p>
        <nav className="mt-4 flex gap-3 text-sm">
          <a href="#es" className="text-primary underline">
            Español
          </a>
          <a href="#en" className="text-primary underline">
            English
          </a>
        </nav>
      </header>

      {/* ---------------------------------------------------------------- ES */}
      <article id="es" className="scroll-mt-8">
        <h2 className="mt-10 font-headline text-2xl font-bold">Política de privacidad</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Última actualización: {LAST_UPDATED_ES}
        </p>

        <Section title="Quién es responsable">
          <p>
            Workout Planner está desarrollada por <strong>{OWNER}</strong>. Para cualquier duda
            sobre esta política o sobre tus datos, escribe a <strong>{CONTACT_EMAIL}</strong>.
          </p>
        </Section>

        <Section title="Qué datos recoge la app">
          <p>Workout Planner solo recoge lo que necesita para funcionar como diario de entrenamiento.</p>
          <p className="font-medium text-foreground">Al crear una cuenta</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tu dirección de correo electrónico, para identificar tu cuenta.</li>
          </ul>
          <p className="font-medium text-foreground">Al usar la app</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Tus entrenamientos: ejercicios, series, repeticiones, pesos, tiempos, RPE y las notas
              que escribas.
            </li>
            <li>Tus rutinas y tus ejercicios personalizados.</li>
            <li>Tus preferencias: idioma, unidades y tiempos de descanso.</li>
            <li>
              Si decides introducirlas, medidas corporales: peso, grasa corporal y perímetros.
            </li>
          </ul>
          <p className="font-medium text-foreground">Qué NO recoge nunca</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Tu ubicación.</li>
            <li>Tus contactos, fotos o archivos.</li>
            <li>Datos de Apple Salud ni de Google Fit.</li>
            <li>
              Identificadores de publicidad. La app no tiene anuncios ni SDK de analítica o
              atribución.
            </li>
          </ul>
        </Section>

        <Section title="Para qué los usamos">
          <p>
            Solo para prestar el servicio: guardar tu historial, sincronizarlo entre tus
            dispositivos y calcular las estadísticas que ves en la app. Tus datos no se usan para
            perfilarte, no se venden y no se usan con fines publicitarios.
          </p>
        </Section>

        <Section title="Dónde se guardan">
          <p>
            En <strong>Google Firebase</strong> (Firebase Authentication y Cloud Firestore), que
            actúa como proveedor de alojamiento y los procesa por cuenta nuestra bajo sus propias
            condiciones. Las transferencias van por HTTPS y Firestore cifra los datos en reposo.
          </p>
          <p>
            Las reglas de seguridad restringen cada documento a su propietario: una persona
            autenticada solo puede leer y escribir sus propios datos.
          </p>
        </Section>

        <Section title="Con quién se comparten">
          <p>
            Con nadie, más allá del alojamiento en Firebase descrito arriba. No hay anunciantes, ni
            intermediarios de datos, ni proveedores de analítica.
          </p>
          <p>
            Si usas la función de compartir, la imagen generada se entrega a la app que elijas en el
            menú de tu dispositivo. Lo que ocurra después se rige por la política de esa app.
          </p>
        </Section>

        <Section title="El modo de ejemplo">
          <p>
            La pantalla de inicio ofrece «Explorar con datos de ejemplo». Ese modo usa datos
            inventados que solo existen en la memoria de tu dispositivo, no envía nada a ningún
            servidor y no guarda nada.
          </p>
        </Section>

        <Section title="Datos sin conexión en tu dispositivo">
          <p>
            Para que la app funcione sin conexión, Firestore guarda una copia de tus datos en el
            dispositivo. Al cerrar sesión o desinstalar la app, esa copia se elimina.
          </p>
        </Section>

        <Section title="Cuánto tiempo se conservan">
          <p>
            Mientras exista tu cuenta. Si la eliminas, tus datos se eliminan con ella.
          </p>
        </Section>

        <Section title="Tus derechos">
          <ul className="list-disc space-y-1 pl-5">
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
        </Section>

        <Section title="Menores">
          <p>
            La app no está dirigida a menores de 13 años y no recogemos sus datos de forma
            consciente.
          </p>
        </Section>

        <Section title="Cambios">
          <p>
            Si esta política cambia, cambia la fecha del encabezado y la nueva versión se publica en
            esta misma dirección.
          </p>
        </Section>
      </article>

      {/* ---------------------------------------------------------------- EN */}
      <article id="en" className="mt-16 scroll-mt-8 border-t border-border pt-10">
        <h2 className="font-headline text-2xl font-bold">Privacy policy</h2>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {LAST_UPDATED_EN}</p>

        <Section title="Who is responsible">
          <p>
            Workout Planner is developed by <strong>{OWNER}</strong>. For any question about this
            policy or your data, write to <strong>{CONTACT_EMAIL}</strong>.
          </p>
        </Section>

        <Section title="What the app collects">
          <p>Workout Planner only collects what it needs to work as a training log.</p>
          <p className="font-medium text-foreground">When you create an account</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your email address, to identify your account.</li>
          </ul>
          <p className="font-medium text-foreground">When you use the app</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Your workouts: exercises, sets, repetitions, weights, times, RPE and any notes you
              write.
            </li>
            <li>Your routines and your custom exercises.</li>
            <li>Your preferences: language, units and rest times.</li>
            <li>If you choose to enter them, body measurements: weight, body fat and girths.</li>
          </ul>
          <p className="font-medium text-foreground">What it never collects</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>Your location.</li>
            <li>Your contacts, photos or files.</li>
            <li>Data from Apple Health or Google Fit.</li>
            <li>
              Advertising identifiers. There are no ads and no analytics or attribution SDKs in the
              app.
            </li>
          </ul>
        </Section>

        <Section title="Why we collect it">
          <p>
            Only to provide the service: storing your training history, syncing it between your
            devices, and computing the statistics the app shows you. Your data is not used to
            profile you, is not sold, and is not used for advertising.
          </p>
        </Section>

        <Section title="Where your data is stored">
          <p>
            In <strong>Google Firebase</strong> (Firebase Authentication and Cloud Firestore), which
            acts as the hosting provider and processes it on our behalf under their own terms.
            Transfers use HTTPS and Firestore encrypts data at rest.
          </p>
          <p>
            Security rules restrict every document to its owner: a signed-in user can only read and
            write their own data.
          </p>
        </Section>

        <Section title="Who we share it with">
          <p>
            Nobody, other than the Firebase hosting described above. There are no advertisers, data
            brokers or analytics providers.
          </p>
          <p>
            If you use the app&apos;s share feature, the image it generates is handed to whichever
            app you pick from your device&apos;s share sheet. What happens next is governed by that
            app&apos;s own policy.
          </p>
        </Section>

        <Section title="Demo mode">
          <p>
            The sign-in screen offers &ldquo;Explore with sample data&rdquo;. That mode uses invented
            data held only in your device&apos;s memory, sends nothing to any server, and stores
            nothing.
          </p>
        </Section>

        <Section title="Offline data on your device">
          <p>
            So the app works without a connection, Firestore caches a copy of your data on your
            device. Signing out or uninstalling the app clears it.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>For as long as your account exists. If you delete it, your data goes with it.</p>
        </Section>

        <Section title="Your rights">
          <ul className="list-disc space-y-1 pl-5">
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
        </Section>

        <Section title="Children">
          <p>
            The app is not aimed at children under 13 and we do not knowingly collect their data.
          </p>
        </Section>

        <Section title="Changes">
          <p>
            If this policy changes, the date at the top changes and the new version is published at
            this same address.
          </p>
        </Section>
      </article>

      <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
        <a href="./" className="text-primary underline">
          Workout Planner
        </a>
      </footer>
    </main>
  );
}
