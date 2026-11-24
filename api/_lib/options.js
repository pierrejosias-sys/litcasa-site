'use strict';

/**
 * LitCasa — configurator options, server side.
 *
 * Mirrors configurator.mjs (SIZE_SETS, FINISHES, and each product's
 * sizeSet / defaultSize / finish). The configurator page is the
 * customer-facing source of truth for option labels and size factors;
 * this file is the server's copy so /api/orders can price configured
 * lines WITHOUT trusting any client-supplied price. If a size label,
 * factor, or product option set changes, update BOTH files.
 *
 * ALL prices here are "Typical price*" placeholders — NOT real
 * supplier prices. The server computes a configured line's unit price
 * as: base price_cents (from the DB) scaled by the size factor ratio
 * (chosen size factor / default size factor), rounded to the cent —
 * the same math as priceFor() in configurator.mjs.
 *
 * Options stored on order_items.options (jsonb) are the NORMALIZED
 * form from normalizeOptions(): only known keys, length-capped,
 * angle-bracket-free, and size/finish validated against this
 * product's own option sets. Unknown or invalid values are dropped
 * (the line then prices at its base typical price), never rejected
 * outright — a bad option must not block a checkout.
 */

const SIZE_SETS = {
  "strip": [
    {
      "label": "16 ft",
      "scale": 0.6,
      "factor": 0.6
    },
    {
      "label": "32 ft",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "65 ft",
      "scale": 1.8,
      "factor": 1.8
    }
  ],
  "stripShort": [
    {
      "label": "10 ft",
      "scale": 0.5,
      "factor": 0.5
    },
    {
      "label": "16 ft",
      "scale": 0.8,
      "factor": 0.8
    },
    {
      "label": "32 ft",
      "scale": 1,
      "factor": 1
    }
  ],
  "bulbPack": [
    {
      "label": "1 pack",
      "scale": 0.7,
      "factor": 0.4
    },
    {
      "label": "2 pack",
      "scale": 0.85,
      "factor": 0.6
    },
    {
      "label": "4 pack",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "6 pack",
      "scale": 1.1,
      "factor": 1.3
    }
  ],
  "neonSize": [
    {
      "label": "12 in",
      "scale": 0.7,
      "factor": 0.6
    },
    {
      "label": "24 in",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "36 in",
      "scale": 1.3,
      "factor": 1.5
    }
  ],
  "stringLen": [
    {
      "label": "25 ft",
      "scale": 0.6,
      "factor": 0.6
    },
    {
      "label": "48 ft",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "72 ft",
      "scale": 1.4,
      "factor": 1.4
    }
  ],
  "panelSize": [
    {
      "label": "1×2 ft",
      "scale": 0.7,
      "factor": 0.7
    },
    {
      "label": "1×4 ft",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "2×2 ft",
      "scale": 1.1,
      "factor": 1.2
    }
  ],
  "hexPack": [
    {
      "label": "3 pack",
      "scale": 0.7,
      "factor": 0.6
    },
    {
      "label": "7 pack",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "10 pack",
      "scale": 1.25,
      "factor": 1.4
    }
  ],
  "floodWatt": [
    {
      "label": "50 W",
      "scale": 0.8,
      "factor": 0.7
    },
    {
      "label": "100 W",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "200 W",
      "scale": 1.25,
      "factor": 1.6
    }
  ],
  "packCount": [
    {
      "label": "2 pack",
      "scale": 0.8,
      "factor": 0.6
    },
    {
      "label": "4 pack",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "8 pack",
      "scale": 1.2,
      "factor": 1.7
    }
  ],
  "growWatt": [
    {
      "label": "60 W",
      "scale": 0.8,
      "factor": 0.7
    },
    {
      "label": "100 W",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "200 W",
      "scale": 1.3,
      "factor": 1.7
    }
  ],
  "oneSize": [
    {
      "label": "One size",
      "scale": 1,
      "factor": 1
    }
  ],
  "chandelierDia": [
    {
      "label": "18 in",
      "scale": 0.8,
      "factor": 0.8
    },
    {
      "label": "24 in",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "36 in",
      "scale": 1.3,
      "factor": 1.5
    }
  ],
  "pendantCount": [
    {
      "label": "Single",
      "scale": 0.8,
      "factor": 0.6
    },
    {
      "label": "3-light",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "5-light",
      "scale": 1.2,
      "factor": 1.5
    }
  ],
  "ceilingDia": [
    {
      "label": "11 in",
      "scale": 0.85,
      "factor": 0.85
    },
    {
      "label": "13 in",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "15 in",
      "scale": 1.15,
      "factor": 1.15
    }
  ],
  "vanityLen": [
    {
      "label": "18 in",
      "scale": 0.8,
      "factor": 0.8
    },
    {
      "label": "24 in",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "36 in",
      "scale": 1.3,
      "factor": 1.35
    }
  ],
  "lampSize": [
    {
      "label": "Table",
      "scale": 0.85,
      "factor": 0.8
    },
    {
      "label": "Floor",
      "scale": 1.15,
      "factor": 1.4
    }
  ],
  "trackLen": [
    {
      "label": "2 ft",
      "scale": 0.6,
      "factor": 0.7
    },
    {
      "label": "4 ft",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "8 ft",
      "scale": 1.6,
      "factor": 1.6
    }
  ],
  "gang": [
    {
      "label": "1-gang",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "2-gang",
      "scale": 1.15,
      "factor": 1.3
    },
    {
      "label": "3-gang",
      "scale": 1.3,
      "factor": 1.6
    }
  ],
  "plateSize": [
    {
      "label": "Standard",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "Midsize",
      "scale": 1.1,
      "factor": 1.15
    },
    {
      "label": "Jumbo",
      "scale": 1.2,
      "factor": 1.3
    }
  ],
  "wireLen": [
    {
      "label": "25 ft",
      "scale": 0.7,
      "factor": 0.7
    },
    {
      "label": "50 ft",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "100 ft",
      "scale": 1.3,
      "factor": 1.6
    }
  ],
  "wattPSU": [
    {
      "label": "60 W",
      "scale": 0.85,
      "factor": 0.8
    },
    {
      "label": "120 W",
      "scale": 1,
      "factor": 1
    },
    {
      "label": "240 W",
      "scale": 1.2,
      "factor": 1.5
    }
  ]
};;

