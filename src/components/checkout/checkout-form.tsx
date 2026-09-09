"use client";

import { useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import {
  placeOrderAction,
  verifyPaymentAction,
  applyCouponAction,
} from "@/actions/checkout";
import { placeOrderSchema, type PlaceOrderFormInput } from "@/lib/validators/checkout";
import { calculateShippingPaise } from "@/lib/shipping";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CartLine } from "@/lib/cart";
import type { RazorpayCheckoutOptions } from "@/types/razorpay";

type SavedAddress = {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
};

const inputClass =
  "w-full rounded-md border border-input px-3 py-2 text-sm outline-none focus:border-ring focus:ring-1 focus:ring-ring";
const labelClass = "mb-1 block text-sm font-medium";

export function CheckoutForm({
  lines,
  subtotalPaise,
  savedAddresses,
  defaultEmail,
  razorpayKeyId,
}: {
  lines: CartLine[];
  subtotalPaise: number;
  savedAddresses: SavedAddress[];
  defaultEmail?: string;
  razorpayKeyId: string;
}) {
  const router = useRouter();
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    savedAddresses[0]?.id ?? "new",
  );
  const [couponCode, setCouponCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    discountPaise: number;
  } | null>(null);

  const selectedAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PlaceOrderFormInput>({
    resolver: zodResolver(placeOrderSchema),
    defaultValues: {
      email: defaultEmail ?? "",
      fullName: selectedAddress?.fullName ?? "",
      phone: selectedAddress?.phone ?? "",
      line1: selectedAddress?.line1 ?? "",
      line2: selectedAddress?.line2 ?? "",
      city: selectedAddress?.city ?? "",
      state: selectedAddress?.state ?? "",
      pincode: selectedAddress?.pincode ?? "",
    },
  });

  function selectSavedAddress(address: SavedAddress) {
    setSelectedAddressId(address.id);
    setValue("fullName", address.fullName);
    setValue("phone", address.phone);
    setValue("line1", address.line1);
    setValue("line2", address.line2 ?? "");
    setValue("city", address.city);
    setValue("state", address.state);
    setValue("pincode", address.pincode);
  }

  function selectNewAddress() {
    setSelectedAddressId("new");
    for (const field of [
      "fullName",
      "phone",
      "line1",
      "line2",
      "city",
      "state",
      "pincode",
    ] as const) {
      setValue(field, "");
    }
  }

  const couponAction = useAction(applyCouponAction, {
    onSuccess: ({ data }) => {
      if (!data) return;
      setAppliedDiscount({ code: data.code, discountPaise: data.discountPaise });
      toast.success(`Coupon ${data.code} applied.`);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't apply that coupon."),
  });

  const verifyAction = useAction(verifyPaymentAction, {
    onSuccess: ({ data }) => {
      if (data?.orderId) router.push(`/checkout/success/${data.orderId}`);
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? "We couldn't confirm your payment. Please contact support.",
      );
    },
  });

  const placeOrderAct = useAction(placeOrderAction, {
    // Read the submitted name/phone from the hook's own tracked `input`
    // (next-safe-action/hooks: "current/last input value"), not component
    // state set just before calling execute() — a state write isn't
    // guaranteed visible by the time this async callback runs after the
    // network round-trip, which is exactly what silently dropped the
    // phone number from Razorpay's `prefill` when this used useState
    // (confirmed against real Razorpay test-mode credentials — Checkout
    // then prompts for a mobile number mid-flow instead of using the one
    // already collected on our form). `input` is the hook's single source
    // of truth for this, so there's nothing to keep in sync by hand.
    onSuccess: ({ data }) => {
      if (!data) return;
      openRazorpayCheckout(data, placeOrderAct.input);
    },
    onError: ({ error }) =>
      toast.error(error.serverError ?? "Couldn't place your order."),
  });

  function openRazorpayCheckout(
    order: {
      orderId: string;
      orderNumber: string;
      razorpayOrderId: string;
      amountPaise: number;
    },
    payer: PlaceOrderFormInput,
  ) {
    // Check the live global directly, not the `scriptReady` state — state
    // is captured in this callback's closure at the render it was created
    // from, so under React's dev-mode double-render (or just an
    // unlucky render ordering) it can still read `false` a moment after
    // the script actually finished loading and set the real global.
    // `window.Razorpay` has no such staleness: it's either there or not.
    if (typeof window.Razorpay === "undefined") {
      toast.error("Payment is still loading — please try again in a moment.");
      return;
    }

    const options: RazorpayCheckoutOptions = {
      key: razorpayKeyId,
      amount: order.amountPaise,
      currency: "INR",
      name: "AzureHijabs",
      description: order.orderNumber,
      order_id: order.razorpayOrderId,
      prefill: { name: payer.fullName, contact: payer.phone },
      theme: { color: "#3d5a99" },
      handler: (response) => {
        verifyAction.execute({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => {
          toast.info("Payment cancelled. You can try again whenever you're ready.");
        },
      },
    };

    new window.Razorpay(options).open();
  }

  const shippingPaise = calculateShippingPaise(subtotalPaise);
  const discountPaise = appliedDiscount?.discountPaise ?? 0;
  const totalPaise = subtotalPaise - discountPaise + shippingPaise;

  const onSubmit = handleSubmit((values) => {
    placeOrderAct.execute({ ...values, couponCode: appliedDiscount?.code });
  });

  const submitting = placeOrderAct.isExecuting || verifyAction.isExecuting;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_360px]">
        <form onSubmit={onSubmit} className="space-y-6">
          {savedAddresses.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-semibold">Choose an address</h2>
              <div className="space-y-2">
                {savedAddresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm ${
                      selectedAddressId === address.id
                        ? "border-primary bg-primary/5"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      className="mt-1"
                      checked={selectedAddressId === address.id}
                      onChange={() => selectSavedAddress(address)}
                    />
                    <span>
                      <span className="block font-medium">{address.fullName}</span>
                      <span className="text-muted-foreground block">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                        {address.state} {address.pincode}
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${
                    selectedAddressId === "new" ? "border-primary bg-primary/5" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    checked={selectedAddressId === "new"}
                    onChange={selectNewAddress}
                  />
                  Use a new address
                </label>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold">Contact & shipping details</h2>

            <div>
              <label htmlFor="email" className={labelClass}>
                Email
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive mt-1 text-xs">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Full name
                </label>
                <input id="fullName" className={inputClass} {...register("fullName")} />
                {errors.fullName && (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="phone"
                  inputMode="numeric"
                  className={inputClass}
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="text-destructive mt-1 text-xs">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="line1" className={labelClass}>
                Address line 1
              </label>
              <input id="line1" className={inputClass} {...register("line1")} />
              {errors.line1 && (
                <p className="text-destructive mt-1 text-xs">{errors.line1.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="line2" className={labelClass}>
                Address line 2 (optional)
              </label>
              <input id="line2" className={inputClass} {...register("line2")} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label htmlFor="city" className={labelClass}>
                  City
                </label>
                <input id="city" className={inputClass} {...register("city")} />
                {errors.city && (
                  <p className="text-destructive mt-1 text-xs">{errors.city.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="state" className={labelClass}>
                  State
                </label>
                <input id="state" className={inputClass} {...register("state")} />
                {errors.state && (
                  <p className="text-destructive mt-1 text-xs">{errors.state.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="pincode" className={labelClass}>
                  Pincode
                </label>
                <input
                  id="pincode"
                  inputMode="numeric"
                  className={inputClass}
                  {...register("pincode")}
                />
                {errors.pincode && (
                  <p className="text-destructive mt-1 text-xs">
                    {errors.pincode.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full lg:hidden"
            disabled={submitting}
          >
            {submitting ? "Processing…" : `Pay ${formatINR(totalPaise)}`}
          </Button>
        </form>

        <aside className="h-fit space-y-4 rounded-lg border p-5">
          <h2 className="text-sm font-semibold">Order summary</h2>
          <ul className="space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  {line.productTitle} × {line.effectiveQuantity}
                </span>
                <span>{formatINR(line.linePaise)}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <Input
              placeholder="Coupon code"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!couponCode || couponAction.isExecuting}
              onClick={() => couponAction.execute({ code: couponCode, subtotalPaise })}
            >
              Apply
            </Button>
          </div>
          {appliedDiscount && (
            <p className="text-xs text-green-700">
              Coupon {appliedDiscount.code} applied.
            </p>
          )}

          <div className="space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatINR(subtotalPaise)}</span>
            </div>
            {discountPaise > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span>-{formatINR(discountPaise)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Shipping</span>
              <span>{shippingPaise === 0 ? "Free" : formatINR(shippingPaise)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatINR(totalPaise)}</span>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            className="hidden w-full lg:flex"
            disabled={submitting}
            onClick={onSubmit}
          >
            {submitting ? "Processing…" : `Pay ${formatINR(totalPaise)}`}
          </Button>
        </aside>
      </div>
    </>
  );
}
