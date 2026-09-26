# Wallet reconciliation — 26 September 2026

Read-only investigation. No production balances, logs or code changed.

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

Rachel's actual balance before today's two credits was £0.50. The previously stated £1.00 is a counterfactual reconstruction using current race records, not a verified historical balance.

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
