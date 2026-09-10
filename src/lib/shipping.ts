import { getSettings } from "@/lib/settings";

export async function calculateShippingPaise(subtotalPaise: number): Promise<number> {
  const settings = await getSettings();
  return subtotalPaise >= settings.freeShippingThresholdPaise ? 0 : settings.shippingFlatPaise;
}

export async function getFreeShippingThresholdPaise(): Promise<number> {
  const settings = await getSettings();
  return settings.freeShippingThresholdPaise;
}
