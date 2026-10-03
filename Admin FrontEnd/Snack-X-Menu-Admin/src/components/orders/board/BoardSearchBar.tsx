import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";

interface BoardSearchBarProps {
  value: string;
  onValueChange: (value: string) => void;
}

const DEBOUNCE_MS = 300;

export function BoardSearchBar({ value, onValueChange }: BoardSearchBarProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState(value);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setInput(value);
  }, [value]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (input !== value) onValueChange(input);
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [input, onValueChange, value]);

  return (
    <div className="w-full sm:max-w-sm">
      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          aria-hidden
        />
        <Input
          type="search"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("orders.board.searchPlaceholder")}
          className="h-10 rounded-full ps-9 pe-9"
          aria-label={t("orders.board.searchPlaceholder")}
        />
        {input && (
          <button
            type="button"
            onClick={() => setInput("")}
            className="absolute end-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label={t("common.clear")}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}