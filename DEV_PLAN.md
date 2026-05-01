# Mobile dev plan: agent dispatch and testing playbook

Operational companion to `MOBILE_PLAN.md`. The design doc is the
contract (architecture, schemas, PASS criteria). This doc is the
playbook (which agent to dispatch, in what order, with what
prompt, gated on what).

**Scope:** drives the work from Phase 0 dispatch to Phase 5 device
sign-off. Testing is woven through every phase via smoke tests +
validators + a final reviewer; no separate test plan is needed.

**Reading order:** read `MOBILE_PLAN.md` first. This doc references
its sections and prompts (Appendix A). It does not duplicate them.

---

## 1. Roles

Five agent roles. Each has a fixed prompt template (see
`MOBILE_PLAN.md` Appendix A) and a fixed scope. Roles are stateless
between phases except via the `FIX_LOG.md` scratchpad.

| Role | Model | When dispatched | Tools needed |
|---|---|---|---|
| **Developer** | sonnet (opus for Phase 1) | Once per phase, first | All file/edit/bash tools |
| **Validator** | sonnet | After developer completes | Read, Bash, Grep |
| **Fix** | sonnet (opus for Phase 1) | After any validator FAIL | All file/edit/bash tools |
| **Reviewer** | opus | After validator final PASS | Read, Grep |
| **Phase 5 checklist generator** | sonnet | Once, before user runs device build | Read, Write |

**Why opus only for Phase 1 and Reviewer:** Phase 1 is the highest-
risk phase (bridge protocol, recovery semantics, sprite rendering)
and benefits from stronger reasoning. Reviewer's job is finding
runtime-break risks the validator can't catch — also reasoning-heavy.
Other phases are mechanical enough that sonnet handles them well at
lower cost.

---

## 2. Phase dispatch sequence

```
Phase 0  ──→  Phase 1  ──→  Phase 2  ──→  Phase 2.5  ──┐
                                                        │
                                                        ▼
        ┌───────────────────────────────────────────────┐
        │   Phase 3 (parallel ×5)                       │
        │   3a, 3b, 3c, 3d, 3e fan out simultaneously   │
        │   merge-conflict validator gates fan-in       │
        └───────────────────────────────────────────────┘
                                                        │
                                ┌───────────────────────┴───────────────────────┐
                                │                                               │
                                ▼                                               ▼
                          Phase 4 (iPhone)                              Phase 4b (iPad)
                                │                                               │
                                └───────────────────┬───────────────────────────┘
                                                    │
                                                    ▼
                                              Phase 5 (human)
```

