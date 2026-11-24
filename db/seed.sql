-- ============================================================================
-- LitCasa — seed data: 31 starter products (LC-001..LC-031)
--   + 28 added products (LC-032..LC-059): indoor lighting, smart switches,
--   switch plates & covers (typical prices, supplier link/cost TO CONFIRM).
-- Source: ~/workspace/your_files/litcasa-sku-master.csv
--   (exact sku / product_name / category / site_price_usd_typical)
--   Run AFTER schema.sql. Safe to re-run: ON CONFLICT DO NOTHING.
--
-- PRICES ARE PLACEHOLDERS: price_cents is the CSV 'typical' price in
--   integer cents; typical_price = true for every row. These are NOT
--   real supplier prices — supplier links/costs are still TO CONFIRM
--   in the CSV. Do not use them as margin/cost basis.
--   To correct a price later, UPDATE the row and set typical_price=false
--   once a supplier-confirmed price replaces it.
--   Categories are the CSV display names (e.g. 'LED Strips'), NOT the
--   short slugs used in the site JS (strips/bulbs/neon/...).
--   supplier_primary / supplier_backup are from the CSV as written.
--   description is NULL except the 4 Smart Switches (HomeKit callout).
--   Sizes are NOT stored in this table (no size column): configurator
--   sizes live in configurator.mjs (SIZE_SETS). LC-050 'Recessed
--   Downlights — 4 Pack, 6in' uses recessedDia (4/6/8 in, default 6 in),
--   not ceilingDia (11/13/15 in). A DB re-seed cannot change sizes.
--   image_url is 'images/lc-XXX.jpg' for every product (local photo files
--   in the repo under images/). EXCEPTION: the 4 Smart Switches carry
--   a HomeKit description ('Works with Apple Home (HomeKit)...') so the
--   API/frontend can surface the compatibility callout; no brand or
--   certification is claimed.
-- ============================================================================

