"use client";

import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clipboard,
  Clock3,
  Database,
  GitBranch,
  History,
  KeyRound,
  LayoutDashboard,
  Lock,
  SearchCode,
  Settings,
  ShieldCheck,
  Sparkles,
  Zap,
  TrendingUp,
  Eye,
} from "lucide-react";

const spring = { type: "spring", mass: 0.6, stiffness: 120, damping: 14 };
const springFast = { type: "spring", mass: 0.4, stiffness: 180, damping: 16 };
const stagger = { animate: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  initial: { y: 20, opacity: 0 },
  animate: { y: 0, opacity: 1, transition: spring },
};

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Runs", icon: SearchCode },
  { label: "History", icon: History },
  { label: "Impact", icon: BarChart3 },
  { label: "Settings", icon: Settings },
];

// ── Slot-machine counter ──────────────────────────────────────────
function SlotCounter({ value, suffix = "" }) {
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { stiffness: 80, damping: 20 });
  const display = useTransform(springVal, (v) => Math.round(v));
  const [shown, setShown] = useState(0);

  useEffect(() => {
    motionVal.set(typeof value === "number" ? value : 0);
    const unsub = display.onChange((v) => setShown(v));
    return unsub;
  }, [value, motionVal, display]);

  if (typeof value !== "number") {
    return <span>{value}{suffix}</span>;
  }
  return <span>{shown}{suffix}</span>;
}

