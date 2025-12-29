// commands/demos/registry.js
import { TABLE_DEMO } from './table.js';
import { CHAIR_DEMO } from './chair.js';
import { HOUSE_DEMO } from './house.js';
import { BOOKSHELF_DEMO } from './bookshelf.js';
import { MUG_DEMO } from './mug.js';
import { SNOWMAN_DEMO } from './snowman.js';
import { WHEEL_DEMO } from './wheel.js';
import { BRIDGE_DEMO } from './bridge.js';
import { CAR_DEMO } from './car.js';
import { SHIP_DEMO } from './ship.js';
import { SKETCH_PROFILES_DEMO } from './sketch_profiles.js';
import { CYBER_KEY_DEMO } from './cyber_key.js';

export const DEMO_REGISTRY = {
    'table': TABLE_DEMO,
    'chair': CHAIR_DEMO,
    'house': HOUSE_DEMO,
    'home': HOUSE_DEMO,       // alias
    'bookshelf': BOOKSHELF_DEMO,
    'mug': MUG_DEMO,
    'cup': MUG_DEMO,          // alias
    'snowman': SNOWMAN_DEMO,
    'wheel': WHEEL_DEMO,
    'bridge': BRIDGE_DEMO,
    'car': CAR_DEMO,
    'vehicle': CAR_DEMO,      // alias
    'ship': SHIP_DEMO,
    'boat': SHIP_DEMO,        // alias
    'sketch': SKETCH_PROFILES_DEMO,
    'profiles': SKETCH_PROFILES_DEMO, // alias
    'key': CYBER_KEY_DEMO,
    'cyber_key': CYBER_KEY_DEMO
};