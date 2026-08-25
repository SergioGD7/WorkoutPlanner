"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, BellRing, CalendarClock, ChevronLeft, Target, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { withBasePath } from "@/lib/base-path";
import BackupDataForm from "@/components/backup-data-form";
import ImportHistoryForm from "@/components/import-history-form";
import DeleteAccountDialog from "@/components/delete-account-dialog";
import ChangePasswordForm from "@/components/change-password-form";
import LanguageSwitcher from "@/components/language-switcher";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { useLanguage } from "@/context/language-context";
import { useProfile } from "@/context/profile-context";
import { useRestTimer } from "@/context/rest-timer-context";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_PROGRESSION, PROGRESSION_LABELS, PROGRESSION_RULES } from "@/lib/progression";
import { scheduleTestNotification } from "@/lib/rest-notifications";
import { fromKg, toKg, trimZeros, weightStep } from "@/lib/workout-utils";
import type { ProgressionRule, WeightUnit } from "@/lib/types";

const REST_PRESETS = [45, 60, 90, 120, 180, 240];


export default function AdvancedSettingsPage() {
  const { t, language } = useLanguage();
  const { settings, updateSettings } = useProfile();
  const { requestNotificationPermission } = useRestTimer();
  const { toast } = useToast();
  const router = useRouter();

  const unit = settings.weightUnit;
  // The field is free text while it is being typed, so a half-entered "7" does
  // not get committed as a 7 kg target. It syncs back whenever the stored goal
  // or the unit changes.
  const [goalInput, setGoalInput] = useState("");
  useEffect(() => {
    setGoalInput(
      settings.bodyWeightGoal === undefined
        ? ""
        : String(Number(fromKg(settings.bodyWeightGoal, unit).toFixed(1))),
    );
  }, [settings.bodyWeightGoal, unit]);

  const commitGoal = () => {
    if (goalInput.trim() === "") {
      void updateSettings({ bodyWeightGoal: undefined });
      return;
    }
    const parsed = Number(goalInput.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    void updateSettings({ bodyWeightGoal: toKg(parsed, unit) });
  };

  const progression = settings.defaultProgression ?? DEFAULT_PROGRESSION;

  // The increment is optional: empty means "whatever a standard plate pair is",
  // which is what most gyms have. Typed freely for the same reason as the goal.
  const defaultStep = weightStep(unit);
  const [stepInput, setStepInput] = useState("");
  useEffect(() => {
    setStepInput(
      progression.step === undefined
        ? ""
        : trimZeros(fromKg(progression.step, unit)),
    );
  }, [progression.step, unit]);

  const commitStep = () => {
    const next = { ...progression };
    if (stepInput.trim() === "") {
      delete next.step;
    } else {
      const parsed = Number(stepInput.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed <= 0) return;
      next.step = toKg(parsed, unit);
    }
    void updateSettings({ defaultProgression: next });
  };

  const handleTestNotification = async () => {
    const result = await scheduleTestNotification(
      5,
      t("testNotificationTitle"),
      t("testNotificationBody"),
    );

    if (result === "scheduled") {
      toast({ title: t("testNotification"), description: t("testNotificationScheduled") });
      return;
    }

    toast({
      variant: "destructive",
      title: t("error"),
      description:
        result === "denied"
          ? t("notificationsDenied")
          : result === "unavailable"
            ? t("testNotificationUnavailable")
            : t("testNotificationFailed"),
    });
  };

  const handleReminderToggle = async (enabled: boolean) => {
    if (!enabled) {
      await updateSettings({ workoutReminderEnabled: false });
      return;
    }

    const granted = await requestNotificationPermission();
    if (!granted) {
      toast({
        variant: "destructive",
        title: t("error"),
        description: t("notificationsDenied"),
      });
      return;
    }
    await updateSettings({ workoutReminderEnabled: true });
  };

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
        <main
          className="mx-auto w-full max-w-4xl flex-1 p-4 md:p-6"
          style={{ paddingTop: "calc(1rem + env(safe-area-inset-top))" }}
        >
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

                  {/* Whether an alert survives being backgrounded depends on
                      permissions, exact-alarm access and the manufacturer's
                      battery saver — none of which are visible from in here.
                      This is the short loop for finding out. */}
                  {settings.restTimerNotifications && (
                    <div className="flex items-center justify-between gap-4">
                      <Label className="pr-2 font-normal text-muted-foreground">
                        {t("testNotificationHint")}
                      </Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleTestNotification()}
                        className="shrink-0"
                      >
                        <BellRing className="mr-2 h-4 w-4" />
                        {t("testNotification")}
                      </Button>
                    </div>
                  )}
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <Label
                      htmlFor="workout-reminder"
                      className="pr-2"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-muted-foreground" />
                        {t("workoutReminder")}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {t("workoutReminderHint")}
                      </span>
                    </Label>
                    <Switch
                      id="workout-reminder"
                      checked={settings.workoutReminderEnabled}
                      onCheckedChange={(checked) => void handleReminderToggle(checked)}
                    />
                  </div>

                  {settings.workoutReminderEnabled && (
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="reminder-time">{t("workoutReminderTime")}</Label>
                      <Input
                        id="reminder-time"
                        type="time"
                        value={settings.workoutReminderTime}
                        onChange={(event) =>
                          void updateSettings({ workoutReminderTime: event.target.value })
                        }
                        className="w-[170px] shrink-0"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="body-weight-goal" className="pr-2">
                      <span className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-muted-foreground" />
                        {t("bodyWeightGoal")}
                      </span>
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {t("bodyWeightGoalHint")}
                      </span>
                    </Label>
                    <div className="relative w-[170px] shrink-0">
                      <Input
                        id="body-weight-goal"
                        type="number"
                        inputMode="decimal"
                        step="0.1"
                        value={goalInput}
                        placeholder={t("noGoal")}
                        onChange={(event) => setGoalInput(event.target.value)}
                        onBlur={commitGoal}
                        className="pr-10"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {unit}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    {/* No sub-hint here: the rule's own description sits right
                        below the row and says more than a generic one would. */}
                    <Label htmlFor="default-progression" className="flex items-center gap-2 pr-2">
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                      {t("progressionRule")}
                    </Label>
                    <Select
                      value={progression.rule}
                      onValueChange={(value) =>
                        void updateSettings({
                          defaultProgression: { ...progression, rule: value as ProgressionRule },
                        })
                      }
                    >
                      <SelectTrigger id="default-progression" className="w-[170px] shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROGRESSION_RULES.map((rule) => (
                          <SelectItem key={rule} value={rule}>
                            {t(PROGRESSION_LABELS[rule].name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* The rules differ enough that the name alone is not much help. */}
                  <p className="-mt-2 text-xs text-muted-foreground">
                    {t(PROGRESSION_LABELS[progression.rule].description)}
                  </p>

                  {/* Meaningless for rules that never touch the load. */}
                  {progression.rule !== "none" && progression.rule !== "time" && (
                    <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="progression-step" className="pr-2">
                        {t("progressionStep")}
                        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                          {t("progressionStepHint", {
                            default: `${trimZeros(defaultStep)} ${unit}`,
                          })}
                        </span>
                      </Label>
                      <div className="relative w-[170px] shrink-0">
                        <Input
                          id="progression-step"
                          type="number"
                          inputMode="decimal"
                          step="0.25"
                          min="0"
                          value={stepInput}
                          placeholder={trimZeros(defaultStep)}
                          onChange={(event) => setStepInput(event.target.value)}
                          onBlur={commitStep}
                          className="pr-10"
                        />
                        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          {unit}
                        </span>
                      </div>
                    </div>
                  )}

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
                <div className="space-y-4">
                  <BackupDataForm />
                  <ImportHistoryForm />
                </div>
              </section>

              <section className="rounded-xl border border-border/50 bg-card p-6 shadow-sm">
                <h3 className="mb-2 font-headline text-lg font-semibold">{t("privacyPolicy")}</h3>
                {/* A relative href resolved to /settings/privacy inside the
                    native WebView, which does not exist: the native build uses
                    trailing slashes, so the page URL is /settings/advanced/ and
                    ".." only climbs to /settings/. An absolute path with the
                    deploy prefix is correct in both places. */}
                {/* The language rides along in the URL. `target="_blank"` hands
                    the link to the system browser, which does not share the
                    WebView's storage — so the page cannot read the app's saved
                    language and would fall back to the phone's. */}
                <a
                  href={`${withBasePath('/privacy')}?lang=${language}`}
                  className="text-sm text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {t("privacyPolicy")}
                </a>
              </section>

              {/* Both stores require an in-app route to account deletion. */}
              <section className="rounded-xl border border-destructive/30 bg-card p-6 shadow-sm">
                <h3 className="mb-4 font-headline text-lg font-semibold text-destructive">
                  {t("dangerZone")}
                </h3>
                <DeleteAccountDialog />
              </section>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
