// LitCasa 3D configurator — product data + option logic (no Three.js here).
// Pure ESM: safe to import in Node for tests and in the browser page.
// Source of truth: ~/workspace/your_files/litcasa-sku-master.csv
// (id / name / category / typical price). ALL prices are "Typical price*"
// placeholders — NOT real supplier prices. Never treat them as real.
export const CART_KEY = 'litcasa-cart-v1';
export const DEFAULT_ID = 'LC-001';

export const COLOR_SETS = {
  rgb: [
    { label: 'Warm White', hex: '#FFD9A0' }, { label: 'Cool White', hex: '#EAF2FF' },
    { label: 'Daylight', hex: '#FFFFFF' }, { label: 'Red', hex: '#FF2D2D' },
    { label: 'Green', hex: '#22C55E' }, { label: 'Blue', hex: '#2D7DFF' },
    { label: 'Turquoise', hex: '#2EC4B6' }, { label: 'Purple', hex: '#A855F7' },
    { label: 'Pink', hex: '#FF5CA8' }, { label: 'Amber', hex: '#FFB800' },
  ],
  white: [
    { label: 'Warm White 2700K', hex: '#FFD9A0' }, { label: 'Neutral 4000K', hex: '#FFEECF' },
    { label: 'Cool White 5000K', hex: '#EAF2FF' }, { label: 'Daylight 6500K', hex: '#FFFFFF' },
  ],
  warm: [
    { label: 'Warm White 2700K', hex: '#FFD9A0' }, { label: 'Warm White 3000K', hex: '#FFE3B3' },
    { label: 'Amber', hex: '#FFB800' },
  ],
  grow: [
    { label: 'Full Spectrum', hex: '#FFF2D6' }, { label: 'Veg Blue', hex: '#7FB3FF' },
    { label: 'Bloom Pink', hex: '#FF7FB0' }, { label: 'Warm White', hex: '#FFD9A0' },
  ],
  indicator: [
    { label: 'Blue', hex: '#2D7DFF' }, { label: 'Green', hex: '#22C55E' },
    { label: 'Red', hex: '#FF2D2D' }, { label: 'Warm White', hex: '#FFD9A0' },
  ],
  neon: [
    { label: 'Pink', hex: '#FF5CA8' }, { label: 'Turquoise', hex: '#2EC4B6' },
    { label: 'Blue', hex: '#2D7DFF' }, { label: 'Purple', hex: '#A855F7' },
    { label: 'Red', hex: '#FF2D2D' }, { label: 'Warm White', hex: '#FFD9A0' },
    { label: 'Green', hex: '#22C55E' },
  ],
};

