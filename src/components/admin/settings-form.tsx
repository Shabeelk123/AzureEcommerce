"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { updateSettingsAction } from "@/actions/admin/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SettingsForm({
  initial,
}: {
  initial: {
    shippingFlatPaise: number;
    freeShippingThresholdPaise: number;
    storeName: string;
    supportEmail: string;
    supportPhone: string | null;
  };
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    shippingFlatRupees: String(initial.shippingFlatPaise / 100),
    freeShippingThresholdRupees: String(initial.freeShippingThresholdPaise / 100),
    storeName: initial.storeName,
    supportEmail: initial.supportEmail,
    supportPhone: initial.supportPhone ?? "",
  });

  const action = useAction(updateSettingsAction, {
    onSuccess: () => {
      toast.success("Settings saved.");
      router.refresh();
    },
    onError: ({ error }) => toast.error(error.serverError ?? "Couldn't save settings."),
  });

  function submit() {
    action.execute({
      shippingFlatPaise: Math.round(Number(values.shippingFlatRupees) * 100),
      freeShippingThresholdPaise: Math.round(Number(values.freeShippingThresholdRupees) * 100),
      storeName: values.storeName.trim(),
      supportEmail: values.supportEmail.trim(),
      supportPhone: values.supportPhone.trim() || undefined,
    });
  }

  return (
    <div className="max-w-lg space-y-4 rounded-lg border bg-white p-5">
      <div>
        <label className="mb-1 block text-sm font-medium">Store name</label>
        <Input
          value={values.storeName}
          onChange={(e) => setValues({ ...values, storeName: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Support email</label>
        <Input
          type="email"
          value={values.supportEmail}
          onChange={(e) => setValues({ ...values, supportEmail: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Support phone</label>
        <Input
          value={values.supportPhone}
          onChange={(e) => setValues({ ...values, supportPhone: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Flat shipping rate (₹)</label>
        <Input
          type="number"
          value={values.shippingFlatRupees}
          onChange={(e) => setValues({ ...values, shippingFlatRupees: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Free shipping threshold (₹)</label>
        <Input
          type="number"
          value={values.freeShippingThresholdRupees}
          onChange={(e) => setValues({ ...values, freeShippingThresholdRupees: e.target.value })}
        />
      </div>
      <Button disabled={action.isExecuting} onClick={submit}>
        Save settings
      </Button>
    </div>
  );
}
