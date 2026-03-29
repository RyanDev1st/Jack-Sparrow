import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Compass,
  Hash,
  Layers3,
  LocateFixed,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

/* ═══════════════════════════════════════════════════
   ZONE CONFIRMATION POPUP
   ═══════════════════════════════════════════════════ */
type PopupType = "success" | "failure" | null;

function ZonePopup({ type, onClose }: { type: PopupType; onClose: () => void }) {
  if (!type) return null;
  const ok = type === "success";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 9990, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "auto" }}
    >
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(2,4,9,0.76)", backdropFilter: "blur(10px)" }} />
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="glass-panel glass-elevated"
        style={{
          position: "relative",
          width: "min(92vw, 420px)",
          padding: "36px 30px",
          borderRadius: "var(--radius-2xl)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "18px",
          textAlign: "center",
          borderColor: ok ? "rgba(52,211,153,0.24)" : "rgba(245,130,32,0.22)",
        }}
      >
        <div style={{
          width: "72px", height: "72px", borderRadius: "22px",
          display: "flex", alignItems: "center", justifyContent: "center",
          background: ok
            ? "linear-gradient(145deg, rgba(52,211,153,0.18), rgba(52,211,153,0.04))"
            : "linear-gradient(145deg, rgba(245,130,32,0.18), rgba(245,130,32,0.04))",
          border: `1px solid ${ok ? "rgba(52,211,153,0.32)" : "rgba(245,130,32,0.28)"}`,
          boxShadow: `0 0 26px ${ok ? "rgba(52,211,153,0.14)" : "rgba(245,130,32,0.12)"}`,
        }}>
          {ok ? <ShieldCheck size={34} color="#34d399" strokeWidth={1.4} /> : <CircleAlert size={34} color="#F58220" strokeWidth={1.4} />}
        </div>

        <div>
          <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 700, marginBottom: "6px" }}>
            Zone Confirmation
          </p>
          <h3 className="font-display" style={{ fontSize: "1.28rem", fontWeight: 700 }}>
            {ok ? "Zone Confirmed!" : "Not On This Hunt Sheet"}
          </h3>
        </div>

        <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.65, maxWidth: "300px" }}>
          {ok
            ? "QR code matches the assigned zone. Progress updated — one step closer to claim."
            : "This QR code doesn't match your assigned zones. Re-read the riddle clues carefully."}
        </p>

        <button
          onClick={onClose}
          className={ok ? "glass-btn glass-btn--success" : "glass-btn glass-btn--orange"}
          style={{ minWidth: "170px", justifyContent: "center", marginTop: "4px" }}
        >
          {ok ? <CheckCircle2 size={14} /> : <Compass size={14} />}
          {ok ? "Continue Hunt" : "Review Clue"}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION HEADER HELPER
   ═══════════════════════════════════════════════════ */
