import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Lock,
  MoreHorizontal,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  Undo2,
  Users,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { RolePermissionsMatrix } from "@/components/roles/RolePermissionsMatrix";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePermissions } from "@/contexts/PermissionsContext";
import { useMyPermissions } from "@/hooks/useMyPermissions";
import { PLAN_QUOTA_QUERY_KEY, usePlanQuota } from "@/hooks/usePlanQuota";
import { useCreateRole, useDeleteRole, rolesQueryKey, useRoles, useUpdateRole } from "@/hooks/useRoles";
import { TENANT_PLAN_INFORMATIONS_QUERY_KEY } from "@/hooks/useTenantPlanInformations";
import { readApiError } from "@/lib/apiErrors";
import {
  buildCreateRoleRequest,
  parseRoleCreateError,
  readCreatedRoleId,
} from "@/lib/roleCreate";
import { isRolesUnavailableError } from "@/lib/roleErrors";
import {
  buildRoleMatrixFeatures,
  buildUpdateRoleRequest,
  findRoleInList,
  getRoleNeighbors,
  permissionStateFromRole,
  serializePermissionState,
} from "@/lib/roles";
import { cn } from "@/lib/utils";
import type { RoleItem, RolePermissionState } from "@/types/role";

const NAME_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 500;

interface RoleFormSnapshot {
  name: string;
  description: string;
  permissions: RolePermissionState;
}

interface RolePrefill {
  name: string;
  description: string;
  permissions: RolePermissionState;
}

interface RoleFormLocationState {
  prefill?: RolePrefill;
}

const EMPTY_SNAPSHOT: RoleFormSnapshot = {
  name: "",
  description: "",
  permissions: {},
};

function formatDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale || "en", { dateStyle: "medium" }).format(date);
}

