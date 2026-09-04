import type { ReactNode } from "react";

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button"
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
}) {
  return (
    <button className={`button button-${variant}`} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "info" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "info" }) {
  return <span className={`badge status-${tone}`}>{children}</span>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
