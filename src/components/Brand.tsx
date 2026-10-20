export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center rounded-[28%] bg-gradient-to-br from-violet to-azure font-extrabold text-ink"
      style={{ width: size, height: size, fontSize: size * 0.58 }}
    >
      P
    </span>
  );
}

export function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <div className="leading-none">
        <p className="text-[17px] font-extrabold tracking-tight">Protech</p>
        <p className="mt-0.5 text-xs font-medium text-muted">AI Hub</p>
      </div>
    </div>
  );
}
