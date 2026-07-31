import AuthGuard from "@/components/auth-guard";
import Settings from "@/components/settings";

export default function SettingsPage() {
  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full bg-background flex-col overflow-y-auto">
        <main
          className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
        >
          <Settings />
        </main>
      </div>
    </AuthGuard>
  );
}
