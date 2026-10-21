import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Pencil, Save, X, ExternalLink, Camera, AlertCircle, RefreshCw, Check, Crown, Sparkles, Building2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useRestaurantInfos } from "@/hooks/useRestaurantInfos";
import { useRestaurantUpdate } from "@/hooks/useRestaurantUpdate";
import { formatLocalDate } from "@/lib/date";
import { CURRENCIES } from "@/lib/currencies";
import { setCurrency } from "@/lib/preferences";
import type { MyRestaurantUpdateInfosDTO } from "@/types";
const PLANS = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    features: [
      "Up to 50 menu items",
      "1 NFC tag",
      "Basic analytics",
      "Email support",
    ],
  },
  {
    name: "Pro",
    price: "$59",
    period: "/month",
    popular: true,
    features: [
      "Unlimited menu items",
      "Up to 10 NFC tags",
      "Advanced analytics",
      "Priority support",
      "Multi-language menu",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: [
      "Everything in Pro",
      "Unlimited NFC tags",
      "Custom integrations",
      "Dedicated account manager",
      "SLA guarantee",
    ],
  },
];

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    Trial: "bg-amber-100 text-amber-700 border-amber-200",
    Active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Suspended: "bg-red-100 text-red-700 border-red-200",
    Cancelled: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <Badge variant="outline" className={styles[status] || styles.Cancelled}>
      {t(`settings.status.${status.toLowerCase()}`)}
    </Badge>
  );
}

function LogoShimmer() {
  return (
    <div className="flex flex-col items-center space-y-3">
      <div className="shimmer h-24 w-24 rounded-full" />
      <div className="shimmer h-3 w-20 rounded" />
    </div>
  );
}

function FieldShimmer() {
  return <div className="shimmer h-4 w-full rounded" />;
}

