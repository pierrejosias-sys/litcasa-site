# LitCasa — Monitoring Cron Spec

**Status: SPEC ONLY — DO NOT INSTALL.** This document describes the scheduled
check the fulfillment agent runs. Nothing here has been installed, and no cron
job exists yet. Installing it needs Josias's go (go-live checklist item 7 in
the agent design doc).

Source: `~/workspace/your_files/litcasa-agent-design.md` §4 (Monitoring) and
§1–§3 (intake, fulfillment, support playbook). This spec restates that design
for the Vercel-backend store; where the design doc says "Gmail", the backend
note below explains the Postgres equivalent once the API is live.

---

## Schedule

- **Every 4 hours, 8 AM–8 PM ET — 4 runs per day: 08:00, 12:00, 16:00, 20:00 ET.**
- No overnight runs while the store is small. Tighten to every 2 hours if
  order volume passes ~10 orders/day.
- **One daily summary at 8 PM ET**, inside the 20:00 run: orders today, orders
  shipped, open support threads, any claim-clock warnings.

## What each run does (in order)

1. **New order emails / new paid orders.** Check for new order/payment
   confirmations since the last run's watermark. For each new **paid** order:
   run the intake (§1 of the design doc) — assign the next order ID
   (`LC-YYYYMMDD-NNN`, sequential per day), log it as `new`, verify payment,
   look up each SKU in the SKU sheet (`~/workspace/your_files/litcasa-sku-master.csv`),
   and draft the fulfillment plan (supplier, cost, expected arrival) for
   Josias. Unpaid/failed payments are logged and flagged, **never fulfilled**.
2. **Unread customer emails / new support messages.** Check the support inbox
   for unread mail since the last watermark. Triage each one (order status /
   tracking / damaged-defective / wrong item / return-refund / product
   question / address change / cancel / custom neon / other), look up the
   order, and **draft** a reply for Josias. Damaged/defective reports jump the
   queue — draft first, flag **URGENT**. Response-time target: first reply
   within 24 hours; damaged/defective is same-day.
3. **Claim-clock check.** For any damaged/defective report logged in the last
   7 days, check whether the supplier claim was filed. If a CJ claim is inside
   48 hours of its deadline, flag it **URGENT** to Josias. CJ damage claims
   close fast: **3 days (ordinary) / 7 days (electronics)** from receipt.
4. **Tracking check.** For orders in `shipped` status, check tracking. Mark
   delivered ones `delivered`. Flag any order past its delivery-promise date
   with no delivery. If tracking shows no movement for 7 days, draft a
   follow-up to Josias — do not email the customer a new promise without
   checking the carrier first. Close orders 7 days after delivery with no
   customer complaint.
5. **Report to Josias.** One short message per run: new orders (with
   fulfillment drafts needing approval), new support drafts needing approval,
   any urgent flags. **If nothing is new, stay silent.**

## Bookkeeping (per run)

- **Watermark** (last Gmail message ID / timestamp seen):
  `~/workspace/goals/litcasa/hidden_files/gmail-watermark.json` — created on
  the first run. (No LitCasa goal exists yet; if one is created, move
  bookkeeping under it.)
- **Order log:** `~/workspace/your_files/litcasa-orders.csv` (created on the
  first order) — the single record of what happened to each order. Once the
  Vercel Postgres backend is live, the `orders` table is the record and the
  CSV is kept only as a backup/export.
- **Run log:** append each run (time, orders found, emails found, flags) to
  the daily memory log.

## Backend note (once the Vercel API is live)

The design doc's intake is Gmail-based because the store started as a static
site. With the backend in place, a run should read the same facts from
Postgres instead of (or in addition to) Gmail:

- New paid orders: `orders` table, `payment_status = 'paid'`, created since
  the last run's watermark (or `status = 'new'`).
- New support messages: `support_messages` table, unanswered, since the last
  watermark.
- Order status / tracking: `orders` + `order_items` tables.

The approval gates below do not change when the source changes.

## What the run must NEVER do

- **Never send a customer email without Josias's approval.** Every reply is
  drafted first and shown to Josias. No auto-sending, ever.
- **Never place a supplier order (spend money) without Josias's approval**
  — or a standing approval limit he has set in writing. Each order's supplier
  cost is shown to Josias with the order before it is placed.
- **Never process a refund without approval.** Refunds are drafted with the
  amount and reason; Josias approves, then the refund is processed.
- **Never invent prices, tracking numbers, or delivery dates.** If the
  supplier hasn't given a tracking number, say "not shipped yet." If a cost
  isn't in the SKU sheet, mark it TO CONFIRM and ask. Never promise a delivery
  date for a mixed basket — two suppliers means two shipments, two tracking
  numbers; promise the slowest date.
- **Never guess a voltage or a car fitment.** Answer only from the SKU sheet
  and the supplier listing; if unsure, say so and check first.
- **Never order the same product from two suppliers.** One supplier per SKU;
  the SKU sheet is the source of truth.
- **Never publish Josias's home address.**
- **Never start a paid trial or paid plan** (e.g. Zendrop auto-fulfilment,
  DSers paid tiers) as part of a run.
- **Never fulfill an unpaid order**, and never fulfill a SKU that is still
  `NEEDS SUPPLIER LINK + COST` in the sheet — stop and tell Josias instead.
- **No social media replies.** Email only, until Josias says otherwise.

## Failure handling

- If Gmail is disconnected, report that **once** and stop checking until it is
  fixed.
- If the Postgres/API source is unreachable, report that once and stop until
  it is fixed. Do not retry in a loop and do not fall back to guessing.
- If anything needed for an order is missing (no address, no SKU match,
  custom neon text missing for LC-007), stop on that order and ask Josias —
  do not guess.

## DO NOT INSTALL

This is a spec only. Installing the cron (Vercel Cron, or any scheduler) needs
Josias's explicit go, after the go-live checklist in the agent design doc §7
is complete — supplier accounts, payment processor, SKU sheet completion,
support email decision, and the [TO CONFIRM] policy items.
