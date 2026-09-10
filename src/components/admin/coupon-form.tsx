"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { createCouponAction, updateCouponAction } from "@/actions/admin/coupon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CouponFormValues = {
  id?: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minSubtotalRupees: string;
  maxRedemptions: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};

function toDateInputValue(date?: Date | string | null) {
  if (!date) return "";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

export function CouponForm({
  initial,
}: {
  initial?: {
    id: string;
    code: string;
    type: "PERCENT" | "FIXED";
    value: number;
    minSubtotalPaise: number;
    maxRedemptions: number | null;
    startsAt: Date | string | null;
    endsAt: Date | string | null;
    isActive: boolean;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState<CouponFormValues>(
    initial
      ? {
          id: initial.id,
          code: initial.code,
          type: initial.type,
          value: String(initial.type === "FIXED" ? initial.value / 100 : initial.value),
          minSubtotalRupees: String(initial.minSubtotalPaise / 100),
          maxRedemptions: initial.maxRedemptions != null ? String(initial.maxRedemptions) : "",
          startsAt: toDateInputValue(initial.startsAt),
          endsAt: toDateInputValue(initial.endsAt),
          isActive: initial.isActive,
        }
      : {
          code: "",
          type: "PERCENT",
          value: "",
          minSubtotalRupees: "0",
          maxRedemptions: "",
          startsAt: "",
          endsAt: "",
          isActive: true,
        },
  );

  const createAction = useAction(createCouponAction, {
    onSuccess: () => {
      toast.success("Coupon created.");
      router.push("/admin/coupons");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't create coupon."),
  });
  const updateAction = useAction(updateCouponAction, {
    onSuccess: () => {
      toast.success("Coupon updated.");
      router.push("/admin/coupons");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't update coupon."),
  });

  const pending = createAction.isExecuting || updateAction.isExecuting;

  function submit() {
    const payload = {
      code: values.code.trim(),
      type: values.type,
      value:
        values.type === "FIXED"
          ? Math.round(Number(values.value) * 100)
          : Math.round(Number(values.value)),
      minSubtotalPaise: Math.round(Number(values.minSubtotalRupees || "0") * 100),
      maxRedemptions: values.maxRedemptions ? Number(values.maxRedemptions) : undefined,
      startsAt: values.startsAt ? new Date(values.startsAt) : undefined,
      endsAt: values.endsAt ? new Date(values.endsAt) : undefined,
      isActive: values.isActive,
    };
    if (values.id) {
      updateAction.execute({ id: values.id, ...payload });
    } else {
      createAction.execute(payload);
    }
  }

  return (
    <div className="max-w-lg space-y-4 rounded-lg border bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Code</label>
        <Input
          value={values.code}
          onChange={(e) => setValues({ ...values, code: e.target.value.toUpperCase() })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Type</label>
        <select
          className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          value={values.type}
          onChange={(e) => setValues({ ...values, type: e.target.value as "PERCENT" | "FIXED" })}
        >
          <option value="PERCENT">Percent off</option>
          <option value="FIXED">Fixed amount off (₹)</option>
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Value {values.type === "PERCENT" ? "(0-100)" : "(₹)"}
        </label>
        <Input
          type="number"
          value={values.value}
          onChange={(e) => setValues({ ...values, value: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Minimum order value (₹)</label>
        <Input
          type="number"
          value={values.minSubtotalRupees}
          onChange={(e) => setValues({ ...values, minSubtotalRupees: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Max redemptions (optional)</label>
        <Input
          type="number"
          value={values.maxRedemptions}
          onChange={(e) => setValues({ ...values, maxRedemptions: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">Starts</label>
          <Input
            type="date"
            value={values.startsAt}
            onChange={(e) => setValues({ ...values, startsAt: e.target.value })}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Ends</label>
          <Input
            type="date"
            value={values.endsAt}
            onChange={(e) => setValues({ ...values, endsAt: e.target.value })}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.isActive}
          onChange={(e) => setValues({ ...values, isActive: e.target.checked })}
        />
        Active
      </label>
      <Button disabled={!values.code || !values.value || pending} onClick={submit}>
        {values.id ? "Save changes" : "Create coupon"}
      </Button>
    </div>
  );
}
