export const navItems = [
  { label: "Essays", href: "/archive", icon: "article" },
  { label: "Fragments", href: "/fragments/memory-is-a-poet", icon: "auto_stories" },
  { label: "Chronicle", href: "/index?type=chronicle", icon: "history" },
  { label: "About", href: "/about", icon: "info" }
];

export function formatArchiveDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric"
  }).format(new Date(date));
}

export function roman(index: number) {
  const numerals = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
  return numerals[index] ?? String(index + 1);
}
