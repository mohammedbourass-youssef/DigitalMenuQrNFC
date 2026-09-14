import { useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2, Mail, CheckCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OtpInput } from "@/components/OtpInput";
import { useCountdown } from "@/hooks/useCountdown";
import {
  requestVerification,
  verifyEmail,
} from "@/services/userService";

type VerificationStep =
  | "idle"
  | "sending"
  | "awaiting-code"
  | "verifying"
  | "verified"
  | "error";

const CODE_EXPIRY_SECONDS = 120;

export default function ConfirmEmailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const email =
    (location.state as { email?: string })?.email ?? "";

  const [step, setStep] = useState<VerificationStep>("idle");
  const [digits, setDigits] = useState<string[]>(
    Array(6).fill("")
  );
  const [error, setError] = useState<string | null>(null);

  const countdown = useCountdown(CODE_EXPIRY_SECONDS);

  const clearInputs = useCallback(() => {
    setDigits(Array(6).fill(""));
  }, []);

  const handleSendCode = useCallback(async () => {
    setStep("sending");
    setError(null);

    try {
      await requestVerification();
      setStep("awaiting-code");
      clearInputs();
      countdown.start(CODE_EXPIRY_SECONDS);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } };
      };
      const status = axiosErr.response?.status;
      const msg = axiosErr.response?.data?.error;

      if (status === 401) {
        navigate("/login");
        return;
      }

      if (status === 400 && msg) {
        setError(msg);
      } else if (status === 404) {
        setError(t("auth.codeNotFound"));
      } else {
        setError(t("auth.errors.unexpected"));
      }
      setStep("idle");
    }
  }, [navigate, t, clearInputs, countdown]);

  const handleVerify = useCallback(async () => {
    const fullCode = digits.join("");
    if (fullCode.length !== 6) return;

    setStep("verifying");
    setError(null);

    try {
      await verifyEmail(Number(fullCode));
      countdown.stop();
      setStep("verified");
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } };
      };
      const status = axiosErr.response?.status;
      const msg = axiosErr.response?.data?.error;

      if (status === 401) {
        navigate("/login");
        return;
      }

      if (status === 404) {
        setError(t("auth.codeNotFound"));
        clearInputs();
      } else if (status === 400 && msg) {
        const lower = msg.toLowerCase();
        if (
          lower.includes("expired") ||
          lower.includes("no longer valid")
        ) {
          setError(msg);
          clearInputs();
          countdown.reset(0);
        } else if (lower.includes("already been used")) {
          setError(msg);
          clearInputs();
        } else if (lower.includes("invalid code status")) {
          setError(msg);
          clearInputs();
        } else {
          setError(msg);
          clearInputs();
        }
      } else {
        setError(t("auth.errors.unexpected"));
        clearInputs();
      }

      setStep("awaiting-code");
    }
  }, [digits, navigate, t, clearInputs, countdown]);

  const handleResend = useCallback(async () => {
    if (countdown.isRunning) return;

    setError(null);
    clearInputs();

    try {
      await requestVerification();
      countdown.start(CODE_EXPIRY_SECONDS);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { status?: number; data?: { error?: string } };
      };
      const status = axiosErr.response?.status;
      const msg = axiosErr.response?.data?.error;

      if (status === 401) {
        navigate("/login");
        return;
      }

      if (status === 400 && msg) {
        setError(msg);
      } else {
        setError(t("auth.errors.unexpected"));
      }
    }
  }, [countdown, navigate, t, clearInputs]);

  const handleOtpComplete = useCallback(
    (code: string) => {
      if (step === "awaiting-code") {
        void handleVerify();
      }
    },
    [step, handleVerify]
  );

  const handleContinue = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const isInputDisabled =
    step === "sending" || step === "verifying" || step === "verified";
  const isVerifyDisabled =
    step !== "awaiting-code" || digits.join("").length !== 6;

  return (
    <div
      className={`min-h-screen bg-slate-100 px-4 py-8 ${i18n.language === "ar" ? "rtl" : ""}`}
      dir={i18n.language === "ar" ? "rtl" : "ltr"}
    >
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-full max-w-md">
          <div className="mb-4 flex justify-end">
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              {["en", "fr", "ar"].map((lng) => (
                <button
                  key={lng}
                  type="button"
                  onClick={() => i18n.changeLanguage(lng)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    i18n.language === lng
                      ? "bg-orange-500 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {lng.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* ─── Step 1: Send Code ─── */}
          {(step === "idle" || step === "sending") && (
            <Card className="relative border-slate-200 shadow-xl overflow-hidden">
              <CardHeader className="space-y-4 pb-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {t("auth.confirmEmail")}
                  </CardTitle>
                  <p className="mt-2 text-sm text-slate-600">
                    {t("auth.confirmEmailDesc")}
                  </p>
                  {email && (
                    <p className="mt-1 text-sm font-semibold text-orange-600">
                      {t("auth.codeSentTo")} {email}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {error && (
                  <Alert
                    variant="destructive"
                    className="border-red-200 bg-red-50 text-red-700"
                  >
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="button"
                  onClick={handleSendCode}
                  disabled={step === "sending"}
                  className="w-full"
                >
                  {step === "sending" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {t("auth.sendCode")}
                </Button>
              </CardContent>

              {/* Loading overlay */}
              {step === "sending" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10">
                  <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                  <p className="mt-4 text-sm font-medium text-slate-700">
                    {t("auth.sendingCode")}
                  </p>
                </div>
              )}
            </Card>
          )}

          {/* ─── Step 2: Code Entry ─── */}
          {(step === "awaiting-code" || step === "verifying") && (
            <Card className="border-slate-200 shadow-xl">
              <CardHeader className="space-y-4 pb-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {t("auth.enterCode")}
                  </CardTitle>
                  {email && (
                    <p className="mt-1 text-sm font-semibold text-orange-600">
                      {t("auth.codeSentTo")} {email}
                    </p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {error && (
                  <Alert
                    variant="destructive"
                    className="border-red-200 bg-red-50 text-red-700"
                    role="alert"
                  >
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div aria-live="polite" className="text-center">
                  {countdown.isRunning ? (
                    <p className="text-sm text-slate-600">
                      {t("auth.codeExpiresIn")}{" "}
                      <span className="font-mono font-semibold text-orange-600">
                        {countdown.formatted}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {t("auth.codeExpired")}
                    </p>
                  )}
                </div>

                <OtpInput
                  length={6}
                  value={digits}
                  onChange={setDigits}
                  onComplete={handleOtpComplete}
                  disabled={isInputDisabled}
                />

                <Button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifyDisabled}
                  className="w-full"
                >
                  {step === "verifying" ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  {step === "verifying"
                    ? t("auth.verifying")
                    : t("auth.verifyEmail")}
                </Button>

                <div className="text-center">
                  {countdown.isRunning ? (
                    <p className="text-sm text-slate-500">
                      {t("auth.resendIn")}{" "}
                      <span className="font-mono">
                        {countdown.formatted}
                      </span>
                    </p>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleResend}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      {t("auth.resendCode")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ─── Step 3: Success ─── */}
          {step === "verified" && (
            <Card className="border-slate-200 shadow-xl">
              <CardHeader className="space-y-4 pb-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-500">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900">
                    {t("auth.verifiedTitle")}
                  </CardTitle>
                  <p className="mt-2 text-sm text-slate-600">
                    {t("auth.verifiedDesc")}
                  </p>
                </div>
              </CardHeader>

              <CardContent>
                <Button
                  type="button"
                  onClick={handleContinue}
                  className="w-full"
                >
                  {t("auth.continueToDashboard")}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
