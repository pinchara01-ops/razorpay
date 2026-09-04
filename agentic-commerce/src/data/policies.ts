import type { MerchantPolicy } from "@/lib/types";

export const policies: MerchantPolicy[] = [
  {
    id: "returns-unopened",
    title: "Returns",
    summary: "Eligible skincare products can be returned within 7 days only if unopened and unused."
  },
  {
    id: "delivery-standard",
    title: "Delivery",
    summary: "Standard delivery is estimated at 2 to 4 days for metro cities in test scenarios."
  },
  {
    id: "non-returnable-addons",
    title: "Personalized Add-ons",
    summary: "Personalized add-ons such as gift notes are not returnable."
  }
];
