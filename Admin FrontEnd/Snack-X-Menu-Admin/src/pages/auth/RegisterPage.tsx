import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, ArrowRight, Info, Mail, Shield, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const { t, i18n } = useTranslation();
  const { register, error: authError, isLoading } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    restaurantName: '',
    phoneNumber: '',
    address: '',
    city: '',
    primaryColor: '#f97316',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const canContinue = useMemo(() => {
    const step1Valid = !!formData.fullName && !!formData.email && !!formData.password && acceptedTerms;
    const step2Valid = !!formData.restaurantName && !!formData.phoneNumber && !!formData.address && !!formData.city;
    return currentStep === 1 ? step1Valid : step2Valid;
  }, [currentStep, formData, acceptedTerms]);

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    setLocalError(null);
    if (!formData.fullName || !formData.email || !formData.password) {
      setLocalError(t('auth.errors.pleaseCompletePersonal'));
      return;
    }
    if (!acceptedTerms) {
      setLocalError(t('auth.errors.acceptTermsRequired'));
      return;
    }

    setCurrentStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!formData.restaurantName || !formData.phoneNumber || !formData.address || !formData.city) {
      setLocalError(t('auth.errors.pleaseCompleteBusiness'));
      return;
    }

    try {
      await register({
        fullName: formData.fullName,
        email: formData.email,
        PassWord: formData.password,
        RestaurantName: formData.restaurantName,
        BusinesPhoneNumber: formData.phoneNumber,
        Address: formData.address,
        City: formData.city,
        Logo: logoFile ?? undefined,
        PrimaryColor: formData.primaryColor,
      });
      toast.success(t('auth.success'));
      navigate('/confirm-email', { state: { email: formData.email } });
    } catch {
      setLocalError(t('auth.errors.unableToCreate'));
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-100 px-4 py-8 ${i18n.language === 'ar' ? 'rtl' : ''}`}
      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-2xl">
          <div className="mb-4 flex justify-end">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {['en', 'fr', 'ar'].map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => changeLanguage(lng)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    i18n.language === lng
                      ? 'bg-orange-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <Card className="border-slate-200 shadow-xl">
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-bold text-white">
                S
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {t('auth.createYourBusinessAccount')}
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {(authError || localError) && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{authError || localError}</AlertDescription>
                </Alert>
              )}

              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-blue-800">
                  <Info className="h-4 w-4" />
                  {t('auth.instructionsTitle')}
                </div>
                <p className="text-sm text-blue-700">{t('auth.instructionsInfo')}</p>
              </div>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 text-slate-500" />
                  <p className="text-sm text-slate-600">{t('auth.infoValidEmail')}</p>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="mt-0.5 h-4 w-4 text-slate-500" />
                  <p className="text-sm text-slate-600">{t('auth.infoSecureData')}</p>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-2">
                {[1, 2].map((step) => (
                  <div
                    key={step}
                    className={`flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium ${
                      currentStep === step ? 'bg-orange-500 text-white' : 'text-slate-600'
                    }`}
                  >
                    {t(`auth.step${step}`)}
                  </div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {currentStep === 1 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">{t('auth.fullName')}</Label>
                      <Input
                        id="fullName"
                        value={formData.fullName}
                        onChange={(e) => handleChange('fullName', e.target.value)}
                        placeholder={t('auth.fullName')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">{t('auth.email')}</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder={t('auth.email')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">{t('auth.password')}</Label>
                      <Input
                        id="password"
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        placeholder={t('auth.password')}
                      />
                    </div>

                    <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
                      <Checkbox
                        id="terms"
                        checked={acceptedTerms}
                        onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                        className="mt-0.5"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="terms" className="cursor-pointer text-sm font-medium text-slate-700">
                          {t('auth.acceptTerms')}
                        </Label>
                        <p className="text-xs text-slate-500">
                          {t('auth.acceptTermsDesc')}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="restaurantName">{t('auth.restaurantName')}</Label>
                      <Input
                        id="restaurantName"
                        value={formData.restaurantName}
                        onChange={(e) => handleChange('restaurantName', e.target.value)}
                        placeholder={t('auth.restaurantName')}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">{t('auth.phoneNumber')}</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => handleChange('phoneNumber', e.target.value)}
                        placeholder={t('auth.phoneNumber')}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="address">{t('auth.address')}</Label>
                        <Input
                          id="address"
                          value={formData.address}
                          onChange={(e) => handleChange('address', e.target.value)}
                          placeholder={t('auth.address')}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="city">{t('auth.city')}</Label>
                        <Input
                          id="city"
                          value={formData.city}
                          onChange={(e) => handleChange('city', e.target.value)}
                          placeholder={t('auth.city')}
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="logo">{t('auth.logo')}</Label>
                        <div className="relative">
                          <Input
                            id="logo"
                            type="file"
                            accept="image/*"
                            onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                            className="h-11 cursor-pointer file:mr-3 file:h-full file:border-0 file:bg-orange-50 file:px-3 file:text-sm file:font-semibold file:text-orange-600 hover:file:bg-orange-100"
                          />
                        </div>
                        {logoFile && (
                          <p className="text-xs text-slate-500">{logoFile.name}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="primaryColor">{t('auth.primaryColor')}</Label>
                        <Input
                          id="primaryColor"
                          type="color"
                          value={formData.primaryColor}
                          onChange={(e) => handleChange('primaryColor', e.target.value)}
                          className="h-11 p-1"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  {currentStep === 2 && (
                    <Button type="button" variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      {t('auth.back')}
                    </Button>
                  )}

                  {currentStep === 1 ? (
                    <Button type="button" onClick={handleNext} disabled={!canContinue} className="flex-1">
                      {t('auth.next')}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isLoading || !canContinue} className="flex-1">
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('auth.submit')}
                    </Button>
                  )}
                </div>
              </form>

              <p className="text-center text-sm text-slate-600">
                {t('auth.alreadyHaveAccount')}{' '}
                <Link to="/login" className="font-semibold text-orange-600 hover:underline">
                  {t('auth.login')}
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