Sequential gates (no skipping, no overlap):
- Phase 0 must PASS before Phase 1 starts (workspace + Sentry foundation).
- Phase 1 must PASS before Phase 2 (bridge contract is needed for store's MapPin selector).
- Phase 2 must PASS before Phase 2.5 (selectors must exist before being frozen).
- Phase 2.5 must PASS before any Phase 3 agent dispatches (frozen primitives).
- All five Phase 3 agents must PASS individually + merge-conflict validator must PASS before Phase 4 / 4b.
- Phase 4 (iPhone) and Phase 4b (iPad) run in parallel; both must PASS before Phase 5 entry gate runs.

---

## 3. Per-phase dispatch detail

For each phase, this table tells me exactly what to run.

### Phase 0 — Scaffold

| Step | Action |
|---|---|
| 0.1 | Dispatch **Developer** with `MOBILE_PLAN.md` Appendix A "Phase 0 scaffold agent" prompt |
| 0.2 | Wait for completion. Read developer's report for transcripts. |
| 0.3 | Dispatch **Validator** with the general validator prompt + `phase: 0` |
| 0.4 | If FAIL: dispatch **Fix** with cited issues. Re-run 0.3. Repeat ≤ 3. |
| 0.5 | On final PASS, dispatch **Reviewer** with `phase: 0`. |
| 0.6 | If reviewer flags issues: 1 fix pass charged to global cap. |
| 0.7 | Phase 0 sign-off: notify user "Phase 0 complete". |

**Estimated agent dispatches:** 2–4 (1 dev + 1 validator + 0–2 fix + 1 reviewer).

### Phase 1 — Map WebView

| Step | Action |
|---|---|
| 1.1 | Dispatch **Developer (opus)** with Appendix A "Phase 1 map WebView agent" prompt |
| 1.2 | Wait for completion. Verify `mobile/scripts/build-map-html.ts` and `build-sprites.ts` produced expected outputs. |
| 1.3 | Dispatch **Validator**. |
| 1.4 | If FAIL: **Fix (opus)**. Repeat ≤ 3. |
| 1.5 | **Reviewer (opus)** — special focus on outbox/seq logic, recovery branches, sprite generation correctness. |
| 1.6 | Sign-off → user. |

**Estimated dispatches:** 3–5 (Phase 1 has the most surface area; expect at least one fix pass).

### Phase 2 — State

| Step | Action |
|---|---|
| 2.1 | Dispatch **Developer** with Appendix A "Phase 2 state agent" prompt |
| 2.2 | Validator runs three smoke tests + content checks. |
| 2.3 | Fix loop ≤ 3. |
| 2.4 | Reviewer focus: race conditions in setHub→setWeatherForDest, MMKV first-render hydration boundary. |
| 2.5 | Sign-off → user. |

**Estimated dispatches:** 2–4.

### Phase 2.5 — Shared primitives lock

| Step | Action |
|---|---|
| 2.5.1 | Dispatch **Developer** with Appendix A "Phase 2.5 primitives lock agent" prompt |
| 2.5.2 | Verify `check-frozen.sh` is installed and `git config core.hooksPath` set. |
| 2.5.3 | Validator runs (small command set). |
| 2.5.4 | Reviewer is light — primarily checking the freeze guard works. |
| 2.5.5 | Sign-off → user. **This is the parallelism gate.** |

**Estimated dispatches:** 2.

### Phase 3 — Component fan-out (PARALLEL)

| Step | Action |
|---|---|
| 3.0 | Confirm Phase 2.5 PASSed; frozen-file guard active. |
| 3.1 | Dispatch **5 Developer agents in parallel**, one per component group (3a–3e). Each prompt is the Appendix A "Phase 3 component agent" template, parameterized per agent (component paths, store slices to read, theme tokens, allowed file list). |
| 3.2 | Each agent runs to completion independently. Wait for all 5. |
| 3.3 | Dispatch **Validator (per component)**, in parallel. Each runs the per-component checks. |
| 3.4 | For any FAILs: dispatch **Fix** for that component. Each fix loop is independent (per-component 3-pass cap). |
| 3.5 | Once all components PASS, run the **merge-conflict validator**: `git merge-tree HEAD <all 5 branches pairwise>`. Any non-trivial overlap → escalate (manual merge required). |
| 3.6 | Dispatch **Reviewer (single, opus)** for the integrated set. |
| 3.7 | Sign-off → user. |

**Estimated dispatches:** 10–15 (5 dev + 5 validator + 0–5 fix + 1 reviewer + 1 merge validator).

**Coordination invariants:**
- Each Phase 3 agent works on its own git branch (`phase3a`, `phase3b`, ...).
- Frozen-file pre-commit guard prevents accidental modification.
- No agent reads another agent's branch — they only read frozen contracts.
- Merge happens once, after all 5 PASS, into a single `phase3-merged` branch.

### Phase 4 + 4b — Integration (iPhone parallel iPad)

| Step | Action |
|---|---|
| 4.0 | Merge `phase3-merged` into main. Confirm typecheck. Branch `phase4-phone` and `phase4b-ipad` off main. |
| 4.1 | Dispatch **2 Developer agents in parallel, single message**: Phase 4 (iPhone) prompt and Phase 4b (iPad) prompt. They commit to separate branches. |
| 4.2 | Each agent runs to completion independently. Wait for both. |
| 4.3 | Dispatch **2 Validators in parallel**, one per phase. |
| 4.4 | Independent fix loops per phase, ≤ 3 each. |
| 4.5 | When both PASS, merge `phase4-phone` then `phase4b-ipad` into main. The two phases touch only one shared file (`mobile/App.tsx` — the layout switch); resolve any conflict in App.tsx by keeping the runtime switch logic from Phase 4b. |
| 4.6 | Run combined validator: typecheck, expo export, cross-phase regression. |
| 4.7 | **Reviewer (opus)** — focus: `AppState` listener correctness, deep-link hydration order, hub-switch flow under fast taps, iPad layout reflow on rotation, Slide Over fallback. |
| 4.8 | Sign-off → user. |

**Estimated dispatches:** 5–8 (2 dev + 2 validator + 0–4 fix + 1 reviewer + 1 combined validator).

**Coordination invariants for parallel 4 / 4b:**
- Phase 4 owns `MainScreenPhone.tsx`. Phase 4b owns `MainScreenIPad.tsx` and `IPadDetailPanel.tsx`.
- Both modify `mobile/App.tsx`, but only Phase 4b adds the layout-switch logic; Phase 4 should leave a stub that imports `MainScreenPhone` directly. Merge resolves to Phase 4b's switch.
- Neither phase modifies frozen files or Phase 3 components.

### Phase 5 — Device validation

| Step | Action |
|---|---|
| 5.0 | Run entry gate (cross-phase regression + frozen guard + expo export). Block if any fails. |
| 5.1 | Dispatch **Phase 5 checklist generator** to produce `mobile/TEST_CHECKLIST.md`. |
| 5.2 | Notify user: "Phase 5 ready. Build and walk the checklist." |
| 5.3 | User runs `cd mobile && npx expo run:ios` or EAS Build → TestFlight. |
| 5.4 | User reports FAIL item numbers. |
| 5.5 | Dispatch **Fix** per failed item. Each fix re-runs the entry gate (rollback rule). |
| 5.6 | User re-tests. Loop until launch criteria met (`MOBILE_PLAN.md` §11). |

**Estimated dispatches:** 1 (checklist) + N (fixes per device-found issue) — N is unknown until devices are tested.

---

## 4. Parallel dispatch coordination (Phase 3)

The five agents in Phase 3 are the only parallel work. They must
fan out cleanly and fan back in cleanly.

### Fan-out

```
git branch phase3a; git branch phase3b; ...; git branch phase3e
Dispatch 5 agents in a SINGLE message with 5 Agent tool calls
(per the parent-agent-tool-use rules — single message for parallel).
Each agent receives:
  - Its component scope (subset of components to port)
  - Its allowed-file list (its own component files only)
  - Its store slices/selectors (read-only narrow list)
  - The frozen contract paths (read-only)
  - The git branch to commit to
```

### Fan-in

```
1. Wait for all 5 to report done.
2. Run validators in parallel, one per component (5 in single message).
3. Resolve each component's fix loop independently.
4. When all 5 PASS: merge phase3a → phase3b → ... → phase3e into
   phase3-merged, running typecheck after each merge.
5. Run merge-conflict validator (git merge-tree pairs).
6. Reviewer agent walks the integrated set.
```

**Branch hygiene:**
- All 5 branches are based off the same Phase 2.5 commit.
- Frozen-file guard prevents any agent from drifting outside its scope.
- If two agents independently write the same shared file (which the
  forbidden-list should prevent), the merge fails and we escalate.

---

## 5. Testing strategy

Testing is woven through every phase, not deferred to the end.

| Layer | What | When | Who |
|---|---|---|---|
| **Typecheck** | `tsc --noEmit` across web + mobile workspaces | Every phase validator | Validator |
| **Smoke tests** | `__tests__/<phase>.smoke.test.ts` runtime invariants | Phase 1, 2, 4 | Validator runs `npm test` |
| **Smoke content checks** | `grep` for asserted symbol inside test file | Same phases | Validator |
| **Cross-phase regression** | Re-run all prior phases' typecheck + smoke | Every phase from Phase 1 onward | Validator |
| **Frozen-file guard** | Pre-commit hook fails on unauthorized changes | Every commit after Phase 2.5 | git hook |
| **Merge-conflict validator** | `git merge-tree` on all phase3 branch pairs | Phase 3 fan-in | Standalone validator dispatch |
| **Reviewer pass** | Reads diff, finds runtime-break risks | After validator final PASS, every phase | Reviewer agent |
| **Bridge harness** | Mocked WebView, asserts handshake / outbox / seq | Phase 1 smoke test | Validator |
| **Race harness** | Hub A → switch → assert hub-A drops | Phase 2 smoke test | Validator |
| **Derived snapshot** | Fixture in → `selectFilteredRows` matches web logic | Phase 2 smoke test | Validator |
| **Linking parser** | `dtp://hub/seattle?reasons=hike,lake` parses | Phase 2 smoke test | Validator |
| **Integration flow** | Hub-switch chain has named symbols | Phase 4 smoke test | Validator |
| **Device manual** | 10-item checklist on real iOS + Android | Phase 5 | User |

**No tests defer to Phase 5.** If a behavior cannot be verified in a
smoke test, it surfaces in the Phase 5 checklist as a manual item.

---

## 6. Failure handling

### Inside a phase

```
Validator FAIL (pass N)  ──→  Fix (must touch only cited files, ≤200 LoC)
                              │
                              ▼
                          Validator (pass N+1)
                              │
                              ├─ PASS → Reviewer
                              └─ FAIL → loop back if N+1 < 3
                                        else escalate to user
```

### Reviewer-triggered fix

Charged to the same 3-pass budget. Reviewer's fix-spec is treated
as another validator FAIL with cited issues. Fix agent applies, then
validator + reviewer re-run.

### Cross-phase regression

If a Phase 4 fix breaks a Phase 1 smoke test, that's a regression
FAIL. The fix must be amended or reverted. Frozen-file guard catches
the egregious case (modifying bridge protocol).

### Escalation to user

3-pass cap exhausted. Fix agent emits final FIX_LOG entry:
- Failing check IDs
- What was tried each pass (with diff hashes)
- Hypothesis for why it's stuck
- Specific human input needed

User decision: amend plan, manually patch, or skip.

### Phase 5 fix loop

Same 3-pass cap per reported item. Each fix re-runs the entry gate
(`MOBILE_PLAN.md` §6 Phase 5). Re-breaking a prior phase's smoke
test triggers automatic revert.

---

## 7. User touchpoints

| When | What | Form |
|---|---|---|
| Phase 0 kickoff | "Proceed?" | One-line confirmation |
| Each phase complete | Sign-off on validator final PASS report | One word ("next") |
| Any 3-pass escalation | Read fix log, decide | Could be hours of work |
| Phase 5 ready | Build + walk checklist on iPhone, Android | Hour or two of device time |
| Phase 5 fixes | Re-run failing checklist items | Minutes per item |
| Launch | Confirm §11 criteria met | Read final report |

**Total estimated user time across all phases:** under 4 hours, most
of it in Phase 5 device testing. Phases 0–4 should each be a 1-line
sign-off after reading a structured PASS report.

---

## 8. Tooling and infrastructure

Beyond the standard Claude Code agent tooling, this work requires:

- **Repo:** existing day-trip-planner monorepo, npm workspaces enabled in Phase 0.
- **Mobile dev environment:** Xcode 16+ for iOS builds; Android Studio for Android builds. Required only at Phase 5.
- **EAS account:** for cloud builds and TestFlight distribution. Provisioning is deferred to launch (§12 of MOBILE_PLAN.md).
- **Apple Developer Program account:** required for TestFlight. User-supplied.
- **Google Play Console account:** required for internal testing track. User-supplied.
- **Sentry account + DSN:** required for crash measurement (§11 launch criterion). Free tier sufficient.
- **Git pre-commit hooks:** installed in Phase 2.5 via `mobile/scripts/check-frozen.sh`.

No CI/CD pipeline is assumed. The agentic loop runs locally; the
user can configure CI later if desired (the validator commands are
all CI-friendly).

---

## 9. Decision log (locked)

These decisions are closed for v1. Agents do not re-litigate.

- Hybrid architecture: native shell + WebView map.
- Map: MapLibre GL JS in WebView (not MapLibre RN).
- State: Zustand + MMKV (not Redux, not AsyncStorage).
- Shared code: npm workspace `@dtp/core` (not sync-shared script).
- iPad: tablet-optimized two-pane layout (Phase 4b runs parallel to Phase 4).
- iPad multi-window scenes, hardware-keyboard shortcuts: out of scope v1.
- Android tablet: phone-compat in v1.
- Push, geolocation, tile pre-cache: out of scope v1.
- Crash reporting: Sentry, installed Phase 0.
- Deep linking: `dtp://hub/<id>?reasons=<csv>`.
- Pin rendering: GeoJSON symbol layer with sprite sheet (not text-field, not DOM markers).
- Bridge handshake: map-first (`MAP_READY` before `INIT`).
- Frozen-file guard: pre-commit hook installed Phase 2.5.

If during dev a real blocker forces revisiting any of these, an
agent escalates via the 3-pass cap mechanism. Decisions are not
quietly mutated.

---

## 10. Go/No-go

Before dispatching Phase 0, this checklist must be true:

- [ ] User has read `MOBILE_PLAN.md` and `DEV_PLAN.md` and signed off.
- [ ] User has confirmed v1 scope (`MOBILE_PLAN.md` §12) — particularly the deferral of push / geolocation / tile pre-cache, iPad multi-window, and Android tablet.
- [ ] User understands their touchpoints (this doc §7).
- [ ] Repo is in clean state on `main` (no uncommitted work).

When all four are true, the next message is "proceed with Phase 0"
and I dispatch the Phase 0 scaffold agent.
