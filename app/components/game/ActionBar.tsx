type ActionBarProps = {
  disabled: boolean;
  canUseStrong: boolean;
  onAttack: () => void;
  onDefend: () => void;
  onStrong: () => void;
  onFlee: () => void;
};

function ActionButton({
  label,
  onClick,
  disabled,
  tone,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  tone: "red" | "blue" | "amber" | "zinc";
}) {
  const tones: Record<typeof tone, string> = {
    red: "border-red-500/40 bg-red-500/10 text-red-100 hover:bg-red-500/20",
    blue: "border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20",
    zinc: "border-white/20 bg-white/5 text-zinc-200 hover:bg-white/10",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`ui-btn border px-4 py-3 text-sm font-bold uppercase tracking-wide transition ${
        disabled ? "cursor-not-allowed opacity-45" : tones[tone]
      }`}
    >
      {label}
    </button>
  );
}

export function ActionBar({
  disabled,
  canUseStrong,
  onAttack,
  onDefend,
  onStrong,
  onFlee,
}: ActionBarProps) {
  return (
    <section className="ui-panel ui-frame border-white/10 bg-black/45 p-4">
      <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.2em] text-amber-300">Действия</h3>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <ActionButton label="Атаковать" onClick={onAttack} disabled={disabled} tone="red" />
        <ActionButton label="Защититься" onClick={onDefend} disabled={disabled} tone="blue" />
        <ActionButton
          label={canUseStrong ? "Сильный удар" : "Сильный удар (мало энергии)"}
          onClick={onStrong}
          disabled={disabled || !canUseStrong}
          tone="amber"
        />
        <ActionButton label="Сбежать" onClick={onFlee} disabled={disabled} tone="zinc" />
      </div>
    </section>
  );
}