const FINISHES = {
  "switchFinish": [
    "White",
    "Black"
  ],
  "plateFinish": [
    "White",
    "Black",
    "Ivory"
  ]
};;

// Product id -> configurator option set. Generated from configurator.mjs
// (do not hand-edit: regenerate from the configurator data instead).
const PRODUCT_OPTIONS = {
  "LC-001": {
    "sizeSet": "strip",
    "defaultSize": 1
  },
  "LC-002": {
    "sizeSet": "strip",
    "defaultSize": 0
  },
  "LC-003": {
    "sizeSet": "stripShort",
    "defaultSize": 1
  },
  "LC-004": {
    "sizeSet": "bulbPack",
    "defaultSize": 2
  },
  "LC-005": {
    "sizeSet": "bulbPack",
    "defaultSize": 3
  },
  "LC-006": {
    "sizeSet": "bulbPack",
    "defaultSize": 1
  },
  "LC-007": {
    "sizeSet": "neonSize",
    "defaultSize": 1
  },
  "LC-008": {
    "sizeSet": "neonSize",
    "defaultSize": 1
  },
  "LC-009": {
    "sizeSet": "strip",
    "defaultSize": 0
  },
  "LC-010": {
    "sizeSet": "stringLen",
    "defaultSize": 1
  },
  "LC-011": {
    "sizeSet": "stringLen",
    "defaultSize": 0
  },
  "LC-012": {
    "sizeSet": "stringLen",
    "defaultSize": 2
  },
  "LC-013": {
    "sizeSet": "panelSize",
    "defaultSize": 1
  },
  "LC-014": {
    "sizeSet": "hexPack",
    "defaultSize": 1
  },
  "LC-015": {
    "sizeSet": "panelSize",
    "defaultSize": 0
  },
  "LC-016": {
    "sizeSet": "packCount",
    "defaultSize": 2
  },
  "LC-017": {
    "sizeSet": "floodWatt",
    "defaultSize": 1
  },
  "LC-018": {
    "sizeSet": "packCount",
    "defaultSize": 1
  },
  "LC-019": {
    "sizeSet": "oneSize",
    "defaultSize": 0
  },
  "LC-020": {
    "sizeSet": "stripShort",
    "defaultSize": 1
  },
  "LC-021": {
    "sizeSet": "vanityLen",
    "defaultSize": 1
  },
  "LC-022": {
    "sizeSet": "strip",
    "defaultSize": 1
  },
  "LC-023": {
    "sizeSet": "growWatt",
    "defaultSize": 1
  },
  "LC-024": {
    "sizeSet": "growWatt",
    "defaultSize": 0
  },
  "LC-025": {
    "sizeSet": "oneSize",
    "defaultSize": 0
  },
  "LC-026": {
    "sizeSet": "oneSize",
    "defaultSize": 0
  },
  "LC-027": {
    "sizeSet": "wireLen",
    "defaultSize": 1
  },
  "LC-028": {
    "sizeSet": "oneSize",
    "defaultSize": 0
  },
  "LC-029": {
    "sizeSet": "oneSize",
    "defaultSize": 0
  },
  "LC-030": {
    "sizeSet": "wattPSU",
    "defaultSize": 0
  },
  "LC-031": {
    "sizeSet": "wattPSU",
    "defaultSize": 2
  },
  "LC-032": {
    "sizeSet": "chandelierDia",
    "defaultSize": 1
  },
  "LC-033": {
    "sizeSet": "chandelierDia",
    "defaultSize": 1
  },
  "LC-034": {
    "sizeSet": "chandelierDia",
    "defaultSize": 1
  },
  "LC-035": {
    "sizeSet": "pendantCount",
    "defaultSize": 0
  },
  "LC-036": {
    "sizeSet": "pendantCount",
    "defaultSize": 1
  },
  "LC-037": {
    "sizeSet": "pendantCount",
    "defaultSize": 0
  },
  "LC-038": {
    "sizeSet": "packCount",
    "defaultSize": 0
  },
  "LC-039": {
    "sizeSet": "oneSize",
    "defaultSize": 0
  },
  "LC-040": {
    "sizeSet": "packCount",
    "defaultSize": 0
  },
  "LC-041": {
    "sizeSet": "ceilingDia",
    "defaultSize": 2
  },
  "LC-042": {
    "sizeSet": "ceilingDia",
    "defaultSize": 1
  },
  "LC-043": {
    "sizeSet": "ceilingDia",
    "defaultSize": 0
  },
  "LC-044": {
    "sizeSet": "vanityLen",
    "defaultSize": 1
  },
  "LC-045": {
    "sizeSet": "vanityLen",
    "defaultSize": 2
  },
  "LC-046": {
    "sizeSet": "stripShort",
    "defaultSize": 0
  },
  "LC-047": {
    "sizeSet": "lampSize",
    "defaultSize": 0
  },
  "LC-048": {
    "sizeSet": "lampSize",
    "defaultSize": 0
  },
  "LC-049": {
    "sizeSet": "lampSize",
    "defaultSize": 1
  },
  "LC-050": {
    "sizeSet": "ceilingDia",
    "defaultSize": 0
  },
  "LC-051": {
    "sizeSet": "trackLen",
    "defaultSize": 1
  },
  "LC-052": {
    "sizeSet": "vanityLen",
    "defaultSize": 0
  },
  "LC-053": {
    "sizeSet": "gang",
    "defaultSize": 0,
    "finish": "switchFinish"
  },
  "LC-054": {
    "sizeSet": "gang",
    "defaultSize": 0,
    "finish": "switchFinish"
  },
  "LC-055": {
    "sizeSet": "gang",
    "defaultSize": 0,
    "finish": "switchFinish"
  },
  "LC-056": {
    "sizeSet": "gang",
    "defaultSize": 0,
    "finish": "switchFinish"
  },
  "LC-057": {
    "sizeSet": "plateSize",
    "defaultSize": 0,
    "finish": "plateFinish"
  },
  "LC-058": {
    "sizeSet": "plateSize",
    "defaultSize": 0,
    "finish": "plateFinish"
  },
  "LC-059": {
    "sizeSet": "plateSize",
    "defaultSize": 0,
    "finish": "plateFinish"
  }
};;

