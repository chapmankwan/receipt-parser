// ---------------------------------------------------------------------------
// Button
//
// Base button with three variants. Used for CTAs across all screens.
//
// Usage:
//   <Button>Save</Button>
//   <Button variant="secondary">Cancel</Button>
//   <Button variant="danger" size="sm">Delete</Button>
// ---------------------------------------------------------------------------

type ButtonProps = {
  variant?: "primary" | "secondary" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
  children: React.ReactNode;
  className?: string;
};

const VARIANT_STYLES = {
  primary:   "bg-gray-900 text-white border-gray-900 hover:bg-gray-700",
  secondary: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50",
  danger:    "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
};

const SIZE_STYLES = {
  sm: "px-2.5 py-1 text-xs",
  md: "px-3 py-1.5 text-sm",
};

export function Button({
  variant = "secondary",
  size = "md",
  disabled = false,
  onClick,
  type = "button",
  children,
  className = "",
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-1.5 border rounded-md font-medium",
        "transition-colors disabled:opacity-40 disabled:cursor-not-allowed",
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}