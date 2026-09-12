import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import axiosInstance from '@/lib/axios';

export default function ConfirmEmailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as { email?: string })?.email || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setLocalError(null);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted) {
      const newCode = pasted.split('').concat(Array(6 - pasted.length).fill(''));
      setCode(newCode);
      const focusIndex = Math.min(pasted.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setLocalError(t('auth.invalidCode'));
      return;
    }

    setIsLoading(true);
    setLocalError(null);

    try {
      await axiosInstance.post('/auth/confirm-email', { email, code: fullCode });
      toast.success(t('auth.emailVerified'));
      navigate('/');
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || t('auth.invalidCode'));
    } finally {
      setIsLoading(false);
    }
  }, [code, email, navigate, t]);

  const handleResend = async () => {
    setIsResending(true);
    setLocalError(null);

    try {
      await axiosInstance.post('/auth/resend-confirmation', { email });
      toast.success(t('auth.codeSentTo') + ' ' + email);
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || t('auth.errors.unexpected'));
    } finally {
      setIsResending(false);
    }
  };

  const handleKeyUp = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  return (
    <div
      className={`min-h-screen bg-slate-100 px-4 py-8 ${i18n.language === 'ar' ? 'rtl' : ''}`}
      dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-4 flex justify-end">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {['en', 'fr', 'ar'].map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => i18n.changeLanguage(lng)}
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
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500">
                <Mail className="h-8 w-8 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-slate-900">
                  {t('auth.confirmEmail')}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-600">
                  {t('auth.confirmEmailDesc')}
                </p>
                {email && (
                  <p className="mt-1 text-sm font-semibold text-orange-600">
                    {t('auth.codeSentTo')} {email}
                  </p>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {localError && (
                <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-700">
                  <AlertDescription>{localError}</AlertDescription>
                </Alert>
              )}

              <div className="flex justify-center gap-3">
                {code.map((digit, index) => (
                  <Input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onKeyUp={(e) => handleKeyUp(index, e)}
                    onPaste={handlePaste}
                    className="h-14 w-12 text-center text-lg font-bold"
                  />
                ))}
              </div>

              <Button
                type="button"
                onClick={handleVerify}
                disabled={isLoading || code.join('').length !== 6}
                className="w-full"
              >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('auth.verifyEmail')}
              </Button>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleResend}
                  disabled={isResending}
                  className="text-sm text-orange-600 hover:text-orange-700"
                >
                  {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {t('auth.resendCode')}
                </Button>
              </div>

              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/')}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  {t('auth.skipForNow')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
