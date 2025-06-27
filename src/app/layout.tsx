import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from '@/context/language-context';
import { ExerciseProvider } from '@/context/exercise-context';
import { Providers } from '@/components/providers';
import { AuthProvider } from '@/context/auth-context';

export const metadata: Metadata = {
  title: 'Workout Planner',
  description: 'Track your gym progress with Workout Planner.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <Providers>
          <AuthProvider>
            <LanguageProvider>
              <ExerciseProvider>
                {children}
                <Toaster />
              </ExerciseProvider>
            </LanguageProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
