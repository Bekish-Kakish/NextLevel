type StatBarProps = {
  label: string;
  value: number;
  max: number;
  tone?: "health" | "energy" | "xp";
};

const toneStyles: Record<NonNullable<StatBarProps["tone"]>, string> = {
  health: "from-red-600 to-red-400",
  energy: "from-cyan-500 to-blue-400",
  xp: "from-amber-500 to-yellow-400",
};

export function StatBar({ label, value, max, tone = "health" }: StatBarProps) {
  const safeMax = Math.max(1, max);
  const percent = Math.max(0, Math.min(100, Math.round((value / safeMax) * 100)));

  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-300">
        <span>{label}</span>
        <span>
          {value} / {safeMax}
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-[2px] bg-zinc-800">
        <div
          className={`h-full rounded-[2px] bg-gradient-to-r ${toneStyles[tone]} transition-all duration-300`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