// Size options: label shown to the customer, scale = model scale factor,
// factor = multiplier applied to the base typical price (labelled typical).
export const SIZE_SETS = {
  strip: [
    { label: '16 ft', scale: 0.6, factor: 0.6 }, { label: '32 ft', scale: 1.0, factor: 1.0 },
    { label: '65 ft', scale: 1.8, factor: 1.8 },
  ],
  stripShort: [
    { label: '10 ft', scale: 0.5, factor: 0.5 }, { label: '16 ft', scale: 0.8, factor: 0.8 },
    { label: '32 ft', scale: 1.0, factor: 1.0 },
  ],
  bulbPack: [
    { label: '1 pack', scale: 0.7, factor: 0.4 }, { label: '2 pack', scale: 0.85, factor: 0.6 },
    { label: '4 pack', scale: 1.0, factor: 1.0 }, { label: '6 pack', scale: 1.1, factor: 1.3 },
  ],
  neonSize: [
    { label: '12 in', scale: 0.7, factor: 0.6 }, { label: '24 in', scale: 1.0, factor: 1.0 },
    { label: '36 in', scale: 1.3, factor: 1.5 },
  ],
  stringLen: [
    { label: '25 ft', scale: 0.6, factor: 0.6 }, { label: '48 ft', scale: 1.0, factor: 1.0 },
    { label: '72 ft', scale: 1.4, factor: 1.4 },
  ],
  panelSize: [
    { label: '1×2 ft', scale: 0.7, factor: 0.7 }, { label: '1×4 ft', scale: 1.0, factor: 1.0 },
    { label: '2×2 ft', scale: 1.1, factor: 1.2 },
  ],
  hexPack: [
    { label: '3 pack', scale: 0.7, factor: 0.6 }, { label: '7 pack', scale: 1.0, factor: 1.0 },
    { label: '10 pack', scale: 1.25, factor: 1.4 },
  ],
  floodWatt: [
    { label: '50 W', scale: 0.8, factor: 0.7 }, { label: '100 W', scale: 1.0, factor: 1.0 },
    { label: '200 W', scale: 1.25, factor: 1.6 },
  ],
  packCount: [
    { label: '2 pack', scale: 0.8, factor: 0.6 }, { label: '4 pack', scale: 1.0, factor: 1.0 },
    { label: '8 pack', scale: 1.2, factor: 1.7 },
  ],
  growWatt: [
    { label: '60 W', scale: 0.8, factor: 0.7 }, { label: '100 W', scale: 1.0, factor: 1.0 },
    { label: '200 W', scale: 1.3, factor: 1.7 },
  ],
  oneSize: [{ label: 'One size', scale: 1.0, factor: 1.0 }],
  chandelierDia: [
    { label: '18 in', scale: 0.8, factor: 0.8 }, { label: '24 in', scale: 1.0, factor: 1.0 },
    { label: '36 in', scale: 1.3, factor: 1.5 },
  ],
  pendantCount: [
    { label: 'Single', scale: 0.8, factor: 0.6 }, { label: '3-light', scale: 1.0, factor: 1.0 },
    { label: '5-light', scale: 1.2, factor: 1.5 },
  ],
  ceilingDia: [
    { label: '11 in', scale: 0.85, factor: 0.85 }, { label: '13 in', scale: 1.0, factor: 1.0 },
    { label: '15 in', scale: 1.15, factor: 1.15 },
  ],
  // Recessed downlights are sold by aperture diameter: 4/6/8 in (LC-050 is a 6in 4-pack).
  recessedDia: [
    { label: '4 in', scale: 0.8, factor: 0.8 }, { label: '6 in', scale: 1.0, factor: 1.0 },
    { label: '8 in', scale: 1.2, factor: 1.25 },
  ],
  vanityLen: [
    { label: '18 in', scale: 0.8, factor: 0.8 }, { label: '24 in', scale: 1.0, factor: 1.0 },
    { label: '36 in', scale: 1.3, factor: 1.35 },
  ],
  lampSize: [
    { label: 'Table', scale: 0.85, factor: 0.8 }, { label: 'Floor', scale: 1.15, factor: 1.4 },
  ],
  trackLen: [
    { label: '2 ft', scale: 0.6, factor: 0.7 }, { label: '4 ft', scale: 1.0, factor: 1.0 },
    { label: '8 ft', scale: 1.6, factor: 1.6 },
  ],
  gang: [
    { label: '1-gang', scale: 1.0, factor: 1.0 }, { label: '2-gang', scale: 1.15, factor: 1.3 },
    { label: '3-gang', scale: 1.3, factor: 1.6 },
  ],
  plateSize: [
    { label: 'Standard', scale: 1.0, factor: 1.0 }, { label: 'Midsize', scale: 1.1, factor: 1.15 },
    { label: 'Jumbo', scale: 1.2, factor: 1.3 },
  ],
  wireLen: [
    { label: '25 ft', scale: 0.7, factor: 0.7 }, { label: '50 ft', scale: 1.0, factor: 1.0 },
    { label: '100 ft', scale: 1.3, factor: 1.6 },
  ],
  wattPSU: [
    { label: '60 W', scale: 0.85, factor: 0.8 }, { label: '120 W', scale: 1.0, factor: 1.0 },
    { label: '240 W', scale: 1.2, factor: 1.5 },
  ],
};

// Builder names — each is a parametric procedural builder in configurator.html.
// 20 builders cover all 22 CSV categories (some builders span 2 categories).
export const BUILDER_NAMES = ['strip','bulb','neon','string','panel','outdoor','headlight','grow','wire','controller','powersupply','chandelier','pendant','sconce','ceiling','vanitybar','lamp','track','switch','plate'];

