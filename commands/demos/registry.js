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
import { FLANGE_DEMO } from './flange.js';
import { STORAGE_BIN_DEMO } from './storage_bin.js';
import { DRAWER_DEMO } from './drawer.js';
import { KNOB_DEMO } from './knob.js';
import { HOOK_DEMO } from './hook.js';
import { LATCH_DEMO } from './latch.js';
import { CABLE_ORGANIZER_DEMO } from './cable_organizer.js';
import { PHONE_STAND_DEMO } from './phone_stand.js';
import { HEADPHONE_HOLDER_DEMO } from './headphone_holder.js';
import { MEASURING_CUP_DEMO } from './measuring_cup.js';
import { SPOON_HOLDER_DEMO } from './spoon_holder.js';
import { COASTER_DEMO } from './coaster.js';
import { PLANT_POT_DEMO } from './plant_pot.js';
import { KEYCHAIN_DEMO } from './keychain.js';
import { PEN_HOLDER_DEMO } from './pen_holder.js';
import { TWEEZERS_DEMO } from './tweezers.js';
import { MIXING_BOWL_SEAL_DEMO } from './mixing_bowl_seal.js';
import { KITCHEN_CLIP_DEMO } from './kitchen_clip.js';
import { SWEPT_DUCT_DEMO } from './swept_duct.js';
import { FLANGED_ELBOW_DEMO } from './flanged_elbow.js';

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
    'cyber_key': CYBER_KEY_DEMO,
    'flange': FLANGE_DEMO,
    'storage': STORAGE_BIN_DEMO,
    'bin': STORAGE_BIN_DEMO,  // alias
    'drawer': DRAWER_DEMO,
    'box': DRAWER_DEMO,       // alias
    'knob': KNOB_DEMO,
    'hook': HOOK_DEMO,
    'latch': LATCH_DEMO,
    'bolt': LATCH_DEMO,       // alias
    'cable': CABLE_ORGANIZER_DEMO,
    'organizer': CABLE_ORGANIZER_DEMO, // alias
    'stand': PHONE_STAND_DEMO,
    'phone': PHONE_STAND_DEMO, // alias
    'holder': HEADPHONE_HOLDER_DEMO,
    'headphone': HEADPHONE_HOLDER_DEMO, // alias
    'measure': MEASURING_CUP_DEMO,
    'measuring_cup': MEASURING_CUP_DEMO, // alias
    'spoon': SPOON_HOLDER_DEMO,
    'spoon_holder': SPOON_HOLDER_DEMO, // alias
    'coaster': COASTER_DEMO,
    'pot': PLANT_POT_DEMO,
    'plant_pot': PLANT_POT_DEMO, // alias
    'keychain': KEYCHAIN_DEMO,
    'tag': KEYCHAIN_DEMO, // alias
    'pen': PEN_HOLDER_DEMO,
    'pen_holder': PEN_HOLDER_DEMO, // alias
    'tweezers': TWEEZERS_DEMO,
    'tool': TWEEZERS_DEMO, // alias
    'seal': MIXING_BOWL_SEAL_DEMO,
    'lid': MIXING_BOWL_SEAL_DEMO, // alias
    'clip': KITCHEN_CLIP_DEMO,
    'bag_clip': KITCHEN_CLIP_DEMO, // alias
    'duct': SWEPT_DUCT_DEMO,
    'sweep': SWEPT_DUCT_DEMO, // alias
    'elbow': FLANGED_ELBOW_DEMO,
    'pipe': FLANGED_ELBOW_DEMO // alias
};