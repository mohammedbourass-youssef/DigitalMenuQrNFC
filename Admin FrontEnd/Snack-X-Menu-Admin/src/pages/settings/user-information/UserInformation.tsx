import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Save, X, AlertCircle, RefreshCw, Loader2, User, CheckCircle, XCircle, Trash2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useRestaurantInfos } from "@/hooks/useRestaurantInfos";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useUpdateProfile } from "@/hooks/useUpdateProfile";
import { formatLocalDate, formatLocalDateTime } from "@/lib/date";

function FieldShimmer() {
  return <div className="shimmer h-4 w-full rounded" />;
}

function ProfileShimmer() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-3">
        <div className="shimmer h-16 w-16 rounded-full" />
        <div className="shimmer h-4 w-32 rounded" />
        <div className="shimmer h-5 w-24 rounded" />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i}>
            <FieldShimmer />
          </div>
        ))}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] || "").toUpperCase();
}
export default function UserInformationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data: restaurant } = useRestaurantInfos();
  const { data: profile, isLoading: isProfileLoading, error: profileError, refetch: refetchProfile } = useMyProfile();
  const { update: updateProfile, isLoading: isSavingProfile } = useUpdateProfile();
  // Profile state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfileConfirm, setShowProfileConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileNameError, setProfileNameError] = useState<string | null>(null);
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Profile handlers
  const handleEditProfile = () => {
    if (profile) {
      setProfileName(profile.fullName);
    }
    setProfileNameError(null);
    setProfileFormError(null);
    setIsEditingProfile(true);
  };

  const handleCancelProfile = () => {
    setProfileName("");
    setProfileNameError(null);
    setProfileFormError(null);
    setIsEditingProfile(false);
  };

  const handleSaveProfile = () => {
    if (!profileName.trim() || profileName.trim().length < 2) {
      setProfileNameError(t("settings.profile.fullName") + " must be at least 2 characters");
      return;
    }
    setProfileNameError(null);
    setShowProfileConfirm(true);
  };

  const handleConfirmProfileUpdate = async () => {
    try {
      await updateProfile({ fullName: profileName.trim() });
      toast.success(t("settings.profile.toast.updateSuccess"));
      setShowProfileConfirm(false);
      setIsEditingProfile(false);
      void refetchProfile();
    } catch {
      toast.error(t("settings.profile.toast.updateError"));
      setProfileFormError(t("settings.profile.toast.updateError"));
    }
  };

  const handleVerifyEmail = () => {
    if (!profile) return;

    navigate('/confirm-email', { state: { email: profile.email } });
  };

  const handleDeleteAccount = () => {
    setIsDeleting(true);
    setTimeout(() => {
      toast.success(t("settings.profile.toast.deleteSuccess"));
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setDeleteInput("");
      window.location.href = "/login";
    }, 1500);
  };

  const avatarColor = restaurant?.primaryColor || "#f97316";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("settings.title")}</h1>

      {/* ─── User Information Section ─── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              {t("settings.profile.title")}
            </CardTitle>
          </div>
          {!isEditingProfile ? (
            <Button variant="outline" size="sm" onClick={handleEditProfile} disabled={isProfileLoading}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("settings.profile.edit")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelProfile} disabled={isSavingProfile}>
                <X className="mr-2 h-4 w-4" />
                {t("settings.profile.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Save className="mr-2 h-4 w-4" />
                {t("settings.profile.save")}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isProfileLoading ? (
            <ProfileShimmer />
          ) : profileError ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>{profileError}</span>
                <Button variant="outline" size="sm" onClick={() => void refetchProfile()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {t("settings.retry")}
                </Button>
              </AlertDescription>
            </Alert>
          ) : profile ? (
            <>
              {/* Avatar + Name */}
              <div className="flex flex-col items-center space-y-2">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-lg font-semibold text-white"
                  style={{ backgroundColor: avatarColor }}
                >
                  {getInitials(profile.fullName)}
                </div>
                <p className="text-base font-bold">{profile.fullName}</p>
                <Badge
                  variant={
                    profile.role === "SuperAdmin"
                      ? "destructive"
                      : profile.role === "TenantOwner"
                      ? "default"
                      : "secondary"
                  }
                >
                  {t(`settings.profile.roles.${profile.role}`)}
                </Badge>
              </div>

              {/* Fields Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.profile.fullName")}</Label>
                  {isEditingProfile ? (
                    <div className="space-y-1">
                      <Input
                        value={profileName}
                        onChange={(e) => {
                          setProfileName(e.target.value);
                          if (profileNameError) setProfileNameError(null);
                        }}
                        maxLength={100}
                      />
                      {profileNameError && (
                        <p className="text-xs text-red-500">{profileNameError}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium">{profile.fullName}</p>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.profile.email")}</Label>
                  <p className="text-base font-medium">{profile.email}</p>
                  <p className="text-xs text-muted-foreground">{t("settings.profile.email")}</p>
                </div>

                {/* Account Status */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.profile.isActive")}</Label>
                  <Badge variant={profile.isActive ? "default" : "destructive"}>
                    {profile.isActive ? t("settings.profile.active") : t("settings.profile.inactive")}
                  </Badge>
                </div>

                {/* Email Verified */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.profile.emailConfirmed")}</Label>
                  <div className="flex items-center gap-2">
                    {profile.emailConfirmed ? (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <span className="text-sm font-medium text-green-600">{t("settings.profile.verified")}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="text-sm font-medium text-red-600">{t("settings.profile.notVerified")}</span>
                        <Button variant="outline" size="sm" onClick={handleVerifyEmail}>
                          {t("settings.profile.verifyNow")}
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Last Login */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.profile.lastLogin")}</Label>
                  <p className="text-base font-medium">
                    {profile.lastLoginAt ? formatLocalDateTime(profile.lastLoginAt) : t("settings.profile.never")}
                  </p>
                </div>

                {/* Member Since */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.profile.memberSince")}</Label>
                  <p className="text-base font-medium">{formatLocalDate(profile.createdAt)}</p>
                </div>
              </div>

              {/* Profile form error */}
              {profileFormError && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{profileFormError}</AlertDescription>
                </Alert>
              )}

              {/* Delete Account */}
              <div className="border-t border-slate-200 pt-6">
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDeleteInput("");
                    setShowDeleteConfirm(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("settings.profile.deleteAccount")}
                </Button>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
      {/* ─── Profile Confirm Dialog ─── */}
      <Dialog open={showProfileConfirm} onOpenChange={setShowProfileConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.profile.confirm.title")}</DialogTitle>
            <DialogDescription>{t("settings.profile.confirm.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProfileConfirm(false)} disabled={isSavingProfile}>
              {t("settings.profile.confirm.cancel")}
            </Button>
            <Button
              onClick={() => void handleConfirmProfileUpdate()}
              disabled={isSavingProfile}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSavingProfile ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("settings.profile.confirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Account Dialog ─── */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              {t("settings.profile.delete.title")}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("settings.profile.delete.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("settings.profile.delete.typeToConfirm")}</Label>
            <Input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={t("settings.profile.delete.placeholder")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
              {t("settings.profile.delete.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteInput !== "DELETE" || isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              {t("settings.profile.delete.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