export default function RoleFormPage() {
  const { i18n, t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { roleId } = useParams<{ roleId: string }>();
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const { data: quota } = usePlanQuota();

  const isNew = !roleId;
  const canRead = can("Roles", "read");
  const canCreate = can("Roles", "create");
  const canEditRole = can("Roles", "edit");
  const canDeleteRole = can("Roles", "delete");
  const canAddRole = canCreate && quota?.roles.canAdd !== false;

  const query = useRoles(canRead);
  const createMut = useCreateRole();
  const updateMut = useUpdateRole();
  const deleteMut = useDeleteRole();

  const { data: myPermissions, isPending: featuresLoading, isError: featuresError } =
    useMyPermissions();

  const roles = useMemo(() => query.data ?? [], [query.data]);
  const role = useMemo(() => findRoleInList(roles, roleId), [roles, roleId]);

  const features = useMemo(() => myPermissions?.features ?? [], [myPermissions]);
  const featureNames = useMemo(
    () => new Map(features.map((feature) => [feature.id.toLowerCase(), feature.name])),
    [features]
  );

  const prefill = (location.state as RoleFormLocationState | null)?.prefill ?? null;

  const [snapshot, setSnapshot] = useState<RoleFormSnapshot>(EMPTY_SNAPSHOT);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [permissions, setPermissions] = useState<RolePermissionState>({});
  const [initialized, setInitialized] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [descriptionError, setDescriptionError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pendingNavigation, setPendingNavigation] = useState<{
    to: string;
    state?: RoleFormLocationState;
  } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const submittingRef = useRef(false);

  const isSystemRole = role?.isSystem === true;
  const readOnly = isNew ? !canCreate : isSystemRole || !canEditRole;
  const isSubmitting = createMut.isPending || updateMut.isPending;
  const quotaFull = quota?.roles.canAdd === false;
  const dir = i18n.language.startsWith("ar") ? "rtl" : "ltr";

  useEffect(() => {
    if (isNew) {
      const next: RoleFormSnapshot = {
        name: prefill ? `${prefill.name} (${t("roles.formPage.copySuffix")})` : "",
        description: prefill?.description ?? "",
        permissions: prefill?.permissions ?? {},
      };
      // A duplicated record starts dirty so Save is available immediately.
      setSnapshot(EMPTY_SNAPSHOT);
      setName(next.name);
      setDescription(next.description);
      setPermissions(next.permissions);
      setNameError(null);
      setDescriptionError(null);
      setErrorMessage(null);
      setInitialized(true);
      return;
    }

    if (!role) return;

    const next: RoleFormSnapshot = {
      name: role.name,
      description: role.description ?? "",
      permissions: permissionStateFromRole(role),
    };
    setSnapshot(next);
    setName(next.name);
    setDescription(next.description);
    setPermissions(next.permissions);
    setNameError(null);
    setDescriptionError(null);
    setErrorMessage(null);
    setInitialized(true);
    // Reset only when the selected record changes; refetches keep local edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew, roleId, role?.id]);

  const initialSignature = useMemo(
    () =>
      JSON.stringify([
        snapshot.name.trim(),
        snapshot.description.trim(),
        serializePermissionState(snapshot.permissions),
      ]),
    [snapshot]
  );

  const currentSignature = useMemo(
    () =>
      JSON.stringify([
        name.trim(),
        description.trim(),
        serializePermissionState(permissions),
      ]),
    [name, description, permissions]
  );

  const isDirty = initialized && initialSignature !== currentSignature;

  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const anchor = (event.target as HTMLElement | null)?.closest<HTMLAnchorElement>(
        "a[href]"
      );
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname.startsWith("/#")) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search &&
        url.hash === window.location.hash
      ) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      setPendingNavigation({ to: `${url.pathname}${url.search}${url.hash}` });
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  const fields = useMemo(() => {
    const next = buildRoleMatrixFeatures(features, permissions, featureNames);
    return { matrixFeatures: next };
  }, [features, permissions, featureNames]);

  const neighbors = useMemo(
    () => getRoleNeighbors(roles, roleId, i18n.language),
    [roles, roleId, i18n.language]
  );

  const requestNavigate = (to: string, state?: RoleFormLocationState) => {
    if (isDirty) {
      setPendingNavigation({ to, state });
      return;
    }
    navigate(to, { state });
  };

  const handleDuplicate = () => {
    if (!role) return;
    requestNavigate("/roles/new", {
      prefill: {
        name: name.trim() || role.name,
        description: description.trim(),
        permissions,
      },
    });
  };

  const handleDiscard = () => {
    setName(snapshot.name);
    setDescription(snapshot.description);
    setPermissions(snapshot.permissions);
    setNameError(null);
    setDescriptionError(null);
    setErrorMessage(null);
  };

  const refetchQuota = () => {
    void queryClient.invalidateQueries({ queryKey: PLAN_QUOTA_QUERY_KEY });
    void queryClient.invalidateQueries({
      queryKey: TENANT_PLAN_INFORMATIONS_QUERY_KEY,
    });
  };

  const handleRoleError = (error: unknown, fallbackKey: string) => {
    const info = parseRoleCreateError(error);

    if (info.kind === "unauthorized") return;

    if (info.kind === "limit") {
      const message = t("roles.create.limitReached");
      setErrorMessage(message);
      toast.error(message);
      refetchQuota();
      return;
    }

    if (info.kind === "duplicate-name") {
      setNameError(t("roles.create.duplicateName"));
      return;
    }

    if (info.kind === "invalid-permissions") {
      const message = t("roles.create.invalidPermissions");
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    if (info.kind === "validation") {
      let mapped = false;

      if (info.fieldErrors.name) {
        setNameError(info.fieldErrors.name);
        mapped = true;
      }
      if (info.fieldErrors.description) {
        setDescriptionError(info.fieldErrors.description);
        mapped = true;
      }
      if (info.fieldErrors.permissions) {
        setErrorMessage(t("roles.create.invalidPermissions"));
        mapped = true;
      }

      if (mapped) return;

      toast.error(info.message || t(fallbackKey));
      return;
    }

    if (info.kind === "forbidden") {
      toast.error(info.message || t(fallbackKey));
      refetchQuota();
      return;
    }

    if (info.kind === "role-not-found") {
      toast.error(info.message || t("roles.formPage.notFoundSub"));
      return;
    }

    if (info.kind === "tenant-not-found") {
      toast.error(t("roles.create.tenantNotFound"));
      return;
    }

    if (info.kind === "plan-not-found") {
      toast.error(t("roles.create.planNotFound"));
      refetchQuota();
      return;
    }

    toast.error(info.message || t(fallbackKey));
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (
      readOnly ||
      isSubmitting ||
      submittingRef.current ||
      featuresLoading ||
      featuresError ||
      !isDirty
    )
      return;

    if (!trimmedName) {
      setNameError(t("roles.form.nameRequired"));
      return;
    }

    if (isNew && quotaFull) {
      const message = t("roles.create.limitReached");
      setErrorMessage(message);
      toast.error(message);
      return;
    }

    setNameError(null);
    setDescriptionError(null);
    setErrorMessage(null);

    if (isNew) {
      const request = buildCreateRoleRequest({
        name: trimmedName,
        description: trimmedDescription,
        rows: fields.matrixFeatures,
        state: permissions,
      });

      submittingRef.current = true;

      try {
        const result = await createMut.mutateAsync(request);
        toast.success(t("roles.toast.createSuccess"));

        setSnapshot({
          name: trimmedName,
          description: trimmedDescription,
          permissions,
        });
        setName(trimmedName);
        setDescription(trimmedDescription);

        const newId = readCreatedRoleId(result);
        if (!newId) {
          navigate("/roles", { replace: true });
          return;
        }

        let list = queryClient.getQueryData<RoleItem[]>(rolesQueryKey);
        if (!list?.some((item) => item.id === newId)) {
          await queryClient.refetchQueries({ queryKey: rolesQueryKey });
          list = queryClient.getQueryData<RoleItem[]>(rolesQueryKey);
        }

        navigate(
          list?.some((item) => item.id === newId) ? `/roles/${newId}` : "/roles",
          { replace: true }
        );
      } catch (error) {
        handleRoleError(error, "roles.toast.createError");
      } finally {
        submittingRef.current = false;
      }
      return;
    }

    if (!role) return;

    submittingRef.current = true;

    try {
      const payload = buildUpdateRoleRequest({
        id: role.id,
        name: trimmedName,
        description: trimmedDescription,
        rows: fields.matrixFeatures,
        state: permissions,
      });

      await updateMut.mutateAsync(payload);
      setName(trimmedName);
      setDescription(trimmedDescription);
      setSnapshot({
        name: trimmedName,
        description: trimmedDescription,
        permissions,
      });
      toast.success(t("roles.toast.updateSuccess"));
    } catch (error) {
      handleRoleError(error, "roles.toast.updateError");
    } finally {
      submittingRef.current = false;
    }
  };

  const handleDelete = async () => {
    if (!role || deleteMut.isPending) return;

    try {
      await deleteMut.mutateAsync(role.id);
      toast.success(t("roles.toast.deleteSuccess"));
      setDeleteOpen(false);
      navigate("/roles", { replace: true });
    } catch (error) {
      toast.error(
        isRolesUnavailableError(error)
          ? t("roles.errors.notAvailable")
          : readApiError(error, t("roles.toast.deleteError"))
      );
    }
  };

  if (!canRead) {
    return <Navigate to="/forbidden" replace />;
  }

  if (isNew && !canCreate) {
    return <Navigate to="/roles" replace />;
  }

  if (!isNew && query.isPending) {
    return (
      <div dir={dir} className="mx-auto flex w-full max-w-[1100px] flex-col gap-3">
        <div className="flex h-9 items-center rounded-sm border border-slate-200 bg-white px-3">
          <div className="h-4 w-40 animate-pulse rounded-sm bg-slate-100" />
        </div>
        <div className="grid min-h-[360px] place-content-center rounded-sm border border-slate-200 bg-white">
          <Spinner className="h-7 w-7 text-primary" />
        </div>
      </div>
    );
  }

  if (!isNew && !role) {
    return (
      <div dir={dir} className="mx-auto w-full max-w-[1100px]">
        <div className="flex flex-col items-center gap-3 rounded-sm border border-slate-200 bg-white p-12 text-center">
          <ShieldCheck className="h-10 w-10 text-slate-300" />
          <p className="text-base font-semibold text-slate-800">
            {t("roles.formPage.notFoundTitle")}
          </p>
          <p className="max-w-md text-sm text-slate-500">
            {t("roles.formPage.notFoundSub")}
          </p>
          <Button variant="outline" onClick={() => navigate("/roles")}>
            {t("roles.formPage.back")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-slate-200 bg-white px-3 py-1.5">
        <Breadcrumb>
          <BreadcrumbList className="gap-1.5 text-[13px] sm:gap-1.5">
            <BreadcrumbItem>
              <button
                type="button"
                onClick={() => requestNavigate("/roles")}
                className="text-slate-600 transition-colors hover:text-slate-900"
              >
                {t("roles.formPage.breadcrumbRoot")}
              </button>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-slate-800">
                {isNew ? t("roles.formPage.newBreadcrumb") : role?.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-center gap-1">
          {isDirty && (
            <span className="me-1 hidden text-xs text-amber-600 sm:inline">
              {t("roles.formPage.dirty")}
            </span>
          )}

          {!readOnly && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={() => void handleSave()}
              disabled={
                !isDirty ||
                isSubmitting ||
                featuresLoading ||
                featuresError ||
                (isNew && quotaFull)
              }
              aria-label={t("roles.formPage.save")}
              title={t("roles.formPage.save")}
            >
              {isSubmitting ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          )}

          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={handleDiscard}
            disabled={!isDirty || isSubmitting}
            aria-label={t("roles.formPage.discard")}
            title={t("roles.formPage.discard")}
          >
            <Undo2 className="h-4 w-4" />
          </Button>

          {canAddRole && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-sm"
              onClick={() => requestNavigate("/roles/new")}
              disabled={isNew}
            >
              <Plus className="h-4 w-4" />
              {t("roles.formPage.new")}
            </Button>
          )}

          {role && (
            <div className="mx-1 flex items-center gap-0.5 border-s border-slate-200 ps-2">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!neighbors.previous}
                onClick={() =>
                  neighbors.previous &&
                  requestNavigate(`/roles/${neighbors.previous.id}`)
                }
                aria-label={t("roles.formPage.previous")}
                title={t("roles.formPage.previous")}
              >
                <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" />
              </Button>
              <span className="min-w-12 text-center text-xs text-slate-500">
                {t("roles.formPage.record", {
                  index: neighbors.index + 1,
                  total: neighbors.total,
                })}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                disabled={!neighbors.next}
                onClick={() =>
                  neighbors.next && requestNavigate(`/roles/${neighbors.next.id}`)
                }
                aria-label={t("roles.formPage.next")}
                title={t("roles.formPage.next")}
              >
                <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-sm"
              >
                {t("roles.formPage.actions")}
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {canAddRole && (
                <DropdownMenuItem
                  onSelect={() => requestNavigate("/roles/new")}
                  disabled={isNew}
                >
                  <Plus className="me-2 h-4 w-4" />
                  {t("roles.formPage.new")}
                </DropdownMenuItem>
              )}
              {!isNew && canAddRole && (
                <DropdownMenuItem onSelect={handleDuplicate} disabled={!role}>
                  <Plus className="me-2 h-4 w-4" />
                  {t("roles.formPage.duplicate")}
                </DropdownMenuItem>
              )}
              {role && !isSystemRole && canDeleteRole && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setDeleteOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="me-2 h-4 w-4 text-red-600" />
                    {t("roles.formPage.delete")}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1100px] rounded-sm border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </div>
        )}

        {isNew && quotaFull && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("roles.create.limitReached")}
          </div>
        )}

        {isSystemRole && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
          >
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            {t("roles.form.systemNote")}
          </div>
        )}

        {!isNew && !isSystemRole && !canEditRole && (
          <div
            role="status"
            className="mb-4 flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {t("roles.formPage.readOnlyBanner")}
          </div>
        )}

        <input
          type="text"
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setNameError(null);
          }}
          maxLength={NAME_MAX_LENGTH}
          disabled={readOnly || isSubmitting}
          placeholder={t("roles.form.namePlaceholder")}
          aria-label={t("roles.form.nameLabel")}
          aria-invalid={nameError ? true : undefined}
          className={cn(
            "w-full border-0 border-b border-transparent bg-transparent px-0 py-1 text-2xl font-semibold outline-none transition-colors placeholder:font-normal placeholder:text-slate-300 focus:border-slate-200 disabled:opacity-70",
            nameError ? "text-red-700" : "text-slate-800"
          )}
        />
        {nameError && (
          <p className="mt-1 text-xs text-red-600" role="alert">
            {nameError}
          </p>
        )}

        <dl className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
          <FieldRow label={t("roles.form.descriptionLabel")}>
            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setDescriptionError(null);
              }}
              rows={3}
              maxLength={DESCRIPTION_MAX_LENGTH}
              disabled={readOnly || isSubmitting}
              placeholder={t("roles.form.descriptionPlaceholder")}
              aria-label={t("roles.form.descriptionLabel")}
              aria-invalid={descriptionError ? true : undefined}
              className={cn(
                "w-full resize-none border-0 bg-transparent p-0 text-[13px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-70",
                descriptionError && "text-red-700"
              )}
            />
            {descriptionError && (
              <p className="mt-1 text-xs text-red-600" role="alert">
                {descriptionError}
              </p>
            )}
            <p className="mt-1 text-end text-[11px] text-slate-400">
              {description.length} / {DESCRIPTION_MAX_LENGTH}
            </p>
          </FieldRow>

          {role && (
            <>
              <FieldRow label={t("roles.formPage.createdOn")}>
                <span className="text-slate-600">
                  {formatDate(role.createdAtUTC, i18n.language)}
                </span>
              </FieldRow>
              <FieldRow label={t("roles.formPage.users")}>
                <span className="inline-flex items-center gap-1.5 text-slate-600">
                  <Users className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                  {role.totalUsersInThisRole}
                </span>
              </FieldRow>
              <FieldRow label={t("roles.formPage.system")}>
                <Badge
                  variant="outline"
                  className="border-slate-300 bg-slate-50 text-slate-600"
                >
                  {isSystemRole
                    ? t("roles.formPage.systemRole")
                    : t("roles.formPage.customRole")}
                </Badge>
              </FieldRow>
            </>
          )}
        </dl>

        <Tabs defaultValue="permissions" className="mt-6">
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-slate-200 bg-transparent p-0">
            <TabsTrigger
              value="permissions"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-[13px] text-slate-500 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
            >
              {t("roles.formPage.tabs.permissions")}
            </TabsTrigger>
            <TabsTrigger
              value="users"
              className="rounded-none border-b-2 border-transparent px-3 py-2 text-[13px] text-slate-500 shadow-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-slate-900 data-[state=active]:shadow-none"
            >
              {t("roles.formPage.tabs.users")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="mt-3">
            <RolePermissionsMatrix
              features={features}
              featureNames={featureNames}
              state={permissions}
              onChange={setPermissions}
              disabled={readOnly || isSubmitting}
              loading={featuresLoading}
              error={featuresError}
            />
          </TabsContent>

          <TabsContent value="users" className="mt-3">
            <div className="rounded-sm border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <Users className="mx-auto h-6 w-6 text-slate-300" />
              <p className="mt-2 text-sm text-slate-600">
                {t("roles.formPage.usersUnavailable")}
              </p>
              {role && (
                <p className="mt-1 text-xs text-slate-500">
                  {t("roles.formPage.usersCount", {
                    count: role.totalUsersInThisRole,
                  })}
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog
        open={pendingNavigation !== null}
        onOpenChange={(open) => {
          if (!open) setPendingNavigation(null);
        }}
      >
        <AlertDialogContent dir={dir} className="max-w-md text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.formPage.unsavedTitle")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {t("roles.formPage.unsavedDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setPendingNavigation(null)}>
              {t("roles.formPage.unsavedStay")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                const pending = pendingNavigation;
                setPendingNavigation(null);
                if (pending) navigate(pending.to, { state: pending.state });
              }}
            >
              {t("roles.formPage.unsavedDiscard")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (!open && !deleteMut.isPending) setDeleteOpen(false);
        }}
      >
        <AlertDialogContent dir={dir} className="max-w-md text-slate-900">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("roles.delete.title")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed">
              {role ? t("roles.delete.description", { name: role.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              variant="outline"
              disabled={deleteMut.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteMut.isPending && <Spinner className="me-2 h-4 w-4" />}
              {t("roles.delete.confirm")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[180px_1fr] sm:gap-4">
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:pt-0.5">
        {label}
      </dt>
      <dd className="min-w-0 text-[13px] text-slate-700">{children}</dd>
    </div>
  );
}
