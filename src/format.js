const DEFAULT_WARN_HOURS = 48;

function pad2(value) {
  return String(value).padStart(2, "0");
}

function offsetLabel(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return sign + pad2(hours) + (minutes === 0 ? "" : ":" + pad2(minutes));
}

export function formatLocalDate(date) {
  return (
    date.getFullYear() +
    "-" +
    pad2(date.getMonth() + 1) +
    "-" +
    pad2(date.getDate()) +
    " " +
    pad2(date.getHours()) +
    ":" +
    pad2(date.getMinutes()) +
    ":" +
    pad2(date.getSeconds()) +
    " " +
    offsetLabel(date)
  );
}

export function formatDuration(milliseconds) {
  const totalSeconds = Math.abs(Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  const parts = [];
  if (days > 0) {
    parts.push(days + "d");
  }
  if (hours > 0 || days > 0) {
    parts.push(hours + "h");
  }
  parts.push(minutes + "m");
  return parts.join(" ");
}

function timeLeftLabel(expiresAt, now) {
  const remainingMs = expiresAt.getTime() - now.getTime();
  if (remainingMs < 0) {
    return "expired " + formatDuration(remainingMs) + " ago";
  }

  return formatDuration(remainingMs);
}

export function toPublicJson(report, { now = new Date(), warnHours = DEFAULT_WARN_HOURS } = {}) {
  const warnMs = warnHours * 3_600_000;

  return {
    availableCount: report.availableCount,
    generatedAt: now.toISOString(),
    warnHours,
    credits: report.credits.map((credit) => {
      const remainingMs = credit.expiresAt.getTime() - now.getTime();
      return {
        title: credit.title,
        status: credit.status,
        resetType: credit.resetType,
        grantedAt: credit.grantedAt.toISOString(),
        expiresAt: credit.expiresAt.toISOString(),
        timeLeftSeconds: Math.floor(remainingMs / 1000),
        expiresWithinWarnHours: remainingMs >= 0 && remainingMs <= warnMs,
      };
    }),
  };
}

export function formatReport(report, { now = new Date(), warnHours = DEFAULT_WARN_HOURS } = {}) {
  const lines = ["Resets available: " + report.availableCount];

  if (report.credits.length === 0) {
    lines.push("No reset credits returned by the endpoint.");
    return lines.join("\n");
  }

  const warnMs = warnHours * 3_600_000;
  const expiringSoon = [];

  lines.push("");
  report.credits.forEach((credit, index) => {
    const displayIndex = index + 1;
    const remainingMs = credit.expiresAt.getTime() - now.getTime();
    const remainingLabel = timeLeftLabel(credit.expiresAt, now);

    if (remainingMs >= 0 && remainingMs <= warnMs) {
      expiringSoon.push({ displayIndex, remainingLabel });
    }

    lines.push(displayIndex + ". " + credit.title);
    lines.push("   Status: " + credit.status);
    lines.push("   Type: " + credit.resetType);
    lines.push("   Granted: " + formatLocalDate(credit.grantedAt));
    lines.push("   Expires: " + formatLocalDate(credit.expiresAt));
    lines.push("   Time left: " + remainingLabel);

    if (index !== report.credits.length - 1) {
      lines.push("");
    }
  });

  if (expiringSoon.length > 0) {
    lines.push("");
    for (const item of expiringSoon) {
      lines.push(
        "WARNING: reset #" +
          item.displayIndex +
          " expires within " +
          warnHours +
          " hours (" +
          item.remainingLabel +
          " left).",
      );
    }
  }

  return lines.join("\n");
}
