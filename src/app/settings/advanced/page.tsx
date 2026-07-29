"use client";

import { useRouter } from "next/navigation";
import { Bell, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import AuthGuard from "@/components/auth-guard";
import BackupDataForm from "@/components/backup-data-form";
import ChangePasswordForm from "@/components/change-password-form";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLanguage } from "@/context/language-context";
import { useProfile } from "@/context/profile-context";
import { useRestTimer } from "@/context/rest-timer-context";
import { useToast } from "@/hooks/use-toast";
import type { WeightUnit } from "@/lib/types";

const REST_PRESETS = [45, 60, 90, 120, 180, 240];

export default function AdvancedSettingsPage() {
  const { t } = useLanguage();
  const { settings, updateSettings } = useProfile();
  const { requestNotificationPermission } = useRestTimer();
  const { toast } = useToast();
  const router = useRouter();

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!enabled) {
      await updateSettings({ restTimerNotifications: false });
      return;
    }

    // Browsers only grant this from a user gesture, which is why it lives here.
    const granted = await requestNotificationPermission();
    if (!granted) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("notificationsDenied"),
      });
      return;
    }
    await updateSettings({ restTimerNotifications: true });
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen w-full flex-col overflow-y-auto bg-background">
        <main className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-6">
          <div className="space-y-6">
            <div className="mb-6 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                className="rounded-full"
                aria-label={t("goBack")}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h2 className="font-headline text-xl font-bold tracking-tight md:text-2xl">
                {t("settings")}
              </h2>
            </div>

            <div className="space-y-8">
              <section className="glass-effect rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 font-headline text-lg font-semibold">
                  {t("preferences")}
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="weight-unit">{t("weightUnit")}</Label>
                    <Select
                      value={settings.weightUnit}
                      onValueChange={(value) =>
                        void updateSettings({ weightUnit: value as WeightUnit })
                      }
                    >
                      <SelectTrigger id="weight-unit" className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kg">{t("kilograms")}</SelectItem>
                        <SelectItem value="lb">{t("pounds")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="rest-enabled" className="pr-2">
                      {t("restTimerEnabled")}
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {t("restTimerEnabledHint")}
                      </span>
                    </Label>
                    <Switch
                      id="rest-enabled"
                      checked={settings.restTimerEnabled}
                      onCheckedChange={(checked) =>
                        void updateSettings({ restTimerEnabled: checked })
                      }
                    />
                  </div>

                  {/* The rest of the timer options are meaningless with it off. */}
                  <div
                    className={`space-y-4 transition-opacity ${
                      settings.restTimerEnabled ? "" : "pointer-events-none opacity-40"
                    }`}
                    aria-hidden={!settings.restTimerEnabled}
                  >
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="default-rest">{t("defaultRest")}</Label>
                    <Select
                      value={String(settings.defaultRestSeconds)}
                      onValueChange={(value) =>
                        void updateSettings({
                          defaultRestSeconds: Number(value),
                        })
                      }
                    >
                      <SelectTrigger id="default-rest" className="w-[170px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REST_PRESETS.map((seconds) => (
                          <SelectItem key={seconds} value={String(seconds)}>
                            {Math.floor(seconds / 60)}:
                            {String(seconds % 60).padStart(2, "0")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="rest-sound">{t("restTimerSound")}</Label>
                    <Switch
                      id="rest-sound"
                      checked={settings.restTimerSound}
                      onCheckedChange={(checked) =>
                        void updateSettings({ restTimerSound: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor="rest-notifications"
                      className="flex items-center gap-2"
                    >
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      {t("restTimerNotifications")}
                    </Label>
                    <Switch
                      id="rest-notifications"
                      checked={settings.restTimerNotifications}
                      onCheckedChange={(checked) =>
                        void handleNotificationToggle(checked)
                      }
                    />
                  </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label>{t("language")}</Label>
                    <LanguageSwitcher />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label>{t("appearance")}</Label>
                    <ThemeSwitcher />
                  </div>
                </div>
              </section>

              <section className="glass-effect rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 font-headline text-lg font-semibold">
                  {t("security")}
                </h3>
                <ChangePasswordForm />
              </section>

              {/* Backup is available to every account, not just one hardcoded address. */}
              <section className="glass-effect rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-4 font-headline text-lg font-semibold">
                  {t("dataManagement")}
                </h3>
                <BackupDataForm />
              </section>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
