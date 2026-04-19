"use client";

import { useEffect, useMemo, useState } from "react";

import { GameFrame } from "../components/game/GameFrame";
import { SectionCard } from "../components/shared/SectionCard";
import {
  addInventoryItem,
  addTestLoot,
  getAdminPlayers,
  getMissionStateForPlayer,
  grantStarterBonuses,
  quickAddGold,
  quickGiveXp,
  quickRestoreEnergy,
  resetCampaignProgress,
  resetMissionDailyLimit,
  resetPlayerProgress,
  setMissionState,
  setPlayerEquipment,
  unlockAllMissions,
  unlockNextMission,
  updatePlayerProgress,
  removeInventoryItem,
  type AdminPlayerRecord,
} from "../lib/adminTools";
import { getCurrentAccount } from "../lib/auth";
import { CAMPAIGN_NODES, type CampaignMissionState } from "../lib/campaignMap";
import { shopItems } from "../lib/shopData";
import { usePlayer } from "../lib/playerStore";

const MISSION_STATE_OPTIONS: Array<{ value: CampaignMissionState; label: "locked" | "unlocked" | "completed" }> = [
  { value: "locked", label: "locked" },
  { value: "available", label: "unlocked" },
  { value: "completed", label: "completed" },
];

function toIntegerOrNull(value: string) {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  const num = Number(trimmed);
  if (!Number.isFinite(num)) {
    return null;
  }

  return Math.trunc(num);
}

