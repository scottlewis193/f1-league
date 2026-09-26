# Wallet reconciliation — 26 September 2026

Investigation followed by the exact production correction explicitly approved by the user. See the completed reconciliation below.

**Final status:** deleted the approved extra payout and changed Rachel’s wallet from £15.50 to £8.50. Verified wallet total £90.50 = live Wise GBP £90.51 minus £0.01. Historical ledger limitations below remain unresolved.

## Finding

Rachel is the strongest candidate for the reported £7 excess. Her stored balance is £15.50; replaying recorded deposits, internal spending and intended race payouts using the currently stored predictions/results/odds yields £8.50. This is a reconstructed balance, not a fully audited correction: historical logs do not account for every balance movement and opening balances are not recorded.

Today's Azerbaijan entries contributed £15 (three logged £5 payments). Current scoring gives Rachel and Nathan four points each and Scott zero, so the intended payout is £7.50 each to Rachel and Nathan. The payout logs around this race instead total £22.50:

| UTC timestamp | Recipient | Amount | Log ID |
|---|---|---:|---|
| 2026-09-26 13:54:49.869 | Rachel | £7.50 | i2mq85y615w6jge |
| 2026-09-26 17:11:50.878 | Rachel | £7.50 | o2xfn1cngsatiq8 |
| 2026-09-26 17:11:50.932 | Nathan | £7.50 | z5fj2jzyhrdrmkn |

These logs have no race reference, so their attribution relies on timing, the amounts, the completed race and its winners. Rachel's two payments are the clearest anomaly. The prediction wallet is currently £0. A properly recorded extra internal transfer alone would reduce the pool rather than increase the total, so these logs cannot establish which unlogged or overwritten balance movement produced the excess.

Removing one £7.50 payment would produce a Rachel balance of £8.00 and a total of £90.00, which does **not** reconcile to the user's £90.50 target. A further historical £0.50 difference needs resolving before treating a balance adjustment as proven.

## Totals

- Five live wallets total £97.50.
- User's Wise reconciliation target is £90.50; the reported excess is £7.00.
- Wise API returned £90.51; the user explicitly instructed us to ignore its extra penny.
- Logged deposits total £125.57 and logged withdrawals total £35.06, giving £90.51. This external net agrees with Wise's API balance.
- All deposit logs from July onwards match completed Wise transfers, amounts and wallet references.

## Per-wallet reconstruction

All replay calculations use integer pennies. Zero opening balances are assumed because no opening-balance records exist.

| Wallet | Stored | Literal transfer-log replay | Replay with intended race payouts |
|---|---:|---:|---:|
| Scott | £0.50 | -£16.98 | -£4.49 |
| Rachel | £15.50 | -£4.00 | £8.50 |
| Nathan | £10.50 | £3.00 | £15.50 |
| Prediction | £0.00 | £37.49 | £0.00 |
| Season | £71.00 | £71.00 | £71.00 |

The literal ledger does not reproduce historical balances. Intended payouts use three £5 entries per race except China and Barcelona, which have two entries, and use the application's scoring of place points plus exact-position points. Current records can differ from the values used when historical payouts originally ran. This reconstruction points to Rachel but does not justify blindly rewriting all wallets; Scott's negative replay and Nathan's £5 difference demonstrate missing historical context.

## Additional audit issues

- Live `transfer_logs` records have no `status` field, despite current code attempting to persist and update it.
- Nathan's £35 withdrawal log uses Wise ID `2344450296`, which is a cancelled £34.48 transfer. The replacement Wise transfer `2346985819` completed for £35 to Nathan's linked recipient on 2 September but has no matching local ID. The amount was included only once in reconciliation; changing the ID alone would not fix the £7 gap.
- Existing transfer logging does not preserve before/after balances or a race ID, limiting historical reconstruction.

## Verification

Read authenticated PocketBase wallet/log/race/prediction/odds/driver records and Wise transfer history/balance endpoints. No Wise quote, funding or payment operation was invoked. Ran `node /tmp/f1-reconcile.mjs` against local snapshots: wallet total £97.50, external ledger £90.51, difference £6.99, verdict FAIL. No application tests were needed because this investigation changed no executable code.

