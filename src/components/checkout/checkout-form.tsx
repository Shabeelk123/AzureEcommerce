"use client";

import { useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { Lock, Mail, ShieldCheck, Sparkles, Truck } from "lucide-react";
import {
  placeOrderAction,
  verifyPaymentAction,
  applyCouponAction,
} from "@/actions/checkout";
import { placeOrderSchema, type PlaceOrderFormInput } from "@/lib/validators/checkout";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
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
  "w-full rounded border border-[#d0c4c4] bg-[#fdfbf7] px-3 py-2.5 text-sm text-[#1c1c19] outline-none focus:border-[#090707] focus:ring-1 focus:ring-[#090707]";
const labelClass = "mb-1.5 block text-sm font-medium text-[#1c1c19]";
const errorClass = "mt-1 text-xs text-red-600";

function StepCard({
  step,
  title,
  subtitle,
  children,
}: {
  step: number;
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded border border-[#d0c4c4]/50 bg-[#fdfbf7] p-6 shadow-xs">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="font-playfair flex items-center gap-2.5 text-xl text-[#090707]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#090707] font-jakarta text-xs font-bold text-white">
            {step}
          </span>
          {title}
        </h3>
        {subtitle}
      </div>
      {children}
    </div>
  );
}

export function CheckoutForm({
  lines,
  subtotalPaise,
  savedAddresses,
  defaultEmail,
  razorpayKeyId,
  shippingFlatPaise,
  freeShippingThresholdPaise,
  supportEmail,
}: {
  lines: CartLine[];
  subtotalPaise: number;
  savedAddresses: SavedAddress[];
  defaultEmail?: string;
  razorpayKeyId: string;
  // Display-only estimate passed down from the server (src/lib/settings.ts)
  // — placeOrder() always recomputes the authoritative shipping cost
  // server-side, same as it does for pricing and discounts.
  shippingFlatPaise: number;
  freeShippingThresholdPaise: number;
  supportEmail: string;
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
  const [paymentMethod, setPaymentMethod] = useState<"RAZORPAY" | "COD">("RAZORPAY");

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
      paymentMethod: "RAZORPAY",
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
      if (data.method === "cod") {
        // No gateway to hand off to — the order is already confirmed
        // server-side (see confirmCodOrder in src/lib/order.ts).
        router.push(`/checkout/success/${data.orderId}`);
        return;
      }
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

  const shippingPaise =
    subtotalPaise >= freeShippingThresholdPaise ? 0 : shippingFlatPaise;
  const discountPaise = appliedDiscount?.discountPaise ?? 0;
  const totalPaise = subtotalPaise - discountPaise + shippingPaise;

  const onSubmit = handleSubmit((values) => {
    placeOrderAct.execute({
      ...values,
      couponCode: appliedDiscount?.code,
      paymentMethod,
    });
  });

  const submitting = placeOrderAct.isExecuting || verifyAction.isExecuting;

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12 lg:items-start">
        <form onSubmit={onSubmit} className="space-y-8 lg:col-span-7">
          <StepCard
            step={1}
            title="Contact Information"
            subtitle={
              <span className="font-jakarta text-sm text-[#4d4545]">
                Have an account?{" "}
                <Link href="/login" className="font-medium text-[#090707] underline">
                  Log in
                </Link>
              </span>
            }
          >
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  className={inputClass}
                  {...register("email")}
                />
                <Mail className="pointer-events-none absolute top-3 right-3 h-[18px] w-[18px] text-[#4d4545]/50" />
              </div>
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
          </StepCard>

          <StepCard step={2} title="Shipping Address">
            {savedAddresses.length > 0 && (
              <div className="mb-4 space-y-2">
                {savedAddresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-3 rounded border p-3 text-sm transition-colors ${
                      selectedAddressId === address.id
                        ? "border-[#090707] bg-[#f7f3ee]"
                        : "border-[#d0c4c4]/60"
                    }`}
                  >
                    <input
                      type="radio"
                      name="savedAddress"
                      className="mt-1 accent-[#090707]"
                      checked={selectedAddressId === address.id}
                      onChange={() => selectSavedAddress(address)}
                    />
                    <span className="font-jakarta">
                      <span className="block font-medium text-[#1c1c19]">
                        {address.fullName}
                      </span>
                      <span className="block text-[#4d4545]">
                        {address.line1}
                        {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                        {address.state} {address.pincode}
                      </span>
                    </span>
                  </label>
                ))}
                <label
                  className={`font-jakarta flex cursor-pointer items-center gap-3 rounded border p-3 text-sm transition-colors ${
                    selectedAddressId === "new"
                      ? "border-[#090707] bg-[#f7f3ee]"
                      : "border-[#d0c4c4]/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="savedAddress"
                    className="accent-[#090707]"
                    checked={selectedAddressId === "new"}
                    onChange={selectNewAddress}
                  />
                  Use a new address
                </label>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Full Name
                </label>
                <input id="fullName" className={inputClass} {...register("fullName")} />
                {errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}
              </div>

              <div>
                <label htmlFor="phone" className={labelClass}>
                  Mobile Phone Number
                </label>
                <div className="flex">
                  <span className="font-jakarta inline-flex items-center rounded-l border border-r-0 border-[#d0c4c4] bg-[#f1ede8] px-3 text-sm text-[#4d4545]">
                    +91
                  </span>
                  <input
                    id="phone"
                    inputMode="numeric"
                    className={`${inputClass} rounded-l-none`}
                    {...register("phone")}
                  />
                </div>
                {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
              </div>

              <div>
                <label htmlFor="line1" className={labelClass}>
                  Street Address &amp; House/Apartment Number
                </label>
                <input id="line1" className={inputClass} {...register("line1")} />
                {errors.line1 && <p className={errorClass}>{errors.line1.message}</p>}
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
                  {errors.city && <p className={errorClass}>{errors.city.message}</p>}
                </div>
                <div>
                  <label htmlFor="state" className={labelClass}>
                    State
                  </label>
                  <input id="state" className={inputClass} {...register("state")} />
                  {errors.state && <p className={errorClass}>{errors.state.message}</p>}
                </div>
                <div>
                  <label htmlFor="pincode" className={labelClass}>
                    PIN Code
                  </label>
                  <input
                    id="pincode"
                    inputMode="numeric"
                    maxLength={6}
                    className={inputClass}
                    {...register("pincode")}
                  />
                  {errors.pincode && <p className={errorClass}>{errors.pincode.message}</p>}
                </div>
              </div>
            </div>
          </StepCard>

          <StepCard step={3} title="Payment Method">
            <p className="font-jakarta -mt-3 mb-4 text-sm text-[#4d4545]">
              All transactions are secured, encrypted, and instantly confirmed.
            </p>
            <div className="space-y-3">
              <label
                className={`flex cursor-pointer flex-col gap-3 rounded border-2 p-4 transition-colors ${
                  paymentMethod === "RAZORPAY"
                    ? "border-[#090707] bg-[#f7f3ee]/50"
                    : "border-[#d0c4c4]/60 hover:border-[#090707]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="paymentMethod"
                      className="h-4 w-4 accent-[#090707]"
                      checked={paymentMethod === "RAZORPAY"}
                      onChange={() => setPaymentMethod("RAZORPAY")}
                    />
                    <span className="font-jakarta text-[15px] font-semibold text-[#090707]">
                      Razorpay (Cards, UPI, Net Banking, Wallets)
                    </span>
                  </div>
                  <span className="font-jakarta rounded bg-[#090707] px-2 py-0.5 text-[10px] font-bold tracking-wide text-white uppercase">
                    Recommended
                  </span>
                </div>
                <p className="font-jakarta pl-7 text-sm text-[#4d4545]">
                  Pay securely with any Indian bank, UPI app, or credit/debit card.
                </p>
                <div className="flex flex-wrap items-center gap-2 pl-7">
                  {["UPI", "GPay", "PhonePe", "Paytm", "VISA", "Mastercard", "RuPay"].map(
                    (badge) => (
                      <span
                        key={badge}
                        className="font-jakarta rounded border border-[#d0c4c4] bg-[#fdfbf7] px-2 py-1 text-[11px] font-semibold text-[#1c1c19]"
                      >
                        {badge}
                      </span>
                    ),
                  )}
                </div>
              </label>

              <label
                className={`flex cursor-pointer flex-col gap-1.5 rounded border-2 p-4 transition-colors ${
                  paymentMethod === "COD"
                    ? "border-[#090707] bg-[#f7f3ee]/50"
                    : "border-[#d0c4c4]/60 hover:border-[#090707]/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    className="h-4 w-4 accent-[#090707]"
                    checked={paymentMethod === "COD"}
                    onChange={() => setPaymentMethod("COD")}
                  />
                  <span className="font-jakarta text-[15px] font-semibold text-[#090707]">
                    Cash on Delivery (COD)
                  </span>
                </div>
                <p className="font-jakarta pl-7 text-sm text-[#4d4545]">
                  Pay in cash when your order arrives.
                </p>
              </label>
            </div>
          </StepCard>

          <div className="space-y-4">
            <Button
              type="submit"
              disabled={submitting}
              className="flex h-14 w-full items-center justify-center gap-3 rounded bg-[#090707] font-jakarta text-[15px] font-semibold tracking-wide text-white uppercase shadow-md transition-all hover:bg-[#221f1f]"
            >
              <Lock className="h-5 w-5" />
              {submitting
                ? "Processing…"
                : paymentMethod === "COD"
                  ? `Place COD Order — ${formatINR(totalPaise)}`
                  : `Pay Securely with Razorpay — ${formatINR(totalPaise)}`}
            </Button>
            <div className="font-jakarta flex flex-col items-center justify-center gap-2 text-center text-xs text-[#4d4545] sm:flex-row sm:gap-4">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#79564f]" />
                256-Bit SSL Encrypted Checkout
              </span>
              <span className="hidden text-[#d0c4c4] sm:inline">•</span>
              <span className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-[#79564f]" />
                Direct brand guarantee
              </span>
            </div>
          </div>
        </form>

        <aside className="space-y-6 lg:sticky lg:top-24 lg:col-span-5">
          <div className="rounded border border-[#d0c4c4]/60 bg-[#fdfbf7] p-6 shadow-sm sm:p-7">
            <div className="flex items-center justify-between border-b border-[#d0c4c4]/50 pb-4">
              <h2 className="font-playfair text-xl text-[#090707]">Order Summary</h2>
              <span className="font-jakarta rounded-full bg-[#fecfc7]/40 px-2.5 py-0.5 text-sm font-semibold text-[#79564f]">
                {lines.length} {lines.length === 1 ? "Item" : "Items"}
              </span>
            </div>

            <ul className="divide-y divide-[#d0c4c4]/40">
              {lines.map((line) => (
                <li key={line.id} className="flex items-center justify-between gap-4 py-4">
                  <span className="font-jakarta text-sm text-[#4d4545]">
                    {line.productTitle} × {line.effectiveQuantity}
                  </span>
                  <span className="font-jakarta text-sm font-semibold text-[#090707]">
                    {formatINR(line.linePaise)}
                  </span>
                </li>
              ))}
            </ul>

            {shippingPaise === 0 && (
              <div className="mt-4 flex items-center gap-2.5 rounded border border-[#d0c4c4]/40 bg-[#f7f3ee] p-3 text-[#79564f]">
                <Truck className="h-[18px] w-[18px]" />
                <span className="font-jakarta text-sm font-medium">
                  Free shipping unlocked on this order!
                </span>
              </div>
            )}

            <div className="mt-5 space-y-2 border-t border-[#d0c4c4]/40 pt-5">
              <label htmlFor="coupon-code" className="font-jakarta block text-sm font-medium text-[#1c1c19]">
                Discount Code
              </label>
              <div className="flex gap-2">
                <input
                  id="coupon-code"
                  placeholder="Enter code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  className={`${inputClass} font-medium uppercase`}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={!couponCode || couponAction.isExecuting}
                  onClick={() => couponAction.execute({ code: couponCode, subtotalPaise })}
                  className="rounded border-[#d0c4c4] text-[#090707] hover:bg-[#f1ede8]"
                >
                  Apply
                </Button>
              </div>
              {appliedDiscount && (
                <p className="font-jakarta flex items-center gap-1 text-xs font-medium text-[#79564f]">
                  Code &lsquo;{appliedDiscount.code}&rsquo; applied.
                </p>
              )}
            </div>

            <div className="mt-6 space-y-3 border-t border-[#d0c4c4]/40 pt-5 font-jakarta text-sm">
              <div className="flex justify-between text-[#4d4545]">
                <span>Subtotal</span>
                <span className="font-medium text-[#1c1c19]">{formatINR(subtotalPaise)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex justify-between text-[#79564f]">
                  <span>Discount</span>
                  <span>-{formatINR(discountPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#4d4545]">
                <span>Shipping</span>
                <span
                  className={
                    shippingPaise === 0
                      ? "text-xs font-medium tracking-wider text-[#79564f] uppercase"
                      : "font-medium text-[#1c1c19]"
                  }
                >
                  {shippingPaise === 0 ? "Free" : formatINR(shippingPaise)}
                </span>
              </div>
              <div className="flex justify-between text-[#4d4545]">
                <span>Taxes</span>
                <span className="text-xs text-[#4d4545]">Included in prices</span>
              </div>
              <div className="flex items-baseline justify-between border-t border-[#d0c4c4]/60 pt-4">
                <div>
                  <span className="font-playfair text-base font-bold text-[#090707]">
                    Total to Pay
                  </span>
                  <p className="text-[11px] text-[#4d4545]">Including all applicable taxes</p>
                </div>
                <span className="font-playfair text-2xl font-bold text-[#090707]">
                  {formatINR(totalPaise)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded border border-[#d0c4c4]/50 bg-[#f7f3ee] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#fecfc7]/50 text-[#79564f]">
                <Mail className="h-[18px] w-[18px]" />
              </div>
              <div>
                <h5 className="font-jakarta text-sm font-semibold text-[#090707]">
                  Need help with your order?
                </h5>
                <p className="font-jakarta text-xs text-[#4d4545]">Email {supportEmail}</p>
              </div>
            </div>
            <a
              href={`mailto:${supportEmail}`}
              className="font-jakarta rounded border border-[#d0c4c4] bg-[#fdfbf7] px-3 py-1.5 text-xs font-semibold text-[#090707] hover:bg-white"
            >
              Email us
            </a>
          </div>
        </aside>
      </div>
    </>
  );
}
