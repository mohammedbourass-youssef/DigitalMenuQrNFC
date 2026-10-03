import { Loader2 } from "lucide-react";
import { useState, type ChangeEvent, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { validateStatusName } from "@/lib/statusNameValidation";

interface AddStatusInputProps {
  existingNames: string[];
  isSaving: boolean;
  error: string | null;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}

export function AddStatusInput({
  existingNames,
  isSaving,
  error,
  onSubmit,
  onCancel,
}: AddStatusInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState("");
  const [duplicate, setDuplicate] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value);
    setDuplicate(false);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (isSaving) return;
    const result = validateStatusName(value, existingNames);
    if (!result.ok) {
      setDuplicate(result.reason === "duplicate");
      return;
    }
    setDuplicate(false);
    onSubmit(result.value);
  };

  const message = error ?? (duplicate ? t("orders.board.statusExists") : null);

  return (
    <div className="flex h-40 w-64 shrink-0 flex-col justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 p-3 dark:border-slate-600">
      <div className="flex items-center gap-2">
        <Input
          autoFocus
          value={value}
          disabled={isSaving}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!isSaving && value.trim() === "") onCancel();
          }}
          placeholder={t("orders.board.statusNamePlaceholder")}
          aria-label={t("orders.board.statusNamePlaceholder")}
          aria-invalid={message !== null}
          aria-describedby={message ? "add-status-error" : undefined}
          className="flex-1"
        />
        {isSaving && (
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />
        )}
      </div>
      {message && (
        <p role="alert" className="text-xs text-red-500 dark:text-red-400" id="add-status-error">
          {message}
        </p>
      )}
    </div>
  );
}