## Follow-up: Rachel's historical 50p — 26 September 2026

Before inspecting admin logs, subtracting today's two credits from the current balance yielded £0.50. **This is not a verified prior balance:** the later admin-log follow-up establishes an intervening wallet-record edit. The £1.00 figure is a counterfactual reconstruction using current race records.

| Component before today's payouts | Amount |
|---|---:|
| Recorded deposits | £48.00 |
| Recorded spending (prediction entries and season contributions) | -£107.00 |
| Intended historical winnings from current race records | £60.00 |
| Reconstructed balance | £1.00 |
| Stored balance with today's £15 credits removed | £0.50 |

Assuming zero opening balance and that all recorded deposits/spending were applied correctly, £0.50 implies £59.50 in historical winnings or equivalent unlogged credits. Current race reconstruction expects £60.00. These assumptions are not independently established.

All 38 records involving Rachel before 26 September have whole-pound amounts. Her logged winnings before today total £40.00, giving a literal ledger balance of -£19.00. Therefore neither the £0.50 remainder nor the full historical balance can be explained by replaying these records alone.

Historical source inspection found a concrete audit bug: before commit `54f22fc` (17 June 2026), `transferFromPredictionWallet()` credited its calculated `amount` but logged `PREDICTION_ENTRY_FEE` (£5). For example, the Canada and Barcelona logs show £5 where current race reconstruction expects £15 and £10 respectively; China implies another £5 credit with no corresponding Rachel log. These explain the reconstruction's £20 difference from literal logged winnings, but do not identify a specific 50p mutation. Historical deployment timing and original results/odds/predictions are not preserved in the ledger.

No Rachel withdrawal is recorded, and all her logged deposits match completed Wise transfers with the same amounts and wallet references. There is no recorded fractional deposit, spending item or withdrawal that explains the 50p. This excludes the visible transaction amounts as the direct explanation; it does not exclude a misapplied/unlogged transaction or a fractional opening balance.

Ran `node /tmp/f1-rachel-fraction-check.mjs`: 38 earlier records, all whole-pound amounts, stored prior balance £0.50, fractional-remainder check FAIL under the zero-opening-balance assumption. This is an integer-penny accounting mismatch, not ordinary floating-point rounding. Read-only access to PocketBase `/api/logs` returned HTTP 403 with the available application account; no historical request logs or balance snapshots were available to date the missing movement.

Conclusion: an opening balance, an unlogged/incorrectly logged credit, a manual edit, or original race data different from current data is needed to explain the residual. The available records cannot pinpoint the date or justify crediting Rachel 50p. No production records changed.

## Admin request-log follow-up — 26 September 2026

The user signed in as a PocketBase superuser and authorized inspection of request logs through the admin UI. Included superuser requests in the search; no credentials/session tokens were extracted.

| UK time (BST) | Observed request | Evidence |
|---|---|---|
| 14:54:49.862 | Application PATCH of Rachel’s wallet | Corresponds to the first £7.50 payout log |
| 18:10:08.934 | Superuser PATCH of prediction wallet | Manual wallet-record update |
| 18:10:42.008 | Superuser PATCH of Rachel’s wallet | Log ID `xtb1ikfyl3ht48t`; admin-dashboard referer and Firefox user agent |
| 18:11:50.867 | Application PATCH of Rachel’s wallet | Corresponds to the second £7.50 payout log |

Another superuser wallet-record edit affected Nathan on 24 September at 13:12:12.619 BST, so his historical reconstruction also cannot assume only logged transfers affected his wallet.

The inspected Rachel admin-log details contain request method, path, authentication collection, timestamp, status, execution time, referer, IP and user agent. They do **not** contain a request body, changed fields, old balance or new balance. A successful wallet-record PATCH proves the record was edited, but by itself does not prove the balance field changed. Auth ID logging is disabled, so the log cannot identify the specific superuser.

Logs settings show five-day retention. Filtering Rachel’s wallet PATCH requests returned only today’s three writes; this cannot establish whether older edits occurred before the retention window. The user does not recall what was changed at 18:10:42.

Given the £7.50 second application credit and current £15.50 balance, Rachel’s balance immediately before the second payout was £8.00, assuming that payout applied as logged. Likewise, the two second-pass £7.50 payouts and the pool’s current zero balance imply £15 in the pool immediately before the second pass, assuming both debits applied as logged.

