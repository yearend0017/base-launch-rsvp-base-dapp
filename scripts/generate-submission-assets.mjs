import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import sharp from "sharp";

const root = resolve(new URL("..", import.meta.url).pathname);
const outDir = join(root, "base-submission");

const W = 1284;
const H = 2778;

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function wrap(text, maxChars) {
  const words = text.split(" ");
  const result = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      result.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) result.push(current);
  return result;
}

function frame(content, bg = "#f4f0e8") {
  return `
  <svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${bg}"/>
        <stop offset="100%" stop-color="#e9dfc9"/>
      </linearGradient>
      <pattern id="grain" width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="2" fill="#1d1b18" opacity=".06"/>
      </pattern>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#grain)"/>
    ${content}
  </svg>`;
}

function header(title, subtitle) {
  const lines = wrap(subtitle, 31);
  return `
    <text x="68" y="112" font-family="Arial, sans-serif" font-size="40" font-weight="900" fill="#8c6c16">BASE LAUNCH RSVP</text>
    <text x="68" y="232" font-family="Arial, sans-serif" font-size="92" font-weight="900" fill="#1d1b18">${esc(title)}</text>
    ${lines.map((line, index) => `<text x="72" y="${306 + index * 44}" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#5d564f">${esc(line)}</text>`).join("")}
  `;
}

function pill(x, y, text, fill, fg = "#1d1b18") {
  return `
    <rect x="${x}" y="${y}" rx="28" width="${text.length * 16 + 64}" height="56" fill="${fill}" stroke="#1d1b18" stroke-width="3"/>
    <text x="${x + 30}" y="${y + 37}" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="${fg}">${esc(text)}</text>
  `;
}

function ticket(x, y, width, height, title, venue, date, seats, fill, dark = false) {
  const fg = dark ? "#ffffff" : "#1d1b18";
  const sub = dark ? "#d8c995" : "#5d564f";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="36" fill="${fill}" stroke="#1d1b18" stroke-width="4"/>
      <circle cx="${x}" cy="${y + height * 0.42}" r="28" fill="${fill}" stroke="#1d1b18" stroke-width="4"/>
      <circle cx="${x + width}" cy="${y + height * 0.42}" r="28" fill="${fill}" stroke="#1d1b18" stroke-width="4"/>
      <line x1="${x + width * 0.68}" y1="${y + 32}" x2="${x + width * 0.68}" y2="${y + height - 32}" stroke="${sub}" stroke-width="3" stroke-dasharray="10 10"/>
      <text x="${x + 30}" y="${y + 70}" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="${sub}">RSVP PASS</text>
      <text x="${x + 30}" y="${y + 146}" font-family="Arial, sans-serif" font-size="44" font-weight="900" fill="${fg}">${esc(title)}</text>
      <text x="${x + 30}" y="${y + 214}" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${sub}">${esc(venue)}</text>
      <text x="${x + 30}" y="${y + 258}" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${sub}">${esc(date)}</text>
      <text x="${x + width * 0.72}" y="${y + 118}" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="${sub}">SEATS LEFT</text>
      <text x="${x + width * 0.72}" y="${y + 194}" font-family="Arial, sans-serif" font-size="52" font-weight="900" fill="${fg}">${esc(seats)}</text>
    </g>
  `;
}

function infoBox(x, y, width, height, title, value, note, fill = "#fff", fg = "#1d1b18") {
  const sub = fill === "#1d1b18" ? "#d8c995" : "#5d564f";
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30" fill="${fill}" stroke="#1d1b18" stroke-width="4"/>
      <text x="${x + 30}" y="${y + 54}" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="${sub}">${esc(title)}</text>
      <text x="${x + 30}" y="${y + 126}" font-family="Arial, sans-serif" font-size="54" font-weight="900" fill="${fg}">${esc(value)}</text>
      <text x="${x + 30}" y="${y + 178}" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${sub}">${esc(note)}</text>
    </g>
  `;
}

function receipt(x, y, width, height, title, lines, fill) {
  return `
    <g>
      <rect x="${x}" y="${y}" width="${width}" height="${height}" rx="30" fill="${fill}" stroke="#1d1b18" stroke-width="4"/>
      <text x="${x + 28}" y="${y + 56}" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="#1d1b18">${esc(title)}</text>
      ${lines.map((line, index) => `<text x="${x + 28}" y="${y + 112 + index * 40}" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#5d564f">${esc(line)}</text>`).join("")}
    </g>
  `;
}

function button(x, y, width, text, fill, fg = "#fff") {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="96" rx="48" fill="${fill}" stroke="#1d1b18" stroke-width="4"/>
    <text x="${x + width / 2}" y="${y + 61}" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="900" fill="${fg}">${esc(text)}</text>
  `;
}