function SettingsShimmer() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center space-y-4">
        <LogoShimmer />
        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={i === 5 ? "md:col-span-2" : ""}>
              <FieldShimmer />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default function RestaurantInformationPage() {
  const { t } = useTranslation();
  const { data: restaurant, isLoading, error, refetch } = useRestaurantInfos();
  const { update, isLoading: isSaving } = useRestaurantUpdate();
  const [isEditing, setIsEditing] = useState(false);
  const [showPlans, setShowPlans] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [restaurantName, setRestaurantName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [currencyCode, setCurrencyCode] = useState("MAD");
  const [primaryColor, setPrimaryColor] = useState("#f97316");
  const [colorHex, setColorHex] = useState("#f97316");
  const [selectedLogo, setSelectedLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = useCallback(() => {
    if (restaurant) {
      setRestaurantName(restaurant.restaurantName || "");
      setPhoneNumber(restaurant.phoneNumber || "");
      setAddress(restaurant.address || "");
      setCity(restaurant.city || "");
      setCurrencyCode(restaurant.currencyCode || "MAD");
      setPrimaryColor(restaurant.primaryColor || "#f97316");
      setColorHex(restaurant.primaryColor || "#f97316");
    }
    setSelectedLogo(null);
    setLogoPreview(null);
    setFormError(null);
  }, [restaurant]);

  useEffect(() => {
    if (restaurant && !isEditing) {
      resetForm();
    }
  }, [restaurant, isEditing, resetForm]);

  const handleEdit = () => {
    resetForm();
    setIsEditing(true);
  };

  /**
   * The selection is both the restaurant record value (sent on save) and the
   * app-wide display preference: it is persisted so every request sends the
   * chosen X-Currency instead of the default.
   */
  const handleCurrencyChange = (next: string) => {
    setCurrencyCode(next);
    setCurrency(next);
  };

  const handleCancel = () => {
    resetForm();
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!restaurantName.trim()) {
      setFormError(t("settings.fields.restaurantName") + " is required");
      return;
    }

    const payload: MyRestaurantUpdateInfosDTO = {
      restaurantName: restaurantName.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
      address: address.trim() || undefined,
      city: city.trim() || undefined,
      currencyCode,
      primaryColor: primaryColor || undefined,
      logo: selectedLogo || undefined,
    };

    try {
      await update(payload);
      toast.success(t("settings.toast.updateSuccess"));
      setShowConfirm(false);
      setIsEditing(false);
      setSelectedLogo(null);
      setLogoPreview(null);
      void refetch();
    } catch {
      toast.error(t("settings.toast.updateError"));
    }
  };

  const handleColorHexChange = (value: string) => {
    setColorHex(value);
    if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
      setPrimaryColor(value);
    }
  };

  const handleColorPickerChange = (value: string) => {
    setPrimaryColor(value);
    setColorHex(value);
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedLogo(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  if (error && !restaurant) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">{t("settings.title")}</h1>
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("settings.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">{t("settings.title")}</h1>

      {/* Restaurant Info Section */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              {t("settings.restaurantInfo")}
            </CardTitle>
            <p className="text-sm text-slate-500">{t("settings.restaurantInfoDesc")}</p>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={handleEdit} disabled={isLoading}>
              <Pencil className="mr-2 h-4 w-4" />
              {t("settings.edit")}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="mr-2 h-4 w-4" />
                {t("settings.cancel")}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConfirm(true)}
                disabled={isSaving}
                className="bg-orange-500 hover:bg-orange-600"
              >
                <Save className="mr-2 h-4 w-4" />
                {t("settings.save")}
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <SettingsShimmer />
          ) : restaurant ? (
            <>
              {/* Logo Section */}
              <div className="flex flex-col items-center space-y-3">
                <div className="relative">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-24 w-24 rounded-full object-cover border-4 border-primary shadow-md"
                    />
                  ) : restaurant.logoUrl ? (
                    <img
                      src={restaurant.logoUrl}
                      alt="Logo"
                      className="h-24 w-24 rounded-full object-cover border-4 border-primary shadow-md"
                    />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted border-4 border-muted">
                      <Camera className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="flex flex-col items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Logo
                    </Button>
                    {selectedLogo && (
                      <p className="text-xs text-muted-foreground">{selectedLogo.name}</p>
                    )}
                    {restaurant.logoUrl && !selectedLogo && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={restaurant.logoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              {t("settings.viewLogoUrl")}
                            </a>
                          </TooltipTrigger>
                          <TooltipContent>{t("settings.viewLogoUrl")}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                ) : (
                  restaurant.logoUrl && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={restaurant.logoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t("settings.viewLogoUrl")}
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>{t("settings.viewLogoUrl")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )
                )}
              </div>

              {/* Free Trial Banner */}
              {restaurant.isInFreeTrial && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-5 w-5 text-amber-600" />
                      <p className="text-sm text-amber-800">
                        {t("settings.trialBanner", { date: formatLocalDate(restaurant.trialEndsAt) })}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPlans(true)}
                      className="border-amber-300 text-amber-700 hover:bg-amber-100"
                    >
                      <Crown className="mr-2 h-4 w-4" />
                      {t("settings.seePlans")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Fields Grid */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* Restaurant Name */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.restaurantName")}</Label>
                  {isEditing ? (
                    <Input
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium">{restaurant.restaurantName || "—"}</p>
                  )}
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.phoneNumber")}</Label>
                  {isEditing ? (
                    <Input
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium">{restaurant.phoneNumber || "—"}</p>
                  )}
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.address")}</Label>
                  {isEditing ? (
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium">{restaurant.address || "—"}</p>
                  )}
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.city")}</Label>
                  {isEditing ? (
                    <Input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  ) : (
                    <p className="text-base font-medium">{restaurant.city || "—"}</p>
                  )}
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.currency")}</Label>
                  {isEditing ? (
                    <Select value={currencyCode} onValueChange={handleCurrencyChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-base font-medium">{restaurant.currencyCode}</p>
                  )}
                </div>

                {/* Brand Color */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.primaryColor")}</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => handleColorPickerChange(e.target.value)}
                        className="h-10 w-10 cursor-pointer rounded-lg border border-slate-200 p-1"
                      />
                      <Input
                        value={colorHex}
                        onChange={(e) => handleColorHexChange(e.target.value)}
                        className="w-32 font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  ) : restaurant.primaryColor ? (
                    <div className="flex items-center gap-3">
                      <div
                        className="h-5 w-5 rounded-full border border-slate-200"
                        style={{ backgroundColor: restaurant.primaryColor }}
                      />
                      <span className="font-mono text-sm">{restaurant.primaryColor}</span>
                    </div>
                  ) : (
                    <p className="text-base font-medium text-muted-foreground">{t("settings.notSet")}</p>
                  )}
                </div>

                {/* Subdomain (always read-only) */}
                <div className="space-y-2 md:col-span-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.subdomain")}</Label>
                  <div className="flex items-center gap-2">
                    <p className="text-base font-medium">{restaurant.subdomain}</p>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href={`https://${restaurant.subdomain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent>{t("settings.openMenu")}</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Status (never editable) */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.status")}</Label>
                  <StatusBadge status={restaurant.status} />
                </div>

                {/* Member Since */}
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">{t("settings.fields.memberSince")}</Label>
                  <p className="text-base font-medium">{formatLocalDate(restaurant.createdAt)}</p>
                </div>
              </div>

              {/* Form error */}
              {formError && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* ─── Restaurant Confirm Dialog ─── */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("settings.confirm.title")}</DialogTitle>
            <DialogDescription>{t("settings.confirm.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSaving}>
              {t("settings.confirm.cancel")}
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={isSaving}
              className="bg-orange-500 hover:bg-orange-600"
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("settings.confirm.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── Plans Dialog ─── */}
      <Dialog open={showPlans} onOpenChange={setShowPlans}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-xl">{t("settings.plans.title")}</DialogTitle>
            <DialogDescription>{t("settings.plans.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 pt-4 sm:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border-2 p-6 ${
                  plan.popular
                    ? "border-orange-500 shadow-lg"
                    : "border-slate-200"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-orange-500 text-white hover:bg-orange-600">
                      {t("settings.plans.mostPopular")}
                    </Badge>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                    {plan.period && (
                      <span className="text-sm text-slate-500">{plan.period}</span>
                    )}
                  </div>
                </div>
                <ul className="mb-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                      <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          variant="outline"
                          className="w-full"
                          disabled
                        >
                          {t("settings.plans.choosePlan")}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>{t("settings.plans.comingSoon")}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
