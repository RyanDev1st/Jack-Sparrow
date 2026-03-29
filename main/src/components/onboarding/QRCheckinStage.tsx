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
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";

type PopupType = "success" | "failure" | null;

function ZonePopup({ type, onClose }: { type: PopupType; onClose: () => void }) {
  if (!type) return null;

  const isSuccess = type === "success";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9990,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(2,4,9,0.76)",
          backdropFilter: "blur(10px)",
        }}
      />
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 18, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
        className="glass-panel glass-elevated"
        style={{
          position: "relative",
          width: "min(92vw, 420px)",
          padding: "32px 28px",
          borderRadius: "var(--radius-2xl)",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          textAlign: "center",
          borderColor: isSuccess ? "rgba(52,211,153,0.24)" : "rgba(245,130,32,0.22)",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            margin: "0 auto",
            borderRadius: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isSuccess
              ? "linear-gradient(145deg, rgba(52,211,153,0.18) 0%, rgba(52,211,153,0.04) 100%)"
              : "linear-gradient(145deg, rgba(245,130,32,0.18) 0%, rgba(245,130,32,0.04) 100%)",
            border: `1px solid ${isSuccess ? "rgba(52,211,153,0.32)" : "rgba(245,130,32,0.28)"}`,
            boxShadow: isSuccess
              ? "0 0 26px rgba(52,211,153,0.14)"
              : "0 0 28px rgba(245,130,32,0.12)",
          }}
        >
          {isSuccess ? (
            <ShieldCheck size={34} color="#34d399" strokeWidth={1.7} />
          ) : (
            <CircleAlert size={34} color="#F58220" strokeWidth={1.7} />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div
            style={{
              fontSize: "0.68rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.42)",
              fontWeight: 700,
            }}
          >
            Zone Confirmation
          </div>
          <h3 className="font-display" style={{ fontSize: "1.28rem", lineHeight: 1.15 }}>
            {isSuccess ? "Zone Confirmed" : "Not On This Hunt Sheet"}
          </h3>
          <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
            {isSuccess
              ? "This code belongs to one of the player's assigned zones. Mark the area solved and guide them to the next search ring."
              : "The code is valid, but it does not belong to this player's current map set. Recheck the riddle before logging the find."}
          </p>
        </div>

        <button
          onClick={onClose}
          className="glass-btn"
          style={{
            alignSelf: "center",
            justifyContent: "center",
            minWidth: "170px",
            background: isSuccess ? "rgba(52,211,153,0.12)" : "rgba(245,130,32,0.12)",
            borderColor: isSuccess ? "rgba(52,211,153,0.2)" : "rgba(245,130,32,0.2)",
            color: isSuccess ? "#34d399" : "#F58220",
          }}
        >
          {isSuccess ? "Continue Hunt" : "Review Clue"}
        </button>
      </motion.div>
    </motion.div>
  );
}