/** Size options (labels + price factors) for one product, or null. */
function sizeOptionsFor(productId) {
  const cfg = PRODUCT_OPTIONS[productId];
  if (!cfg) return null;
  return SIZE_SETS[cfg.sizeSet] || SIZE_SETS.oneSize;
}

/** Stable key for comparing two normalized option sets. */
function optionsKey(options) {
  if (!options) return '';
  return Object.keys(options)
    .filter((k) => options[k] !== undefined && options[k] !== null)
    .sort()
    .map((k) => k + '=' + JSON.stringify(options[k]))
    .join('|');
}

/**
 * Normalize raw client-supplied options for one product.
 * Returns null when nothing usable remains (plain line).
 * Never throws on bad input — invalid values are dropped.
 */
function normalizeOptions(productId, raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const cfg = PRODUCT_OPTIONS[productId] || null;
  const sizes = cfg ? (SIZE_SETS[cfg.sizeSet] || SIZE_SETS.oneSize) : null;
  const finishes = cfg && cfg.finish ? (FINISHES[cfg.finish] || null) : null;
  const strip = (s) => String(s).replace(/[<>]/g, '').slice(0, 40);
  const out = {};
  if (typeof raw.color === 'string' && raw.color.trim()) out.color = strip(raw.color);
  if (typeof raw.size === 'string' && sizes) {
    // Only a real label from this product's size set counts — anything
    // else is dropped, so the line prices at its base typical price.
    const label = raw.size.trim();
    if (sizes.some((s) => s.label === label)) out.size = label;
  }
  if (Number.isFinite(+raw.brightness)) {
    out.brightness = Math.max(0, Math.min(100, Math.round(+raw.brightness)));
  }
  if (typeof raw.finish === 'string' && finishes) {
    const f = raw.finish.trim();
    if (finishes.includes(f)) out.finish = f;
  }
  if (typeof raw.customText === 'string' && raw.customText.trim()) {
    out.customText = String(raw.customText).replace(/[<>]/g, '').slice(0, 24);
  }
  // NOTE: a client-supplied unitPrice is NEVER accepted — the server
  // recomputes the price from the DB base price and the size factor.
  return Object.keys(out).length ? out : null;
}

