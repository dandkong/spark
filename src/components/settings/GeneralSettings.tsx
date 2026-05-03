import type { UserPreferences } from "@/lib/preferences-storage";
import { Slider } from "@/components/ui/slider";
import { SettingsContent, SettingsHeader } from "./shared";

const contextLimitMax = 100;
const contextLimitUnlimitedValue = contextLimitMax;
const contextLimitMarks = [
  { label: "0", value: 0 },
  { label: "25", value: 25 },
  { label: "50", value: 50 },
  { label: "75", value: 75 },
  { label: "不限", value: contextLimitUnlimitedValue },
] as const;

export default function GeneralSettings({
  settings,
  onChange,
}: {
  settings: UserPreferences;
  onChange: (settings: UserPreferences) => void;
}) {
  const contextLimitValue =
    settings.contextMessageLimit === null
      ? contextLimitUnlimitedValue
      : settings.contextMessageLimit;
  const contextLimitLabel =
    settings.contextMessageLimit === null ? "不限" : String(contextLimitValue);

  return (
    <SettingsContent>
      <SettingsHeader title="通用" />

      <div className="grid gap-3">
        <section className="grid gap-3 rounded-lg border p-3">
          <div className="text-sm font-medium">显示</div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">聊天字号</span>
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
          <div className="text-sm font-medium">对话</div>
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                上下文消息数
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
