import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { RoleSearchBar } from "@/components/roles/RoleSearchBar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePermissions } from "@/contexts/PermissionsContext";
import { usePlanQuota } from "@/hooks/usePlanQuota";
import { useDeleteRoles, useRoles } from "@/hooks/useRoles";
import { useTenantPlanInformations } from "@/hooks/useTenantPlanInformations";
import { readApiError } from "@/lib/apiErrors";
import { isRolesUnavailableError } from "@/lib/roleErrors";
import {
  filterRolesByType,
  getRolePermissionCounts,
  paginateRoles,
  searchRolesByName,
  sortRoles,
} from "@/lib/roles";
import { cn } from "@/lib/utils";
import type {
  RoleItem,
  RoleSortDirection,
  RoleSortKey,
  RoleTypeFilter,
} from "@/types/role";

const PAGE_SIZES = [10, 20, 50, 100] as const;

function formatRoleDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale || "en", { dateStyle: "medium" }).format(date);
}

export default function RolesPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { data: quota } = usePlanQuota();
  const { data: planInfo } = useTenantPlanInformations();

  const canRead = can("Roles", "read");
  const canCreate = can("Roles", "create");
  const canDelete = can("Roles", "delete");

  const query = useRoles(canRead);
  const bulkDeleteMut = useDeleteRoles();

  const allRoles = useMemo(() => query.data ?? [], [query.data]);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<RoleTypeFilter>("all");
  const [sortKey, setSortKey] = useState<RoleSortKey>("name");
  const [sortDirection, setSortDirection] = useState<RoleSortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const dir = i18n.language.startsWith("ar") ? "rtl" : "ltr";

  const filtered = useMemo(() => {
    const byName = searchRolesByName(allRoles, search);
    const byType = filterRolesByType(byName, typeFilter);
    return sortRoles(byType, sortKey, sortDirection, i18n.language);
  }, [allRoles, search, typeFilter, sortKey, sortDirection, i18n.language]);

  const pageData = useMemo(
    () => paginateRoles(filtered, page, pageSize),
    [filtered, page, pageSize]
  );

  useEffect(() => {
    if (page !== pageData.page) setPage(pageData.page);
  }, [page, pageData.page]);

  useEffect(() => {
    setSelectedIds((previous) => {
      if (previous.size === 0) return previous;

      const existing = new Set(allRoles.map((role) => role.id));
      const next = new Set<string>();
      let changed = false;

      for (const id of previous) {
        if (existing.has(id)) next.add(id);
        else changed = true;
      }

      return changed ? next : previous;
    });
  }, [allRoles]);

  const selectedRoles = useMemo(
    () => allRoles.filter((role) => selectedIds.has(role.id) && !role.isSystem),
    [allRoles, selectedIds]
  );

  const selectableRoles = pageData.items.filter((role) => !role.isSystem);
  const allSelected =
    selectableRoles.length > 0 &&
    selectableRoles.every((role) => selectedIds.has(role.id));
  const someSelected = selectableRoles.some((role) => selectedIds.has(role.id));

  const quotaFull = quota?.roles.canAdd === false;
  const usageDisplay = planInfo?.usedRolesFromTotal ?? quota?.roles.display;
  const errorMessage = query.error
    ? readApiError(query.error, t("roles.list.loadError"))
    : null;

  const filteredUsers = useMemo(
    () => filtered.reduce((total, role) => total + role.totalUsersInThisRole, 0),
    [filtered]
  );

  const filtersActive = search.trim().length > 0 || typeFilter !== "all";

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setSearch("");
    setTypeFilter("all");
    resetPage();
  };

  const toggleSort = (key: RoleSortKey) => {
    resetPage();

    if (sortKey === key) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      for (const role of selectableRoles) {
        if (checked) next.add(role.id);
        else next.delete(role.id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (bulkDeleteMut.isPending || selectedRoles.length === 0) return;

    const result = await bulkDeleteMut.mutateAsync(selectedRoles.map((role) => role.id));

    if (result.deleted > 0) {
      toast.success(t("roles.toast.bulkDeleteSuccess"));
      setSelectedIds(new Set());
    }

    if (result.failed.length > 0) {
      const allUnavailable = result.failed.every(isRolesUnavailableError);
      toast.error(
        allUnavailable ? t("roles.errors.notAvailable") : t("roles.toast.bulkDeleteError")
      );
    }

    setBulkDeleteOpen(false);
  };

  if (!canRead) {
    return <Navigate to="/forbidden" replace />;
  }

  return (
    <div dir={dir} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="rounded-sm border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-[15px] font-semibold text-slate-800">
              {t("roles.title")}
            </h1>
            {usageDisplay && (
              <span className="rounded-sm border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                {usageDisplay}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-500"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
              aria-label={t("roles.refresh")}
              title={t("roles.refresh")}
            >
              <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
            </Button>

            {selectedIds.size > 0 ? (
              <>
                <span className="text-xs font-medium text-slate-600">
                  {t("roles.list.selected", { count: selectedIds.size })}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm">
                      {t("roles.list.actions")}
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {canDelete && (
                      <DropdownMenuItem
                        onSelect={() => setBulkDeleteOpen(true)}
                        disabled={selectedRoles.length === 0}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="me-2 h-4 w-4 text-red-600" />
                        {t("roles.list.deleteSelected")}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-sm text-slate-500"
                  onClick={() => setSelectedIds(new Set())}
                >
                  {t("roles.list.clearSelection")}
                </Button>
              </>
            ) : (
              canCreate &&
              (quotaFull ? (
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span tabIndex={0} className="inline-flex cursor-not-allowed">
                        <Button type="button" size="sm" className="h-8 rounded-sm" disabled>
                          <Plus className="h-4 w-4" />
                          {t("roles.new")}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("roles.list.quotaTooltip", {
                        display: quota?.roles.display ?? "—",
                      })}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 rounded-sm"
                  onClick={() => navigate("/roles/new")}
                >
                  <Plus className="h-4 w-4" />
                  {t("roles.new")}
                </Button>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
          <RoleSearchBar
            value={search}
            onValueChange={(value) => {
              setSearch(value);
              resetPage();
            }}
            typeFilter={typeFilter}
            onTypeFilterChange={(value) => {
              setTypeFilter(value);
              resetPage();
            }}
            sortKey={sortKey}
            sortDirection={sortDirection}
            onSortKeyChange={(value) => {
              setSortKey(value);
              resetPage();
            }}
            onSortDirectionChange={(value) => {
              setSortDirection(value);
              resetPage();
            }}
            onClearFilters={clearFilters}
          />

          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              {t("roles.pagination.range", {
                from: pageData.from,
                to: pageData.to,
                total: pageData.total,
              })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-sm"
              disabled={pageData.page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label={t("roles.pagination.previous")}
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-7 w-7 rounded-sm"
              disabled={pageData.page >= pageData.pageCount}
              onClick={() => setPage((current) => Math.min(pageData.pageCount, current + 1))}
              aria-label={t("roles.pagination.next")}
            >
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Button>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value));
                resetPage();
              }}
            >
              <SelectTrigger className="h-7 w-[68px] rounded-sm text-xs" aria-label={t("roles.pagination.pageSize")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZES.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm border border-slate-200 bg-white">
        {(query.isFetching || bulkDeleteMut.isPending) && (
          <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/50 pt-8 backdrop-blur-[1px]">
            <Spinner className="h-6 w-6 text-primary" />
          </div>
        )}

        {query.isPending ? (
          <RolesTableSkeleton showSelection={canDelete} />
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-4 p-10 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="font-semibold text-red-800">{errorMessage}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RefreshCw />
              {t("roles.list.retry")}
            </Button>
          </div>
        ) : allRoles.length === 0 ? (
          <Empty className="min-h-[360px] border-0 bg-white">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <ShieldCheck />
              </EmptyMedia>
              <EmptyTitle>{t("roles.list.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("roles.list.emptySub")}</EmptyDescription>
            </EmptyHeader>
            {canCreate && (
              <EmptyContent>
                <Button
                  type="button"
                  onClick={() => navigate("/roles/new")}
                  disabled={quotaFull}
                >
                  <Plus />
                  {t("roles.new")}
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : filtered.length === 0 ? (
          <Empty className="min-h-[320px] border-0 bg-white">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search />
              </EmptyMedia>
              <EmptyTitle>{t("roles.list.noResultsTitle")}</EmptyTitle>
              <EmptyDescription>{t("roles.list.noResultsSub")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button variant="outline" onClick={clearFilters}>
                {filtersActive ? t("roles.search.clear") : t("common.clear")}
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="max-h-[calc(100vh-19rem)] overflow-auto">
              <RolesTable
                roles={pageData.items}
                locale={i18n.language}
                canDelete={canDelete}
                selectedIds={selectedIds}
                onToggleSelected={toggleSelected}
                onSelectAll={toggleSelectAll}
                allSelected={allSelected}
                someSelected={someSelected}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                onOpen={(role) => navigate(`/roles/${role.id}`)}
              />
            </div>

            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-1.5 text-xs text-slate-500">
              <span>{t("roles.list.totalUsers", { count: filteredUsers })}</span>
              <span>
                {t("roles.pagination.range", {
                  from: pageData.from,
                  to: pageData.to,
                  total: pageData.total,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      <AlertDialog
        open={bulkDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !bulkDeleteMut.isPending) setBulkDeleteOpen(false);
        }}
      >
        <AlertDialogContent dir={dir} className="max-w-md text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.delete.bulkTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {t("roles.delete.bulkDescription", { count: selectedRoles.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={bulkDeleteMut.isPending}
              onClick={() => setBulkDeleteOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={bulkDeleteMut.isPending || selectedRoles.length === 0}
              onClick={() => void handleBulkDelete()}
            >
              {bulkDeleteMut.isPending && <Spinner className="me-2 h-4 w-4" />}
              {t("roles.delete.bulkConfirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RolesTableProps {
  roles: RoleItem[];
  locale: string;
  canDelete: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelected: (id: string, checked: boolean) => void;
  onSelectAll: (checked: boolean) => void;
  allSelected: boolean;
  someSelected: boolean;
  sortKey: RoleSortKey;
  sortDirection: RoleSortDirection;
  onSort: (key: RoleSortKey) => void;
  onOpen: (role: RoleItem) => void;
}

function RolesTable({
  roles,
  locale,
  canDelete,
  selectedIds,
  onToggleSelected,
  onSelectAll,
  allSelected,
  someSelected,
  sortKey,
  sortDirection,
  onSort,
  onOpen,
}: RolesTableProps) {
  const { t } = useTranslation();

  const columnCount = canDelete ? 6 : 5;

  return (
    <Table className="min-w-[900px] text-[13px]">
      <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_0_0_theme(colors.slate.200)]">
        <TableRow className="hover:bg-transparent">
          {canDelete && (
            <TableHead className="w-9 px-3 py-2">
              <Checkbox
                checked={allSelected ? true : someSelected ? "indeterminate" : false}
                onCheckedChange={(value) => onSelectAll(value === true)}
                disabled={!roles.some((role) => !role.isSystem)}
                aria-label={t("roles.list.selectAll")}
              />
            </TableHead>
          )}
          <TableHead className="px-3 py-2">
            <SortButton
              label={t("roles.columns.name")}
              column="name"
              sortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="hidden px-3 py-2 md:table-cell">
            {t("roles.columns.description")}
          </TableHead>
          <TableHead className="px-3 py-2">
            <SortButton
              label={t("roles.columns.users")}
              column="users"
              sortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="hidden px-3 py-2 sm:table-cell">
            {t("roles.columns.permissions")}
          </TableHead>
          <TableHead className="hidden px-3 py-2 lg:table-cell">
            {t("roles.columns.createdAt")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => {
          const counts = getRolePermissionCounts(role);
          const featureLabel =
            counts.total === 1
              ? t("roles.list.featureOne")
              : t("roles.list.featureMany", { count: counts.total });

          return (
            <TableRow
              key={role.id}
              tabIndex={0}
              role="link"
              aria-label={t("roles.list.openRow", { name: role.name })}
              onClick={() => onOpen(role)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && event.target === event.currentTarget) {
                  onOpen(role);
                }
              }}
              className="cursor-pointer border-slate-100 hover:bg-slate-50/80 focus-visible:bg-slate-50 focus-visible:outline-none"
            >
              {canDelete && (
                <TableCell
                  className="px-3 py-2"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <Checkbox
                    checked={selectedIds.has(role.id)}
                    onCheckedChange={(value) => onToggleSelected(role.id, value === true)}
                    disabled={role.isSystem}
                    aria-label={t("roles.list.selectRow", { name: role.name })}
                    title={role.isSystem ? t("roles.form.systemNote") : undefined}
                  />
                </TableCell>
              )}
              <TableCell className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{role.name}</span>
                  {role.isSystem && (
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-slate-50 px-1.5 py-0 text-[10px] font-medium text-slate-500"
                    >
                      <Lock className="me-1 h-2.5 w-2.5" />
                      {t("roles.system")}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden max-w-72 px-3 py-2 md:table-cell">
                <span
                  className={cn(
                    "block truncate text-slate-600",
                    !role.description && "italic text-slate-400"
                  )}
                  title={role.description || undefined}
                >
                  {role.description || "—"}
                </span>
              </TableCell>
              <TableCell className="px-3 py-2">
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {role.totalUsersInThisRole}
                </span>
              </TableCell>
              <TableCell className="hidden px-3 py-2 text-slate-600 sm:table-cell">
                {counts.total === 0 ? (
                  <span className="text-slate-400">{t("roles.list.noPermissions")}</span>
                ) : (
                  featureLabel
                )}
              </TableCell>
              <TableCell className="hidden whitespace-nowrap px-3 py-2 text-slate-600 lg:table-cell">
                {formatRoleDate(role.createdAtUTC, locale)}
              </TableCell>
            </TableRow>
          );
        })}
        {roles.length === 0 && (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columnCount} className="px-3 py-8 text-center text-slate-500">
              {t("roles.list.noResultsSub")}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}

function SortButton({
  label,
  column,
  sortKey,
  direction,
  onSort,
}: {
  label: string;
  column: RoleSortKey;
  sortKey: RoleSortKey;
  direction: RoleSortDirection;
  onSort: (key: RoleSortKey) => void;
}) {
  const active = sortKey === column;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
    >
      {label}
      <Icon
        className={cn("h-3 w-3", active ? "text-slate-500" : "text-slate-300")}
        aria-hidden="true"
      />
    </button>
  );
}

function RolesTableSkeleton({ showSelection }: { showSelection: boolean }) {
  return (
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          {showSelection && <TableHead className="w-9" />}
          <TableHead> </TableHead>
          <TableHead className="hidden md:table-cell"> </TableHead>
          <TableHead> </TableHead>
          <TableHead className="hidden lg:table-cell"> </TableHead>
          <TableHead className="hidden sm:table-cell"> </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 8 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            {showSelection && (
              <TableCell>
                <Skeleton className="h-4 w-4 rounded-sm" />
              </TableCell>
            )}
            <TableCell>
              <Skeleton className="h-4 w-36 max-w-full" />
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <Skeleton className="h-4 w-52 max-w-full" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-8" />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <Skeleton className="h-4 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
