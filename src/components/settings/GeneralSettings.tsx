import type { UserPreferences } from "@/lib/preferences-storage";
import type { LanguagePreference } from "@/i18n";
import { useI18n } from "@/i18n";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SettingsContent, SettingsHeader } from "./shared";

const languageOptions: LanguagePreference[] = ["system", "en-US", "zh-CN"];

export default function GeneralSettings({
  settings,
  onChange,
}: {
  settings: UserPreferences;
  onChange: (settings: UserPreferences) => void;
}) {
  const { t } = useI18n();
  return (
    <SettingsContent>
      <SettingsHeader title={t("settings.general.title")} />

      <div className="grid gap-3">
        <section className="grid gap-3 rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">
              {t("settings.general.language")}
            </span>
            <Select
              value={settings.language}
              onValueChange={(language) =>
                onChange({ ...settings, language: language as LanguagePreference })
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue>
                  {(language) =>
                    language
                      ? t(`language.${language as LanguagePreference}`)
                      : ""
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {languageOptions.map((language) => (
                  <SelectItem key={language} value={language}>
                    {t(`language.${language}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="text-sm font-medium">{t("settings.general.display")}</div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {t("settings.general.chatFontSize")}
              </span>
              <span className="text-sm text-muted-foreground">
                {settings.chatMessageFontSize}px
              </span>
            </div>
            <Slider
              min={12}
              max={22}
              step={1}
              value={[settings.chatMessageFontSize]}
              onValueChange={([chatMessageFontSize]) =>
                onChange({ ...settings, chatMessageFontSize })
              }
            />
          </div>
        </section>
      </div>
    </SettingsContent>
  );
}
