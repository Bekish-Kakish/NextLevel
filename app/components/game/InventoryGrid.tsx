import type { ShopItem } from "../../lib/shopData";

type InventoryGridProps = {
  slots: Array<ShopItem | null>;
  equippedWeaponId: number | null;
  equippedArmorId: number | null;
};

const RARITY_LABELS = {
  Common: "Обычный",
  Rare: "Редкий",
  Epic: "Эпический",
  Legendary: "Легендарный",
} as const;

export function InventoryGrid({
  slots,
  equippedWeaponId,
  equippedArmorId,
}: InventoryGridProps) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {slots.map((item, index) => {
        const equipped = item
          ? item.id === equippedWeaponId || item.id === equippedArmorId
          : false;

        return (
          <div
            key={`slot-${index}`}
            className={`ui-slot min-h-[86px] border p-2 text-xs ${
              item
                ? "border-amber-500/25 bg-amber-500/10"
                : "border-white/10 bg-black/25"
            } ${equipped ? "ring-1 ring-emerald-300/60" : ""}`}
          >
            {item ? (
              <>
                <p className="font-semibold text-zinc-100">{item.name}</p>
                <p className="mt-1 text-zinc-300">
                  {item.type === "weapon"
                    ? "Оружие"
                    : item.type === "armor"
                      ? "Броня"
                      : "Артефакт"}
                </p>
                <p className="mt-1 text-zinc-400">{RARITY_LABELS[item.rarity]}</p>
                {equipped ? <p className="mt-1 text-emerald-300">Надето</p> : null}
              </>
            ) : (
              <span className="text-zinc-600">Пусто</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
