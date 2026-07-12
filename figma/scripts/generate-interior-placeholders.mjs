// Generates placeholder PNG images for every valid combination of
// (room, flooring, kitchen millwork, furniture package) used by
// InteriorStudio.tsx's main canvas. Each image is just large text stating
// the 4 config values it represents -- a stand-in until real renders exist.
// Rendered as PNG (via sharp, rasterizing an SVG built in-memory) rather
// than served as raw SVG: photo-sphere-viewer/three.js fails to use an SVG
// `<img>` as a WebGL texture source in this stack (confirmed via direct
// Viewer test -- SVG panoramas fire `panorama-error`, PNG loads fine).
//
// Run with: node scripts/generate-interior-placeholders.mjs
// Output:   public/static-assets/interior-placeholders/<key>.png

import { mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'public', 'static-assets', 'interior-placeholders');

// Mirrors the data in src/components/studio/InteriorStudio.tsx
const ROOMS = [
  { id: 'living', label: 'Living' },
  { id: 'kitchen', label: 'Kitchen' },
  { id: 'bedroom', label: 'Bedroom' },
  { id: 'bathroom', label: 'Bathroom' },
];

const FLOORING = [
  { id: 'oak', name: 'LVP Oak' },
  { id: 'concrete', name: 'Polished Concrete' },
  { id: 'walnut', name: 'Eng. Walnut' },
];

const CABINETS = [
  { id: 'white', name: 'Matte White' },
  { id: 'ash', name: 'Light Ash' },
  { id: 'navy', name: 'Midnight Blue' },
];

// Furniture package options per room ('unfurnished' always included).
// Ids/names mirror `furniturePackages` in InteriorStudio.tsx.
// Kitchen has no furniture category, so it's always 'unfurnished'.
// 'Outdoors' packages aren't tied to any room tab, so excluded here.
const FURNITURE_BY_ROOM = {
  living: [
    { id: 'unfurnished', name: 'Unfurnished' },
    { id: 'liv-1', name: 'Heritage Living' },
    { id: 'liv-2', name: 'Modern Hearth' },
    { id: 'liv-3', name: 'Zen Lounge' },
  ],
  kitchen: [
    { id: 'unfurnished', name: 'Unfurnished' },
  ],
  bedroom: [
    { id: 'unfurnished', name: 'Unfurnished' },
    { id: 'bed-1', name: 'Scandi Dream' },
  ],
  bathroom: [
    { id: 'unfurnished', name: 'Unfurnished' },
    { id: 'bath-1', name: 'Spa Serenity' },
  ],
};

const ROOM_COLORS = {
  living: '#c9a876',
  kitchen: '#8fa9a3',
  bedroom: '#a889b5',
  bathroom: '#7fa5c9',
};

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function placeholderKey(roomId, flooringId, cabinetId, furnitureId) {
  return `${roomId}__${flooringId}__${cabinetId}__${furnitureId}`;
}

// Equirectangular (2:1) so it wraps correctly onto a sphere in the panorama
// viewer. The main config text sits at the front-facing yaw (x = W/2);
// faint compass labels are spaced around the full 360 so dragging the view
// visibly reveals different content, proving the wrap-around works.
function buildSvg({ roomLabel, flooringName, cabinetName, furnitureName, bg }) {
  const W = 2048;
  const H = 1024;
  const lines = [
    `ROOM: ${roomLabel.toUpperCase()}`,
    `FLOORING: ${flooringName.toUpperCase()}`,
    `KITCHEN: ${cabinetName.toUpperCase()}`,
    `FURNITURE: ${furnitureName.toUpperCase()}`,
  ];
  const lineHeight = 108;
  const startY = H / 2 - ((lines.length - 1) * lineHeight) / 2;
  const textEls = lines
    .map(
      (line, i) => `
      <text x="${W / 2}" y="${startY + i * lineHeight}" text-anchor="middle"
            font-family="system-ui, -apple-system, Segoe UI, sans-serif"
            font-size="68" font-weight="700" fill="#1a1a1a"
            dominant-baseline="middle">${escapeXml(line)}</text>`
    )
    .join('');

  const compassPoints = [
    { label: 'N', x: W / 2 },
    { label: 'E', x: W * 0.75 },
    { label: 'S', x: 0 },
    { label: 'S', x: W },
    { label: 'W', x: W * 0.25 },
  ];
  const compassEls = compassPoints
    .map(
      (p) => `
      <text x="${p.x}" y="${H * 0.12}" text-anchor="middle"
            font-family="system-ui, -apple-system, Segoe UI, sans-serif"
            font-size="40" font-weight="700" fill="#1a1a1a" opacity="0.35">${p.label}</text>`
    )
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}" />
  <line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" stroke="#1a1a1a" stroke-width="2" opacity="0.2" />
  ${compassEls}
  ${textEls}
</svg>`;
}

async function main() {
  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true, force: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  let count = 0;
  for (const room of ROOMS) {
    for (const flooring of FLOORING) {
      for (const cabinet of CABINETS) {
        for (const furniture of FURNITURE_BY_ROOM[room.id]) {
          const key = placeholderKey(room.id, flooring.id, cabinet.id, furniture.id);
          const svg = buildSvg({
            roomLabel: room.label,
            flooringName: flooring.name,
            cabinetName: cabinet.name,
            furnitureName: furniture.name,
            bg: ROOM_COLORS[room.id],
          });
          await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, `${key}.png`));
          count++;
        }
      }
    }
  }

  console.log(`Generated ${count} placeholder PNGs in ${path.relative(process.cwd(), OUT_DIR)}`);
  console.log(`Files: ${readdirSync(OUT_DIR).length}`);
}

main();