function SectionHead({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
      <div className="section-icon"><Icon size={16} color="#F58220" /></div>
      <div>
        <h3 className="font-display" style={{ fontSize: "0.92rem", fontWeight: 700, lineHeight: 1.2 }}>{title}</h3>
        {subtitle && <p style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "2px" }}>{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */
export default function QRCheckinStage({ isMobile = false }: { isMobile?: boolean }) {
  const [popup, setPopup] = useState<PopupType>(null);

  const assignedZones = useMemo(() => [
    { name: "North Stacks", detail: "Upper aisle window bay", status: "solved" as const },
    { name: "Atlas Corner", detail: "Mid-way east of central spine", status: "active" as const },
    { name: "Archive Steps", detail: "Unlock after second zone", status: "locked" as const },
  ], []);

  const steps = useMemo(() => [
    { label: "Riddle solved", status: "done" as const },
    { label: "Search ring narrowed", status: "done" as const },
    { label: "Zone confirmed", status: "active" as const },
    { label: "Check-in unlocked", status: "locked" as const },
  ], []);

  const solved = 2;
  const total = 3;
  const pct = Math.round((solved / total) * 100);

  /* ─── LAYOUT ────────────────────────────────────────
     Desktop: 3-column  [Scanner 60%] [Hunt Sheet 40%]
                         [Zone Board 50%] [Progress 50%]
     Mobile: single column stacked
  ──────────────────────────────────────────────────── */

  return (
    <>
      <AnimatePresence>{popup && <ZonePopup type={popup} onClose={() => setPopup(null)} />}</AnimatePresence>

      <motion.div
        key="qr-checkin"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ width: "min(1280px, 100%)", padding: isMobile ? "1rem" : "1.5rem", pointerEvents: "auto" }}
      >
        {/* ── Top Row: Scanner (60%) + Hunt Sheet (40%) ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "3fr 2fr",
          gap: isMobile ? "14px" : "18px",
          marginBottom: isMobile ? "14px" : "18px",
        }}>
          {/* ─── SCANNER PANEL (60%) ─── */}
          <div className="glass-panel" style={{
            padding: 0,
            borderRadius: "var(--radius-2xl)",
            overflow: "hidden",
            border: "1px solid rgba(245,130,32,0.12)",
            display: "flex",
            flexDirection: "column",
          }}>
            {/* Scanner viewport */}
            <div style={{
              position: "relative",
              minHeight: isMobile ? "320px" : "420px",
              background: "radial-gradient(circle at 50% 0%, rgba(245,130,32,0.10) 0%, rgba(10,14,30,0) 34%), linear-gradient(180deg, rgba(6,10,20,0.96), rgba(7,12,24,0.9))",
            }}>
              {/* Grid overlay */}
              <div style={{
                position: "absolute", inset: 0, opacity: 0.25,
                backgroundImage: "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }} />

              {/* Corner markers */}
              {[
                { top: "24px", left: "24px", bTop: true, bLeft: true },
                { top: "24px", right: "24px", bTop: true, bRight: true },
                { bottom: "24px", left: "24px", bBottom: true, bLeft: true },
                { bottom: "24px", right: "24px", bBottom: true, bRight: true },
              ].map((m, i) => (
                <div key={i} style={{
                  position: "absolute",
                  top: (m as any).top, bottom: (m as any).bottom, left: (m as any).left, right: (m as any).right,
                  width: "36px", height: "36px",
                  borderColor: "rgba(245,130,32,0.6)",
                  borderStyle: "solid", borderWidth: 0,
                  ...((m as any).bTop ? { borderTopWidth: "2.5px" } : {}),
                  ...((m as any).bBottom ? { borderBottomWidth: "2.5px" } : {}),
                  ...((m as any).bLeft ? { borderLeftWidth: "2.5px" } : {}),
                  ...((m as any).bRight ? { borderRightWidth: "2.5px" } : {}),
                }} />
              ))}

              {/* Scan line animation */}
              <div style={{
                position: "absolute", left: "12%", right: "12%", height: "2px",
                background: "linear-gradient(90deg, transparent, rgba(84,255,224,0.9), rgba(245,130,32,0.86), transparent)",
                boxShadow: "0 0 18px rgba(84,255,224,0.4), 0 0 8px rgba(245,130,32,0.3)",
                animation: "qrScanLine 2.8s ease-in-out infinite",
              }} />

              {/* Center icon */}
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                  style={{
                    width: isMobile ? "88px" : "104px", height: isMobile ? "88px" : "104px",
                    borderRadius: "28px",
                    background: "linear-gradient(145deg, rgba(245,130,32,0.08), rgba(84,255,224,0.04))",
                    border: "1px solid rgba(255,255,255,0.06)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <ScanLine size={isMobile ? 36 : 44} color="rgba(255,255,255,0.2)" strokeWidth={1.2} />
                </motion.div>
              </div>

              {/* Scan label */}
              <div style={{
                position: "absolute", bottom: "20px", left: 0, right: 0,
                display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
              }}>
                <Camera size={14} color="rgba(255,255,255,0.3)" />
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                  Awaiting QR code
                </span>
              </div>
            </div>

            {/* Scanner action bar */}
            <div style={{
              padding: "16px 20px",
              background: "rgba(0,0,0,0.2)",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              alignItems: "center",
              gap: "10px",
            }}>
              <div className="glass-well" style={{ flex: 1, display: "flex", alignItems: "center", gap: "8px", padding: "8px 14px" }}>
                <MapPin size={14} color="#F58220" />
                <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                  Active: <strong style={{ color: "var(--text-primary)" }}>Atlas Corner</strong> — east of central spine
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button className="glass-btn glass-btn--success" onClick={() => setPopup("success")}>
                  <CheckCircle2 size={13} /> Match
                </button>
                <button className="glass-btn glass-btn--orange" onClick={() => setPopup("failure")}>
                  <CircleAlert size={13} /> Mismatch
                </button>
              </div>
            </div>
          </div>

          {/* ─── HUNT SHEET PANEL (40%) ─── */}
          <div className="glass-panel" style={{
            padding: isMobile ? "18px" : "22px",
            borderRadius: "var(--radius-2xl)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            <SectionHead icon={Compass} title="Hunt Sheet" subtitle="Your assigned riddle clues" />

            {/* Player ID */}
            <div className="glass-well" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Hash size={14} color="#F58220" />
                <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 700 }}>Sheet</span>
              </div>
              <span style={{ fontFamily: "'Space Grotesk', monospace", fontSize: "1rem", fontWeight: 700, color: "var(--orange-500)", letterSpacing: "0.12em" }}>
                TH-LIB-2041
              </span>
            </div>

            {/* Riddle clues */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { icon: Compass, label: "Directional", value: "East of the central spine" },
                { icon: LocateFixed, label: "Proximity", value: "Mid-way into the highlighted ring" },
                { icon: Layers3, label: "Elevation", value: "Above shelf height, near aisle opening" },
              ].map(({ icon: Ic, label, value }) => (
                <div key={label} className="data-row" style={{ padding: "10px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: "110px" }}>
                    <Ic size={14} color="rgba(245,130,32,0.6)" />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</span>
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="divider" />

            {/* Hint text */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: "10px", padding: "8px 0" }}>
              <Sparkles size={14} color="rgba(52,211,153,0.7)" style={{ flexShrink: 0, marginTop: "2px" }} />
              <p style={{ fontSize: "0.76rem", color: "rgba(52,211,153,0.8)", lineHeight: 1.6 }}>
                Two zones solved. One remains before check-in unlocks. Scan the QR once you find the matching location.
              </p>
            </div>

            {/* Scanner note */}
            <div className="glass-well" style={{ fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.6 }}>
              The scanner verifies the QR code's embedded location against your assigned zones. If it matches, the zone is confirmed.
            </div>
          </div>
        </div>

        {/* ── Bottom Row: Zone Board (50%) + Progress (50%) ── */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? "14px" : "18px",
        }}>
          {/* ─── ZONE BOARD ─── */}
          <div className="glass-panel" style={{
            padding: isMobile ? "18px" : "22px",
            borderRadius: "var(--radius-2xl)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}>
            <SectionHead icon={MapPin} title="Zone Board" subtitle="Assigned zones for this hunt" />

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {assignedZones.map((zone, i) => {
                const isSolved = zone.status === "solved";
                const isActive = zone.status === "active";
                return (
                  <div key={i} className="data-row" style={{
                    padding: "12px 14px",
                    borderColor: isActive ? "rgba(245,130,32,0.15)" : undefined,
                    background: isActive ? "rgba(245,130,32,0.04)" : undefined,
                    opacity: zone.status === "locked" ? 0.5 : 1,
                  }}>
                    <div style={{
                      width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: isSolved ? "rgba(52,211,153,0.12)" : isActive ? "rgba(245,130,32,0.12)" : "rgba(255,255,255,0.04)",
                      border: `1.5px solid ${isSolved ? "rgba(52,211,153,0.35)" : isActive ? "rgba(245,130,32,0.35)" : "rgba(255,255,255,0.08)"}`,
                      fontSize: "0.68rem", fontWeight: 700,
                      color: isSolved ? "#34d399" : isActive ? "#F58220" : "var(--text-ghost)",
                    }}>
                      {isSolved ? "✓" : i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p className="font-display" style={{ fontSize: "0.85rem", fontWeight: 600 }}>{zone.name}</p>
                      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "2px" }}>{zone.detail}</p>
                    </div>
                    <span className="badge" style={{
                      background: isSolved ? "rgba(52,211,153,0.1)" : isActive ? "rgba(245,130,32,0.1)" : "rgba(255,255,255,0.04)",
                      color: isSolved ? "#34d399" : isActive ? "#F58220" : "var(--text-ghost)",
                      borderColor: isSolved ? "rgba(52,211,153,0.2)" : isActive ? "rgba(245,130,32,0.2)" : "rgba(255,255,255,0.06)",
                    }}>
                      {isSolved ? "Confirmed" : isActive ? "Live target" : "Queued"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ─── PROGRESS + CHECK-IN ─── */}
          <div className="glass-panel" style={{
            padding: isMobile ? "18px" : "22px",
            borderRadius: "var(--radius-2xl)",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}>
            <SectionHead icon={Trophy} title="Run Status" subtitle="Completion progress" />

            {/* Big number */}
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span className="font-display" style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-bright)" }}>
                {solved} <span style={{ fontSize: "0.9rem", fontWeight: 500, color: "var(--text-muted)" }}>/ {total} zones</span>
              </span>
              <span className="font-display" style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--orange-500)" }}>
                {pct}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="progress" style={{ height: "6px" }}>
              <div className="progress__fill" style={{
                width: `${pct}%`,
                background: "linear-gradient(90deg, rgba(245,130,32,0.95), rgba(84,255,224,0.88))",
              }} />
            </div>

            {/* Steps */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {steps.map((s, i) => (
                <div key={i} className="data-row" style={{
                  padding: "8px 12px",
                  opacity: s.status === "locked" ? 0.44 : 1,
                }}>
                  <div style={{
                    width: "26px", height: "26px", borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: s.status === "done" ? "rgba(52,211,153,0.12)" : s.status === "active" ? "rgba(245,130,32,0.12)" : "rgba(255,255,255,0.04)",
                    border: `1.5px solid ${s.status === "done" ? "rgba(52,211,153,0.35)" : s.status === "active" ? "rgba(245,130,32,0.35)" : "rgba(255,255,255,0.08)"}`,
                    fontSize: "0.62rem", fontWeight: 700,
                    color: s.status === "done" ? "#34d399" : s.status === "active" ? "#F58220" : "var(--text-ghost)",
                  }}>
                    {s.status === "done" ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: "0.82rem", color: s.status === "locked" ? "var(--text-ghost)" : "var(--text-primary)", fontWeight: 500 }}>
                    {s.label}
                  </span>
                  {s.status === "active" && (
                    <div style={{ marginLeft: "auto", width: "6px", height: "6px", borderRadius: "50%", background: "#F58220", boxShadow: "0 0 8px rgba(245,130,32,0.4)" }} />
                  )}
                </div>
              ))}
            </div>

            <div className="divider" />

            {/* Final check-in preview */}
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div style={{
                width: "60px", height: "60px", borderRadius: "var(--radius-md)",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1px", padding: "6px",
                background: "rgba(0,0,0,0.2)",
              }}>
                {Array.from({ length: 25 }).map((_, j) => (
                  <div key={j} style={{
                    borderRadius: "1px",
                    background: [0,1,3,5,6,8,10,12,14,16,18,20,21,23,24].includes(j)
                      ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.08)",
                  }} />
                ))}
              </div>
              <div style={{ flex: 1 }}>
                <p className="font-display" style={{ fontSize: "0.82rem", fontWeight: 600, marginBottom: "4px" }}>Final Check-in</p>
                <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  Complete all zones to unlock your claim QR. Present it at the check-in table.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