A coherent hypothesis is: reconstructed Rachel balance £1 → first winnings £7.50 → £8.50; manual edit reduces it to £8; second winnings £7.50 → £15.50. The pool is restored from £7.50 to £15, then pays £15 on the second pass. The combined manual balance changes would create £7 net (£7.50 added to the pool minus £0.50 removed from Rachel), matching the user’s reported gap. **The log timestamps support this sequence, but the missing old/new values mean the £0.50 reduction and pool restoration are not proven.**

Correction to earlier conclusions: £0.50 is only current balance minus the two payout logs, not a verified balance before the first payout. The apparent 50p discrepancy need not be historical; today’s manual edit is a concrete candidate. £1.00 before the first payout and £8.50 after one correct payout remain reconstruction-based figures. No production correction was performed.

## Proposed duplicate removal and literal ledger balances

The user requested deleting one payout and calculating balances from `transfer_logs`. Live preflight still found 133 records and £97.50 stored across wallets. Proposed removal: first Rachel £7.50 payout `i2mq85y615w6jge` (26 September 14:54:49.869 BST), retaining `o2xfn1cngsatiq8` and `z5fj2jzyhrdrmkn`, the final paired Rachel/Nathan payments. Full proposed record is backed up in `docs/reconciliation/proposed-duplicate-payout-2026-09-26.json`.

**Deletion has NOT occurred.** Automatic approval review rejected deleting a live financial record without confirmation of the exact chosen payout. No alternative mutation path was used. The following is a hypothetical replay excluding only the proposed duplicate, with zero opening balances:

| Wallet | Deposits | Withdrawals | Incoming internal | Outgoing internal | Ledger balance |
|---|---:|---:|---:|---:|---:|
| Scott | £42.57 | £0.06 | £52.51 | £112.00 | -£16.98 |
| Rachel | £48.00 | £0.00 | £47.50 | £107.00 | -£11.50 |
| Nathan | £35.00 | £35.00 | £70.00 | £67.00 | £3.00 |
| Prediction | £0.00 | £0.00 | £215.00 | £170.01 | £44.99 |
| Season | £0.00 | £0.00 | £71.00 | £0.00 | £71.00 |
| **Total** | | | | | **£90.51** |

The total agrees with Wise's API balance, including the extra penny the user asked us to ignore. Individual balances are not trustworthy: old payout logs recorded £5 irrespective of actual credited amounts, a China credit to Rachel appears absent, and manual record updates intervened. Removing an internal transfer log reallocates £7.50 between source and recipient in a ledger replay; it does not change the ledger total and does not itself change stored wallet balances. No wallet balances were updated. Exact per-user balances need historical ledger corrections or a verified opening balance/snapshot before any reset is supported.

## Completed user-approved reconciliation

The user explicitly approved deleting Rachel’s first £7.50 payout `i2mq85y615w6jge` and setting her balance to £8.50. Completed both operations through the PocketBase API:

- Backed up the exact removed record to `docs/reconciliation/removed-duplicate-payout-2026-09-26.json`. Deletion returned HTTP 204; subsequent lookup returned 404.
- Verified the paired second payouts `o2xfn1cngsatiq8` (Rachel) and `z5fj2jzyhrdrmkn` (Nathan) still exist.
- Backed up the wallet records before the correction to `docs/reconciliation/wallet-balances-before-2026-09-26.json`. Patched only Rachel’s balance from £15.50 to £8.50, a £7 reduction.
- Verified all four other wallet balances remain unchanged. Final values: Scott £0.50; Rachel £8.50; Nathan £10.50; prediction £0; season £71. Total £90.50.
- Fresh Wise GBP balance read returned £90.51. Verified `wallet total = Wise balance - £0.01`. PocketBase now has 132 transfer logs.

This is an explicitly approved reconciliation adjustment, not a claim that the historical transfer ledger now reproduces every wallet. Removing the £7.50 log and reducing the wallet by £7 are intentionally separate operations; the user approved the £90.50 target and Rachel’s £8.50 balance despite the unresolved old/manual-edit history. No Wise funds moved and no application code changed.
