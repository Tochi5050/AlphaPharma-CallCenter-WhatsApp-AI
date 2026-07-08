export function getTimeBasedGreeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hour12: false,
      timeZone: "Africa/Lagos",
    }).format(new Date()),
  );

  if (hour < 12) return "Good morning";
  if (hour < 16) return "Good afternoon";
  return "Good evening";
}

export function withGreeting(message: string, name: string = "Kamsi"): string {
  return `${getTimeBasedGreeting()}, I'm ${name}. ${message}`;
}