export const FINISHES = {
  switchFinish: ['White', 'Black'],
  plateFinish: ['White', 'Black', 'Ivory'],
};

// id, name, category (CSV display name), slug (site cat), price (typical $),
// desc (from site fallback data), builder, variant (builder sub-shape),
// colorSet, sizeSet, defaultSize index, defaultColor index, finish set or null,
// homekit flag (LC-053–LC-056 only).
// prettier-ignore
export const PRODUCTS = [
  { id:'LC-001', name:'AuraStrip Pro RGBIC — 32.8ft', category:'LED Strips', slug:'strips', price:24.99, desc:'Color-chasing RGBIC with app + voice control. Music sync, cuttable, adhesive back.', builder:'strip', variant:'coil', colorSet:'rgb', sizeSet:'strip', defaultSize:1, defaultColor:6 },
  { id:'LC-002', name:'COB Warm White Strip — 16.4ft', category:'LED Strips', slug:'strips', price:18.99, desc:'Seamless dot-free glow for coves, cabinets, and TV walls. 3000K warm.', builder:'strip', variant:'coil', colorSet:'warm', sizeSet:'strip', defaultSize:0, defaultColor:0 },
  { id:'LC-003', name:'TV Backlight Strip — USB', category:'LED Strips', slug:'strips', price:14.99, desc:'USB-powered bias lighting for 55–65" TVs. Reduces eye strain instantly.', builder:'strip', variant:'tv', colorSet:'rgb', sizeSet:'stripShort', defaultSize:1, defaultColor:2 },
  { id:'LC-004', name:'CasaSmart Color Bulb — 4 Pack', category:'Smart Bulbs', slug:'bulbs', price:29.99, desc:'16M colors, schedules, Alexa/Google ready. No hub needed.', builder:'bulb', variant:'a19', colorSet:'rgb', sizeSet:'bulbPack', defaultSize:2, defaultColor:0 },
  { id:'LC-005', name:'Edison Filament LED — 6 Pack', category:'Smart Bulbs', slug:'bulbs', price:19.99, desc:'Vintage look, LED efficiency. Dimmable 2700K for pendants & sconces.', builder:'bulb', variant:'edison', colorSet:'warm', sizeSet:'bulbPack', defaultSize:3, defaultColor:0 },
  { id:'LC-006', name:'Motion Sensor Bulb — 2 Pack', category:'Smart Bulbs', slug:'bulbs', price:12.99, desc:'Auto on/off for closets, porches, and hallways. Dusk-to-dawn sensor.', builder:'bulb', variant:'a19', colorSet:'white', sizeSet:'bulbPack', defaultSize:1, defaultColor:1 },
  { id:'LC-007', name:'Custom Neon Sign — Your Text', category:'Neon & Signs', slug:'neon', price:89.99, desc:'Your words in LED neon flex. Dimmer + remote included, 24" wide standard.', builder:'neon', variant:'custom', colorSet:'neon', sizeSet:'neonSize', defaultSize:1, defaultColor:0, customText:true },
  { id:'LC-008', name:'Good Vibes Neon Sign', category:'Neon & Signs', slug:'neon', price:49.99, desc:'Ready-to-hang pink neon-flex sign for bedrooms, bars, and studios.', builder:'neon', variant:'script', colorSet:'neon', sizeSet:'neonSize', defaultSize:1, defaultColor:0 },
  { id:'LC-009', name:'Neon Flex Rope — 16.4ft', category:'Neon & Signs', slug:'neon', price:22.99, desc:'Bendable, cuttable neon look without glass. Indoor/outdoor IP65.', builder:'neon', variant:'rope', colorSet:'neon', sizeSet:'strip', defaultSize:0, defaultColor:1 },
  { id:'LC-010', name:'Globe String Lights — 48ft', category:'String Lights', slug:'string', price:34.99, desc:'Shatterproof G40 globes, connectable, commercial-grade patio string.', builder:'string', variant:'globe', colorSet:'warm', sizeSet:'stringLen', defaultSize:1, defaultColor:0 },
  { id:'LC-011', name:'Fairy Wire Lights — 33ft', category:'String Lights', slug:'string', price:9.99, desc:'100 warm micro-LEDs on copper wire. Jars, wreaths, centerpieces.', builder:'string', variant:'fairy', colorSet:'warm', sizeSet:'stringLen', defaultSize:0, defaultColor:0 },
  { id:'LC-012', name:'Solar String Lights — 72ft', category:'String Lights', slug:'string', price:19.99, desc:'200 LEDs, 8 modes, charges by day — no outlet needed.', builder:'string', variant:'globe', colorSet:'white', sizeSet:'stringLen', defaultSize:2, defaultColor:0 },
  { id:'LC-013', name:'Ultra-Thin Panel Light — 6 Pack', category:'Panels & Ceiling', slug:'panels', price:59.99, desc:'1×4ft edge-lit panels, 3 color temps, flicker-free for kitchens & offices.', builder:'panel', variant:'flat', colorSet:'white', sizeSet:'panelSize', defaultSize:1, defaultColor:1 },
  { id:'LC-014', name:'Hex Glow Panels — 7 Pack', category:'Panels & Ceiling', slug:'panels', price:69.99, desc:'Touch + app RGB hex tiles. Build your wall, sync to music.', builder:'panel', variant:'hex', colorSet:'rgb', sizeSet:'hexPack', defaultSize:1, defaultColor:6 },
  { id:'LC-015', name:'Slim Flush Ceiling Light — 12in', category:'Panels & Ceiling', slug:'panels', price:27.99, desc:'Low-profile daylight ceiling light. 5CCT selectable, easy retrofit.', builder:'panel', variant:'flat', colorSet:'white', sizeSet:'panelSize', defaultSize:0, defaultColor:2 },
  { id:'LC-016', name:'Solar Pathway Lights — 8 Pack', category:'Outdoor', slug:'outdoor', price:29.99, desc:'Warm path glow, auto dusk-on. Weatherproof stakes included.', builder:'outdoor', variant:'pathway', colorSet:'warm', sizeSet:'packCount', defaultSize:2, defaultColor:0 },
  { id:'LC-017', name:'LED Flood Light — 2 Pack, 100W', category:'Outdoor', slug:'outdoor', price:39.99, desc:'Driveway & yard security floods. IP66, daylight 5000K.', builder:'outdoor', variant:'flood', colorSet:'white', sizeSet:'floodWatt', defaultSize:1, defaultColor:2 },
  { id:'LC-018', name:'Landscape Spotlights — 4 Pack', category:'Outdoor', slug:'outdoor', price:44.99, desc:'Uplight trees, flags, and facades. Low-voltage, transformer ready.', builder:'outdoor', variant:'spot', colorSet:'white', sizeSet:'packCount', defaultSize:1, defaultColor:0 },
  { id:'LC-019', name:'LED Headlight Bulbs — 9005 Pair', category:'Car Lights', slug:'auto', price:39.99, desc:'600% brighter 6500K white. Fan-cooled, plug-and-play in ~20 min.', builder:'headlight', variant:'h11', colorSet:'white', sizeSet:'oneSize', defaultSize:0, defaultColor:3 },
  { id:'LC-020', name:'Car Interior Strip Kit — 4pc', category:'Car Lights', slug:'auto', price:19.99, desc:'Footwell RGB with music sync + app. USB / 12V powered.', builder:'strip', variant:'car', colorSet:'rgb', sizeSet:'stripShort', defaultSize:1, defaultColor:4 },
  { id:'LC-021', name:'LED Light Bar — 22in, Spot/Flood', category:'Car Lights', slug:'auto', price:59.99, desc:'Off-road combo beam bar with harness + mounts. IP67 sealed.', builder:'outdoor', variant:'lightbar', colorSet:'white', sizeSet:'vanityLen', defaultSize:1, defaultColor:3 },
  { id:'LC-022', name:'RGB Underglow Kit — App Control', category:'Car Lights', slug:'auto', price:49.99, desc:'Flexible underbody strips, chasing modes, brake-sync option.', builder:'strip', variant:'underglow', colorSet:'rgb', sizeSet:'strip', defaultSize:1, defaultColor:2 },
  { id:'LC-023', name:'Full-Spectrum Grow Panel — 100W', category:'Grow Lights', slug:'grow', price:49.99, desc:'Sunlike spectrum for seed-to-harvest. Quiet, daisy-chainable, 2×2ft cover.', builder:'grow', variant:'panel', colorSet:'grow', sizeSet:'growWatt', defaultSize:1, defaultColor:0 },
  { id:'LC-024', name:'Grow Light Bars — 4 Pack, 2ft', category:'Grow Lights', slug:'grow', price:39.99, desc:'Linkable T5-style bars for shelves & racks. Timer ready.', builder:'grow', variant:'bars', colorSet:'grow', sizeSet:'growWatt', defaultSize:0, defaultColor:0 },
  { id:'LC-025', name:'Dual-Head Grow Lamp — Clip On', category:'Grow Lights', slug:'grow', price:24.99, desc:'Gooseneck clip lamp with auto timer for houseplants & herbs.', builder:'grow', variant:'clip', colorSet:'grow', sizeSet:'oneSize', defaultSize:0, defaultColor:0 },
  { id:'LC-026', name:'LED Wire & Connector Kit — 142pc', category:'Wires & Connectors', slug:'wiring', price:14.99, desc:'Solderless clips, splitters, jumpers & pins for 2/4-pin strips.', builder:'wire', variant:'kit', colorSet:'indicator', sizeSet:'oneSize', defaultSize:0, defaultColor:1 },
  { id:'LC-027', name:'LED Extension Wire — 50ft', category:'Wires & Connectors', slug:'wiring', price:11.99, desc:'22AWG 4-conductor wire for runs between strips & controllers.', builder:'wire', variant:'spool', colorSet:'indicator', sizeSet:'wireLen', defaultSize:1, defaultColor:1 },
  { id:'LC-028', name:'WiFi Controller + Remote', category:'Controllers', slug:'control', price:16.99, desc:'App, voice & 24-key remote. Music sync for 12–24V strips.', builder:'controller', variant:'wifi', colorSet:'indicator', sizeSet:'oneSize', defaultSize:0, defaultColor:0 },
  { id:'LC-029', name:'Inline Dimmer Switch — Touch', category:'Controllers', slug:'control', price:12.99, desc:'Stepless touch dimming for single-color strips & cabinets.', builder:'controller', variant:'dimmer', colorSet:'indicator', sizeSet:'oneSize', defaultSize:0, defaultColor:3 },
  { id:'LC-030', name:'12V 5A Power Supply', category:'Power Supplies', slug:'power', price:13.99, desc:'60W adapter with DC plug. Powers most single strip runs.', builder:'powersupply', variant:'brick', colorSet:'indicator', sizeSet:'wattPSU', defaultSize:0, defaultColor:0 },
  { id:'LC-031', name:'24V 10A Power Supply — 240W', category:'Power Supplies', slug:'power', price:24.99, desc:'Heavy-duty driver for long 24V runs, panels & signs.', builder:'powersupply', variant:'brick', colorSet:'indicator', sizeSet:'wattPSU', defaultSize:2, defaultColor:0 },
  { id:'LC-032', name:'Modern Crystal Chandelier — 24in', category:'Chandeliers', slug:'chandeliers', price:189.99, desc:'Faceted crystal tiers on a chrome frame. Dimmable, E12 bulbs included.', builder:'chandelier', variant:'crystal', colorSet:'warm', sizeSet:'chandelierDia', defaultSize:1, defaultColor:0 },
  { id:'LC-033', name:'Farmhouse Chandelier — 6-Light', category:'Chandeliers', slug:'chandeliers', price:129.99, desc:'Rustic wood + black metal, 6 lights. Chain + rod included.', builder:'chandelier', variant:'farmhouse', colorSet:'warm', sizeSet:'chandelierDia', defaultSize:1, defaultColor:0 },
  { id:'LC-034', name:'Sputnik Chandelier — 8-Light', category:'Chandeliers', slug:'chandeliers', price:149.99, desc:'Mid-century sputnik with 8 brass arms. G9 bulbs included.', builder:'chandelier', variant:'sputnik', colorSet:'warm', sizeSet:'chandelierDia', defaultSize:1, defaultColor:0 },
  { id:'LC-035', name:'Single Pendant Light — Glass', category:'Pendant Lights', slug:'pendants', price:49.99, desc:'Clear glass single pendant. Adjustable cord, E26 base.', builder:'pendant', variant:'single', colorSet:'warm', sizeSet:'pendantCount', defaultSize:0, defaultColor:0 },
  { id:'LC-036', name:'3-Light Pendant Cluster', category:'Pendant Lights', slug:'pendants', price:89.99, desc:'Three glass shades on one canopy. Staggered drops, E26 bases.', builder:'pendant', variant:'cluster', colorSet:'warm', sizeSet:'pendantCount', defaultSize:1, defaultColor:0 },
  { id:'LC-037', name:'Glass Dome Pendant Light', category:'Pendant Lights', slug:'pendants', price:59.99, desc:'Smoked glass dome pendant. Warm 3000K bulb included.', builder:'pendant', variant:'dome', colorSet:'warm', sizeSet:'pendantCount', defaultSize:0, defaultColor:0 },
  { id:'LC-038', name:'Up/Down Wall Sconce — 2 Pack', category:'Wall Sconces', slug:'sconces', price:39.99, desc:'Up + down wash for hallways & bedsides. Integrated LED, 3000K.', builder:'sconce', variant:'updown', colorSet:'warm', sizeSet:'packCount', defaultSize:0, defaultColor:0 },
  { id:'LC-039', name:'Swing-Arm Wall Sconce', category:'Wall Sconces', slug:'sconces', price:44.99, desc:'Swing-arm reading light. Plug-in or hardwire, E26 base.', builder:'sconce', variant:'swing', colorSet:'warm', sizeSet:'oneSize', defaultSize:0, defaultColor:0 },
  { id:'LC-040', name:'Candle-Style Wall Sconce — 2 Pack', category:'Wall Sconces', slug:'sconces', price:34.99, desc:'Classic candle sleeves for dining rooms & entryways. E12 bases.', builder:'sconce', variant:'candle', colorSet:'warm', sizeSet:'packCount', defaultSize:0, defaultColor:0 },
  { id:'LC-041', name:'Flush Mount Ceiling Light — 15in', category:'Ceiling Lights', slug:'ceiling', price:39.99, desc:'Slim 15in flush mount. 5CCT selectable, damp-rated.', builder:'ceiling', variant:'flush', colorSet:'white', sizeSet:'ceilingDia', defaultSize:2, defaultColor:1 },
  { id:'LC-042', name:'Semi-Flush Ceiling Light — 13in', category:'Ceiling Lights', slug:'ceiling', price:49.99, desc:'Fabric drum semi-flush. Soft diffused light, E26 bases.', builder:'ceiling', variant:'drum', colorSet:'warm', sizeSet:'ceilingDia', defaultSize:1, defaultColor:0 },
  { id:'LC-043', name:'LED Disk Light — 11in', category:'Ceiling Lights', slug:'ceiling', price:29.99, desc:'Ultra-slim 11in LED disk. Warm 3000K, easy retrofit.', builder:'ceiling', variant:'disk', colorSet:'warm', sizeSet:'ceilingDia', defaultSize:0, defaultColor:0 },
  { id:'LC-044', name:'Vanity Light Bar — 24in', category:'Vanity & Bathroom Lights', slug:'vanity', price:44.99, desc:'24in damp-rated vanity bar. Even 4000K light, no shadows.', builder:'vanitybar', variant:'bar', colorSet:'white', sizeSet:'vanityLen', defaultSize:1, defaultColor:1 },
  { id:'LC-045', name:'Vanity Light Bar — 36in', category:'Vanity & Bathroom Lights', slug:'vanity', price:59.99, desc:'36in damp-rated vanity bar for double sinks. Even 4000K light.', builder:'vanitybar', variant:'bar', colorSet:'white', sizeSet:'vanityLen', defaultSize:2, defaultColor:1 },
  { id:'LC-046', name:'Hollywood Mirror Light Strip — 10ft', category:'Vanity & Bathroom Lights', slug:'vanity', price:19.99, desc:'10ft adhesive mirror light strip. USB powered, dimmable.', builder:'strip', variant:'mirror', colorSet:'white', sizeSet:'stripShort', defaultSize:0, defaultColor:3 },
  { id:'LC-047', name:'Table Lamp — Ceramic Base', category:'Table & Floor Lamps', slug:'lamps', price:34.99, desc:'Glazed ceramic base + fabric shade. 3-way switch, E26 base.', builder:'lamp', variant:'table', colorSet:'warm', sizeSet:'lampSize', defaultSize:0, defaultColor:0 },
  { id:'LC-048', name:'Table Lamp — Modern Fabric Shade', category:'Table & Floor Lamps', slug:'lamps', price:29.99, desc:'Modern matte base, linen shade. Inline switch, E26 base.', builder:'lamp', variant:'table', colorSet:'warm', sizeSet:'lampSize', defaultSize:0, defaultColor:0 },
  { id:'LC-049', name:'Arc Floor Lamp', category:'Table & Floor Lamps', slug:'lamps', price:79.99, desc:'Arched arm over sofas & chairs. Marble base, foot switch.', builder:'lamp', variant:'arc', colorSet:'warm', sizeSet:'lampSize', defaultSize:1, defaultColor:0 },
  { id:'LC-050', name:'Recessed Downlights — 4 Pack, 6in', category:'Recessed Downlights', slug:'recessed', price:49.99, desc:'Canless 6in downlights, 4 pack. 5CCT selectable, IC rated.', builder:'ceiling', variant:'recessed', colorSet:'white', sizeSet:'recessedDia', defaultSize:1, defaultColor:1 },
  { id:'LC-051', name:'Track Lighting Kit — 4-Light', category:'Track Lighting', slug:'track', price:69.99, desc:'4ft track + 4 adjustable heads. Aim light where you need it.', builder:'track', variant:'rail', colorSet:'white', sizeSet:'trackLen', defaultSize:1, defaultColor:1 },
  { id:'LC-052', name:'Under-Cabinet Light Bar — 18in', category:'Under-Cabinet Lights', slug:'undercabinet', price:24.99, desc:'18in linkable bar for kitchens. Warm 3000K, plug-in or hardwire.', builder:'vanitybar', variant:'undercab', colorSet:'warm', sizeSet:'vanityLen', defaultSize:0, defaultColor:0 },
  { id:'LC-053', name:'HomeKit Dimmer Switch', category:'Smart Switches', slug:'switches', price:34.99, desc:'Works with Apple Home (HomeKit). Single-pole dimmer, no hub needed.', builder:'switch', variant:'dimmer', colorSet:'indicator', sizeSet:'gang', defaultSize:0, defaultColor:1, finish:'switchFinish', homekit:true },
  { id:'LC-054', name:'HomeKit On/Off Switch', category:'Smart Switches', slug:'switches', price:29.99, desc:'Works with Apple Home (HomeKit). Single-pole on/off, no hub needed.', builder:'switch', variant:'toggle', colorSet:'indicator', sizeSet:'gang', defaultSize:0, defaultColor:1, finish:'switchFinish', homekit:true },
  { id:'LC-055', name:'HomeKit 3-Way Dimmer Switch', category:'Smart Switches', slug:'switches', price:39.99, desc:'Works with Apple Home (HomeKit). 3-way dimmer, no hub needed.', builder:'switch', variant:'dimmer', colorSet:'indicator', sizeSet:'gang', defaultSize:0, defaultColor:1, finish:'switchFinish', homekit:true },
  { id:'LC-056', name:'HomeKit Smart Switch — No Neutral Required', category:'Smart Switches', slug:'switches', price:44.99, desc:'Works with Apple Home (HomeKit). No neutral wire required, no hub needed.', builder:'switch', variant:'toggle', colorSet:'indicator', sizeSet:'gang', defaultSize:0, defaultColor:1, finish:'switchFinish', homekit:true },
  { id:'LC-057', name:'Screwless Duplex Wall Plate', category:'Switch Plates & Covers', slug:'plates', price:9.99, desc:'Screwless snap-on duplex plate. Clean, no visible screws.', builder:'plate', variant:'duplex', colorSet:'indicator', sizeSet:'plateSize', defaultSize:0, defaultColor:3, finish:'plateFinish' },
  { id:'LC-058', name:'Toggle Switch Plate — Single', category:'Switch Plates & Covers', slug:'plates', price:6.99, desc:'Single toggle plate. Unbreakable nylon, standard size.', builder:'plate', variant:'toggle', colorSet:'indicator', sizeSet:'plateSize', defaultSize:0, defaultColor:3, finish:'plateFinish' },
  { id:'LC-059', name:'Duplex Outlet Cover — 2 Pack', category:'Switch Plates & Covers', slug:'plates', price:7.99, desc:'Duplex outlet covers, 2 pack. Unbreakable nylon, standard size.', builder:'plate', variant:'duplex', colorSet:'indicator', sizeSet:'plateSize', defaultSize:0, defaultColor:3, finish:'plateFinish' },
];

