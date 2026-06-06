// Approximate live minute from kickoff timestamp.
// Real providers expose this directly; football-data.org does not on snapshots,
// so we fall back to elapsed wall time.

export type MatchClock =
  | { kind: "scheduled"; label: string }
  | { kind: "live"; minute: number; label: string }
  | { kind: "half_time"; label: string }
  | { kind: "finished"; label: string }
  | { kind: "postponed"; label: string };

export function matchClock(status: string, kickoff: Date, now: Date = new Date()): MatchClock {
  const elapsedSec = (now.getTime() - new Date(kickoff).getTime()) / 1000;
  if (status === "FINISHED") return { kind: "finished", label: "FT" };
  if (status === "PAUSED") return { kind: "half_time", label: "HT" };
  if (status === "POSTPONED" || status === "CANCELLED") {
    return { kind: "postponed", label: status === "CANCELLED" ? "CXL" : "PPD" };
  }
  if (status === "IN_PLAY" && elapsedSec > 0) {
    // 0–45 first half, ~15 min break, 45–90 second half. Past 90 we cap at "90+".
    let minute = Math.floor(elapsedSec / 60);
    if (minute > 105) minute = 90;
    else if (minute > 60) minute = Math.min(90, minute - 15);
    minute = Math.max(1, minute);
    return { kind: "live", minute, label: `${minute}'` };
  }
  return {
    kind: "scheduled",
    label: new Date(kickoff).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })
  };
}
