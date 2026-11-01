import { ArrowDown, ArrowUp, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type {
  RoleSortDirection,
  RoleSortKey,
  RoleTypeFilter,
} from "@/types/role";

const TYPE_OPTIONS: RoleTypeFilter[] = ["all", "system", "custom"];

const SORT_OPTIONS: Array<{ key: RoleSortKey; labelKey: string }> = [
  { key: "name", labelKey: "roles.search.sortName" },
  { key: "users", labelKey: "roles.search.sortUsers" },
  { key: "createdAt", labelKey: "roles.search.sortCreated" },
];

interface RoleSearchBarProps {
  value: string;
  onValueChange: (value: string) => void;
  typeFilter: RoleTypeFilter;
  onTypeFilterChange: (filter: RoleTypeFilter) => void;
  sortKey: RoleSortKey;
  sortDirection: RoleSortDirection;
  onSortKeyChange: (key: RoleSortKey) => void;
  onSortDirectionChange: (direction: RoleSortDirection) => void;
  onClearFilters: () => void;
}

export function RoleSearchBar({
  value,
  onValueChange,
  typeFilter,
  onTypeFilterChange,
  sortKey,
  sortDirection,
  onSortKeyChange,
  onSortDirectionChange,
  onClearFilters,
}: RoleSearchBarProps) {
  const { t } = useTranslation();
  const activeCount = Number(value.trim().length > 0) + Number(typeFilter !== "all");

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex h-8 min-w-52 max-w-md flex-1 items-center rounded-sm border border-slate-300 bg-white focus-within:border-slate-400">
          <Search className="ms-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder={t("roles.search.placeholder")}
            aria-label={t("roles.search.placeholder")}
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
          />
          {value && (
            <button
              type="button"
              onClick={() => onValueChange("")}
              aria-label={t("roles.search.clear")}
              className="px-1.5 text-slate-400 transition-colors hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-sm border-slate-300 px-2.5 text-[13px] font-normal"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("roles.search.filters")}
              {activeCount > 0 && (
                <span className="grid h-4 min-w-4 place-content-center rounded-sm bg-slate-700 px-1 text-[10px] font-semibold text-white">
                  {activeCount}
                </span>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-72 rounded-sm p-3 text-[13px]">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t("roles.search.type")}
              </p>
              <div className="flex flex-wrap gap-1">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => onTypeFilterChange(option)}
                    className={cn(
                      "rounded-sm border px-2.5 py-1 text-xs transition-colors",
                      typeFilter === option
                        ? "border-slate-700 bg-slate-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {t(`roles.typeFilter.${option}`)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {t("roles.search.sortBy")}
              </p>
              <div className="flex flex-col gap-1">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => onSortKeyChange(option.key)}
                    className={cn(
                      "flex items-center justify-between rounded-sm px-2 py-1.5 text-start text-xs transition-colors",
                      sortKey === option.key
                        ? "bg-slate-100 font-medium text-slate-900"
                        : "text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {t(option.labelKey)}
                    {sortKey === option.key && (
                      <span className="text-[10px] uppercase text-slate-400">
                        {t(
                          sortDirection === "asc"
                            ? "roles.search.asc"
                            : "roles.search.desc"
                        )}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() =>
                  onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")
                }
              >
                {sortDirection === "asc" ? (
                  <ArrowUp className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" />
                )}
                {t(
                  sortDirection === "asc"
                    ? "roles.search.asc"
                    : "roles.search.desc"
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-slate-500"
                onClick={onClearFilters}
              >
                {t("roles.search.clear")}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {(value.trim().length > 0 || typeFilter !== "all") && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {t("roles.search.active")}
          </span>
          {value.trim().length > 0 && (
            <Facet
              label={`"${value.trim()}"`}
              removeLabel={t("roles.search.clear")}
              onRemove={() => onValueChange("")}
            />
          )}
          {typeFilter !== "all" && (
            <Facet
              label={t(`roles.typeFilter.${typeFilter}`)}
              removeLabel={t("roles.search.clear")}
              onRemove={() => onTypeFilterChange("all")}
            />
          )}
          <button
            type="button"
            onClick={onClearFilters}
            className="text-xs text-slate-500 underline-offset-2 hover:text-slate-700 hover:underline"
          >
            {t("roles.search.clear")}
          </button>
        </div>
      )}
    </div>
  );
}

function Facet({
  label,
  removeLabel,
  onRemove,
}: {
  label: string;
  removeLabel: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-sm border border-slate-300 bg-slate-50 py-0.5 pe-0.5 ps-1.5 text-xs text-slate-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="grid h-4 w-4 place-content-center rounded-sm text-slate-400 hover:bg-slate-200 hover:text-slate-700"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
