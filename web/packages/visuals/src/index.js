// Pure floor-plan model and renderer; no native bridge or device transport.
export { ConfigError, LIGHT_KINDS, LINK_FIELDS, SERVICES, FLOOR_KINDS, WINDOW_SASHES, SLAB, levelsOf, linkOf, isLinked, normalize } from './config.js';
export { STAGE_BG, createWorld } from './three/world.js';
export { FURNITURE_TYPES, FURNITURE_VARIANTS, footprint, surfaceHeight, isWallMounted } from './three/furniture.js';
