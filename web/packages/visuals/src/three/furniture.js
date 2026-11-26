// Procedural furniture library. Every builder returns a Group standing on y = 0,
// centred on its footprint and facing +z; the plan's "rot" turns it from there.
import * as THREE from 'three';
import { box, cyl, mat, at, rng } from './kit.js';

const WOOD = '#a98459';
const DARK_WOOD = '#5a4334';
const WHITE = '#eceae5';
const BLACK = '#1b1c21';
const METAL = '#9a9fa8';

const group = (...children) => {
  const g = new THREE.Group();
  g.add(...children.flat().filter(Boolean));
  return g;
};

function rodX(r, len, material, seg = 12) {
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.rotateZ(Math.PI / 2);
  return new THREE.Mesh(geo, material);
}

function rodZ(rTop, rBottom, len, material, seg = 14) {
  const geo = new THREE.CylinderGeometry(rTop, rBottom, len, seg);
  geo.rotateX(Math.PI / 2);
  geo.translate(0, 0, len / 2);
  return new THREE.Mesh(geo, material);
}

function darker(hex, k = 0.75) {
  return `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
}

function legs(w, d, h, material, inset = 0.06, r = 0.022) {
  const out = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    out.push(at(cyl(r, r * 0.8, h, material, 10), sx * (w / 2 - inset), 0, sz * (d / 2 - inset)));
  }
  return out;
}

function seating(width, depth, color, cushions) {
  const fabric = mat(color, { rough: 1 });
  const dark = mat(darker(color, 0.82), { rough: 1 });
  const arm = 0.2;
  const inner = width - arm * 2;
  const parts = [
    ...legs(width, depth, 0.1, mat(BLACK, { rough: 0.5 }), 0.08),
    at(box(width, 0.2, depth, dark, { r: 0.05 }), 0, 0.1, 0),
    at(box(inner, 0.52, 0.24, dark, { r: 0.09 }), 0, 0.3, -depth / 2 + 0.12),
  ];
  for (const sx of [-1, 1]) parts.push(at(box(arm, 0.36, depth, dark, { r: 0.08 }), sx * (width / 2 - arm / 2), 0.3, 0));
  const cw = inner / cushions;
  for (let i = 0; i < cushions; i++) {
    const x = -inner / 2 + cw * (i + 0.5);
    parts.push(at(box(cw - 0.02, 0.17, depth - 0.3, fabric, { r: 0.06 }), x, 0.3, 0.1));
    const back = at(box(cw - 0.04, 0.36, 0.16, fabric, { r: 0.07 }), x, 0.46, -depth / 2 + 0.3);
    back.rotation.x = -0.14;
    parts.push(back);
  }
  return group(parts);
}

function chair(color = BLACK) {
  const m = mat(color, { rough: 0.7 });
  const back = at(box(0.42, 0.4, 0.04, m, { r: 0.02 }), 0, 0.47, -0.2);
  back.rotation.x = -0.1;
  return group(...legs(0.42, 0.42, 0.44, m, 0.04, 0.015), at(box(0.44, 0.05, 0.44, m, { r: 0.02 }), 0, 0.42, 0), back);
}

function doorLines(width, height, y, z, count, material) {
  const out = [];
  for (let i = 1; i < count; i++) out.push(at(box(0.008, height, 0.006, material, { r: 0 }), -width / 2 + (width / count) * i, y, z));
  return out;
}

export const FURNITURE_VARIANTS = {
  tv: ['console', 'wall'],
  vanity: ['cabinet', 'pedestal'],
  coffeeTable: ['modern', 'woodShelf'],
  sofa: ['pillowed', 'plain'],
  toilet: ['tank', 'concealed'],
};

const WALL_MOUNTED_TYPES = new Set(['wallShelf', 'showerHead', 'towelRail', 'showerCurtain']);

export function isWallMounted(item) {
  if (!item) return false;
  if (item.type === 'tv') return item.variant ? item.variant === 'wall' : item.wallMounted === true;
  return WALL_MOUNTED_TYPES.has(item.type);
}

const builders = {
  rug({ size = [2, 1.4], color = '#3b4a66' }) {
    const g = group(
      at(box(size[0], 0.016, size[1], mat(color, { rough: 1 }), { r: 0.006 }), 0, 0, 0),
      at(box(size[0] - 0.24, 0.018, size[1] - 0.24, mat(darker(color, 1.18), { rough: 1 }), { r: 0.006 }), 0, 0, 0),
    );
    g.userData.flat = true;
    return g;
  },

  sofa({ width = 2.2, color = '#8b93a7', variant, throwPillow }) {
    const g = seating(width, 0.95, color, width > 2 ? 3 : 2);
    const plain = variant ? variant === 'plain' : throwPillow === false;
    if (!plain) {
      const pillow = at(box(0.36, 0.36, 0.12, mat('#d9b98a', { rough: 1 }), { r: 0.05 }), -width / 2 + 0.42, 0.46, -0.1);
      pillow.rotation.set(-0.25, 0.3, 0.1);
      g.add(pillow);
    }
    return g;
  },

  pillow({ width = 0.38, color = '#d9b98a' }) {
    const cushion = at(box(width, width * 0.92, 0.12, mat(color, { rough: 1 }), { r: 0.05 }), 0, 0.01, 0);
    cushion.rotation.set(-0.2, 0.12, 0.04);
    return group(cushion);
  },

  armchair({ color = '#c28a5a' }) {
    return seating(0.92, 0.88, color, 1);
  },

  coffeeTable({ width = 1.1, depth = 0.58, height = 0.4, color = WOOD, variant, woodShelf = false }) {
    const wood = mat(color, { rough: 0.58 });
    const apron = mat(darker(color, 0.88), { rough: 0.65 });
    const shelfStyle = variant ? variant === 'woodShelf' : Boolean(woodShelf);
    if (shelfStyle) {
      const legH = height - 0.03;
      const legW = 0.036;
      const inset = 0.032;
      const sqLegs = [];
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        sqLegs.push(at(box(legW, legH, legW, wood, { r: 0.006 }), sx * (width / 2 - inset), 0, sz * (depth / 2 - inset)));
      }
      return group(
        at(box(width, 0.03, depth, wood, { r: 0.009 }), 0, legH, 0),
        at(box(width - 0.07, 0.036, depth - 0.07, apron, { r: 0 }), 0, legH - 0.036, 0),
        at(box(width - 0.055, 0.022, depth - 0.055, wood, { r: 0.005 }), 0, 0.08, 0),
        ...sqLegs,
      );
    }
    const topY = Math.max(0.16, height - 0.04);
    return group(
      at(box(width, 0.04, depth, wood, { r: 0.015 }), 0, topY, 0),
      at(box(width - 0.16, 0.02, Math.max(0.16, depth - 0.14), mat(BLACK, { rough: 0.5 }), { r: 0.008 }), 0, Math.min(0.14, topY * 0.4), 0),
      ...legs(width, depth, topY, mat(BLACK, { rough: 0.5 }), 0.07, 0.015),
      at(box(0.24, 0.035, 0.17, mat('#c9553f', { rough: 0.9 }), { r: 0.006 }), 0.22, topY + 0.04, 0.05),
      at(cyl(0.05, 0.04, 0.09, mat(WHITE, { rough: 0.4 })), -0.3, topY + 0.04, -0.08),
    );
  },

  tv({ width = 1.7, variant, wallMounted = false }) {
    const wall = variant ? variant === 'wall' : Boolean(wallMounted);
    const sw = width * 0.84;
    const sh = sw * 0.5625;
    const screen = new THREE.MeshBasicMaterial({ color: '#0d1320', toneMapped: false });
    if (wall) {
      const screenHeight = width * 0.5625;
      const bezel = 0.012;
      return group(
        // Low-profile VESA wall mount behind the slim OLED chassis.
        at(box(width * 0.38, screenHeight * 0.36, 0.024, mat('#24272f', { rough: 0.5, metal: 0.4 }), { r: 0.004 }), 0, screenHeight * 0.32, -0.022),
        at(box(width, screenHeight, 0.024, mat(BLACK, { rough: 0.35 }), { r: 0.006 }), 0, 0, 0),
        at(box(width - bezel * 2, screenHeight - bezel * 2 - 0.008, 0.005, screen, { r: 0 }), 0, bezel + 0.008, 0.013),
        at(box(width * 0.16, 0.01, 0.012, mat('#2d313b', { rough: 0.4, metal: 0.5 }), { r: 0.003 }), 0, -0.006, 0.004),
      );
    }
    return group(
      at(box(width, 0.36, 0.4, mat(DARK_WOOD, { rough: 0.6 }), { r: 0.015 }), 0, 0.1, 0),
      ...legs(width, 0.4, 0.1, mat(BLACK), 0.08, 0.015),
      ...doorLines(width, 0.3, 0.13, 0.2, 3, mat(BLACK)),
      at(box(sw + 0.03, sh + 0.03, 0.035, mat(BLACK, { rough: 0.4 }), { r: 0.008 }), 0, 0.72, -0.15),
      at(box(sw - 0.02, sh - 0.02, 0.01, screen, { r: 0 }), 0, 0.745, -0.129),
      at(box(0.5, 0.07, 0.09, mat('#2a2c33', { rough: 0.7 }), { r: 0.02 }), 0, 0.46, 0.05),
    );
  },

  cabinet({ width = 0.62, depth = 0.44, height = 0.94, color = WHITE, cubby = true }) {
    const body = mat(color, { rough: 0.65 });
    const toeKick = mat(color === WHITE ? '#d2cfc7' : darker(color, 0.88), { rough: 0.75 });
    const recess = mat(color === WHITE ? '#dad6ce' : darker(color, 0.92), { rough: 0.75 });
    const seam = mat(color === WHITE ? '#b6b4b0' : darker(color, 0.75));
    const steel = mat('#b4b7bc', { metal: 0.55, rough: 0.35 });
    const topH = 0.026;
    const cubbyH = cubby ? 0.23 : 0;
    const baseH = cubby ? height - cubbyH : height - topH;
    return group(
      // Lower cabinet with subtle toe-kick, doors, bar pulls, optional open top cubby, and top counter.
      at(box(width - 0.02, 0.05, depth - 0.04, toeKick, { r: 0 }), 0, 0, -0.01),
      at(box(width, baseH - 0.05, depth, body, { r: 0.008 }), 0, 0.05, 0),
      at(box(width + 0.01, topH, depth + 0.01, body, { r: 0.006 }), 0, height - topH, 0),
      cubby && at(box(width - 0.03, cubbyH - topH, 0.018, recess, { r: 0 }), 0, baseH, -depth / 2 + 0.012),
      ...[-1, 1].flatMap((side) => [
        cubby && at(box(0.023, cubbyH - topH, depth, body, { r: 0.004 }), side * (width / 2 - 0.0115), baseH, 0),
        at(box(0.012, 0.14, 0.012, steel, { r: 0.004 }), side * 0.038, baseH - 0.21, depth / 2 + 0.02),
        at(box(0.01, 0.01, 0.018, steel, { r: 0 }), side * 0.038, baseH - 0.195, depth / 2 + 0.009),
        at(box(0.01, 0.01, 0.018, steel, { r: 0 }), side * 0.038, baseH - 0.09, depth / 2 + 0.009),
      ]),
      ...doorLines(width, baseH - 0.09, 0.07, depth / 2 + 0.001, 2, seam),
    );
  },

  oven({ width = 0.54, depth = 0.38, height = 0.32 }) {
    const steel = mat('#b4b7bc', { metal: 0.55, rough: 0.35 });
    const dark = mat('#22242a', { rough: 0.45 });
    const glassDoor = mat('#14171e', { rough: 0.15, metal: 0.2 });
    const footH = 0.012;
    const dials = [0.234375, 0.484375, 0.734375].map((t) =>
      at(rodZ(0.017, 0.019, 0.02, dark, 14), width / 2 - 0.038, footH + height * t, depth / 2));
    return group(
      ...legs(width, depth, footH, dark, 0.04, 0.012),
      at(box(width, height, depth, steel, { r: 0.012 }), 0, footH, 0),
      at(box(width - 0.12, height - 0.1, 0.012, dark, { r: 0.006 }), -0.036, footH + 0.045, depth / 2),
      at(box(width - 0.16, height - 0.17, 0.006, glassDoor, { r: 0.004 }), -0.036, footH + 0.072, depth / 2 + 0.007),
      at(box(width - 0.16, 0.014, 0.014, steel, { r: 0.005 }), -0.036, footH + height - 0.078, depth / 2 + 0.024),
      ...[-1, 1].map((side) => at(box(0.012, 0.012, 0.02, steel, { r: 0 }), -0.036 + side * ((width - 0.2) / 2), footH + height - 0.077, depth / 2 + 0.012)),
      ...dials,
    );
  },

  airFryer({ width = 0.24, depth = 0.24, height = 0.25 }) {
    const steel = mat('#b4b7bc', { metal: 0.55, rough: 0.35 });
    const dark = mat('#22242a', { rough: 0.45 });
    return group(
      at(box(width, height, depth, dark, { r: 0.045 }), 0, 0, 0),
      at(box(width - 0.04, 0.006, depth - 0.04, mat('#343740', { metal: 0.4, rough: 0.4 }), { r: 0.003 }), 0, height - 0.002, 0),
      at(box(width - 0.03, 0.006, 0.006, steel, { r: 0 }), 0, height * 0.52, depth / 2 - 0.001),
      at(box(0.028, 0.095, 0.018, steel, { r: 0.006 }), 0, 0.03, depth / 2 + 0.012),
      ...[-0.03, 0.03].map((dy) => at(box(0.018, 0.014, 0.02, dark, { r: 0 }), 0, 0.07 + dy, depth / 2)),
    );
  },

  ovenStand({ width = 0.62, depth = 0.44, height = 0.94 }) {
    const ovenHeight = 0.32;
    return group(
      builders.cabinet({ width, depth, height }),
      at(builders.oven({ width: width - 0.08, depth: depth - 0.06, height: ovenHeight }), 0, height, 0),
      at(builders.airFryer({}), 0, height + ovenHeight + 0.012, 0),
    );
  },

  wallShelf({ width = 0.66, depth = 0.28, color = WHITE }) {
    const shelfTop = 0.028;
    const bracket = mat(color === WHITE ? '#d5d2ca' : darker(color, 0.88), { rough: 0.6 });
    return group(
      // Wall shelf + two slim underside L-brackets at the back edge.
      at(box(width, shelfTop, depth, mat(color, { rough: 0.6 }), { r: 0.006 }), 0, 0, 0),
      ...[-width * 0.34, width * 0.34].flatMap((x) => [
        at(box(0.018, 0.09, 0.016, bracket, { r: 0 }), x, -0.09, -depth / 2 + 0.008),
        at(box(0.018, 0.014, depth * 0.62, bracket, { r: 0 }), x, -0.014, -depth * 0.18),
      ]),
    );
  },

  kettle({ width = 0.17 }) {
    const steel = mat('#c2c5ca', { metal: 0.58, rough: 0.32 });
    const dark = mat('#26282e', { rough: 0.5 });
    const spout = at(box(0.032, 0.045, 0.026, steel, { r: 0.005 }), -0.072, 0.155, 0);
    spout.rotation.z = 0.42;
    const g = group(
      at(cyl(0.084, 0.086, 0.022, dark, 20), 0, 0, 0),
      at(cyl(0.062, 0.08, 0.185, steel, 20), 0, 0.022, 0),
      at(cyl(0.062, 0.064, 0.014, dark, 20), 0, 0.207, 0),
      at(box(0.03, 0.01, 0.016, steel, { r: 0.003 }), 0, 0.221, 0),
      spout,
      at(box(0.042, 0.014, 0.02, dark, { r: 0.004 }), 0.07, 0.175, 0),
      at(box(0.016, 0.115, 0.022, dark, { r: 0.006 }), 0.086, 0.068, 0),
      at(box(0.036, 0.014, 0.02, dark, { r: 0.004 }), 0.072, 0.064, 0),
    );
    if (width !== 0.17) g.scale.setScalar(width / 0.17);
    return g;
  },

  coffeeGrinder({ width = 0.1 }) {
    const steel = mat('#c2c5ca', { metal: 0.58, rough: 0.32 });
    const dark = mat('#26282e', { rough: 0.5 });
    const g = group(
      at(cyl(0.045, 0.048, 0.135, dark, 18), 0, 0, 0),
      at(cyl(0.046, 0.046, 0.014, steel, 18), 0, 0.135, 0),
    );
    if (width !== 0.1) g.scale.setScalar(width / 0.1);
    return g;
  },

  coffeeBag({ width = 0.084 }) {
    const g = group(
      at(box(0.084, 0.125, 0.052, mat('#cbb799', { rough: 0.9 }), { r: 0.006 }), 0, 0, 0),
      at(box(0.062, 0.048, 0.004, mat('#3d332a', { rough: 0.8 }), { r: 0 }), 0, 0.052, 0.027),
    );
    if (width !== 0.084) g.scale.setScalar(width / 0.084);
    return g;
  },

  coffeeShelf({ width = 0.66, depth = 0.28 }) {
    const shelfTop = 0.028;
    return group(
      builders.wallShelf({ width, depth }),
      at(builders.kettle({}), 0.16, shelfTop, 0),
      at(builders.coffeeGrinder({}), -0.19, shelfTop, 0.015),
      at(builders.coffeeBag({}), -0.045, shelfTop, -0.016),
    );
  },

  sideboard({ width = 1.6 }) {
    return group(
      ...legs(width, 0.42, 0.16, mat(BLACK), 0.07, 0.015),
      at(box(width, 0.6, 0.42, mat(WOOD, { rough: 0.6 }), { r: 0.015 }), 0, 0.16, 0),
      ...doorLines(width, 0.54, 0.19, 0.21, 4, mat(DARK_WOOD)),
      at(cyl(0.07, 0.05, 0.26, mat('#3d6b8c', { rough: 0.35 })), -width / 2 + 0.3, 0.76, 0),
      at(box(0.3, 0.05, 0.2, mat('#d8c9a8', { rough: 0.9 }), { r: 0.006 }), width / 2 - 0.35, 0.76, 0),
    );
  },

  diningSet({ width = 1.8, chairs = 6 }) {
    const depth = 0.95;
    const wood = mat('#b48d63', { rough: 0.55 });
    const g = group(
      at(box(width, 0.05, depth, wood, { r: 0.02 }), 0, 0.71, 0),
      ...legs(width, depth, 0.71, mat(BLACK, { rough: 0.5 }), 0.1, 0.028),
      at(cyl(0.16, 0.1, 0.07, mat(WHITE, { rough: 0.4 })), 0, 0.76, 0),
    );
    const perSide = Math.ceil(chairs / 2);
    for (let i = 0; i < chairs; i++) {
      const side = i < perSide ? 1 : -1;
      const k = i < perSide ? i : i - perSide;
      const n = i < perSide ? perSide : chairs - perSide;
      const c = chair('#2b2e37');
      c.position.set(-width / 2 + (width / n) * (k + 0.5), 0, side * (depth / 2 + 0.12));
      c.rotation.y = side > 0 ? Math.PI : 0;
      g.add(c);
    }
    return g;
  },

  island({ width = 2.0, stools = 3 }) {
    const g = group(
      at(box(width - 0.12, 0.88, 0.62, mat('#39424f', { rough: 0.7 }), { r: 0.015 }), 0, 0, -0.04),
      at(box(width, 0.05, 0.86, mat('#e9e7e2', { rough: 0.3 }), { r: 0.015 }), 0, 0.88, 0),
    );
    for (let i = 0; i < stools; i++) {
      const x = -width / 2 + (width / stools) * (i + 0.5);
      g.add(group(
        at(cyl(0.16, 0.16, 0.012, mat(BLACK, { rough: 0.4 })), x, 0, 0.62),
        at(cyl(0.015, 0.015, 0.64, mat(METAL, { rough: 0.3, metal: 0.8 }), 10), x, 0, 0.62),
        at(cyl(0.17, 0.15, 0.05, mat('#c28a5a', { rough: 0.9 })), x, 0.64, 0.62),
      ));
    }
    return g;
  },

  kitchen({ width = 3, upper = true, depth, height = 0.9 }) {
    const counterHeight = 0.04;
    const cabinetHeight = height - counterHeight;
    const cabinetDepth = depth == null ? 0.6 : depth - 0.03;
    const counterDepth = depth ?? 0.63;
    const counterWidth = depth == null ? width + 0.02 : width;
    const front = mat('#e4e1da', { rough: 0.6 });
    const seam = mat('#b9b6ae');
    const n = Math.max(2, Math.round(width / 0.6));
    const g = group(
      at(box(width, cabinetHeight, cabinetDepth, front, { r: 0.008 }), 0, 0, 0),
      ...doorLines(width, cabinetHeight - 0.08, 0.06, cabinetDepth / 2, n, seam),
      at(box(counterWidth, counterHeight, counterDepth, mat('#33363d', { rough: 0.35 }), { r: 0.008 }), 0, cabinetHeight, depth == null ? 0.005 : 0),
      at(box(0.58, 0.012, 0.5, mat('#0c0d10', { rough: 0.15 }), { r: 0 }), -width / 4, height, 0),
      at(box(0.5, 0.012, 0.38, mat(METAL, { rough: 0.3, metal: 0.9 }), { r: 0 }), width / 4, height, 0.02),
      at(cyl(0.015, 0.015, 0.24, mat(METAL, { rough: 0.25, metal: 0.9 }), 10), width / 4, height, -0.22),
    );
    if (upper) {
      g.add(
        at(box(width, 0.72, 0.35, front, { r: 0.008 }), 0, 1.48, -0.125),
        ...doorLines(width, 0.66, 1.51, 0.05, n, seam),
        at(box(0.7, 0.1, 0.42, mat('#2f3239', { rough: 0.4, metal: 0.4 }), { r: 0.008 }), -width / 4, 1.42, -0.09),
      );
    }
    return g;
  },

  fridge() {
    const body = mat('#c5c9d0', { rough: 0.35, metal: 0.5 });
    return group(
      at(box(0.7, 1.92, 0.68, body, { r: 0.025 }), 0, 0, 0),
      at(box(0.66, 0.008, 0.005, mat('#7c8088'), { r: 0 }), 0, 1.25, 0.34),
      at(box(0.02, 0.5, 0.03, mat('#70747c', { metal: 0.7, rough: 0.3 }), { r: 0.008 }), -0.26, 1.34, 0.35),
      at(box(0.02, 0.4, 0.03, mat('#70747c', { metal: 0.7, rough: 0.3 }), { r: 0.008 }), -0.26, 0.76, 0.35),
    );
  },

  bed({ width = 1.6, color = '#7f8fb5', depth: frameDepth }) {
    const depth = frameDepth === undefined ? 2.1 : frameDepth - 0.04;
    const headboardZ = frameDepth === undefined ? -depth / 2 : -frameDepth / 2 + 0.05;
    const linen = mat('#f1efea', { rough: 1 });
    const g = group(
      at(box(width + 0.1, 0.26, depth + 0.04, mat(DARK_WOOD, { rough: 0.7 }), { r: 0.03 }), 0, 0.04, 0),
      at(box(width + 0.16, 1.02, 0.1, mat(darker(color, 0.6), { rough: 1 }), { r: 0.04 }), 0, 0, headboardZ),
      at(box(width, 0.2, depth - 0.06, linen, { r: 0.07 }), 0, 0.28, 0.02),
      at(box(width + 0.05, 0.13, depth * 0.63, mat(color, { rough: 1 }), { r: 0.06 }), 0, 0.4, depth * 0.17),
      at(box(width + 0.06, 0.05, 0.3, mat(darker(color, 0.8), { rough: 1 }), { r: 0.02 }), 0, 0.5, depth * 0.36),
    );
    for (const sx of [-1, 1]) {
      const pillow = at(box(width / 2 - 0.14, 0.13, 0.42, linen, { r: 0.06 }), sx * width / 4, 0.46, -depth / 2 + 0.36);
      pillow.rotation.x = -0.18;
      g.add(pillow);
    }
    return g;
  },

  nightstand() {
    return group(
      at(box(0.46, 0.44, 0.4, mat(WOOD, { rough: 0.6 }), { r: 0.015 }), 0, 0.06, 0),
      ...legs(0.46, 0.4, 0.06, mat(BLACK), 0.06, 0.014),
      at(box(0.4, 0.006, 0.005, mat(DARK_WOOD), { r: 0 }), 0, 0.28, 0.2),
    );
  },

  dresser({ width = 1.3, depth = 0.45, height }) {
    const bodyHeight = height == null ? 0.74 : height - 0.1;
    const g = group(
      ...legs(width, depth, 0.1, mat(BLACK), 0.06, 0.015),
      at(box(width, bodyHeight, depth, mat(WHITE, { rough: 0.6 }), { r: 0.015 }), 0, 0.1, 0),
      height == null && at(cyl(0.09, 0.07, 0.18, mat('#c9a15e', { rough: 0.4 })), width / 2 - 0.3, 0.84, 0),
    );
    for (let i = 1; i < 3; i++) g.add(at(box(width - 0.06, 0.006, 0.005, mat('#b9b6ae'), { r: 0 }), 0, 0.1 + bodyHeight / 3 * i, depth / 2 + 0.001));
    return g;
  },

  plant({ height = 1.2 }) {
    const rand = rng(Math.round(height * 1000));
    const leaves = [mat('#3f7d52', { rough: 0.9 }), mat('#4f9462', { rough: 0.9 }), mat('#35694a', { rough: 0.9 })];
    const g = group(
      at(cyl(0.17, 0.12, 0.3, mat('#d7d0c4', { rough: 0.8 })), 0, 0, 0),
      at(cyl(0.15, 0.15, 0.02, mat('#3a2c22', { rough: 1 })), 0, 0.285, 0),
      at(cyl(0.015, 0.02, height * 0.55, mat('#6b4a33', { rough: 1 }), 8), 0, 0.3, 0),
    );
    const count = Math.round(6 + height * 5);
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const y = 0.5 + t * (height - 0.62);
      const spread = 0.28 * Math.sin(Math.PI * (0.25 + t * 0.7));
      const a = rand() * Math.PI * 2;
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(0.13 + rand() * 0.1, 1), leaves[i % 3]);
      blob.position.set(Math.cos(a) * spread * rand(), y, Math.sin(a) * spread * rand());
      blob.scale.y = 0.75 + rand() * 0.3;
      g.add(blob);
    }
    return g;
  },

  vanity({ width = 1.0, variant, pedestal = false }) {
    const mirror = new THREE.MeshStandardMaterial({ color: '#b9c7dc', roughness: 0.12, metalness: 0.9 });
    const ceramic = mat(WHITE, { rough: 0.22 });
    const chrome = mat(METAL, { rough: 0.2, metal: 0.9 });
    const isPedestal = variant ? variant === 'pedestal' : Boolean(pedestal);
    if (isPedestal) {
      const spout = at(cyl(0.009, 0.009, 0.115, chrome, 10), 0, 1.015, -0.175);
      spout.rotation.x = Math.PI / 2.15;
      const lever = at(cyl(0.006, 0.006, 0.055, chrome, 8), 0.012, 0.93, -0.175);
      lever.rotation.z = -0.85;
      return group(
        // Flared porcelain pedestal base + tapered column + sculpted rounded basin.
        at(cyl(0.105, 0.145, 0.08, ceramic, 20), 0, 0, 0),
        at(cyl(0.085, 0.105, 0.72, ceramic, 20), 0, 0.08, 0),
        at(box(width + 0.02, 0.075, 0.46, ceramic, { r: 0.032 }), 0, 0.79, 0),
        at(box(width - 0.1, 0.02, 0.28, mat('#d9dde2', { rough: 0.28 }), { r: 0.008 }), 0, 0.85, 0.03),
        at(cyl(0.022, 0.022, 0.006, chrome, 14), 0, 0.869, 0.02),
        // Gooseneck faucet + side mixer lever.
        at(cyl(0.022, 0.026, 0.015, chrome, 12), 0, 0.865, -0.175),
        at(cyl(0.011, 0.012, 0.145, chrome, 10), 0, 0.88, -0.175),
        spout,
        lever,
        // Wall-mounted medicine cabinet with framed mirror door + chrome pull.
        at(box(width * 0.88, 0.62, 0.125, mat(WHITE, { rough: 0.5 }), { r: 0.01 }), 0, 1.19, -0.235),
        at(box(width * 0.8, 0.55, 0.02, mirror, { r: 0.006 }), 0, 1.225, -0.17),
        at(box(0.01, 0.075, 0.014, chrome, { r: 0.003 }), width * 0.36, 1.32, -0.16),
      );
    }
    return group(
      at(box(width, 0.62, 0.48, mat(WOOD, { rough: 0.6 }), { r: 0.012 }), 0, 0.2, 0),
      ...doorLines(width, 0.56, 0.23, 0.24, 2, mat(DARK_WOOD)),
      at(box(width + 0.03, 0.04, 0.5, ceramic, { r: 0.012 }), 0, 0.82, 0),
      at(cyl(0.19, 0.15, 0.1, ceramic), 0, 0.86, 0.02),
      at(cyl(0.012, 0.012, 0.2, chrome, 10), 0, 0.86, -0.18),
      at(box(width * 0.82, 0.8, 0.025, mirror, { r: 0.01 }), 0, 1.08, -0.225),
    );
  },

  bathtub() {
    return group(
      at(box(1.7, 0.56, 0.78, mat(WHITE, { rough: 0.25 }), { r: 0.1 }), 0, 0, 0),
      at(box(1.5, 0.02, 0.58, mat('#9fd3ec', { rough: 0.1, emissive: '#1d4f6b', emissiveIntensity: 0.25 }), { r: 0.009 }), 0, 0.545, 0),
      at(cyl(0.014, 0.014, 0.2, mat(METAL, { rough: 0.2, metal: 0.9 }), 10), -0.74, 0.56, 0),
    );
  },

  toilet({ variant, tank = true }) {
    const c = mat(WHITE, { rough: 0.25 });
    const bowl = at(cyl(0.19, 0.13, 0.4, c), 0, 0, 0.1);
    bowl.scale.z = 1.25;
    const lid = at(cyl(0.2, 0.2, 0.03, c), 0, 0.4, 0.1);
    lid.scale.z = 1.25;
    const hasTank = variant ? variant !== 'concealed' : tank !== false;
    return group(hasTank && at(box(0.38, 0.78, 0.17, c, { r: 0.03 }), 0, 0, -0.24), bowl, lid);
  },

  desk({ width = 1.4, depth = 0.65, height = 0.76 }) {
    const topThickness = 0.04;
    const legHeight = height - topThickness;
    const monitorZ = -depth / 2 + 0.145;
    const c = chair('#2b2e37');
    c.position.z = depth / 2 + 0.175;
    c.rotation.y = Math.PI;
    return group(
      at(box(width, topThickness, depth, mat(WOOD, { rough: 0.55 }), { r: 0.012 }), 0, legHeight, 0),
      ...legs(width, depth, legHeight, mat(BLACK), 0.06, 0.02),
      at(box(0.56, 0.34, 0.025, mat(BLACK, { rough: 0.3 }), { r: 0.008 }), 0, height + 0.1, monitorZ),
      at(box(0.2, 0.1, 0.12, mat(BLACK), { r: 0.008 }), 0, height, monitorZ),
      c,
    );
  },

  wardrobe({ width = 1.6, height = 2.1, color = WHITE }) {
    const doors = Math.max(2, Math.round(width / 0.55));
    const seam = mat(color === WHITE ? '#b9b6ae' : darker(color, 0.72));
    const trim = mat(darker(color, 0.88), { rough: 0.65 });
    const handle = mat(color === WHITE ? '#767a82' : '#3a342f', { metal: 0.5, rough: 0.35 });
    const handles = [];
    const dw = width / doors;
    for (let i = 0; i < doors; i++) {
      const center = -width / 2 + dw * (i + 0.5);
      const side = i % 2 === 0 ? 1 : -1;
      const hx = center + side * Math.min(dw * 0.34, 0.16);
      handles.push(at(box(0.014, 0.2, 0.018, handle, { r: 0.005 }), hx, height * 0.48, 0.308));
    }
    return group(
      at(box(width - 0.03, 0.06, 0.56, trim, { r: 0 }), 0, 0, -0.015),
      at(box(width, height - 0.08, 0.6, mat(color, { rough: 0.6 }), { r: 0.012 }), 0, 0.06, 0),
      at(box(width + 0.025, 0.024, 0.62, trim, { r: 0.006 }), 0, height - 0.024, 0),
      ...doorLines(width, height - 0.12, 0.08, 0.301, doors, seam),
      ...handles,
    );
  },

  glassCupboard({ width = 1.13, height = 1.7, color = '#402850' }) {
    const depth = 0.32;
    const frame = mat(color, { rough: 0.52 });
    const crown = mat(darker(color, 0.85), { rough: 0.55 });
    const interior = mat('#c8c2b6', { rough: 0.85 });
    const glass = mat('#b6c4c6', { rough: 0.22, metal: 0.1, opacity: 0.34 });
    const knob = mat('#cab896', { metal: 0.62, rough: 0.32 });
    const lower = height * 0.34;
    const baseH = 0.055;
    const bodyTop = height - 0.03;
    const muntinY = lower + (bodyTop - lower) * 0.5;
    return group(
      // Toe-kick base + top crown molding cap.
      at(box(width - 0.03, baseH, depth - 0.03, crown, { r: 0 }), 0, 0, -0.01),
      at(box(width + 0.04, 0.03, depth + 0.03, crown, { r: 0.007 }), 0, bodyTop, 0.005),
      // Lighter interior backing & shelves so the glass upper doors show real depth.
      at(box(width - 0.04, bodyTop - baseH - 0.02, 0.018, interior, { r: 0 }), 0, baseH + 0.01, -depth / 2 + 0.02),
      at(box(width, bodyTop - baseH, 0.016, frame, { r: 0 }), 0, baseH, -depth / 2 + 0.008),
      ...[baseH, lower, lower + (bodyTop - lower) * 0.34, lower + (bodyTop - lower) * 0.67, bodyTop - 0.024].map((y) =>
        at(box(width - 0.02, 0.022, depth - 0.03, y === baseH || y > bodyTop - 0.04 ? frame : interior, { r: 0 }), 0, y, -0.008)),
      ...[-1, 1].flatMap(side => [
        at(box(0.034, bodyTop - baseH, depth, frame, { r: 0.004 }), side * (width / 2 - 0.017), baseH, 0),
        // Upper glazed door pane + thin horizontal muntin bar.
        at(box(width / 2 - 0.06, bodyTop - lower - 0.07, 0.01, glass, { r: 0 }), side * width / 4, lower + 0.025, 0.146),
        at(box(width / 2 - 0.05, 0.016, 0.018, frame, { r: 0 }), side * width / 4, muntinY, 0.15),
        // Door stiles & rails + lower solid panel.
        at(box(width / 2 - 0.024, lower - baseH, 0.024, frame, { r: 0.004 }), side * width / 4, baseH, 0.148),
        at(box(width / 2 - 0.024, 0.034, 0.024, frame, { r: 0.004 }), side * width / 4, bodyTop - 0.034, 0.148),
        at(box(0.028, bodyTop - baseH, 0.024, frame, { r: 0.004 }), side * 0.018, baseH, 0.148),
        // Contrasting brushed-brass knobs.
        at(rodZ(0.007, 0.008, 0.016, knob, 10), side * 0.038, height * 0.52, 0.158),
        at(new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 8), knob), side * 0.038, height * 0.52, 0.178),
      ]),
    );
  },

  bookshelf({ width = 1.0, height = 1.8 }) {
    const rand = rng(Math.round(width * 100 + height * 7));
    const wood = mat(WOOD, { rough: 0.6 });
    const g = group(at(box(width, height, 0.04, wood, { r: 0 }), 0, 0, -0.14));
    for (const sx of [-1, 1]) g.add(at(box(0.03, height, 0.32, wood, { r: 0 }), sx * (width / 2 - 0.015), 0, 0));
    const shelves = Math.round(height / 0.38);
    const colors = ['#c9553f', '#3d6b8c', '#d8c9a8', '#4f9462', '#8b93a7', '#d9b98a'];
    for (let i = 0; i <= shelves; i++) {
      const y = (height - 0.03) * (i / shelves);
      g.add(at(box(width, 0.03, 0.32, wood, { r: 0 }), 0, y, 0));
      if (i === shelves) break;
      let x = -width / 2 + 0.06;
      while (x < width / 2 - 0.12) {
        const bw = 0.03 + rand() * 0.04;
        const bh = 0.2 + rand() * 0.1;
        g.add(at(box(bw, bh, 0.2, mat(colors[Math.floor(rand() * colors.length)], { rough: 0.9 }), { r: 0 }), x + bw / 2, y + 0.03, 0));
        x += bw + 0.004;
        if (rand() < 0.12) x += 0.12;
      }
    }
    return g;
  },

  shoeRack() {
    const rack = mat('#a69e95', { rough: 0.55, metal: 0.25 });
    const sole = mat('#d9d6cf', { rough: 0.8 });
    const uppers = [mat('#3d3a39', { rough: 0.85 }), mat('#554a42', { rough: 0.85 })];
    return group(
      ...legs(0.5, 0.28, 0.32, rack, 0.025, 0.012),
      ...[0.06, 0.24].flatMap((y, tier) => [
        // Two slatted shelf rails per tier.
        at(box(0.47, 0.016, 0.022, rack, { r: 0.004 }), 0, y, -0.075),
        at(box(0.47, 0.016, 0.022, rack, { r: 0.004 }), 0, y, 0.075),
        ...[-0.16, -0.075, 0.075, 0.16].flatMap((x, idx) => {
          const upper = uppers[(tier + (idx >= 2 ? 1 : 0)) % uppers.length];
          return [
            at(box(0.068, 0.014, 0.19, sole, { r: 0.005 }), x, y + 0.016, 0),
            at(box(0.064, 0.04, 0.16, upper, { r: 0.016 }), x, y + 0.028, -0.01),
            at(box(0.06, 0.024, 0.07, upper, { r: 0.012 }), x, y + 0.056, -0.045),
          ];
        }),
      ]),
    );
  },

  foldingDoor({ width = 0.14 }, { interiorWallHeight }) {
    const height = Math.min(1.98, interiorWallHeight);
    const panel = mat(WHITE, { rough: 0.65 });
    const hinge = mat('#cbc7be', { rough: 0.7 });
    const pull = mat(METAL, { metal: 0.7, rough: 0.3 });
    const parts = [];
    for (let i = 0; i < 4; i++) {
      const x = (i - 1.5) * width / 4;
      const z = (i % 2) * 0.026;
      parts.push(at(box(width / 4 - 0.004, height, 0.052, panel, { r: 0.004 }), x, 0, z));
      if (i > 0) parts.push(at(box(0.005, height - 0.04, 0.03, hinge, { r: 0 }), x - width / 8, 0.02, 0.013));
    }
    parts.push(at(box(0.01, 0.12, 0.018, pull, { r: 0.004 }), width / 2 + 0.003, Math.min(height * 0.55, 0.98), 0.026));
    return group(parts);
  },

  towelRail() {
    const chrome = mat('#b8bec7', { metal: 0.75, rough: 0.25 });
    const towel = mat('#d6cbbd', { rough: 0.96 });
    const stripe = mat('#b8ab9b', { rough: 0.96 });
    return group(
      ...[-0.16, 0.16].flatMap((x) => [
        at(box(0.024, 0.024, 0.01, chrome, { r: 0.004 }), x, 0.908, 0.005),
        at(box(0.012, 0.012, 0.055, chrome, { r: 0.003 }), x, 0.914, 0.032),
      ]),
      at(rodX(0.009, 0.36, chrome, 12), 0, 0.92, 0.056),
      at(rodX(0.018, 0.21, towel, 12), 0, 0.92, 0.056),
      at(box(0.21, 0.27, 0.018, towel, { r: 0.008 }), 0, 0.65, 0.068),
      at(box(0.21, 0.24, 0.016, towel, { r: 0.007 }), 0, 0.68, 0.044),
      at(box(0.212, 0.018, 0.02, stripe, { r: 0 }), 0, 0.69, 0.068),
    );
  },

  showerHead() {
    const chrome = mat('#b4bac4', { metal: 0.78, rough: 0.24 });
    const face = mat('#4a4f58', { rough: 0.6, metal: 0.3 });
    const arm = cyl(0.011, 0.011, 0.25, chrome, 10);
    arm.rotation.x = Math.PI / 2.2;
    const disc = cyl(0.088, 0.076, 0.022, chrome, 20);
    disc.rotation.x = 0.22;
    const nozzles = cyl(0.072, 0.072, 0.006, face, 18);
    nozzles.rotation.x = 0.22;
    return group(
      at(rodZ(0.036, 0.036, 0.014, chrome, 16), 0, 0.03, 0),
      at(arm, 0, 0.03, 0.012),
      at(cyl(0.011, 0.011, 0.045, chrome, 10), 0, 0.026, 0.256),
      at(disc, 0, 0.008, 0.256),
      at(nozzles, 0, 0.004, 0.257),
    );
  },

  showerCurtain({ width = 1.34 }) {
    const fabric = mat('#2f3137', { rough: 0.96 });
    const hem = mat('#25272d', { rough: 0.96 });
    const chrome = mat('#b8bec7', { metal: 0.75, rough: 0.26 });
    const folds = 12;
    const span = width * 0.58;
    const pleat = span / folds;
    const rings = [];
    for (let i = 0; i < 6; i++) {
      const rx = -width / 2 + 0.04 + (span - 0.08) * (i / 5);
      rings.push(at(box(0.008, 0.044, 0.034, chrome, { r: 0.004 }), rx, 1.915, 0));
    }
    return group(
      at(rodX(0.012, width, chrome, 12), 0, 1.945, 0),
      ...[-width / 2 + 0.006, width / 2 - 0.006].map((x) =>
        at(rodX(0.024, 0.012, chrome, 12), x, 1.945, 0)),
      ...rings,
      ...Array.from({ length: folds }, (_, i) => {
        const x = -width / 2 + (i + 0.5) * pleat;
        const z = i % 2 ? 0.014 : -0.014;
        return at(box(pleat + 0.008, 1.74, 0.024, i % 2 ? fabric : hem, { r: 0.008 }), x, 0.17, z);
      }),
    );
  },

  // A straight flight up to the floor above: you step on at the front (+z) and climb towards the back.
  stairs({ width = 1, depth = 2.8, height = 2.9 }) {
    const steps = Math.max(3, Math.round(height / 0.18));
    const rise = height / steps;
    const run = depth / steps;
    const body = mat('#d9d4cb', { rough: 0.9 });
    const tread = mat(WOOD, { rough: 0.6 });
    const g = new THREE.Group();
    for (let i = 0; i < steps; i++) {
      const z = depth / 2 - run * (i + 0.5);
      g.add(at(box(width, rise * i + rise - 0.03, run, body, { r: 0 }), 0, 0, z));
      g.add(at(box(width + 0.02, 0.03, run + 0.02, tread, { r: 0.008 }), 0, rise * (i + 1) - 0.03, z));
    }
    // A handrail along the open side.
    const rail = mat(BLACK, { rough: 0.5 });
    const slope = Math.atan2(height, depth);
    const length = Math.hypot(height, depth);
    const bar = at(box(0.04, 0.04, length, rail, { r: 0.015 }), width / 2 - 0.03, height / 2 + 0.9, 0);
    bar.rotation.x = slope;
    g.add(bar);
    for (const t of [0.1, 0.5, 0.9]) {
      g.add(at(box(0.025, 0.9, 0.025, rail, { r: 0 }), width / 2 - 0.03, height * t, depth / 2 - depth * t));
    }
    return g;
  },
};

export const FURNITURE_TYPES = Object.keys(builders);

// Approximate [width, depth] of each piece, for the 2D plan editor.
export function footprint(item) {
  const w = item.width;
  switch (item.type) {
    case 'rug': return item.size || [2, 1.4];
    case 'sofa': return [w || 2.2, 0.95];
    case 'pillow': return [w || 0.38, 0.16];
    case 'armchair': return [0.92, 0.88];
    case 'coffeeTable': return [w || 1.1, item.depth || 0.58];
    case 'cabinet': return [w || 0.62, item.depth || 0.44];
    case 'oven': return [w || 0.54, item.depth || 0.38];
    case 'airFryer': return [w || 0.24, item.depth || 0.24];
    case 'ovenStand': return [w || 0.62, item.depth || 0.44];
    case 'wallShelf': return [w || 0.66, item.depth || 0.28];
    case 'kettle': return [w || 0.17, w || 0.17];
    case 'coffeeGrinder': return [w || 0.1, w || 0.1];
    case 'coffeeBag': return [w || 0.084, w ? w * (0.052 / 0.084) : 0.052];
    case 'coffeeShelf': return [w || 0.66, item.depth || 0.28];
    case 'tv': return [w || 1.7, isWallMounted(item) ? 0.055 : 0.4];
    case 'sideboard': return [w || 1.6, 0.42];
    case 'diningSet': return [w || 1.8, 1.9];
    case 'island': return [w || 2, 1.1];
    case 'kitchen': return [w || 3, item.depth || 0.62];
    case 'fridge': return [0.7, 0.68];
    case 'bed': return [(w || 1.6) + 0.1, item.depth || 2.14];
    case 'nightstand': return [0.46, 0.4];
    case 'dresser': return [w || 1.3, item.depth || 0.45];
    case 'shoeRack': return [0.5, 0.28];
    case 'foldingDoor': return [w || 0.14, 0.09];
    case 'towelRail': return [0.32, 0.09];
    case 'showerHead': return [0.17, 0.33];
    case 'showerCurtain': return [w || 1.34, 0.05];
    case 'plant': return [0.45, 0.45];
    case 'vanity': return [w || 1, 0.5];
    case 'bathtub': return [1.7, 0.78];
    case 'toilet': return [0.4, 0.66];
    case 'desk': return [w || 1.4, item.depth || 0.65];
    case 'wardrobe': return [w || 1.6, 0.6];
    case 'glassCupboard': return [w || 1.13, 0.32];
    case 'bookshelf': return [w || 1, 0.32];
    case 'stairs': return [w || 1, item.depth || 2.8];
    default: return [0.6, 0.6];
  }
}

// Top-surface height in metres above `item.y || 0` for any support piece, or null for non-supports.
export function surfaceHeight(item) {
  switch (item?.type) {
    case 'cabinet': return item.height ?? 0.94;
    case 'oven': return (item.height ?? 0.32) + 0.012;
    case 'wallShelf': return 0.028;
    case 'sofa':
    case 'armchair': return 0.47;
    case 'bed': return 0.48;
    case 'coffeeTable': return item.height ?? 0.4;
    case 'sideboard':
    case 'diningSet': return 0.76;
    case 'island': return 0.93;
    case 'kitchen': return item.height ?? 0.9;
    case 'fridge': return 1.92;
    case 'nightstand': return 0.5;
    case 'dresser': return item.height ?? 0.84;
    case 'desk': return item.height ?? 0.76;
    case 'bookshelf': return item.height ?? 1.8;
    case 'wardrobe': return item.height ?? 2.1;
    case 'glassCupboard': return item.height ?? 1.7;
    case 'tv': return isWallMounted(item) ? null : 0.46;
    case 'pillow':
    case 'airFryer':
    case 'kettle':
    case 'coffeeGrinder':
    case 'coffeeBag':
    case 'rug':
    case 'plant':
    case 'bathtub':
    case 'toilet':
    case 'stairs':
    case 'shoeRack':
    case 'foldingDoor':
    case 'towelRail':
    case 'showerHead':
    case 'showerCurtain':
    default: return null;
  }
}

export function buildFurniture(items, { interiorWallHeight = Infinity } = {}) {
  const context = { interiorWallHeight };
  const root = new THREE.Group();
  for (const item of items) {
    const make = builders[item.type];
    if (!make || !Array.isArray(item.pos)) {
      console.warn(`[plan] skipping furniture of unknown type "${item.type}"`);
      continue;
    }
    const g = make(item, context);
    g.position.set(item.pos[0], item.y || 0, item.pos[1]);
    g.rotation.y = THREE.MathUtils.degToRad(item.rot || 0);
    const flat = g.userData.flat;
    g.traverse((o) => {
      if (o.isMesh) { o.castShadow = !flat; o.receiveShadow = true; }
    });
    root.add(g);
  }
  return root;
}
