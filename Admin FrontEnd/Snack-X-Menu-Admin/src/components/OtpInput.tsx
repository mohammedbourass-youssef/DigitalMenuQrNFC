import { useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";

interface OtpInputProps {
  length?: number;
  value: string[];
  onChange: (value: string[]) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const focusInput = useCallback((index: number) => {
    inputRefs.current[index]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, digit: string) => {
      if (!/^\d*$/.test(digit)) return;

      const newValue = [...value];
      newValue[index] = digit.slice(-1);
      onChange(newValue);

      if (digit && index < length - 1) {
        focusInput(index + 1);
      }

      if (digit && index === length - 1) {
        const full = newValue.join("");
        if (full.length === length) {
          onComplete?.(full);
        }
      }
    },
    [value, onChange, onComplete, length, focusInput]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace" && !value[index] && index > 0) {
        focusInput(index - 1);
      }
    },
    [value, focusInput]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, length);
      if (!pasted) return;

      const newValue = pasted
        .split("")
        .concat(Array(length - pasted.length).fill(""));
      onChange(newValue);

      const focusIndex = Math.min(pasted.length, length - 1);
      focusInput(focusIndex);

      if (pasted.length === length) {
        onComplete?.(pasted);
      }
    },
    [onChange, onComplete, length, focusInput]
  );

  const handleKeyUp = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        const full = value.join("");
        if (full.length === length) {
          onComplete?.(full);
        }
      }
    },
    [value, onComplete, length]
  );

  return (
    <div className="flex justify-center gap-3" role="group" aria-label="One-time password">
      {Array.from({ length }, (_, i) => (
        <Input
          key={i}
          ref={(el) => { inputRefs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] ?? ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onKeyUp={(e) => handleKeyUp(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${i + 1} of ${length}`}
          className="h-14 w-12 text-center text-lg font-bold"
        />
      ))}
    </div>
  );
}
