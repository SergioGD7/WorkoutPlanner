
"use client";

import { useLanguage } from "@/context/language-context";
import { Button } from "@/components/ui/button";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex gap-1">
      <Button
        variant={language === "en" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setLanguage("en")}
        className="font-bold"
      >
        EN
      </Button>
      <Button
        variant={language === "es" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setLanguage("es")}
        className="font-bold"
      >
        ES
      </Button>
    </div>
  );
}