INSERT INTO products (id, name, category, price_cents, typical_price, description, image_url, homekit, supplier_primary, supplier_backup, active) VALUES
  ('LC-001', 'AuraStrip Pro RGBIC — 32.8ft', 'LED Strips', 2499, true, NULL, 'images/lc-001.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-002', 'COB Warm White Strip — 16.4ft', 'LED Strips', 1899, true, NULL, 'images/lc-002.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-003', 'TV Backlight Strip — USB', 'LED Strips', 1499, true, NULL, 'images/lc-003.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-004', 'CasaSmart Color Bulb — 4 Pack', 'Smart Bulbs', 2999, true, NULL, 'images/lc-004.jpg', false, 'Zendrop', 'AliExpress', true),
  ('LC-005', 'Edison Filament LED — 6 Pack', 'Smart Bulbs', 1999, true, NULL, 'images/lc-005.jpg', false, 'AliExpress', 'Zendrop', true),
  ('LC-006', 'Motion Sensor Bulb — 2 Pack', 'Smart Bulbs', 1299, true, NULL, 'images/lc-006.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-007', 'Custom Neon Sign — Your Text', 'Neon & Signs', 8999, true, NULL, 'images/lc-007.jpg', false, 'CJ Dropshipping', 'Alibaba', true),
  ('LC-008', 'Good Vibes Neon Sign', 'Neon & Signs', 4999, true, NULL, 'images/lc-008.jpg', false, 'CJ Dropshipping', 'Alibaba', true),
  ('LC-009', 'Neon Flex Rope — 16.4ft', 'Neon & Signs', 2299, true, NULL, 'images/lc-009.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-010', 'Globe String Lights — 48ft', 'String Lights', 3499, true, NULL, 'images/lc-010.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-011', 'Fairy Wire Lights — 33ft', 'String Lights', 999, true, NULL, 'images/lc-011.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-012', 'Solar String Lights — 72ft', 'String Lights', 1999, true, NULL, 'images/lc-012.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-013', 'Ultra-Thin Panel Light — 6 Pack', 'Panels & Ceiling', 5999, true, NULL, 'images/lc-013.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-014', 'Hex Glow Panels — 7 Pack', 'Panels & Ceiling', 6999, true, NULL, 'images/lc-014.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-015', 'Slim Flush Ceiling Light — 12in', 'Panels & Ceiling', 2799, true, NULL, 'images/lc-015.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-016', 'Solar Pathway Lights — 8 Pack', 'Outdoor', 2999, true, NULL, 'images/lc-016.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-017', 'LED Flood Light — 2 Pack, 100W', 'Outdoor', 3999, true, NULL, 'images/lc-017.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-018', 'Landscape Spotlights — 4 Pack', 'Outdoor', 4499, true, NULL, 'images/lc-018.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-019', 'LED Headlight Bulbs — 9005 Pair', 'Car Lights', 3999, true, NULL, 'images/lc-019.jpg', false, 'CJ Dropshipping', 'AliExpress', true),
  ('LC-020', 'Car Interior Strip Kit — 4pc', 'Car Lights', 1999, true, NULL, 'images/lc-020.jpg', false, 'CJ Dropshipping', 'AliExpress', true),
  ('LC-021', 'LED Light Bar — 22in, Spot/Flood', 'Car Lights', 5999, true, NULL, 'images/lc-021.jpg', false, 'CJ Dropshipping', 'AliExpress', true),
  ('LC-022', 'RGB Underglow Kit — App Control', 'Car Lights', 4999, true, NULL, 'images/lc-022.jpg', false, 'CJ Dropshipping', 'AliExpress', true),
  ('LC-023', 'Full-Spectrum Grow Panel — 100W', 'Grow Lights', 4999, true, NULL, 'images/lc-023.jpg', false, 'AliExpress', 'Alibaba', true),
  ('LC-024', 'Grow Light Bars — 4 Pack, 2ft', 'Grow Lights', 3999, true, NULL, 'images/lc-024.jpg', false, 'AliExpress', 'Alibaba', true),
  ('LC-025', 'Dual-Head Grow Lamp — Clip On', 'Grow Lights', 2499, true, NULL, 'images/lc-025.jpg', false, 'AliExpress', 'Alibaba', true),
  ('LC-026', 'LED Wire & Connector Kit — 142pc', 'Wires & Connectors', 1499, true, NULL, 'images/lc-026.jpg', false, 'AliExpress', 'Alibaba', true),
  ('LC-027', 'LED Extension Wire — 50ft', 'Wires & Connectors', 1199, true, NULL, 'images/lc-027.jpg', false, 'AliExpress', 'Alibaba', true),
  ('LC-028', 'WiFi Controller + Remote', 'Controllers', 1699, true, NULL, 'images/lc-028.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-029', 'Inline Dimmer Switch — Touch', 'Controllers', 1299, true, NULL, 'images/lc-029.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-030', '12V 5A Power Supply', 'Power Supplies', 1399, true, NULL, 'images/lc-030.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-031', '24V 10A Power Supply — 240W', 'Power Supplies', 2499, true, NULL, 'images/lc-031.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-032', 'Modern Crystal Chandelier — 24in', 'Chandeliers', 18999, true, NULL, 'images/lc-032.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-033', 'Farmhouse Chandelier — 6-Light', 'Chandeliers', 12999, true, NULL, 'images/lc-033.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-034', 'Sputnik Chandelier — 8-Light', 'Chandeliers', 14999, true, NULL, 'images/lc-034.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-035', 'Single Pendant Light — Glass', 'Pendant Lights', 4999, true, NULL, 'images/lc-035.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-036', '3-Light Pendant Cluster', 'Pendant Lights', 8999, true, NULL, 'images/lc-036.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-037', 'Glass Dome Pendant Light', 'Pendant Lights', 5999, true, NULL, 'images/lc-037.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-038', 'Up/Down Wall Sconce — 2 Pack', 'Wall Sconces', 3999, true, NULL, 'images/lc-038.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-039', 'Swing-Arm Wall Sconce', 'Wall Sconces', 4499, true, NULL, 'images/lc-039.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-040', 'Candle-Style Wall Sconce — 2 Pack', 'Wall Sconces', 3499, true, NULL, 'images/lc-040.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-041', 'Flush Mount Ceiling Light — 15in', 'Ceiling Lights', 3999, true, NULL, 'images/lc-041.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-042', 'Semi-Flush Ceiling Light — 13in', 'Ceiling Lights', 4999, true, NULL, 'images/lc-042.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-043', 'LED Disk Light — 11in', 'Ceiling Lights', 2999, true, NULL, 'images/lc-043.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-044', 'Vanity Light Bar — 24in', 'Vanity & Bathroom Lights', 4499, true, NULL, 'images/lc-044.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-045', 'Vanity Light Bar — 36in', 'Vanity & Bathroom Lights', 5999, true, NULL, 'images/lc-045.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-046', 'Hollywood Mirror Light Strip — 10ft', 'Vanity & Bathroom Lights', 1999, true, NULL, 'images/lc-046.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-047', 'Table Lamp — Ceramic Base', 'Table & Floor Lamps', 3499, true, NULL, 'images/lc-047.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-048', 'Table Lamp — Modern Fabric Shade', 'Table & Floor Lamps', 2999, true, NULL, 'images/lc-048.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-049', 'Arc Floor Lamp', 'Table & Floor Lamps', 7999, true, NULL, 'images/lc-049.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-050', 'Recessed Downlights — 4 Pack, 6in', 'Recessed Downlights', 4999, true, NULL, 'images/lc-050.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-051', 'Track Lighting Kit — 4-Light', 'Track Lighting', 6999, true, NULL, 'images/lc-051.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-052', 'Under-Cabinet Light Bar — 18in', 'Under-Cabinet Lights', 2499, true, NULL, 'images/lc-052.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-053', 'HomeKit Dimmer Switch', 'Smart Switches', 3499, true, 'Works with Apple Home (HomeKit). Single-pole dimmer switch, no hub needed.', 'images/lc-053.jpg', true, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-054', 'HomeKit On/Off Switch', 'Smart Switches', 2999, true, 'Works with Apple Home (HomeKit). Single-pole on/off switch, no hub needed.', 'images/lc-054.jpg', true, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-055', 'HomeKit 3-Way Dimmer Switch', 'Smart Switches', 3999, true, 'Works with Apple Home (HomeKit). 3-way dimmer switch, no hub needed.', 'images/lc-055.jpg', true, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-056', 'HomeKit Smart Switch — No Neutral Required', 'Smart Switches', 4499, true, 'Works with Apple Home (HomeKit). Smart switch, no neutral wire required, no hub needed.', 'images/lc-056.jpg', true, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-057', 'Screwless Duplex Wall Plate', 'Switch Plates & Covers', 999, true, NULL, 'images/lc-057.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-058', 'Toggle Switch Plate — Single', 'Switch Plates & Covers', 699, true, NULL, 'images/lc-058.jpg', false, 'AliExpress', 'CJ Dropshipping', true),
  ('LC-059', 'Duplex Outlet Cover — 2 Pack', 'Switch Plates & Covers', 799, true, NULL, 'images/lc-059.jpg', false, 'AliExpress', 'CJ Dropshipping', true)
ON CONFLICT (id) DO NOTHING;

-- Verification (run after seeding):
--   SELECT count(*) AS product_count FROM products;  -- expect 59
--   SELECT count(*) FROM products WHERE typical_price = true;  -- expect 59
--   SELECT id, name, category, price_cents FROM products ORDER BY id;