export const CATEGORIES = [...new Set(PRODUCTS.map(p => p.category))];

export function resolveProductId(raw) {
  if (!raw) return DEFAULT_ID;
  const id = String(raw).trim().toUpperCase();
  if (PRODUCTS.some(p => p.id === id)) return id;
  const n = parseInt(id.replace(/\D/g, ''), 10);
  if (Number.isFinite(n) && n >= 1 && n <= 59) return 'LC-' + String(n).padStart(3, '0');
  return DEFAULT_ID;
}
export function getProduct(id) { return PRODUCTS.find(p => p.id === resolveProductId(id)); }
export function colorsFor(p) { return COLOR_SETS[p.colorSet] || COLOR_SETS.white; }
export function sizesFor(p) { return SIZE_SETS[p.sizeSet] || SIZE_SETS.oneSize; }
export function finishesFor(p) { return p.finish ? FINISHES[p.finish] : null; }
export function defaultOptions(p) {
  const colors = colorsFor(p), sizes = sizesFor(p);
  return {
    color: colors[p.defaultColor ?? 0].label,
    colorHex: colors[p.defaultColor ?? 0].hex,
    size: sizes[p.defaultSize ?? 0].label,
    sizeScale: sizes[p.defaultSize ?? 0].scale,
    sizeFactor: sizes[p.defaultSize ?? 0].factor,
    brightness: 80,
    finish: finishesFor(p) ? finishesFor(p)[0] : null,
    customText: '',
  };
}
export function priceFor(p, opts) {
  // Base typical price is for the product's NAMED size (e.g. LC-002 is a
  // 16.4 ft strip, LC-045 a 36 in bar). Size factors are relative within
  // their set, so normalize by the default size's factor: the default
  // configuration always shows exactly the CSV typical price, and other
  // sizes scale proportionally from there. Result is still typical.
  // Integer cents throughout: avoids float artifacts (e.g. 89.99 x 1.5
  // landing a cent low). Same math as scaledUnitPriceCents() in
  // api/_lib/options.js — the two must always agree.
  const sizes = sizesFor(p);
  const baseFactor = sizes[p.defaultSize ?? 0]?.factor ?? 1;
  const factor = (opts?.sizeFactor ?? 1) / baseFactor;
  return Math.round(Math.round(p.price * 100) * factor) / 100;
}
export function money(n) { return '$' + n.toFixed(2); }
export function summaryText(p, opts) {
  const parts = [p.name, p.category, 'Color: ' + opts.color, 'Size: ' + opts.size, 'Brightness: ' + opts.brightness + '%'];
  if (opts.finish) parts.push('Finish: ' + opts.finish);
  if (opts.customText) parts.push('Text: "' + opts.customText + '"');
  return parts.join(' · ');
}