/**
 * Scaled unit price (integer cents) for a configured line.
 * Same math as priceFor() in configurator.mjs: base price scaled by
 * (chosen size factor / default size factor), rounded to the cent.
 * Falls back to the base price when there is no size or it is unknown.
 */
function scaledUnitPriceCents(baseCents, productId, options) {
  if (!options || !options.size) return baseCents;
  const cfg = PRODUCT_OPTIONS[productId];
  if (!cfg) return baseCents;
  const sizes = SIZE_SETS[cfg.sizeSet] || SIZE_SETS.oneSize;
  const chosen = sizes.find((s) => s.label === options.size);
  const base = sizes[cfg.defaultSize ?? 0];
  if (!chosen || !base || !base.factor) return baseCents;
  return Math.round(baseCents * (chosen.factor / base.factor));
}

/**
 * True when the live database has the order_items.options column.
 * The column ships in db/schema.sql; until that migration has been
 * run in the Vercel Query editor, orders still work — options are
 * simply not persisted on the line (pricing is unaffected, since
 * unit_price_cents is computed server-side either way).
 */
async function hasOptionsColumn(sql) {
  const { rows } = await sql`SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_items' AND column_name = 'options' LIMIT 1`;
  return rows.length > 0;
}

module.exports = {
  SIZE_SETS,
  FINISHES,
  PRODUCT_OPTIONS,
  sizeOptionsFor,
  optionsKey,
  normalizeOptions,
  scaledUnitPriceCents,
  hasOptionsColumn,
};