function screenshot1() {
  const content = `
    ${header("Reserve a seat.", "Use your wallet to RSVP for the next Base launch event and secure a visible onchain pass.")}
    ${pill(68, 404, "One wallet, one seat", "#d2bf7f")}
    ${pill(336, 404, "Live capacity", "#ffffff")}
    ${ticket(68, 520, 1148, 360, "Base Launch Night", "Base Hall", "Jun 20, 2026", "87 / 120", "#1d1b18", true)}
    ${infoBox(68, 950, 548, 220, "Venue", "Base Hall", "Launch-stage gathering and product reveal.", "#ffffff")}
    ${infoBox(670, 950, 546, 220, "Seats left", "33", "Availability updates after each RSVP.", "#ffffff")}
    ${receipt(68, 1230, 540, 310, "What you get", ["A clean onchain RSVP record", "One seat tied to one wallet", "A simple pass you can show later"], "#efe2c6")}
    ${receipt(676, 1230, 540, 310, "Why it fits", ["No confusing flow", "Clear event utility", "Easy to understand in mobile"], "#ffffff")}
    ${receipt(68, 1590, 1148, 300, "Event brief", ["Base Launch RSVP turns a simple attendance action into a trustworthy onchain signal with limited capacity and instant feedback."], "#f6ead2")}
    ${button(68, 2522, 1148, "Connect wallet to RSVP", "#1d1b18")}
  `;
  return frame(content);
}

function screenshot2() {
  const content = `
    ${header("Seat almost yours.", "Connected wallet, event pass visible, and one clear action to reserve a seat.")}
    ${pill(68, 404, "0x9936...9652 connected", "#1d1b18", "#fff")}
    ${pill(392, 404, "Base mainnet", "#d2bf7f")}
    ${ticket(68, 520, 1148, 360, "Base Launch Night", "Base Hall", "Jun 20, 2026", "24 / 120", "#efe2c6")}
    ${infoBox(68, 950, 548, 220, "Current status", "Not RSVP'd", "Your wallet can reserve one seat.", "#ffffff")}
    ${infoBox(670, 950, 546, 220, "Seat count", "96", "Ninety-six seats already reserved.", "#1d1b18", "#fff")}
    <rect x="68" y="1238" width="1148" height="320" rx="34" fill="#1d1b18"/>
    <text x="104" y="1314" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="#d8c995">Status</text>
    <text x="104" y="1390" font-family="Arial, sans-serif" font-size="42" font-weight="900" fill="#fff">Wallet confirmation requested for the RSVP transaction.</text>
    <text x="104" y="1454" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="#d8c995">Once confirmed, your wallet is counted and the seat availability updates.</text>
    ${button(68, 2522, 1148, "Reserve seat on Base", "#d2bf7f", "#1d1b18")}
  `;
  return frame(content, "#f7f1e6");
}

function screenshot3() {
  const content = `
    ${header("RSVP confirmed.", "Your seat is reserved, the pass is visible, and the event capacity continues to update in real time.")}
    ${pill(68, 404, "RSVP confirmed", "#d2bf7f")}
    ${pill(276, 404, "Seat reserved on Base", "#1d1b18", "#fff")}
    ${ticket(68, 520, 1148, 360, "Base Launch Night", "Base Hall", "Jun 20, 2026", "23 / 120", "#1d1b18", true)}
    ${infoBox(68, 950, 548, 220, "Your pass", "Reserved", "This wallet now holds one seat.", "#1d1b18", "#fff")}
    ${infoBox(670, 950, 546, 220, "Remaining seats", "23", "Capacity shrinks with every RSVP.", "#ffffff")}
    ${receipt(68, 1230, 540, 310, "Attendee record", ["Wallet: 0x9936...9652", "Status: confirmed", "One wallet cannot RSVP twice"], "#efe2c6")}
    ${receipt(676, 1230, 540, 310, "Event note", ["Show up with your wallet connection", "Capacity remains visible to everyone", "Useful for launches, demos, and community events"], "#ffffff")}
    ${receipt(68, 1590, 1148, 300, "Why it matters", ["A launch RSVP is a lightweight but real onchain utility. It gives Base App a clean action that feels like attendance, not a generic demo."], "#f6ead2")}
    ${button(68, 2522, 1148, "Share your RSVP pass", "#1d1b18")}
  `;
  return frame(content, "#f4eee3");
}