export default function QRCheckinStage({ isMobile = false }: { isMobile?: boolean }) {
  const [popup, setPopup] = useState<PopupType>(null);

  const assignedZones = useMemo(
    () => [
      {
        name: "North Stacks",
        detail: "Solved - upper aisle window bay",
        status: "solved" as const,
      },
      {
        name: "Atlas Corner",
        detail: "Active - mid-way east of the central spine",
        status: "active" as const,
      },
      {
        name: "Archive Steps",
        detail: "Locked - unlock after second zone",
        status: "locked" as const,
      },
    ],
    []
  );

  const progressSteps = useMemo(
    () => [
      { label: "Riddle solved", status: "done" as const },
      { label: "Search ring narrowed", status: "done" as const },
      { label: "Zone confirmed", status: "active" as const },
      { label: "Check-in unlocked", status: "locked" as const },
    ],
    []
  );

  const layoutColumns = isMobile ? "1fr" : "minmax(0, 1.12fr) minmax(320px, 0.88fr)";
  const progressPercent = Math.round((2 / 3) * 100);

  if (isMobile) {
    return (
      <>
        <motion.div
          key="qr-checkin-stage-mobile"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{
            width: "100%",
            padding: "0.9rem",
            pointerEvents: "auto",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div className="glass-panel" style={{ padding: "18px", borderRadius: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge badge--active">Treasure Hunt</span>
                <span className="badge">Check-in flow</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <h2 className="font-display" style={{ fontSize: "1.24rem", lineHeight: 1.1 }}>
                  Confirm the zone without losing the hunt narrative.
                </h2>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Mobile layout prioritizes the scanner first, then the hunt sheet, then the final check-in state.
                </p>
              </div>
              <div className="glass-well" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Hash size={14} color="#F58220" />
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                    Player Sheet
                  </span>
                </div>
                <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: "1rem", color: "var(--text-primary)", fontWeight: 700, letterSpacing: "0.12em" }}>
                  TH-LIB-2041
                </div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "14px", borderRadius: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="section-header" style={{ marginBottom: 0, paddingBottom: "12px" }}>
                <div className="section-icon">
                  <ScanLine size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "0.98rem" }}>Zone Confirmation</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Scan confirms the find. It does not replace the riddle.
                  </p>
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  minHeight: "330px",
                  borderRadius: "22px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(245,130,32,0.12) 0%, rgba(10,14,30,0) 36%), linear-gradient(180deg, rgba(6,10,20,0.96) 0%, rgba(7,12,24,0.92) 100%)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "14px",
                    borderRadius: "18px",
                    overflow: "hidden",
                    border: "1px solid rgba(245,130,32,0.14)",
                    background: "linear-gradient(180deg, rgba(14,21,42,0.82) 0%, rgba(7,12,24,0.74) 100%)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
                      backgroundSize: "38px 38px",
                      opacity: 0.34,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "12%",
                      left: "10%",
                      right: "10%",
                      height: "2px",
                      background: "linear-gradient(90deg, transparent, rgba(84,255,224,0.88), rgba(245,130,32,0.84), transparent)",
                      boxShadow: "0 0 20px rgba(84,255,224,0.22), 0 0 28px rgba(245,130,32,0.18)",
                      animation: "qrScanLine 2.8s ease-in-out infinite",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "16px",
                      textAlign: "center",
                      padding: "24px",
                    }}
                  >
                    <div
                      style={{
                        width: "88px",
                        height: "88px",
                        borderRadius: "24px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(10,14,30,0.88) 100%)",
                        border: "1px solid rgba(255,255,255,0.12)",
                      }}
                    >
                      <ScanLine size={34} color="#F58220" strokeWidth={1.6} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <h3 className="font-display" style={{ fontSize: "1.06rem", lineHeight: 1.1 }}>
                        Scan to confirm the active zone.
                      </h3>
                      <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                        Active call: east of the central spine, mid-way toward the atlas corner, above shelf height.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                <button className="glass-btn glass-btn--success" style={{ justifyContent: "center" }} onClick={() => setPopup("success")}>
                  <CheckCircle2 size={14} /> Valid Match
                </button>
                <button
                  className="glass-btn"
                  style={{ justifyContent: "center", background: "rgba(245,130,32,0.12)", borderColor: "rgba(245,130,32,0.16)", color: "#F58220" }}
                  onClick={() => setPopup("failure")}
                >
                  <CircleAlert size={14} /> Mismatch
                </button>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "18px", borderRadius: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="section-header" style={{ marginBottom: 0, paddingBottom: "12px" }}>
                <div className="section-icon">
                  <ShieldCheck size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "0.98rem" }}>Run Status</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Mobile keeps the progress summary ahead of the support panels.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "end", justifyContent: "space-between", gap: "12px" }}>
                <div>
                  <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                    Completion
                  </div>
                  <div className="font-display" style={{ fontSize: "1.6rem", lineHeight: 1, marginTop: "6px" }}>
                    2 / 3 zones
                  </div>
                </div>
                <div style={{ fontSize: "0.86rem", color: "#F58220", fontWeight: 700 }}>
                  {progressPercent}%
                </div>
              </div>

              <div className="progress">
                <div className="progress__fill" style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, rgba(245,130,32,0.95) 0%, rgba(84,255,224,0.88) 100%)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {progressSteps.map((step, index) => (
                  <div key={step.label} className="data-row" style={{ padding: "10px 12px", opacity: step.status === "locked" ? 0.44 : 1 }}>
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: step.status === "done" ? "rgba(52,211,153,0.14)" : step.status === "active" ? "rgba(245,130,32,0.14)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${step.status === "done" ? "rgba(52,211,153,0.26)" : step.status === "active" ? "rgba(245,130,32,0.26)" : "rgba(255,255,255,0.1)"}`,
                        color: step.status === "done" ? "#34d399" : step.status === "active" ? "#F58220" : "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {step.status === "done" ? <CheckCircle2 size={13} /> : <span style={{ fontSize: "0.68rem", fontWeight: 700 }}>{index + 1}</span>}
                    </div>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-primary)" }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "18px", borderRadius: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="section-header" style={{ marginBottom: 0, paddingBottom: "12px" }}>
                <div className="section-icon">
                  <Compass size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "0.98rem" }}>Assigned Hunt Sheet</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Direction, proximity, and elevation stay readable in a stacked layout.
                  </p>
                </div>
              </div>

              {[
                { label: "Directional", value: "East of the central spine" },
                { label: "Proximity", value: "Mid-way into the highlighted ring" },
                { label: "Elevation", value: "Above shelf height near the aisle opening" },
              ].map((item) => (
                <div key={item.label} className="data-row" style={{ padding: "12px 14px", alignItems: "start" }}>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", minWidth: "88px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="glass-panel" style={{ padding: "18px", borderRadius: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="section-header" style={{ marginBottom: 0, paddingBottom: "12px" }}>
                <div className="section-icon">
                  <Layers3 size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "0.98rem" }}>Zone Board</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Active zone stays visible without the desktop sidebar.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {assignedZones.map((zone, index) => {
                  const isSolved = zone.status === "solved";
                  const isActive = zone.status === "active";

                  return (
                    <div
                      key={zone.name}
                      className="data-row"
                      style={{
                        padding: "13px 14px",
                        alignItems: "flex-start",
                        background: isActive ? "rgba(245,130,32,0.08)" : undefined,
                        borderColor: isActive ? "rgba(245,130,32,0.18)" : undefined,
                        opacity: zone.status === "locked" ? 0.56 : 1,
                      }}
                    >
                      <div
                        style={{
                          width: "28px",
                          height: "28px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isSolved ? "rgba(52,211,153,0.14)" : isActive ? "rgba(245,130,32,0.16)" : "rgba(255,255,255,0.05)",
                          color: isSolved ? "#34d399" : isActive ? "#F58220" : "var(--text-muted)",
                          border: `1px solid ${isSolved ? "rgba(52,211,153,0.28)" : isActive ? "rgba(245,130,32,0.26)" : "rgba(255,255,255,0.1)"}`,
                          flexShrink: 0,
                        }}
                      >
                        {isSolved ? <CheckCircle2 size={14} /> : <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>{index + 1}</span>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 600 }}>{zone.name}</span>
                          <span className={`badge ${isSolved ? "badge--active" : ""}`} style={{ color: isActive ? "#F58220" : undefined }}>
                            {isSolved ? "Confirmed" : isActive ? "Live target" : "Queued"}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>{zone.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="glass-panel" style={{ padding: "18px", borderRadius: "26px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="section-header" style={{ marginBottom: 0, paddingBottom: "12px" }}>
                <div className="section-icon">
                  <Trophy size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "0.98rem" }}>Final Check-in</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Completion output lives at the bottom of the mobile stack.
                  </p>
                </div>
              </div>

              <div className="glass-well" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                  Once every assigned zone is confirmed, generate a mantra ID and verification QR for the check-in table.
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span className="badge">Check-in gate</span>
                  <span className="badge">Admin verify</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence>
          {popup && <ZonePopup type={popup} onClose={() => setPopup(null)} />}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.div
        key="qr-checkin-stage"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          width: "min(1240px, 100%)",
          padding: isMobile ? "1rem" : "1.5rem",
          pointerEvents: "auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: layoutColumns,
            gap: isMobile ? "14px" : "18px",
            alignItems: "start",
          }}
        >
          <section style={{ display: "flex", flexDirection: "column", gap: isMobile ? "14px" : "18px" }}>
            <div
              className="glass-panel"
              style={{
                padding: isMobile ? "18px" : "24px",
                borderRadius: "var(--radius-2xl)",
                display: "flex",
                flexDirection: "column",
                gap: "18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: isMobile ? "column" : "row",
                  alignItems: isMobile ? "flex-start" : "center",
                  justifyContent: "space-between",
                  gap: "14px",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span className="badge badge--active">Treasure Hunt</span>
                    <span className="badge">Library Run 02</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <h2 className="font-display" style={{ fontSize: isMobile ? "1.4rem" : "1.7rem", lineHeight: 1.08 }}>
                      Confirm the zone, then keep the hunt moving.
                    </h2>
                    <p style={{ fontSize: "0.84rem", color: "var(--text-secondary)", maxWidth: "620px", lineHeight: 1.7 }}>
                      The scan is only a confirmation step. It checks whether the code belongs to this player's assigned map sheet and unlocks the next part of the run.
                    </p>
                  </div>
                </div>

                <div
                  className="glass-well"
                  style={{
                    minWidth: isMobile ? "100%" : "220px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Hash size={14} color="#F58220" />
                    <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                      Player Sheet
                    </span>
                  </div>
                  <div style={{ fontFamily: "'Space Grotesk', monospace", fontSize: "1.1rem", color: "var(--text-primary)", fontWeight: 700, letterSpacing: "0.12em" }}>
                    TH-LIB-2041
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "rgba(52,211,153,0.8)", fontSize: "0.74rem" }}>
                    <Sparkles size={14} />
                    Two zones solved. One remains before check-in.
                  </div>
                </div>
              </div>

              <div
                style={{
                  position: "relative",
                  minHeight: isMobile ? "360px" : "470px",
                  borderRadius: "28px",
                  overflow: "hidden",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background:
                    "radial-gradient(circle at 50% 0%, rgba(245,130,32,0.12) 0%, rgba(10,14,30,0) 34%), linear-gradient(180deg, rgba(6,10,20,0.96) 0%, rgba(7,12,24,0.9) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), 0 24px 70px rgba(0,0,0,0.36)",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: "18px",
                    borderRadius: "22px",
                    overflow: "hidden",
                    border: "1px solid rgba(245,130,32,0.14)",
                    background:
                      "linear-gradient(180deg, rgba(14,21,42,0.84) 0%, rgba(7,12,24,0.72) 100%)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background:
                        "radial-gradient(circle at 50% 50%, rgba(245,130,32,0.08) 0%, rgba(84,255,224,0.04) 28%, rgba(255,255,255,0) 55%)",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backgroundImage:
                        "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
                      backgroundSize: "44px 44px",
                      opacity: 0.34,
                    }}
                  />
                  {[
                    { top: "20px", left: "20px" },
                    { top: "20px", right: "20px" },
                    { bottom: "20px", left: "20px" },
                    { bottom: "20px", right: "20px" },
                  ].map((position, index) => (
                    <div
                      key={index}
                      style={{
                        position: "absolute",
                        ...position,
                        width: "34px",
                        height: "34px",
                        borderColor: "rgba(245,130,32,0.66)",
                        borderStyle: "solid",
                        borderWidth: 0,
                        ...(index === 0
                          ? { borderTopWidth: "2px", borderLeftWidth: "2px" }
                          : index === 1
                            ? { borderTopWidth: "2px", borderRightWidth: "2px" }
                            : index === 2
                              ? { borderBottomWidth: "2px", borderLeftWidth: "2px" }
                              : { borderBottomWidth: "2px", borderRightWidth: "2px" }),
                      }}
                    />
                  ))}

                  <div
                    style={{
                      position: "absolute",
                      top: "14%",
                      left: "12%",
                      right: "12%",
                      height: "2px",
                      background: "linear-gradient(90deg, transparent, rgba(84,255,224,0.9), rgba(245,130,32,0.86), transparent)",
                      boxShadow: "0 0 20px rgba(84,255,224,0.25), 0 0 30px rgba(245,130,32,0.18)",
                      animation: "qrScanLine 2.8s ease-in-out infinite",
                    }}
                  />

                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "18px",
                      textAlign: "center",
                      padding: "30px",
                    }}
                  >
                    <motion.div
                      animate={{ scale: [1, 1.03, 1] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                      style={{
                        width: isMobile ? "92px" : "104px",
                        height: isMobile ? "92px" : "104px",
                        borderRadius: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(145deg, rgba(255,255,255,0.1) 0%, rgba(10,14,30,0.88) 100%)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        boxShadow: "0 0 32px rgba(245,130,32,0.08)",
                      }}
                    >
                      <ScanLine size={isMobile ? 36 : 40} color="#F58220" strokeWidth={1.6} />
                    </motion.div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxWidth: "420px" }}>
                      <h3 className="font-display" style={{ fontSize: isMobile ? "1.18rem" : "1.4rem", lineHeight: 1.1 }}>
                        Scan to confirm the active zone.
                      </h3>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                        The code only clears if it belongs to this player's assigned sheet. Wrong zone codes stay blocked, even when the QR itself is real.
                      </p>
                    </div>
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: "18px",
                      right: "18px",
                      bottom: "18px",
                      display: "flex",
                      flexDirection: isMobile ? "column" : "row",
                      alignItems: isMobile ? "stretch" : "center",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div
                      className="glass-well"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <LocateFixed size={15} color="rgba(84,255,224,0.78)" />
                      <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        Active call: east of the central spine, mid-way toward the atlas corner, above shelf height.
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="glass-btn glass-btn--success"
                        style={{ justifyContent: "center" }}
                        onClick={() => setPopup("success")}
                      >
                        <CheckCircle2 size={14} /> Simulate Valid Match
                      </button>
                      <button
                        className="glass-btn"
                        style={{
                          justifyContent: "center",
                          background: "rgba(245,130,32,0.12)",
                          borderColor: "rgba(245,130,32,0.16)",
                          color: "#F58220",
                        }}
                        onClick={() => setPopup("failure")}
                      >
                        <CircleAlert size={14} /> Simulate Mismatch
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                gap: isMobile ? "14px" : "18px",
              }}
            >
              <div
                className="glass-panel"
                style={{
                  padding: isMobile ? "18px" : "22px",
                  borderRadius: "var(--radius-2xl)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div className="section-header" style={{ paddingBottom: "12px" }}>
                  <div className="section-icon">
                    <Compass size={18} color="#F58220" />
                  </div>
                  <div>
                    <h3 className="font-display" style={{ fontSize: "1rem" }}>Assigned Hunt Sheet</h3>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Direction, proximity, and elevation drive the search.
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gap: "10px" }}>
                  {[
                    { label: "Directional", value: "East of the central spine" },
                    { label: "Proximity", value: "Mid-way into the highlighted ring" },
                    { label: "Elevation", value: "Above shelf height near the aisle opening" },
                  ].map((item) => (
                    <div key={item.label} className="data-row" style={{ padding: "12px 14px", alignItems: "start" }}>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", minWidth: "96px", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>
                        {item.label}
                      </span>
                      <span style={{ fontSize: "0.82rem", color: "var(--text-primary)", lineHeight: 1.55 }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="glass-panel"
                style={{
                  padding: isMobile ? "18px" : "22px",
                  borderRadius: "var(--radius-2xl)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                }}
              >
                <div className="section-header" style={{ paddingBottom: "12px" }}>
                  <div className="section-icon">
                    <QrCode size={18} color="#F58220" />
                  </div>
                  <div>
                    <h3 className="font-display" style={{ fontSize: "1rem" }}>Scan Notes</h3>
                    <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      Use scanning as proof, not as the main story beat.
                    </p>
                  </div>
                </div>

                <div className="glass-well" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Camera size={14} color="rgba(84,255,224,0.74)" />
                    <span style={{ fontSize: "0.74rem", color: "var(--text-primary)", fontWeight: 600 }}>
                      What the scan should say
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    "Zone confirmed" when the code belongs to the sheet.
                    "Not on this hunt sheet" when it does not.
                  </p>
                </div>

                <div className="glass-well" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={14} color="#F58220" />
                    <span style={{ fontSize: "0.74rem", color: "var(--text-primary)", fontWeight: 600 }}>
                      UX principle
                    </span>
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    The scanner confirms the find. The player story is still about solving the riddle and finding the correct shelf zone.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <aside style={{ display: "flex", flexDirection: "column", gap: isMobile ? "14px" : "18px" }}>
            <div
              className="glass-panel"
              style={{
                padding: isMobile ? "18px" : "22px",
                borderRadius: "var(--radius-2xl)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div className="section-header" style={{ paddingBottom: "12px" }}>
                <div className="section-icon">
                  <Layers3 size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "1rem" }}>Zone Board</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    The player only clears the zones assigned to their map set.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {assignedZones.map((zone, index) => {
                  const isSolved = zone.status === "solved";
                  const isActive = zone.status === "active";

                  return (
                    <div
                      key={zone.name}
                      className="data-row"
                      style={{
                        padding: "14px 14px",
                        alignItems: "flex-start",
                        background: isActive ? "rgba(245,130,32,0.08)" : undefined,
                        borderColor: isActive ? "rgba(245,130,32,0.18)" : undefined,
                        opacity: zone.status === "locked" ? 0.56 : 1,
                      }}
                    >
                      <div
                        style={{
                          width: "30px",
                          height: "30px",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: isSolved
                            ? "rgba(52,211,153,0.14)"
                            : isActive
                              ? "rgba(245,130,32,0.16)"
                              : "rgba(255,255,255,0.05)",
                          color: isSolved ? "#34d399" : isActive ? "#F58220" : "var(--text-muted)",
                          border: `1px solid ${
                            isSolved
                              ? "rgba(52,211,153,0.28)"
                              : isActive
                                ? "rgba(245,130,32,0.26)"
                                : "rgba(255,255,255,0.1)"
                          }`,
                          flexShrink: 0,
                        }}
                      >
                        {isSolved ? <CheckCircle2 size={15} /> : <span style={{ fontSize: "0.76rem", fontWeight: 700 }}>{index + 1}</span>}
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "0.84rem", color: "var(--text-primary)", fontWeight: 600 }}>
                            {zone.name}
                          </span>
                          <span className={`badge ${isSolved ? "badge--active" : ""}`} style={{ color: isActive ? "#F58220" : undefined }}>
                            {isSolved ? "Confirmed" : isActive ? "Live target" : "Queued"}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                          {zone.detail}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: isMobile ? "18px" : "22px",
                borderRadius: "var(--radius-2xl)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div className="section-header" style={{ paddingBottom: "12px" }}>
                <div className="section-icon">
                  <ShieldCheck size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "1rem" }}>Run Status</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Progress should read like a hunt, not a scanner demo.
                  </p>
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: "12px",
                  alignItems: "end",
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700 }}>
                    Completion
                  </div>
                  <div className="font-display" style={{ fontSize: "1.9rem", lineHeight: 1, marginTop: "6px" }}>
                    2 / 3 zones
                  </div>
                </div>
                <div style={{ fontSize: "0.92rem", color: "#F58220", fontWeight: 700 }}>
                  {progressPercent}%
                </div>
              </div>

              <div className="progress">
                <div
                  className="progress__fill"
                  style={{
                    width: `${progressPercent}%`,
                    background: "linear-gradient(90deg, rgba(245,130,32,0.95) 0%, rgba(84,255,224,0.88) 100%)",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {progressSteps.map((step, index) => (
                  <div
                    key={step.label}
                    className="data-row"
                    style={{
                      padding: "10px 12px",
                      opacity: step.status === "locked" ? 0.44 : 1,
                    }}
                  >
                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background:
                          step.status === "done"
                            ? "rgba(52,211,153,0.14)"
                            : step.status === "active"
                              ? "rgba(245,130,32,0.14)"
                              : "rgba(255,255,255,0.05)",
                        border: `1px solid ${
                          step.status === "done"
                            ? "rgba(52,211,153,0.26)"
                            : step.status === "active"
                              ? "rgba(245,130,32,0.26)"
                              : "rgba(255,255,255,0.1)"
                        }`,
                        color:
                          step.status === "done"
                            ? "#34d399"
                            : step.status === "active"
                              ? "#F58220"
                              : "var(--text-muted)",
                        flexShrink: 0,
                      }}
                    >
                      {step.status === "done" ? <CheckCircle2 size={14} /> : <span style={{ fontSize: "0.72rem", fontWeight: 700 }}>{index + 1}</span>}
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-primary)" }}>{step.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="glass-panel"
              style={{
                padding: isMobile ? "18px" : "22px",
                borderRadius: "var(--radius-2xl)",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div className="section-header" style={{ paddingBottom: "12px" }}>
                <div className="section-icon">
                  <Trophy size={18} color="#F58220" />
                </div>
                <div>
                  <h3 className="font-display" style={{ fontSize: "1rem" }}>Final Check-in</h3>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    Unlock this only after every assigned zone is confirmed.
                  </p>
                </div>
              </div>

              <div
                className="glass-well"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 94px",
                  gap: "14px",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 700 }}>
                    When complete
                  </div>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                    Generate a mantra ID and a verification QR. The player takes that to the check-in table, and staff confirm the full run before prize claim.
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span className="badge">Check-in gate</span>
                    <span className="badge">Admin verify</span>
                  </div>
                </div>

                <div
                  style={{
                    width: "94px",
                    height: "94px",
                    borderRadius: "18px",
                    padding: "10px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)",
                    display: "grid",
                    gridTemplateColumns: "repeat(5, 1fr)",
                    gap: "4px",
                  }}
                >
                  {Array.from({ length: 25 }, (_, index) => (
                    <div
                      key={index}
                      style={{
                        borderRadius: "2px",
                        background:
                          index % 2 === 0 || index === 6 || index === 18
                            ? "rgba(255,255,255,0.84)"
                            : "rgba(255,255,255,0.12)",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="data-row" style={{ padding: "12px 14px" }}>
                <MapPin size={14} color="rgba(84,255,224,0.74)" />
                <span style={{ fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Suggested copy: "All zones cleared. Proceed to the check-in table for prize verification."
                </span>
              </div>
            </div>
          </aside>
        </div>
      </motion.div>

      <AnimatePresence>
        {popup && <ZonePopup type={popup} onClose={() => setPopup(null)} />}
      </AnimatePresence>
    </>
  );
}