// ── Main dashboard ────────────────────────────────────────────────
export function BrolensDashboard({ runs }) {
  const selectedRun = runs[0];
  const repeatCount = new Set(runs.map((r) => r.fingerprint)).size;
  const failedRuns = runs.filter((r) => r.status === "failed").length;
  const categoryCounts = runs.reduce((acc, r) => {
    const k = r.diagnosis.primaryCategory;
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white text-[#17191c]">
      {/* Animated background blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="bg-blob-1 absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.22)_0%,transparent_70%)]" />
        <div className="bg-blob-2 absolute -top-16 right-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(255,150,60,0.14)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[800px] rounded-full bg-[radial-gradient(ellipse,rgba(255,106,0,0.06)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#fff_0%,#fff7f0_45%,#ffffff_100%)]" style={{zIndex:-1}} />
      </div>

      {/* Centered canvas */}
      <div className="mx-auto flex min-h-screen max-w-[1400px] flex-col px-4 pb-8 lg:px-6">
        <GlassTopbar />
        <div className="relative flex flex-1 gap-5 pt-4">
          <FloatingNav />
          {/* Main content */}
          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="flex min-w-0 flex-1 flex-col gap-4 pl-16 lg:pl-20"
          >
            <HeroMetrics failedRuns={failedRuns} repeatCount={repeatCount} totalRuns={runs.length} />
            <div className="grid gap-4 xl:grid-cols-2">
              <CategoryBento categoryCounts={categoryCounts} />
              <ActivityStream runs={runs} />
            </div>
            <RecentRunsTable runs={runs} />
          </motion.div>
          {/* Right detail panel */}
          <RunDetailPanel run={selectedRun} />
        </div>
      </div>
    </div>
  );
}

// ── Floating Icon Nav ─────────────────────────────────────────────
function FloatingNav() {
  const [active, setActive] = useState(0);
  const [hoveredIdx, setHoveredIdx] = useState(null);

  return (
    <motion.nav
      initial={{ x: -30, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={spring}
      aria-label="Workspace navigation"
      className="absolute left-0 top-0 z-20 flex flex-col items-center gap-2 rounded-2xl border border-white/50 bg-white/70 p-2 shadow-xl backdrop-blur-[28px]"
      style={{ boxShadow: "0 8px 32px rgba(23,25,28,0.1), inset 0 1px 0 rgba(255,255,255,0.9)" }}
    >
      {/* Logo pill */}
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff6a00] shadow-[0_0_20px_rgba(255,106,0,0.5)]">
        <Sparkles size={18} className="text-white" />
      </div>

      {navItems.map((item, i) => {
        const Icon = item.icon;
        const isActive = active === i;
        const isHovered = hoveredIdx === i;
        return (
          <div key={item.label} className="relative">
            <motion.button
              onClick={() => setActive(i)}
              onHoverStart={() => setHoveredIdx(i)}
              onHoverEnd={() => setHoveredIdx(null)}
              whileHover={{ scale: 1.12 }}
              whileTap={{ scale: 0.95 }}
              transition={springFast}
              className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                isActive
                  ? "bg-[#ff6a00] text-white shadow-[0_0_20px_rgba(255,106,0,0.55)]"
                  : "text-[#6f737a] hover:bg-black/5 hover:text-[#17191c]"
              }`}
              aria-label={item.label}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute inset-0 rounded-xl bg-[#ff6a00]"
                  style={{ boxShadow: "0 0 20px rgba(255,106,0,0.6)" }}
                  transition={spring}
                />
              )}
              <Icon size={17} className="relative z-10" />
            </motion.button>
            {/* Tooltip */}
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={springFast}
                  className="pointer-events-none absolute left-14 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-lg border border-black/10 bg-[#17191c] px-3 py-1.5 text-xs font-semibold text-white shadow-xl"
                >
                  {item.label}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Bottom shield */}
      <div className="mt-2 flex h-10 w-10 items-center justify-center rounded-xl border border-black/10 bg-[#fff0e2]">
        <ShieldCheck size={16} className="text-[#ff6a00]" />
      </div>
    </motion.nav>
  );
}

// ── Glass Topbar ──────────────────────────────────────────────────
function GlassTopbar() {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={spring}
      className="glass-panel mb-0 flex flex-wrap items-center justify-between gap-3 rounded-2xl border-b border-white/50 px-5 py-4 backdrop-blur-[28px]"
    >
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff6a00]">
          ⬡ Demo data · AGY-powered
        </p>
        <h1 className="mt-0.5 text-xl font-semibold tracking-tight text-[#17191c] lg:text-2xl">
          CI Failure Command Center
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Pill icon={Database} label="Workspace: Acme Labs" />
        <Pill icon={GitBranch} label="GitHub Actions" />
        <Pill icon={Lock} label="Firebase-ready" glow />
      </div>
    </motion.header>
  );
}

// ── Hero Metrics ──────────────────────────────────────────────────
function HeroMetrics({ failedRuns, repeatCount, totalRuns }) {
  const metrics = [
    { label: "Failed runs", value: failedRuns, caption: "sample period", icon: AlertTriangle, glow: true },
    { label: "Fingerprints", value: repeatCount, caption: "grouped signatures", icon: History },
    { label: "Median diagnosis", value: "2m", caption: "demo estimate", icon: Clock3 },
    { label: "Total analyzed", value: totalRuns, caption: "seeded runs", icon: TrendingUp },
  ];

  return (
    <motion.section variants={fadeUp} className="glass-panel shimmer-border rounded-2xl p-5 lg:p-6">
      <div className="relative z-10 grid gap-5 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#ff6a00]/30 bg-[#fff0e2] px-3 py-1 text-xs font-semibold text-[#9a3b00]">
            <Activity size={13} /> Evidence before explanation · No hallucinated root causes
          </p>
          <h2 className="max-w-2xl text-3xl font-bold leading-tight tracking-tight lg:text-5xl">
            Find the cause.<br />
            <span className="text-[#ff6a00]">Reproduce the failure.</span><br />
            Unblock the release.
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#5f6369]">
            Brolens turns CI logs into evidence-backed diagnoses and reviewable Failure Reproduction Packs.
            Running on seeded sample data — labeled clearly.
          </p>
        </div>
        <div className="grid min-w-[300px] grid-cols-2 gap-3 lg:grid-cols-2">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <motion.div
                key={m.label}
                whileHover={{ scale: 1.025, y: -2 }}
                transition={spring}
                className={`shimmer-border rounded-xl border border-black/10 bg-white/80 p-4 ${
                  m.glow ? "shadow-[0_0_24px_rgba(255,106,0,0.2)]" : "shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-[#6f737a]">{m.label}</p>
                  <Icon size={15} className="text-[#ff6a00]" />
                </div>
                <p className="mt-2 text-3xl font-bold tabular-nums text-[#17191c]">
                  <SlotCounter value={typeof m.value === "number" ? m.value : m.value} />
                </p>
                <p className="mt-1 text-[11px] text-[#6f737a]">{m.caption}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}

// ── Category Bento ────────────────────────────────────────────────
function CategoryBento({ categoryCounts }) {
  const total = Object.values(categoryCounts).reduce((s, v) => s + v, 0);
  return (
    <GlassPanel title="Failure categories" icon={BarChart3}>
      <div className="space-y-4">
        {Object.entries(categoryCounts).map(([cat, count]) => {
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={cat}>
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="font-medium capitalize">{cat.replaceAll("_", " ")}</span>
                <span className="flex items-center gap-2 text-[#6f737a]">
                  <span className="text-xs font-semibold text-[#ff6a00]">{pct}%</span>
                  {count}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-black/5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ ...spring, delay: 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-[#ff6a00] to-[#ff9b4a] shadow-[0_0_8px_rgba(255,106,0,0.5)]"
                />
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

// ── Activity Stream ───────────────────────────────────────────────
function ActivityStream({ runs }) {
  return (
    <GlassPanel title="Analysis stream" icon={Activity}>
      <div className="space-y-3">
        {runs.slice(0, 5).map((run, i) => (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ ...spring, delay: i * 0.07 }}
            className="flex items-start gap-3 rounded-xl border border-black/10 bg-white/70 p-3 shadow-sm"
          >
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#fff0e2]">
              <CheckCircle2 size={13} className="text-[#ff6a00]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{run.repository}</p>
              <p className="mt-0.5 line-clamp-2 text-xs leading-5 text-[#6f737a]">{run.diagnosis.summary}</p>
            </div>
            <span className="shrink-0 rounded-full bg-[#fff0e2] px-2 py-0.5 text-[10px] font-bold text-[#9a3b00]">
              {run.diagnosis.primaryCategory.split("_")[0]}
            </span>
          </motion.div>
        ))}
      </div>
    </GlassPanel>
  );
}

// ── Recent Runs Table ─────────────────────────────────────────────
function RecentRunsTable({ runs }) {
  return (
    <GlassPanel title="Recent failed runs" icon={SearchCode}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] border-separate border-spacing-y-2 text-left text-sm">
          <caption className="sr-only">Recent seeded failed CI runs</caption>
          <thead className="text-[11px] font-bold uppercase tracking-widest text-[#6f737a]">
            <tr>
              <th className="px-3 py-2">Repository</th>
              <th className="px-3 py-2">Branch</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Evidence</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run, i) => (
              <motion.tr
                key={run.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: i * 0.05 }}
                whileHover={{ scale: 1.005 }}
                className="cursor-pointer bg-white/70 shadow-sm transition-shadow hover:shadow-[0_0_16px_rgba(255,106,0,0.15)]"
              >
                <td className="rounded-l-xl px-3 py-3 font-semibold">{run.repository}</td>
                <td className="px-3 py-3 font-mono text-xs text-[#6f737a]">{run.branch}</td>
                <td className="px-3 py-3">
                  <span className="rounded-full bg-[#fff0e2] px-2.5 py-1 text-xs font-bold text-[#9a3b00]">
                    {run.diagnosis.primaryCategory.replaceAll("_", " ")}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-1 text-[#6f737a]">
                    <Eye size={13} className="text-[#ff6a00]" /> {run.evidence.length} refs
                  </span>
                </td>
                <td className="rounded-r-xl px-3 py-3">
                  <button className="inline-flex items-center gap-1 text-xs font-bold text-[#ff6a00] transition-all hover:gap-2">
                    Open pack <ChevronRight size={14} />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}

// ── Run Detail Panel ──────────────────────────────────────────────
function RunDetailPanel({ run }) {
  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={spring}
      className="glass-panel shimmer-border hidden w-80 shrink-0 rounded-2xl p-5 xl:block"
    >
      <div className="relative z-10 h-full flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#ff6a00]">Failure pack</p>
            <h2 className="mt-1.5 text-lg font-bold leading-tight">{run.repository}</h2>
            <p className="mt-0.5 text-xs text-[#6f737a] font-mono">{run.workflow} / {run.commit}</p>
          </div>
          <span className="shrink-0 rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#17191c]">
            {run.diagnosis.confidence}
          </span>
        </div>

        {/* Diagnosis */}
        <div className="rounded-xl bg-[#17191c] p-4 text-white shadow-[0_0_30px_rgba(23,25,28,0.25)]">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={13} className="text-[#ff9b4a]" />
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/55">Diagnosis</p>
          </div>
          <p className="text-sm font-semibold leading-5">{run.diagnosis.summary}</p>
          <p className="mt-3 text-xs leading-5 text-white/50">
            Facts and hypotheses are kept separate. Brolens has not executed commands or modified a repository.
          </p>
        </div>

        {/* Evidence */}
        <section className="flex-1 min-h-0">
          <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
            <AlertTriangle size={13} className="text-[#ff6a00]" /> Evidence
          </h3>
          <div className="log-scroll h-40 overflow-auto rounded-xl border border-black/10 bg-white/80 p-3 font-mono text-[11px] leading-6">
            {run.redactedLog.split(/\r?\n/).map((line, idx) => {
              const ev = run.evidence.find((e) => e.line === idx + 1);
              return (
                <div
                  key={`${line}-${idx}`}
                  className={ev ? "rounded-md bg-[#fff0e2] px-2 text-[#9a3b00]" : "px-2 text-[#4c5158]"}
                >
                  <span className="mr-3 select-none text-[#9a9da3]">{String(idx + 1).padStart(2, "0")}</span>
                  {line}
                </div>
              );
            })}
          </div>
        </section>

        {/* Reproduction */}
        <section className="grid gap-2">
          <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
            <Clipboard size={13} className="text-[#ff6a00]" /> Reproduction pack
          </h3>
          {run.diagnosis.reproduction.commands.map((cmd) => (
            <div key={cmd} className="flex items-center justify-between gap-2 rounded-xl border border-black/10 bg-white/80 p-3">
              <code className="min-w-0 overflow-x-auto whitespace-nowrap text-[11px] text-[#17191c]">{cmd}</code>
              <button aria-label="Copy command">
                <Clipboard size={13} className="shrink-0 text-[#ff6a00]" />
              </button>
            </div>
          ))}
          <p className="text-[11px] leading-5 text-[#6f737a]">{run.diagnosis.reproduction.notes[0]}</p>
        </section>

        {/* Privacy guard */}
        <section className="rounded-xl border border-black/10 bg-white/70 p-3">
          <h3 className="mb-1.5 flex items-center gap-2 text-xs font-bold">
            <KeyRound size={13} className="text-[#ff6a00]" /> Privacy guard
          </h3>
          <p className="text-[11px] leading-5 text-[#5f6369]">
            Secret-like values are redacted before analysis output.
          </p>
        </section>
      </div>
    </motion.aside>
  );
}

// ── Shared Glass Panel ────────────────────────────────────────────
function GlassPanel({ title, icon: Icon, children }) {
  return (
    <motion.section
      variants={fadeUp}
      whileHover={{ y: -3, boxShadow: "0 12px 48px rgba(255,106,0,0.14), 0 4px 16px rgba(23,25,28,0.08)" }}
      transition={spring}
      className="glass-panel shimmer-border rounded-2xl p-5"
    >
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold">
            <Icon size={16} className="text-[#ff6a00]" />
            {title}
          </h2>
          <span className="rounded-full bg-[#fff0e2] px-2.5 py-1 text-[10px] font-bold text-[#9a3b00]">
            Sample data
          </span>
        </div>
        {children}
      </div>
    </motion.section>
  );
}

// ── Pill ──────────────────────────────────────────────────────────
function Pill({ icon: Icon, label, glow = false }) {
  return (
    <span
      className={`inline-flex h-9 items-center gap-2 rounded-full border border-black/10 bg-white/85 px-3 text-xs font-semibold text-[#17191c] ${
        glow ? "shadow-[0_0_16px_rgba(255,106,0,0.22)]" : "shadow-sm"
      }`}
    >
      <Icon size={13} className="text-[#ff6a00]" />
      {label}
    </span>
  );
}
