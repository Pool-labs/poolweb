import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, Label } from "my-v0-project"

// The admin login's email-OTP control. maxLength is required and must match the
// number of slots rendered.
export function SixDigit() {
  return (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}

export function Grouped() {
  return (
    <InputOTP maxLength={6}>
      <InputOTPGroup>
        {[0, 1, 2].map((i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
      <InputOTPSeparator />
      <InputOTPGroup>
        {[3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  )
}

export function Labelled() {
  return (
    <div className="space-y-3">
      <Label>Enter the 6-digit code we emailed you</Label>
      <InputOTP maxLength={6}>
        <InputOTPGroup>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <InputOTPSlot key={i} index={i} />
          ))}
        </InputOTPGroup>
      </InputOTP>
    </div>
  )
}
