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

export function withGreeting(
  message: string,
  customerName?: string,
  botName: string = "Kamsi",
): string {
  const greeting = getTimeBasedGreeting();
  const nameInsert = customerName ? `, ${customerName}` : "";
  return `${greeting}${nameInsert}! Welcome to Alpha. I'm ${botName}. ${message}`;
}
