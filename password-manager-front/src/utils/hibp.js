export async function checkHibp(password) {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-1", enc.encode(password));
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
  const prefix = hex.slice(0, 5);
  const suffix = hex.slice(5);

  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!res.ok) throw new Error("HIBP API unavailable");

  const text = await res.text();
  const match = text.split("\n").find((l) => l.startsWith(suffix));
  if (!match) return 0;
  return parseInt(match.split(":")[1], 10);
}
