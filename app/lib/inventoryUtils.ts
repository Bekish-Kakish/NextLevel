import type { ShopItem } from "./shopData";
import { getShopItemById } from "./shopData";

export function getInventoryItems(inventory: number[]) {
  return inventory
    .map((itemId) => getShopItemById(itemId))
    .filter((item): item is ShopItem => item !== null);
}

export function getEquippedItems(equipment: {
  equippedWeapon: number | null;
  equippedArmor: number | null;
}) {
  return {
    weapon: getShopItemById(equipment.equippedWeapon),
    armor: getShopItemById(equipment.equippedArmor),
  };
}

export function calculateFinalAttack(
  baseAttack: number,
  weaponId: number | null,
  armorId: number | null,
) {
  const weapon = getShopItemById(weaponId);
  const armor = getShopItemById(armorId);
  return baseAttack + (weapon?.attack ?? 0) + (armor?.attack ?? 0);
}

export function calculateFinalDefense(
  baseDefense: number,
  weaponId: number | null,
  armorId: number | null,
) {
  const weapon = getShopItemById(weaponId);
  const armor = getShopItemById(armorId);
  return baseDefense + (weapon?.defense ?? 0) + (armor?.defense ?? 0);
}

export function getInventoryGrid(inventory: number[], size = 16) {
  const slots: Array<ShopItem | null> = Array.from({ length: size }, () => null);
  const items = getInventoryItems(inventory).slice(0, size);

  items.forEach((item, index) => {
    slots[index] = item;
  });

  return slots;
}

export type FusionDraft = {
  leftItem: ShopItem;
  rightItem: ShopItem;
  projectedType: "оружие" | "броня";
  ready: boolean;
};

export function getFusionDrafts(inventory: number[]): FusionDraft[] {
  const artifacts = getInventoryItems(inventory).filter((item) => item.type === "artifact");
  const drafts: FusionDraft[] = [];

  for (let index = 0; index < artifacts.length - 1; index += 2) {
    const leftItem = artifacts[index];
    const rightItem = artifacts[index + 1];

    if (!rightItem) {
      continue;
    }

    drafts.push({
      leftItem,
      rightItem,
      projectedType: index % 4 === 0 ? "оружие" : "броня",
      ready: true,
    });
  }

  if (drafts.length === 0 && artifacts.length === 1) {
    drafts.push({
      leftItem: artifacts[0],
      rightItem: artifacts[0],
      projectedType: "оружие",
      ready: false,
    });
  }

  return drafts;
}
