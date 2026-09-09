"use client";

import { useActionState, useRef, useEffect } from "react";
import { addAddress } from "@/actions/account";

const inputClass =
  "w-full rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500";
const labelClass = "mb-1 block text-sm font-medium text-stone-700";

export function AddressForm() {
  const [state, action, pending] = useActionState(addAddress, null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state === null) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="fullName" className={labelClass}>
          Full name
        </label>
        <input id="fullName" name="fullName" required className={inputClass} />
        {state?.fieldErrors?.fullName && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.fullName[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className={labelClass}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          inputMode="numeric"
          placeholder="10-digit mobile"
          required
          className={inputClass}
        />
        {state?.fieldErrors?.phone && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.phone[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="pincode" className={labelClass}>
          Pincode
        </label>
        <input
          id="pincode"
          name="pincode"
          inputMode="numeric"
          placeholder="6-digit pincode"
          required
          className={inputClass}
        />
        {state?.fieldErrors?.pincode && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.pincode[0]}</p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="line1" className={labelClass}>
          Address line 1
        </label>
        <input id="line1" name="line1" required className={inputClass} />
        {state?.fieldErrors?.line1 && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.line1[0]}</p>
        )}
      </div>

      <div className="sm:col-span-2">
        <label htmlFor="line2" className={labelClass}>
          Address line 2 (optional)
        </label>
        <input id="line2" name="line2" className={inputClass} />
      </div>

      <div>
        <label htmlFor="city" className={labelClass}>
          City
        </label>
        <input id="city" name="city" required className={inputClass} />
        {state?.fieldErrors?.city && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.city[0]}</p>
        )}
      </div>

      <div>
        <label htmlFor="state" className={labelClass}>
          State
        </label>
        <input id="state" name="state" required className={inputClass} />
        {state?.fieldErrors?.state && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.state[0]}</p>
        )}
      </div>

      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          id="isDefault"
          name="isDefault"
          type="checkbox"
          className="h-4 w-4 rounded border-stone-300"
        />
        <label htmlFor="isDefault" className="text-sm text-stone-700">
          Set as default address
        </label>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 sm:col-span-2">{state.error}</p>
      )}

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-800 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save address"}
        </button>
      </div>
    </form>
  );
}
