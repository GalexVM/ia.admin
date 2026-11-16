"use client";

import React from "react";
import Image from "next/image";

interface ZefironLogoProps {
  variant?: "full" | "icon" | "with-slogan";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  theme?: "dark" | "light";
  className?: string;
  showAdminBadge?: boolean;
}

export function ZefironIsotipo({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: "inline-block", verticalAlign: "middle", flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="zefiron-top-grad" x1="20" y1="20" x2="80" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#81C784" />
          <stop offset="100%" stopColor="#66BB6A" />
        </linearGradient>
        <linearGradient id="zefiron-bot-grad" x1="20" y1="40" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#43A047" />
          <stop offset="100%" stopColor="#2E7D32" />
        </linearGradient>
      </defs>

      {/* Anillo Inferior (Verde Primario #43A047) */}
      <rect
        x="26"
        y="38"
        width="48"
        height="48"
        rx="10"
        transform="rotate(45 50 62)"
        stroke="url(#zefiron-bot-grad)"
        strokeWidth="11"
        fill="none"
      />

      {/* Anillo Superior (Verde Claro #66BB6A) */}
      <rect
        x="26"
        y="16"
        width="48"
        height="48"
        rx="10"
        transform="rotate(45 50 40)"
        stroke="url(#zefiron-top-grad)"
        strokeWidth="11"
        fill="none"
      />
    </svg>
  );
}

export default function ZefironLogo({
  variant = "full",
  size = "md",
  theme = "dark",
  className = "",
  showAdminBadge = false,
}: ZefironLogoProps) {
  // Dimensiones según el tamaño
  const dimensions = {
    xs: { iconSize: 22, fontSize: "1rem", sloganSize: "0.625rem", badgeSize: "0.65rem", gap: 6 },
    sm: { iconSize: 28, fontSize: "1.2rem", sloganSize: "0.7rem", badgeSize: "0.7rem", gap: 8 },
    md: { iconSize: 34, fontSize: "1.45rem", sloganSize: "0.75rem", badgeSize: "0.72rem", gap: 10 },
    lg: { iconSize: 44, fontSize: "1.9rem", sloganSize: "0.85rem", badgeSize: "0.78rem", gap: 12 },
    xl: { iconSize: 56, fontSize: "2.4rem", sloganSize: "0.95rem", badgeSize: "0.85rem", gap: 14 },
  }[size];

  const textColor = theme === "light" ? "#191919" : "#ffffff";
  const mutedColor = theme === "light" ? "#505050" : "#9C9C9C";

  if (variant === "icon") {
    return (
      <div className={className} style={{ display: "inline-flex", alignItems: "center" }}>
        <ZefironIsotipo size={dimensions.iconSize} />
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: dimensions.gap,
        fontFamily: "var(--font-family), var(--font-poppins), 'Poppins', sans-serif",
        userSelect: "none",
      }}
    >
      <ZefironIsotipo size={dimensions.iconSize} />

      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontWeight: 600,
              fontSize: dimensions.fontSize,
              color: textColor,
              letterSpacing: "-0.02em",
            }}
          >
            Zefiron
          </span>
          {showAdminBadge && (
            <span
              style={{
                fontSize: dimensions.badgeSize,
                fontWeight: 600,
                color: "var(--brand-primary)",
                background: "var(--brand-surface)",
                border: "1px solid var(--brand-border)",
                padding: "2px 8px",
                borderRadius: "var(--radius-full)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              IA Admin Central
            </span>
          )}
        </div>

        {variant === "with-slogan" && (
          <span
            style={{
              fontSize: dimensions.sloganSize,
              fontWeight: 400,
              color: mutedColor,
              marginTop: 2,
              letterSpacing: "0.02em",
            }}
          >
            Make your life easier
          </span>
        )}
      </div>
    </div>
  );
}

