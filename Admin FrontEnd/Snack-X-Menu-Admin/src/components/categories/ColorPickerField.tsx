import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface ColorPickerFieldProps {
  value: string;
  onChange: (color: string) => void;
  disabled?: boolean;
}

const PRESET_COLORS = [
  { label: "Orange", value: "#f97316" },
  { label: "Teal", value: "#14b8a6" },
  { label: "Violet", value: "#a78bfa" },
  { label: "Amber", value: "#facc15" },
  { label: "Rose", value: "#fb7185" },
  { label: "Sky", value: "#38bdf8" },
  { label: "Emerald", value: "#34d399" },
  { label: "Slate", value: "#94a3b8" },
  { label: "Red", value: "#ef4444" },
  { label: "Indigo", value: "#6366f1" },
  { label: "Pink", value: "#ec4899" },
  { label: "Lime", value: "#84cc16" },
];

function isValidHex(hex: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex);
}

export function ColorPickerField({
  value,
  onChange,
  disabled = false,
}: ColorPickerFieldProps) {
  const { t } = useTranslation();
  const [hexInput, setHexInput] = useState(value);
  const [isCustom, setIsCustom] = useState(
    !PRESET_COLORS.some((c) => c.value === value)
  );

  const handlePresetClick = useCallback(
    (color: string) => {
      onChange(color);
      setHexInput(color);
      setIsCustom(false);
    },
    [onChange]
  );

  const handleHexChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      let raw = e.target.value;
      if (!raw.startsWith("#")) raw = "#" + raw;
      setHexInput(raw);
      if (isValidHex(raw)) {
        onChange(raw);
        setIsCustom(true);
      }
    },
    [onChange]
  );

  const handleHexBlur = useCallback(() => {
    if (!isValidHex(hexInput)) {
      setHexInput(value);
    }
  }, [hexInput, value]);

  return (
    <div className="space-y-3">
      {/* Preset swatches */}
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color.value}
            type="button"
            onClick={() => handlePresetClick(color.value)}
            disabled={disabled}
            className={cn(
              "relative h-8 w-8 rounded-full transition-transform hover:scale-110",
              value === color.value && "ring-2 ring-offset-2 ring-slate-900"
            )}
            style={{ backgroundColor: color.value }}
            aria-label={color.label}
            aria-pressed={value === color.value}
          >
            {value === color.value && (
              <Check className="absolute inset-0 m-auto h-4 w-4 text-white drop-shadow-sm" />
            )}
          </button>
        ))}
      </div>

      {/* Custom hex input */}
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 shrink-0 rounded-full border border-slate-200"
          style={{ backgroundColor: value }}
          aria-hidden="true"
        />
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            #
          </span>
          <Input
            type="text"
            value={hexInput.replace("#", "")}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
              const prefixed = "#" + raw;
              setHexInput(prefixed);
              if (isValidHex(prefixed)) {
                onChange(prefixed);
                setIsCustom(true);
              }
            }}
            onBlur={handleHexBlur}
            disabled={disabled}
            placeholder="000000"
            maxLength={6}
            className="h-8 pl-7 text-sm font-mono"
            aria-label={t("categories.colorPicker.hexLabel")}
          />
        </div>
      </div>
    </div>
  );
}