export default function AdminPage() {
  const sessionAccount = getCurrentAccount();
  const currentPlayer = usePlayer();

  const [records, setRecords] = useState<AdminPlayerRecord[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<string>("");
  const [missionStateMap, setMissionStateMap] = useState<Record<string, CampaignMissionState>>({});

  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [goldInput, setGoldInput] = useState("");
  const [xpInput, setXpInput] = useState("");
  const [healthInput, setHealthInput] = useState("");
  const [energyInput, setEnergyInput] = useState("");
  const [levelInput, setLevelInput] = useState("");

  const [missionNodeId, setMissionNodeId] = useState(CAMPAIGN_NODES[0]?.id ?? "m01");
  const [missionStateInput, setMissionStateInput] = useState<CampaignMissionState>("available");

  const [itemGiveId, setItemGiveId] = useState("2");
  const [itemRemoveId, setItemRemoveId] = useState("2");
  const [weaponIdInput, setWeaponIdInput] = useState("");
  const [armorIdInput, setArmorIdInput] = useState("");

  const selectedRecord = useMemo(
    () => records.find((entry) => entry.account.email === selectedEmail) ?? null,
    [records, selectedEmail],
  );

  function syncInputsFromRecord(record: AdminPlayerRecord | null) {
    if (!record) {
      setGoldInput("");
      setXpInput("");
      setHealthInput("");
      setEnergyInput("");
      setLevelInput("");
      setWeaponIdInput("");
      setArmorIdInput("");
      return;
    }

    setGoldInput(String(record.player.gold));
    setXpInput(String(record.player.xp));
    setHealthInput(String(record.player.health));
    setEnergyInput(String(record.player.energy));
    setLevelInput(String(record.player.level));
    setWeaponIdInput(record.player.equippedWeapon !== null ? String(record.player.equippedWeapon) : "");
    setArmorIdInput(record.player.equippedArmor !== null ? String(record.player.equippedArmor) : "");
  }

  function refreshData(preferredEmail?: string) {
    const next = getAdminPlayers();
    setRecords(next);

    if (next.length === 0) {
      setSelectedEmail("");
      setMissionStateMap({});
      syncInputsFromRecord(null);
      return;
    }

    const nextSelected =
      (preferredEmail && next.find((entry) => entry.account.email === preferredEmail)?.account.email) ||
      (selectedEmail && next.find((entry) => entry.account.email === selectedEmail)?.account.email) ||
      next[0].account.email;

    setSelectedEmail(nextSelected);

    const selected = next.find((entry) => entry.account.email === nextSelected) ?? null;
    syncInputsFromRecord(selected);

    const states = getMissionStateForPlayer(nextSelected);
    setMissionStateMap(states ?? {});
  }

  useEffect(() => {
    refreshData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedEmail) {
      return;
    }

    const states = getMissionStateForPlayer(selectedEmail);
    setMissionStateMap(states ?? {});
  }, [selectedEmail]);

  function runAction(action: () => boolean, successMessage: string, failureMessage: string) {
    const ok = action();
    if (!ok) {
      setError(failureMessage);
      setNotice(null);
      return;
    }

    setError(null);
    setNotice(successMessage);
    refreshData(selectedEmail);
  }

  function handleSaveProgress() {
    if (!selectedRecord) {
      return;
    }

    const gold = toIntegerOrNull(goldInput);
    const xp = toIntegerOrNull(xpInput);
    const health = toIntegerOrNull(healthInput);
    const energy = toIntegerOrNull(energyInput);
    const level = toIntegerOrNull(levelInput);

    runAction(
      () =>
        updatePlayerProgress(selectedRecord.account.email, {
          gold: gold ?? undefined,
          xp: xp ?? undefined,
          health: health ?? undefined,
          energy: energy ?? undefined,
          level: level ?? undefined,
        }),
      "Прогресс игрока успешно обновлён.",
      "Не удалось обновить прогресс игрока.",
    );
  }

  function handleSetMissionState() {
    if (!selectedRecord) {
      return;
    }

    runAction(
      () => setMissionState(selectedRecord.account.email, missionNodeId, missionStateInput),
      `Статус миссии ${missionNodeId} изменён на ${missionStateInput === "available" ? "unlocked" : missionStateInput}.`,
      "Не удалось изменить статус миссии.",
    );
  }

  function handleGiveItem() {
    if (!selectedRecord) {
      return;
    }

    const itemId = toIntegerOrNull(itemGiveId);
    if (itemId === null) {
      setError("Введите корректный id предмета.");
      setNotice(null);
      return;
    }

    runAction(
      () => addInventoryItem(selectedRecord.account.email, itemId),
      `Предмет #${itemId} выдан игроку.`,
      "Не удалось выдать предмет.",
    );
  }

  function handleRemoveItem() {
    if (!selectedRecord) {
      return;
    }

    const itemId = toIntegerOrNull(itemRemoveId);
    if (itemId === null) {
      setError("Введите корректный id предмета для удаления.");
      setNotice(null);
      return;
    }

    runAction(
      () => removeInventoryItem(selectedRecord.account.email, itemId),
      `Предмет #${itemId} удалён у игрока.`,
      "Не удалось удалить предмет.",
    );
  }

  function handleSetEquipment() {
    if (!selectedRecord) {
      return;
    }

    const weaponId = toIntegerOrNull(weaponIdInput);
    const armorId = toIntegerOrNull(armorIdInput);

    runAction(
      () =>
        setPlayerEquipment(selectedRecord.account.email, {
          weaponId: weaponIdInput.trim().length === 0 ? null : weaponId ?? undefined,
          armorId: armorIdInput.trim().length === 0 ? null : armorId ?? undefined,
        }),
      "Экипировка обновлена.",
      "Не удалось обновить экипировку.",
    );
  }

  if (!sessionAccount || sessionAccount.role !== "admin") {
    return (
      <main className="game-ui min-h-screen px-4 py-10 text-zinc-100 md:px-6">
        <div className="ui-panel ui-frame mx-auto max-w-xl border-red-400/30 bg-black/50 p-8 text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-red-300">Admin Access</p>
          <h1 className="mt-3 text-3xl font-black uppercase">Доступ запрещён</h1>
          <p className="mt-3 text-sm text-zinc-300">Эта страница доступна только пользователям с ролью admin.</p>
          <a
            href="/app/dashboard"
            className="ui-btn mt-6 inline-block border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold uppercase tracking-wide text-zinc-200 transition hover:bg-white/10"
          >
            Вернуться в Dashboard
          </a>
        </div>
      </main>
    );
  }

  return (
    <GameFrame player={currentPlayer} active="admin">
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <SectionCard title="Игроки" subtitle="Список аккаунтов и быстрый обзор состояния">
          <div className="space-y-2">
            {records.length === 0 ? (
              <p className="ui-card ui-frame border-white/10 bg-black/30 px-3 py-3 text-sm text-zinc-400">
                Игроки не найдены.
              </p>
            ) : (
              records.map((entry) => {
                const active = entry.account.email === selectedEmail;
                return (
                  <button
                    key={entry.account.email}
                    onClick={() => {
                      setSelectedEmail(entry.account.email);
                      syncInputsFromRecord(entry);
                      setNotice(null);
                      setError(null);
                    }}
                    className={`ui-btn w-full border px-3 py-3 text-left transition ${
                      active
                        ? "border-amber-400/45 bg-amber-500/15"
                        : "border-white/15 bg-black/25 hover:bg-black/35"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-100">{entry.player.name}</p>
                      <span
                        className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          entry.account.role === "admin"
                            ? "border-red-400/35 bg-red-500/15 text-red-100"
                            : "border-white/20 bg-white/10 text-zinc-200"
                        }`}
                      >
                        {entry.account.role}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-zinc-400">{entry.account.email}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-zinc-300">
                      <span>Lvl {entry.player.level}</span>
                      <span>XP {entry.player.xp}</span>
                      <span>Gold {entry.player.gold}</span>
                      <span>HP {entry.player.health}</span>
                      <span>EN {entry.player.energy}</span>
                      <span>Campaign {entry.campaignProgressPercent}%</span>
                      <span className="col-span-2">Миссий сегодня: {entry.missionRunsToday}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Control Room" subtitle="Управление выбранным игроком">
            {selectedRecord ? (
              <div className="space-y-4">
                <div className="ui-card ui-frame border-cyan-400/20 bg-cyan-500/10 p-3 text-sm">
                  <p className="font-semibold text-cyan-100">{selectedRecord.player.name}</p>
                  <p className="text-zinc-300">{selectedRecord.account.email}</p>
                  <p className="text-zinc-300">
                    Роль: {selectedRecord.account.role} • Уровень: {selectedRecord.player.level} • Прогресс кампании: {selectedRecord.campaignProgressPercent}%
                  </p>
                </div>

                {notice ? (
                  <p className="ui-card ui-frame border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                    {notice}
                  </p>
                ) : null}
                {error ? (
                  <p className="ui-card ui-frame border border-red-500/35 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                    {error}
                  </p>
                ) : null}

                <div className="grid gap-4 xl:grid-cols-2">
                  <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-amber-200">Прогресс игрока</h3>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-zinc-400">Золото</span>
                        <input value={goldInput} onChange={(e) => setGoldInput(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-zinc-400">XP</span>
                        <input value={xpInput} onChange={(e) => setXpInput(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-zinc-400">Здоровье</span>
                        <input value={healthInput} onChange={(e) => setHealthInput(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                      </label>
                      <label className="space-y-1">
                        <span className="text-zinc-400">Энергия</span>
                        <input value={energyInput} onChange={(e) => setEnergyInput(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                      </label>
                      <label className="space-y-1 col-span-2">
                        <span className="text-zinc-400">Уровень</span>
                        <input value={levelInput} onChange={(e) => setLevelInput(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                      </label>
                    </div>
                    <div className="mt-3 grid gap-2">
                      <button onClick={handleSaveProgress} className="ui-btn border border-amber-400/35 bg-amber-500/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-amber-100">
                        Применить изменения
                      </button>
                      <button
                        onClick={() => runAction(() => grantStarterBonuses(selectedRecord.account.email), "Стартовые бонусы выданы.", "Не удалось выдать стартовые бонусы.")}
                        className="ui-btn border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-emerald-100"
                      >
                        Выдать стартовые бонусы
                      </button>
                      <button
                        onClick={() => runAction(() => resetPlayerProgress(selectedRecord.account.email), "Персонаж сброшен.", "Не удалось сбросить прогресс.")}
                        className="ui-btn border border-red-500/35 bg-red-500/15 px-3 py-2 text-xs font-bold uppercase tracking-wide text-red-100"
                      >
                        Сбросить прогресс персонажа
                      </button>
                    </div>
                  </div>

                  <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-cyan-200">Управление миссиями</h3>
                    <div className="mt-3 grid gap-2 text-xs">
                      <button onClick={() => runAction(() => resetMissionDailyLimit(selectedRecord.account.email), "Дневной лимит миссий сброшен.", "Не удалось сбросить лимит миссий.")} className="ui-btn border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 font-bold uppercase tracking-wide text-cyan-100">
                        Сбросить дневной лимит миссий
                      </button>
                      <button onClick={() => runAction(() => resetCampaignProgress(selectedRecord.account.email), "Кампания сброшена.", "Не удалось сбросить кампанию.")} className="ui-btn border border-white/20 bg-white/5 px-3 py-2 font-bold uppercase tracking-wide text-zinc-200">
                        Сбросить campaign progress
                      </button>
                      <button onClick={() => runAction(() => unlockNextMission(selectedRecord.account.email), "Следующая миссия открыта.", "Не удалось открыть следующую миссию.")} className="ui-btn border border-amber-400/35 bg-amber-500/15 px-3 py-2 font-bold uppercase tracking-wide text-amber-100">
                        Открыть следующую миссию
                      </button>
                      <button onClick={() => runAction(() => unlockAllMissions(selectedRecord.account.email), "Все миссии открыты.", "Не удалось открыть все миссии.")} className="ui-btn border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 font-bold uppercase tracking-wide text-emerald-100">
                        Открыть все миссии
                      </button>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-zinc-400">Миссия</span>
                        <select value={missionNodeId} onChange={(e) => setMissionNodeId(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1">
                          {CAMPAIGN_NODES.map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.id} - {node.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="space-y-1">
                        <span className="text-zinc-400">Статус</span>
                        <select value={missionStateInput} onChange={(e) => setMissionStateInput(e.target.value as CampaignMissionState)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1">
                          {MISSION_STATE_OPTIONS.map((state) => (
                            <option key={state.value} value={state.value}>{state.label}</option>
                          ))}
                        </select>
                      </label>
                      <button onClick={handleSetMissionState} className="ui-btn border border-white/20 bg-white/5 px-3 py-2 font-bold uppercase tracking-wide text-zinc-100">
                        Применить статус
                      </button>
                    </div>
                  </div>

                  <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-amber-200">Инвентарь и экипировка</h3>
                    <div className="mt-3 grid gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-zinc-400">Выдать предмет (id)</span>
                        <input value={itemGiveId} onChange={(e) => setItemGiveId(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                      </label>
                      <button onClick={handleGiveItem} className="ui-btn border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 font-bold uppercase tracking-wide text-emerald-100">
                        Выдать предмет
                      </button>

                      <label className="space-y-1">
                        <span className="text-zinc-400">Удалить предмет (id)</span>
                        <input value={itemRemoveId} onChange={(e) => setItemRemoveId(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                      </label>
                      <button onClick={handleRemoveItem} className="ui-btn border border-red-500/35 bg-red-500/15 px-3 py-2 font-bold uppercase tracking-wide text-red-100">
                        Удалить предмет
                      </button>

                      <button onClick={() => runAction(() => addTestLoot(selectedRecord.account.email), "Тестовый лут добавлен.", "Не удалось добавить тестовый лут.")} className="ui-btn border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 font-bold uppercase tracking-wide text-cyan-100">
                        Добавить тестовый лут
                      </button>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="space-y-1">
                          <span className="text-zinc-400">weapon id</span>
                          <input value={weaponIdInput} onChange={(e) => setWeaponIdInput(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                        </label>
                        <label className="space-y-1">
                          <span className="text-zinc-400">armor id</span>
                          <input value={armorIdInput} onChange={(e) => setArmorIdInput(e.target.value)} className="ui-btn w-full border border-white/20 bg-black/30 px-2 py-1" />
                        </label>
                      </div>
                      <button onClick={handleSetEquipment} className="ui-btn border border-white/20 bg-white/5 px-3 py-2 font-bold uppercase tracking-wide text-zinc-100">
                        Изменить экипировку
                      </button>
                    </div>
                  </div>

                  <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-red-200">Dev / Debug Actions</h3>
                    <div className="mt-3 grid gap-2 text-xs">
                      <button onClick={() => runAction(() => quickAddGold(selectedRecord.account.email), "+ золото выдано.", "Не удалось добавить золото.")} className="ui-btn border border-amber-400/35 bg-amber-500/15 px-3 py-2 font-bold uppercase tracking-wide text-amber-100">
                        + золото
                      </button>
                      <button onClick={() => runAction(() => quickGiveXp(selectedRecord.account.email), "+ XP выдано.", "Не удалось добавить XP.")} className="ui-btn border border-cyan-400/35 bg-cyan-500/15 px-3 py-2 font-bold uppercase tracking-wide text-cyan-100">
                        + XP
                      </button>
                      <button onClick={() => runAction(() => quickRestoreEnergy(selectedRecord.account.email), "Энергия полностью восстановлена.", "Не удалось восстановить энергию.")} className="ui-btn border border-emerald-400/35 bg-emerald-500/15 px-3 py-2 font-bold uppercase tracking-wide text-emerald-100">
                        Восстановить энергию
                      </button>
                      <button onClick={() => runAction(() => unlockAllMissions(selectedRecord.account.email), "Все миссии разблокированы.", "Не удалось разблокировать миссии.")} className="ui-btn border border-indigo-400/35 bg-indigo-500/15 px-3 py-2 font-bold uppercase tracking-wide text-indigo-100">
                        Разблокировать все миссии
                      </button>
                      <button onClick={() => runAction(() => resetPlayerProgress(selectedRecord.account.email), "Герой сброшен.", "Не удалось сбросить героя.")} className="ui-btn border border-red-500/35 bg-red-500/15 px-3 py-2 font-bold uppercase tracking-wide text-red-100">
                        Сбросить героя
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-100">Текущие статусы миссий</h3>
                  <div className="mt-2 grid gap-1 text-xs md:grid-cols-2">
                    {CAMPAIGN_NODES.map((node) => (
                      <div key={node.id} className="flex items-center justify-between rounded border border-white/10 bg-black/25 px-2 py-1">
                        <span className="truncate pr-2 text-zinc-300">{node.id}</span>
                        <span className="font-semibold text-amber-200">
                          {(missionStateMap[node.id] ?? "locked") === "available"
                            ? "unlocked"
                            : missionStateMap[node.id] ?? "locked"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="ui-card ui-frame border-white/10 bg-black/30 p-3">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-zinc-100">Справка по предметам</h3>
                  <p className="mt-1 text-xs text-zinc-400">
                    Используйте id предмета для выдачи/удаления/экипировки.
                  </p>
                  <div className="mt-2 max-h-56 overflow-auto rounded border border-white/10 bg-black/20 p-2 text-xs">
                    {shopItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between border-b border-white/5 py-1 last:border-b-0">
                        <span className="text-zinc-300">#{item.id} {item.name}</span>
                        <span className="text-zinc-500">{item.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Выберите игрока в левом блоке.</p>
            )}
          </SectionCard>
        </div>
      </div>
    </GameFrame>
  );
}
