import React from 'react';

/**
 * Unified Typography System — XBuild Design Studio
 *
 * Hierarchy:
 *   PageTitle        → 30px  semibold   (one per page)
 *   PageSubtitle     → 14px  normal     (under page title)
 *   SectionTitle     → 20px  semibold   (major sections)
 *   SubsectionLabel  → 11px  semibold   (uppercase group labels)
 *   MetricLabel      → 14px  medium     (key metric names)
 *   BodyMuted        → 13px  normal     (explanatory text)
 *
 * Spacing tokens:
 *   Between major sections:    48px  (mb-12)
 *   Section header → content:  12px  (mb-3)
 *   Between subsection groups: 24px  (space-y-6 / mb-6)
 *   Title → subtitle:          8px   (mb-2)
 *   Between rows in a group:   16px  (space-y-4)
 *
 * Panel constants:
 *   Width: 420px fixed
 *   Padding: px-8 pt-10 pb-8
 *   Border: border-l border-slate-200
 *   Scroll: overflow-y-auto
 */

// ── Color tokens ──
const TEXT_PRIMARY = 'text-slate-900';
const TEXT_SECONDARY = 'text-slate-500';
const TEXT_MUTED = 'text-slate-400';

// ── Panel class string (for re-use) ──
export const PANEL_CLASSES =
  'w-[420px] shrink-0 bg-white border-l border-slate-200 px-8 pt-10 pb-8 flex flex-col h-full overflow-y-auto';

// ── Components ──

interface TypoProps {
  children: React.ReactNode;
  className?: string;
}

/** H1 — Page title. Used exactly once per page. 30px semibold. */
export function PageTitle({ children, className = '' }: TypoProps) {
  return (
    <h1
      className={`text-[30px] font-semibold ${TEXT_PRIMARY} tracking-tight leading-tight ${className}`}
    >
      {children}
    </h1>
  );
}

/** Subtitle under PageTitle. 14px muted. */
export function PageSubtitle({ children, className = '' }: TypoProps) {
  return (
    <p className={`text-[14px] ${TEXT_SECONDARY} leading-relaxed ${className}`}>
      {children}
    </p>
  );
}

/** H2 — Section title inside page. 20px semibold. */
export function SectionTitle({ children, className = '' }: TypoProps) {
  return (
    <h2
      className={`text-[20px] font-semibold ${TEXT_PRIMARY} tracking-tight ${className}`}
    >
      {children}
    </h2>
  );
}

/** H3 — Subsection/group label. 11px uppercase semibold muted. */
export function SubsectionLabel({ children, className = '' }: TypoProps) {
  return (
    <h3
      className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${TEXT_MUTED} ${className}`}
    >
      {children}
    </h3>
  );
}

/** Key metric name label. 14px medium. */
export function MetricLabel({ children, className = '' }: TypoProps) {
  return (
    <span className={`text-[14px] font-medium ${TEXT_PRIMARY} ${className}`}>
      {children}
    </span>
  );
}

/** Explanatory body text. 13px muted. */
export function BodyMuted({ children, className = '' }: TypoProps) {
  return (
    <p className={`text-[13px] ${TEXT_SECONDARY} leading-relaxed ${className}`}>
      {children}
    </p>
  );
}
