import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit,
  MailWarning,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UsersRound,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { usePermissions } from "@/contexts/PermissionsContext";
import {
  useCreateTenantUser,
  useDeleteTenantUser,
  useTenantRoles,
  useUpdateTenantUser,
  useUsers,
} from "@/hooks/useUsers";
import { readApiError } from "@/lib/apiErrors";
import { getSystemRoleKey, getUserRoleNames } from "@/lib/users";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type {
  CreateTenantUserRequest,
  TenantRole,
  UpdateTenantUserRequest,
  UserListItem,
  UserListRequest,
  UserSortDirection,
  UserSortKey,
  UserStatusFilter,
  UserVerificationFilter,
} from "@/types/user";

const PAGE_SIZES = [10, 20, 50, 100] as const;

const STATUS_OPTIONS: UserStatusFilter[] = ["all", "active", "inactive"];
const VERIFICATION_OPTIONS: UserVerificationFilter[] = ["all", "verified", "unverified"];

function formatUserDate(value: string | null, locale: string, withTime = false): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(locale || "en", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function UsersPage() {
  const { i18n, t } = useTranslation();
  const { can } = usePermissions();
  const canRead = can("Users", "read");
  const canCreate = can("Users", "read");
  const canUpdate = can("Users", "edit");
  const canDelete = can("Users", "delete");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<UserStatusFilter>("all");
  const [verification, setVerification] = useState<UserVerificationFilter>("all");
  const [sortKey, setSortKey] = useState<UserSortKey>("name");
  const [sortDirection, setSortDirection] = useState<UserSortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const addForm = useForm<{
    fullName: string;
    email: string;
    password?: string;
    roleId: string;
  }>({
    resolver: zodResolver(
      z.object({
        fullName: z.string().min(1, "Full name is required.").max(100),
        email: z.string().email("Enter a valid email.").max(100),
        password: z.string().min(6, "Password must be at least 6 characters.").optional(),
        roleId: z.string().min(1, "Select a role."),
      })
    ),
    defaultValues: { fullName: "", email: "", password: "", roleId: "" },
  });

  const editForm = useForm<{
    fullName: string;
    email: string;
    roleId: string;
  }>({
    resolver: zodResolver(
      z.object({
        fullName: z.string().min(1, "Full name is required.").max(100),
        email: z.string().email("Enter a valid email.").max(100),
        roleId: z.string().min(1, "Select a role."),
      })
    ),
    defaultValues: { fullName: "", email: "", roleId: "" },
  });

  const rolesQuery = useTenantRoles(canRead);
  const roles = rolesQuery.data ?? [];
  const createMut = useCreateTenantUser();
  const updateMut = useUpdateTenantUser();
  const deleteMut = useDeleteTenantUser();

  const request: UserListRequest = useMemo(
    () => ({
      search: search.trim() || undefined,
      status,
      verification,
      sortKey,
      sortDirection,
      page,
      pageSize,
    }),
    [search, status, verification, sortKey, sortDirection, page, pageSize]
  );

  const query = useUsers(request, canRead);

  const data = query.data;
  const users = useMemo(() => data?.items ?? [], [data]);
  const total = data?.total ?? 0;
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? pageSize;
  const pageCount = data?.pageCount ?? 1;
  const from = total === 0 ? 0 : (currentPage - 1) * currentPageSize + 1;
  const to = Math.min(currentPage * currentPageSize, total);

  const dir = i18n.language.startsWith("ar") ? "rtl" : "ltr";

  const filtersActive =
    search.trim().length > 0 || status !== "all" || verification !== "all";

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    setSearch("");
    setStatus("all");
    setVerification("all");
    setPage(1);
  };

  const toggleSort = (key: UserSortKey) => {
    setPage(1);

    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const errorMessage = query.error
    ? readApiError(query.error, t("users.list.loadError"))
    : null;

  const handleAddSubmit = async (values: {
    fullName: string;
    email: string;
    password?: string;
    roleId: string;
  }) => {
    try {
      await createMut.mutateAsync({
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password?.trim() || undefined,
        roleId: values.roleId,
      });
      setAddOpen(false);
      toast.success(t("users.toast.createSuccess"));
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        t("users.toast.createError");
      toast.error(message);
    }
  };

  const handleEditSubmit = async (values: {
    fullName: string;
    email: string;
    roleId: string;
  }) => {
    if (!editingUser) return;

    try {
      await updateMut.mutateAsync({
        id: editingUser.id,
        payload: {
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          roleId: values.roleId,
        },
      });
      setEditOpen(false);
      setEditingUser(null);
      toast.success(t("users.toast.editSuccess"));
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        t("users.toast.editError");
      toast.error(message);
    }
  };

  const openDelete = (id: string) => {
    setDeletingUserId(id);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUserId) return;

    try {
      await deleteMut.mutateAsync(deletingUserId);
      setDeleteOpen(false);
      setDeletingUserId(null);
      toast.success(t("users.toast.deleteSuccess"));
    } catch (error: any) {
      const message =
        error?.response?.data?.error ??
        error?.message ??
        t("users.toast.deleteError");
      toast.error(message);
      setDeleteOpen(false);
      setDeletingUserId(null);
    }
  };

  const openEdit = (user: UserListItem) => {
    editForm.reset({
      fullName: user.fullName,
      email: user.email,
      roleId: user.roleId,
    });
    setEditingUser(user);
    setEditOpen(true);
  };

  if (!canRead) {
    return <Navigate to="/forbidden" replace />;
  }

  return (
    <div dir={dir} className="flex min-h-[calc(100vh-4rem)] flex-1 flex-col bg-slate-50">
      <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <UsersRound className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-900">{t("users.title")}</h2>
            <p className="text-xs text-slate-500">
              {t("users.subtitle", { count: total })}
            </p>
          </div>
        </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-slate-500"
            onClick={() => void query.refetch()}
            disabled={query.isFetching}
            aria-label={t("users.refresh")}
            title={t("users.refresh")}
          >
            <RefreshCw className={cn("h-4 w-4", query.isFetching && "animate-spin")} />
          </Button>

          {canCreate && (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                addForm.reset({
                  fullName: "",
                  email: "",
                  password: "",
                  roleId: "",
                });
                setAddOpen(true);
              }}
              disabled={createMut.isPending || roles.length === 0}
            >
              <Plus className="h-3.5 w-3.5" />
              {t("users.add")}
            </Button>
          )}
      </header>

      <div className="border-b border-slate-200 bg-white px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-8 min-w-52 max-w-md flex-1 items-center rounded-sm border border-slate-300 bg-white focus-within:border-slate-400">
            <Search className="ms-2 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder={t("users.searchPlaceholder")}
              aria-label={t("users.searchPlaceholder")}
              className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
                aria-label={t("common.clear")}
                className="px-1.5 text-slate-400 transition-colors hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as UserStatusFilter);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-8 w-[140px] rounded-sm border-slate-300 text-[13px]"
              aria-label={t("users.filters.status")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`users.statusOptions.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={verification}
            onValueChange={(value) => {
              setVerification(value as UserVerificationFilter);
              setPage(1);
            }}
          >
            <SelectTrigger
              className="h-8 w-[150px] rounded-sm border-slate-300 text-[13px]"
              aria-label={t("users.filters.email")}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VERIFICATION_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`users.verificationOptions.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {filtersActive && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-slate-500"
              onClick={clearFilters}
            >
              {t("users.list.clearFilters")}
            </Button>
          )}
        </div>
      </div>

      <main className="relative flex-1 min-h-0 overflow-hidden rounded-sm border border-slate-200 bg-white">
        {query.isFetching && (
          <div className="absolute inset-0 z-20 flex items-start justify-center bg-white/60 pt-10 backdrop-blur-sm">
            <Spinner className="h-6 w-6 text-indigo-600" />
          </div>
        )}

        {query.isPending ? (
          <UsersTableSkeleton />
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-4 p-16 text-center">
            <AlertCircle className="h-10 w-10 text-red-500" />
            <p className="font-semibold text-red-800">{errorMessage}</p>
            <Button variant="outline" onClick={() => void query.refetch()}>
              <RefreshCw />
              {t("users.list.retry")}
            </Button>
          </div>
        ) : total === 0 ? (
          <Empty className="min-h-[360px] border-0 bg-white mx-auto max-w-[500px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <UsersRound className="text-slate-400" />
              </EmptyMedia>
              <EmptyTitle>{t("users.list.emptyTitle")}</EmptyTitle>
              <EmptyDescription>{t("users.list.emptySub")}</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : users.length === 0 ? (
          <Empty className="min-h-[320px] border-0 bg-white mx-auto max-w-[500px]">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Search className="text-slate-400" />
              </EmptyMedia>
              <EmptyTitle>{t("users.list.noResultsTitle")}</EmptyTitle>
              <EmptyDescription>{t("users.list.noResultsSub")}</EmptyDescription>
            </EmptyHeader>
            <Button variant="outline" onClick={clearFilters}>
              {t("users.list.clearFilters")}
            </Button>
          </Empty>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="max-h-[calc(100vh-22rem)] overflow-auto">
              <UsersTable
                users={users}
                locale={i18n.language}
                sortKey={sortKey}
                sortDirection={sortDirection}
                onSort={toggleSort}
                canUpdate={canUpdate}
                canDelete={canDelete}
                onEdit={openEdit}
                onDelete={openDelete}
              />
            </div>

            <footer className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
              <span>
                {t("users.pagination.range", { from, to, total })}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  aria-label={t("users.pagination.previous")}
                >
                  <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-7 w-7 rounded-sm"
                  disabled={currentPage >= pageCount}
                  onClick={() =>
                    setPage((current) => Math.min(pageCount, current + 1))
                  }
                  aria-label={t("users.pagination.next")}
                >
                  <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
                </Button>
                <Select
                  value={String(currentPageSize)}
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setPage(1);
                  }}
                >
                  <SelectTrigger
                    className="h-7 w-[68px] rounded-sm text-xs"
                    aria-label={t("users.pagination.pageSize")}
                  >
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
            </footer>
          </div>
        )}
      </main>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("users.addTitle")}</DialogTitle>
            <DialogDescription>
              {t("users.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <Form {...addForm}>
            <form onSubmit={addForm.handleSubmit(handleAddSubmit)} className="grid gap-3 p-4">
              <FormField
                control={addForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.form.fullNameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.form.emailLabel")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.form.passwordLabel")}</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-slate-500">
                      {t("users.form.passwordHint")}
                    </p>
                  </FormItem>
                )}
              />
              <FormField
                control={addForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.form.roleLabel")}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("users.form.selectRole")} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : null}
                  {t("users.form.createButton")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{t("users.editTitle")}</DialogTitle>
            <DialogDescription>{t("users.editDescription")}</DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form
              onSubmit={editForm.handleSubmit(handleEditSubmit)}
              className="grid gap-3 p-4"
            >
              <FormField
                control={editForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.form.fullNameLabel")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.form.emailLabel")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="roleId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("users.form.roleLabel")}</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder={t("users.form.selectRole")} />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={updateMut.isPending}
                >
                  {updateMut.isPending ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : null}
                  {t("users.form.editButton")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("users.dialog.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("users.dialog.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={handleDeleteConfirm}
            >
              {deleteMut.isPending ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : null}
              {t("users.dialog.confirmDelete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UsersTable({
  users,
  locale,
  sortKey,
  sortDirection,
  onSort,
  canUpdate,
  canDelete,
  onEdit,
  onDelete,
}: {
  users: UserListItem[];
  locale: string;
  sortKey: UserSortKey;
  sortDirection: UserSortDirection;
  onSort: (key: UserSortKey) => void;
  canUpdate: boolean;
  canDelete: boolean;
  onEdit: (user: UserListItem) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();

  return (
    <Table className="w-full text-[13px]">
      <TableHeader className="sticky top-0 z-10 bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-4 py-3 text-left">
            <SortButton
              label={t("users.columns.user")}
              column="name"
              sortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 py-3 text-left">{t("users.columns.role")}</TableHead>
          <TableHead className="px-4 py-3 text-left">{t("users.columns.status")}</TableHead>
          <TableHead className="hidden px-4 py-3 text-left sm:table-cell">
            {t("users.columns.email")}
          </TableHead>
          <TableHead className="hidden px-4 py-3 text-left md:table-cell">
            <SortButton
              label={t("users.columns.lastLogin")}
              column="lastLogin"
              sortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="hidden px-4 py-3 text-left lg:table-cell">
            <SortButton
              label={t("users.columns.createdAt")}
              column="createdAt"
              sortKey={sortKey}
              direction={sortDirection}
              onSort={onSort}
            />
          </TableHead>
          <TableHead className="px-4 py-3 text-right">{t("users.columns.actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody className="divide-y divide-slate-100">
        {users.map((user) => {
          const roleNames = getUserRoleNames(user);
          const systemRoleKey = getSystemRoleKey(user.systemRole);

          return (
            <TableRow
              key={user.id}
              className="hover:bg-slate-50 focus-visible:bg-slate-100"
            >
              <TableCell className="px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 grid h-9 w-9 place-content-center rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-600">
                    {initialsOf(user.fullName)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {user.fullName || "—"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email || "—"}</p>
                  </div>
                </div>
              </TableCell>

              <TableCell className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {roleNames.length > 0 ? (
                    <>
                      {roleNames.slice(0, 2).map((name) => (
                        <Badge
                          key={name}
                          variant="outline"
                          className="border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600"
                        >
                          {name}
                        </Badge>
                      ))}
                      {roleNames.length > 2 && (
                        <Badge
                          variant="outline"
                          className="border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-500"
                        >
                          {t("users.moreRoles", { count: roleNames.length - 2 })}
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className="text-slate-500">
                      {systemRoleKey ? t(systemRoleKey) : user.systemRole || "—"}
                    </span>
                  )}
                </div>
              </TableCell>

              <TableCell className="px-4 py-3">
                <Badge
                  variant="outline"
                  className={cn(
                    "px-2 py-0.5 text-[11px] font-medium",
                    user.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  {user.isActive
                    ? t("users.status.active")
                    : t("users.status.inactive")}
                </Badge>
              </TableCell>

              <TableCell className="hidden px-4 py-3 sm:table-cell">
                {user.emailConfirmed ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("users.verification.verified")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-amber-700">
                    <MailWarning className="h-3.5 w-3.5" aria-hidden="true" />
                    {t("users.verification.unverified")}
                  </span>
                )}
              </TableCell>

              <TableCell className="hidden whitespace-nowrap px-4 py-3 text-slate-600 md:table-cell">
                {user.lastLoginAt
                  ? formatUserDate(user.lastLoginAt, locale, true)
                  : t("users.never")}
              </TableCell>

              <TableCell className="hidden whitespace-nowrap px-4 py-3 text-slate-600 lg:table-cell">
                {formatUserDate(user.createdAtUTC, locale)}
              </TableCell>

              <TableCell className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {canUpdate && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8"
                      onClick={(event) => {
                        event.stopPropagation();
                        onEdit(user);
                      }}
                      aria-label={t("users.actions.edit")}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {canDelete && (
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 text-slate-500 hover:text-red-600"
                      onClick={(event) => {
                        event.stopPropagation();
                        onDelete(user.id);
                      }}
                      aria-label={t("users.actions.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
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
  column: UserSortKey;
  sortKey: UserSortKey;
  direction: UserSortDirection;
  onSort: (key: UserSortKey) => void;
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
        className={cn("h-3 w-3", active ? "text-indigo-600" : "text-slate-300")}
        aria-hidden="true"
      />
    </button>
  );
}

function UsersTableSkeleton() {
  return (
    <Table className="w-full text-[13px]">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="px-4 py-3"> </TableHead>
          <TableHead className="px-4 py-3"> </TableHead>
          <TableHead className="px-4 py-3"> </TableHead>
          <TableHead className="hidden px-4 py-3 sm:table-cell"> </TableHead>
          <TableHead className="hidden px-4 py-3 md:table-cell"> </TableHead>
          <TableHead className="hidden px-4 py-3 lg:table-cell"> </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 6 }, (_, index) => (
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell className="px-4 py-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex flex-col gap-1.5 min-w-0">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            </TableCell>
            <TableCell className="px-4 py-3">
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="px-4 py-3">
              <Skeleton className="h-4 w-16" />
            </TableCell>
            <TableCell className="hidden px-4 py-3 sm:table-cell">
              <Skeleton className="h-4 w-20" />
            </TableCell>
            <TableCell className="hidden px-4 py-3 md:table-cell">
              <Skeleton className="h-4 w-28" />
            </TableCell>
            <TableCell className="hidden px-4 py-3 lg:table-cell">
              <Skeleton className="h-4 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
