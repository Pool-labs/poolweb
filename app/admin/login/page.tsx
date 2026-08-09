'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, ArrowLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';
import { ENV_BADGE, ENV_DESCRIPTIONS, ENV_LABELS, type ApiEnv } from '@/lib/admin/adminEnv';

const OTP_LENGTH = 6;

interface EnvState {
  env: ApiEnv;
  availableEnvs: ApiEnv[];
  authenticatedEnvs: ApiEnv[];
}

type Step = 'email' | 'code';

/**
 * Two-step platform-admin login: email → OTP.
 *
 * All auth traffic goes through the same-origin Next Route Handlers
 * (/admin/api/auth/*). The verify step also confirms platform-admin status
 * server-side before any cookie is set; a non-admin account is rejected here.
 * On success the server has set the httpOnly session cookies and we navigate to
 * the overview.
 *
 * ⚠️ THE ENVIRONMENT MATTERS MOST ON THIS SCREEN. Admin allowlists and OTPs are
 * per-environment, so a code minted by staging simply will not verify against
 * production — without saying so, "the code didn't work" is indistinguishable
 * from "you are logging into the wrong Pool".
 *
 * #112 answered that with a badge and a switcher inside this card, both of which
 * appeared only once a client fetch resolved. As of #14 the loud, colour-coded
 * strip in the admin LAYOUT carries both — server-resolved, on the first paint,
 * above this card and on every other page — so this card keeps only the
 * CONTEXTUAL sentence ("the code will be minted by X") and deliberately does NOT
 * render a second switcher. One switch, one place.
 *
 * The `GET /admin/api/env` fetch is kept for that sentence alone; it is
 * best-effort, and the server routes the OTP by its own cookie regardless, so
 * this display can never disagree with the truth, only lag it.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [envState, setEnvState] = useState<EnvState | null>(null);

  useEffect(() => {
    // Best-effort: a failure here leaves the badge absent rather than blocking
    // login. The server still routes the OTP to whichever environment its own
    // cookie names — this display can never disagree with it, only lag it.
    void fetch('/admin/api/env')
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => setEnvState(body?.data ?? null))
      .catch(() => setEnvState(null));
  }, []);

  const sendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/admin/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        setError(body?.error || 'Could not send the code. Try again.');
        return;
      }
      setStep('code');
      setCode('');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (submittedCode: string) => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/admin/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: submittedCode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.success === false) {
        setError(body?.error || 'Invalid or expired code.');
        setCode('');
        return;
      }
      router.replace('/admin/overview');
      router.refresh();
    } catch {
      setError('Network error. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onCodeComplete = (value: string) => {
    setCode(value);
    if (value.length === OTP_LENGTH) void verifyOtp(value);
  };

  return (
    // Not `min-h-screen`: the environment strip now sits above this card inside
    // the same viewport, and a full-height card under it would push the page
    // into a pointless scroll.
    <div className="flex min-h-[85vh] items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <div className="mb-4 flex items-center justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary">
                <Lock className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-center text-2xl">Platform Admin</CardTitle>
            {envState && (
              <div className="flex flex-col items-center gap-2 pb-1">
                <span
                  title={ENV_DESCRIPTIONS[envState.env]}
                  className={cn(
                    'whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide',
                    ENV_BADGE[envState.env].className,
                  )}
                >
                  {ENV_LABELS[envState.env]}
                </span>
                <p className="text-center text-xs text-muted-foreground">
                  Your code will be minted by the {ENV_LABELS[envState.env].toLowerCase()}{' '}
                  environment and will not work anywhere else. Admin access is granted per
                  environment — use the switch at the top of the page to change it.
                </p>
              </div>
            )}
            <CardDescription className="text-center">
              {step === 'email'
                ? 'Enter your admin email to receive a one-time code'
                : `Enter the 6-digit code sent to ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'email' ? (
              <form onSubmit={sendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading || !email.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending code...
                    </>
                  ) : (
                    'Send code'
                  )}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={OTP_LENGTH}
                    value={code}
                    onChange={onCodeComplete}
                    disabled={isLoading}
                  >
                    <InputOTPGroup>
                      {Array.from({ length: OTP_LENGTH }).map((_, i) => (
                        <InputOTPSlot key={i} index={i} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                {isLoading && (
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => {
                      setStep('email');
                      setError('');
                      setCode('');
                    }}
                  >
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Change email
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => void sendOtp(new Event('submit') as unknown as React.FormEvent)}
                  >
                    Resend code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