function iconSvg() {
  return `
  <svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
    <rect width="1024" height="1024" fill="#f4f0e8"/>
    <rect x="122" y="122" width="780" height="780" rx="92" fill="#fff" stroke="#1d1b18" stroke-width="28"/>
    <rect x="186" y="248" width="652" height="250" rx="34" fill="#d2bf7f" stroke="#1d1b18" stroke-width="18"/>
    <circle cx="186" cy="372" r="24" fill="#d2bf7f" stroke="#1d1b18" stroke-width="18"/>
    <circle cx="838" cy="372" r="24" fill="#d2bf7f" stroke="#1d1b18" stroke-width="18"/>
    <line x1="618" y1="272" x2="618" y2="474" stroke="#1d1b18" stroke-width="16" stroke-dasharray="10 12"/>
    <rect x="186" y="562" width="652" height="72" rx="24" fill="#1d1b18"/>
    <rect x="186" y="682" width="324" height="112" rx="24" fill="#efe2c6" stroke="#1d1b18" stroke-width="16"/>
    <rect x="544" y="682" width="294" height="112" rx="24" fill="#ffffff" stroke="#1d1b18" stroke-width="16"/>
  </svg>`;
}

function thumbnailSvg() {
  return `
  <svg width="1910" height="1000" viewBox="0 0 1910 1000" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#f4f0e8"/>
        <stop offset="100%" stop-color="#e9dfc9"/>
      </linearGradient>
    </defs>
    <rect width="1910" height="1000" fill="url(#bg)"/>
    <text x="96" y="194" font-family="Arial, sans-serif" font-size="116" font-weight="900" fill="#1d1b18">Base Launch RSVP</text>
    <text x="100" y="288" font-family="Arial, sans-serif" font-size="46" font-weight="800" fill="#5d564f">Reserve a launch event seat on Base and track live seat availability.</text>
    ${pill(100, 342, "Ticket-first flow", "#d2bf7f")}
    ${button(100, 444, 420, "Reserve seat", "#1d1b18")}
    ${button(556, 444, 420, "Show pass", "#d2bf7f", "#1d1b18")}
    ${ticket(1120, 120, 690, 300, "Base Launch Night", "Base Hall", "Jun 20, 2026", "23 / 120", "#1d1b18", true)}
    ${infoBox(1120, 468, 326, 180, "Status", "Reserved", "Wallet confirmed.", "#ffffff")}
    ${infoBox(1484, 468, 326, 180, "Seats left", "23", "Live capacity.", "#ffffff")}
    ${receipt(1120, 700, 690, 184, "Use cases", ["Launch events, demos, meetups, community sessions"], "#efe2c6")}
  </svg>`;
}

async function writePng(name, svg, width = W, height = H) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .png({ quality: 92, compressionLevel: 9 })
    .toFile(file);
  return file;
}

async function writeJpg(name, svg, width, height) {
  const file = join(outDir, name);
  await sharp(Buffer.from(svg))
    .resize(width, height)
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(file);
  return file;
}

await mkdir(outDir, { recursive: true });

const files = [
  await writeJpg("app-icon.jpg", iconSvg(), 1024, 1024),
  await writeJpg("app-thumbnail.jpg", thumbnailSvg(), 1910, 1000),
  await writePng("screenshot-1.png", screenshot1()),
  await writePng("screenshot-2.png", screenshot2()),
  await writePng("screenshot-3.png", screenshot3()),
];

await writeFile(
  join(outDir, "asset-manifest.json"),
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      files: files.map((file) => file.replace(`${root}/`, "")),
      screenshotSize: "1284x2778",
      thumbnailAspectRatio: "1.91:1",
    },
    null,
    2,
  ),
);

console.log(files.join("\n"));
