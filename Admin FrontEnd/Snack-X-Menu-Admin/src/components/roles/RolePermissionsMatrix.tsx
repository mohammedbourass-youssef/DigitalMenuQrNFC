import { useMemo, useState } from "react";
import {
  AlertCircle,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  EMPTY_ROLE_PERMISSIONS,
  FULL_ROLE_PERMISSIONS,
  buildRoleMatrixFeatures,
  countEnabledPermissions,
  filterMatrixFeatures,
  hasAnyPermission,
  isActionSelected,
  toggleAllFeaturePermissions,
  togglePermissionAction,
} from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { FeaturePermission } from "@/types/permissions";
import type {
  RolePermissionAction,
  RolePermissionFlags,
  RolePermissionState,
} from "@/types/role";

const ACTIONS: Array<{
  key: RolePermissionAction;
  labelKey: string;
  icon: LucideIcon;
}> = [
  { key: "read", labelKey: "roles.matrix.read", icon: Eye },
  { key: "add", labelKey: "roles.matrix.add", icon: Plus },
  { key: "edit", labelKey: "roles.matrix.edit", icon: Pencil },
  { key: "delete", labelKey: "roles.matrix.delete", icon: Trash2 },
];

interface RolePermissionsMatrixProps {
  features: FeaturePermission[];
  featureNames?: ReadonlyMap<string, string>;
  state: RolePermissionState;
  onChange: (state: RolePermissionState) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: boolean;
}

export function RolePermissionsMatrix({
  features,
  featureNames,
  state,
  onChange,
  disabled = false,
  loading = false,
  error = false,
}: RolePermissionsMatrixProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");

  const allRows = useMemo(
    () => buildRoleMatrixFeatures(features, state, featureNames),
    [features, state, featureNames]
  );
  const rows = useMemo(() => filterMatrixFeatures(allRows, search), [allRows, search]);
  const featureIds = useMemo(() => allRows.map((row) => row.id), [allRows]);

  const enabled = countEnabledPermissions(state, featureIds);
  const total = allRows.length * ACTIONS.length;

  const columnState = (action: RolePermissionAction) => {
    if (rows.length === 0) return false;
    const selected = rows.filter((row) => isActionSelected(state, row.id, action)).length;
    if (selected === 0) return false;
    return selected === rows.length ? true : "indeterminate";
  };

  const handleColumnChange = (action: RolePermissionAction, checked: boolean) => {
    let next = state;
    for (const row of rows) {
      next = togglePermissionAction(next, row.id, action, checked);
    }
    onChange(next);
  };

  const handleSelectAll = () => {
    let next = state;
    for (const row of rows) {
      next = { ...next, [row.id]: { ...FULL_ROLE_PERMISSIONS } };
    }
    onChange(next);
  };

  const handleClearAll = () => {
    let next = state;
    for (const row of rows) {
      next = { ...next, [row.id]: { ...EMPTY_ROLE_PERMISSIONS } };
    }
    onChange(next);
  };

  const masterState =
    rows.length === 0
      ? false
      : rows.every((row) => {
          const flags = state[row.id];
          return (
            flags?.read === true &&
            flags.add === true &&
            flags.edit === true &&
            flags.delete === true
          );
        });

  if (loading) {
    return <MatrixSkeleton />;
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        {t("roles.matrix.unavailable")}
      </div>
    );
  }

  if (allRows.length === 0) {
    return (
      <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
        {t("roles.matrix.noFeatures")}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex h-8 min-w-48 max-w-xs flex-1 items-center rounded-sm border border-slate-300 bg-white focus-within:border-slate-400">
          <Search className="ms-2 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("roles.matrix.search")}
            aria-label={t("roles.matrix.search")}
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label={t("roles.search.clear")}
              className="px-1.5 text-slate-400 hover:text-slate-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">
            {t("roles.matrix.counter", { enabled, total })}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleSelectAll}
            disabled={disabled || rows.length === 0 || masterState === true}
          >
            {t("roles.matrix.selectAll")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-500"
            onClick={handleClearAll}
            disabled={disabled || rows.length === 0 || enabled === 0}
          >
            {t("roles.matrix.clearAll")}
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-sm border border-slate-200">
        <div className="max-h-[56vh] overflow-auto">
          <table
            className="w-full min-w-[620px] text-[13px]"
            aria-label={t("roles.form.permissionsLabel")}
          >
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th scope="col" className="px-3 py-2 text-start font-semibold">
                  {t("roles.matrix.feature")}
                </th>
                {ACTIONS.map(({ key, labelKey, icon: Icon }) => (
                  <th
                    key={key}
                    scope="col"
                    className="w-20 px-2 py-2 text-center font-semibold"
                  >
                    <label className="flex cursor-pointer flex-col items-center gap-1">
                      <Checkbox
                        checked={columnState(key)}
                        onCheckedChange={(value) => handleColumnChange(key, value === true)}
                        disabled={disabled}
                        aria-label={t("roles.matrix.selectColumn", {
                          action: t(labelKey),
                        })}
                      />
                      <span className="inline-flex items-center gap-1 text-[11px] font-normal">
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {t(labelKey)}
                      </span>
                    </label>
                  </th>
                ))}
                <th scope="col" className="w-16 px-2 py-2 text-center font-semibold">
                  {t("roles.matrix.all")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={ACTIONS.length + 2}
                    className="px-3 py-8 text-center text-sm text-slate-500"
                  >
                    {t("roles.matrix.noResults")}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const flags: RolePermissionFlags =
                    state[row.id] ?? EMPTY_ROLE_PERMISSIONS;
                  const all = flags.read && flags.add && flags.edit && flags.delete;
                  const some = hasAnyPermission(state, row.id);

                  return (
                    <tr
                      key={row.id}
                      className="border-t border-slate-100 hover:bg-slate-50/70"
                    >
                      <th
                        scope="row"
                        className={cn(
                          "max-w-64 px-3 py-2 text-start font-normal",
                          some ? "text-slate-800" : "text-slate-400"
                        )}
                      >
                        <span className="block truncate" title={row.name}>
                          {row.name}
                        </span>
                      </th>
                      {ACTIONS.map(({ key, labelKey }) => (
                        <td key={key} className="px-2 py-2 text-center">
                          <Checkbox
                            checked={isActionSelected(state, row.id, key)}
                            onCheckedChange={(value) =>
                              onChange(
                                togglePermissionAction(state, row.id, key, value === true)
                              )
                            }
                            disabled={disabled}
                            aria-label={`${t(labelKey)} — ${row.name}`}
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center">
                        <Checkbox
                          checked={all ? true : some ? "indeterminate" : false}
                          onCheckedChange={(value) =>
                            onChange(
                              toggleAllFeaturePermissions(state, row.id, value === true)
                            )
                          }
                          disabled={disabled}
                          aria-label={t("roles.matrix.selectRow", { feature: row.name })}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {disabled && (
        <p className="text-xs text-slate-500">{t("roles.matrix.disabledHint")}</p>
      )}
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <div className="space-y-2 rounded-sm border border-slate-200 p-3" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex items-center gap-4">
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-4 rounded-sm" />
        </div>
      ))}
    </div>
  );
}
