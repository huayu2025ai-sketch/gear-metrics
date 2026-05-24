import { OutfitPanel } from "@/app/gears/outfit-panel";
import { PurchaseAuditPanel } from "@/app/gears/purchase-audit-panel";

export default function RecommendPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">AI 推荐</h1>
      <OutfitPanel />
      <PurchaseAuditPanel />
    </div>
  );
}
