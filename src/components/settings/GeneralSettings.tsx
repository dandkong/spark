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

const contextLimitMax = 100;
const contextLimitUnlimitedValue = contextLimitMax;
const languageOptions: LanguagePreference[] = ["system", "en-US", "zh-CN"];

export default function GeneralSettings({
  settings,
  onChange,
}: {
  settings: UserPreferences;
  onChange: (settings: UserPreferences) => void;
}) {
  const { t } = useI18n();
  const contextLimitMarks = [
    { label: "0", value: 0 },
    { label: "25", value: 25 },
    { label: "50", value: 50 },
    { label: "75", value: 75 },
    { label: t("settings.general.unlimited"), value: contextLimitUnlimitedValue },
  ] as const;
  const contextLimitValue =
    settings.contextMessageLimit === null
      ? contextLimitUnlimitedValue
      : settings.contextMessageLimit;
  const contextLimitLabel =
    settings.contextMessageLimit === null
      ? t("settings.general.unlimited")
      : String(contextLimitValue);

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

        <section className="grid gap-3 rounded-lg border p-3">
          <div className="text-sm font-medium">
            {t("settings.general.conversation")}
          </div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                {t("settings.general.contextMessages")}
              </span>
              <span className="text-sm text-muted-foreground">
                {contextLimitLabel}
              </span>
            </div>
            <div className="grid gap-2">
              <Slider
                min={0}
                max={contextLimitMax}
                step={1}
                value={[contextLimitValue]}
                onValueChange={([value]) => {
                  const contextMessageLimit =
                    value >= contextLimitUnlimitedValue
                      ? null
                      : Math.round(value);
                  onChange({ ...settings, contextMessageLimit });
                }}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                {contextLimitMarks.map((option) => (
                  <span key={option.label}>{option.label}</span>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </SettingsContent>
  );
}
