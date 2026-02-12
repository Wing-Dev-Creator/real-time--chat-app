export function formatTime(timestamp) {
  if (!timestamp) {
    return "";
  }

  const date = new Date(timestamp);
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}
