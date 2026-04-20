# Agent instructions: adding a hub

You are an AI agent (Claude, Codex, Grok, Cursor, or anything else)
that has been pointed at this repository and asked to add a new "hub"
— a metro area's worth of curated day-trip destinations. **Read this
file end-to-end before writing any code or doing any research.** The
quality of your output, and whether the maintainer will merge your
PR, depends on following these rules.

If you're a human reading this: this file is the prompt. You don't
need to copy-paste anything. Just ask your AI agent to add a hub for
your area, point it at this repo, and it will read this file and do
the rest.

---

## Prerequisites: what your agent needs

Section §8 below requires real web research. To follow that rule,
your agent must have **web search and web fetch tools enabled** —
e.g. `WebSearch` + `WebFetch` in Claude Code, the Web tool in
claude.ai, comparable tools in Codex / Cursor / Grok / etc. If
those tools are denied or unavailable, **stop and surface the
blocker** rather than fabricating destinations from training-data
recall (which §8 forbids and §10 lists as a PR-rejection criterion).

If you're a human and your agent has flagged a missing tool: enable
it (in claude.ai web, toggle the Web tool; in Claude Code, allowlist
`WebSearch` and `WebFetch` in your `.claude/settings.json` or
approve them when prompted) and re-run.

---

## 0. What you're building

This app shows day trips around a "hub" (a metro area), ranked by
forecast weather. Each hub is a TypeScript file in `src/hubs/` that
exports a `Hub` object: a center coordinate (drive-time anchor) plus
a list of destinations, each with coordinates, reasons-to-visit
tags, and a one-sentence blurb.

The hub you're adding will appear in the area picker dropdown. Users
who pick your hub will see your destinations on the map, ranked by
this weekend's weather.

The reference implementation is **`src/hubs/seattle.ts`**. Read it
once before going further. Your output should look structurally
identical, just for a different metro.

---

## 1. The schema

Authoritative type definitions live in **`src/hubs/types.ts`**. Read
that file. Summary:

```ts
interface Hub {
  id: string;          // kebab-case, unique across all hubs
  name: string;        // casual display label for the area picker
                       //   (e.g. "Austin", "Bay Area", "NYC")
  center: {
    name: string;      // formal anchor-city label, "City, ST" form
                       //   (e.g. "Austin, TX", "San Francisco, CA")
    lat: number;       // decimal degrees, 4 places of precision
    lon: number;
  };
  destinations: Destination[];
}

interface Destination {
  id: string;          // kebab-case, unique within this hub
  name: string;        // self-explanatory map-pin label — see §7.1
  lat: number;
  lon: number;
  elevation_m?: number;  // optional, only set when meaningful (peaks, passes)
  reasons_to_visit: ReasonsToVisit[];  // see §4
  blurb: string;       // one short sentence — see §7.2
}
```

---

## 2. Coverage constraint: continental US only

Weather data comes from `api.weather.gov` (the US National Weather
Service), which only covers the United States. Alaska and Hawaii
work in theory but are out of scope for v1.

**If the user asks for a hub outside the continental US** (Vancouver
BC, London, Tokyo, Mexico City, Anchorage, Honolulu — anything not
in the lower 48 states), do not generate the hub. Reply explaining
the constraint and stop. Do not "try anyway with a different weather
provider" — that's a separate architectural change that needs
maintainer approval.

The validator script enforces this with a continental-US bounding
box; bad coordinates will fail validation.

---

## 3. Hub identity: id, name, and center

Three fields identify a hub. Pick them independently — the display
label and the anchor city don't have to match.

**`hub.id`** — kebab-case URL slug, unique across hubs. Keep it
short if natural. Examples: `austin`, `bay-area`, `nyc`, `la`,
`boston`.

**`hub.name`** — the casual display label shown in the area
dropdown. Use what a local would say, not always the formal city
name:

- `"Austin"`, `"Boston"`, `"Denver"` — city names work when they match
- `"Bay Area"` (not "San Francisco") — the metro is bigger than the city
- `"NYC"` (not "New York") — the abbreviation is how people refer to it
- `"LA"` (not "Los Angeles") — same

**`hub.center`** — the coordinate from which all drive times are
calculated. Pick **downtown coordinates of the most-recognized city
in the metro**, not a personal location, not the geographic centroid
of the destination list, not a suburb.

Examples:
- Austin metro → downtown Austin (~30.2672, -97.7431)
- Bay Area → downtown San Francisco (~37.7749, -122.4194)
- NYC metro → Manhattan (~40.7580, -73.9855)
- Seattle metro → downtown Seattle (~47.6062, -122.3321)

Use 4 decimal places of precision (≈11m accuracy — more than enough
for "approximately downtown").

**`hub.center.name`** — the formal anchor-city label shown in the
map's home-pin tooltip. Always `City, ST` form: `"Austin, TX"`,
`"San Francisco, CA"`, `"New York, NY"`. This is independent of
`hub.name` — a hub can have `name: "Bay Area"` and
`center.name: "San Francisco, CA"`.

---

## 4. The reasons-to-visit taxonomy

There are exactly 18 reasons. The list lives in `ReasonsToVisit` in
`src/hubs/types.ts`. **Do not invent new ones.** If something doesn't
fit, pick the closest match or omit the destination.

A destination usually has 1–4 reasons. Pick the ones that capture
*why someone would drive an hour to be there*, not everything that's
technically true.

Disambiguation rules (the ones that get confused most often):

| Reason | When to use it |
| --- | --- |
| `lake` | A place to look at, sit by, or swim in a lake. |
| `paddle` | You can launch a kayak / canoe / SUP here. |
| `fish` | This is a notable fishing destination. |
| `coast` | Saltwater shoreline (ocean, sound, bay). |
| `island` | Reached by ferry or a place where the island-ness is the point. |
| `viewpoint` | The reward is a view (often paired with `hike` for short summit hikes). |
| `hike` | Trail-walking is a reason to come, not a 2-min stroll from the parking lot. |
| `town` | A small town worth wandering in (not the metro itself). |
| `historic` | Pre-1950 site or preserved area with historical interpretation. |
| `museum` | A formal museum (not "this town has history"). |
| `garden` | Cultivated gardens or seasonal flower fields. |
| `farm` | Working farm or farm-stand / U-pick experience. |
| `volcano` | Active or recently-active volcano (Cascades, Mt St Helens, etc.). |
| `wildlife` | Notable for animal viewing (refuge, raptor flyway, marine mammals). |
| `picnic` | Has picnic facilities AND that's a primary draw (state parks). |
| `zoo` | A zoo or aquarium. |
| `ski` | A ski area (winter) or a place with summer alpine access. |
| `waterfall` | A named waterfall is the destination, not just incidental. |

Many destinations earn 3–4 reasons (a state park with beach + trails
+ picnic + history is reasonable). Don't pad — if `picnic` isn't
specifically a draw, leave it off.

---

## 5. Destination inclusion criteria

A destination belongs in a hub if **all** of these are true:

1. **Driveable as a day trip from the hub center.** Up to ~3 hours
   one-way; the validator enforces a 250 km haversine cap.
2. **A genuine day-trip destination, not a local errand.** The hub
   center is a drive-time *anchor*, not a proxy for where users
   live — users come from across the metro, so a place 20 minutes
   from downtown can still be a day trip for someone in the suburbs.
   The test is whether people drive *to* this place for a day, not
   how far it is from the center.
3. **A recognizable destination, not just a stop on the way.** If
   nobody would drive *to* it as the primary goal, leave it off.
4. **Outdoor-primary OR meaningfully weather-affected.** Indoor
   destinations (museums, zoos) are okay as rainy-day options, but
   most of the list should be places where weather genuinely changes
   whether you'd go.

Aim for **25–40 destinations** per hub. The validator warns under 15.
Don't pad to hit a count — if a metro genuinely has fewer obvious day
trips, that's fine. If you find yourself adding marginal entries to
hit a number, stop.

---

## 6. What NOT to include

- **Chains** (any restaurant, cafe, store that exists in multiple cities).
- **Generic shopping districts** unless the place is the draw (Pike
  Place Market = OK; "downtown Bellevue shopping" = no).
- **Local errands** (a neighborhood park, a farmers market, a trailhead
  with no named draw) — see §5 rule 2 for the test.
- **Pure en-route stops** (gas station with a view, roadside scenic pullout).
- **Speculative or seasonal-only attractions** that are usually closed.
- **The hub city itself.** The whole UI is "drive away from here." Close-in
  suburbs that are genuine day-trip destinations (e.g. Woodinville wine
  country near Seattle) are fine.

---

## Merging vs. keeping separate

When two places are nearby or co-located, the test is whether people
treat them as the *same destination* or *different destinations*.

**Merge** when people always do them together AND one name subsumes
the other's features. The result is one entry named for the broader
feature, with the sub-feature in the blurb (and in the name if both
are recognizable — see §7.1).

- Chuckanut Drive absorbs Larrabee SP — you don't drive Chuckanut
  without stopping at Larrabee.
- Artist Point absorbs Picture Lake — Picture Lake is a 0.5-mi loop
  at the Artist Point trailhead gateway.

**Keep separate** when the activities are distinct even at the same
location.

- Friday Harbor (town, ferry, galleries) + Lime Kiln Point (shore-based
  orca viewing) — both on San Juan Island, different user intents.
- Artist Point (roadside viewpoint + short walks) + Chain Lakes Loop
  (6.5-mi alpine commitment hike) — same trailhead, different day.

**Geographic proximity alone is not grounds for merging.** Two
beaches 5 miles apart with different characters can both stay. What
matters is whether they're one destination in the user's mental
model.

**State parks.** A state park can be its own entry when it has an
independent draw. But when a park's key feature is already named via
another entry (a named waterfall, a historic landmark, the town it
sits in), fold it into that entry rather than listing both.

---

## 7. Names and blurbs

### 7.1 Names

The `name` field is what shows on the map pin and the sidebar
list, so it has to be self-explanatory — a user scanning the list
should recognize what the entry is about *without* reading the
blurb.

Patterns that work:

- **`Feature / Sub-feature`** — two co-located named attractions
  where both are recognizable
  (e.g. `"Chuckanut Drive / Larrabee SP"`,
  `"Artist Point / Picture Lake (Mt Baker)"`,
  `"Lake Serene / Bridal Veil Falls"`).
- **`Feature (Region)`** — feature name alone is ambiguous
  (e.g. `"Artist Point (Mt Baker)"`,
  `"Fort Ebey St Park (Whidbey)"`,
  `"Heybrook Lookout (Index)"`).
- **`City (Anchor1 + Anchor2)`** — the city is the destination but
  specific attractions are the draw, and listing them helps users
  recognize the entry (e.g. `"Waco (Magnolia + Mammoth NM)"`,
  `"Brenham (Blue Bell)"`,
  `"San Antonio (The Alamo + River Walk)"`).
- **Plain town/place name** — when the place itself is the
  destination and no single attraction dominates (e.g.
  `"Fredericksburg"`, `"Bellingham"`, `"Leavenworth"`).

Target ~45 characters or less so the name doesn't wrap in the UI.

### 7.2 Blurb tone

One short sentence (typically 60–120 characters; the validator caps
at 200). Fact-forward. **Do not write marketing copy.** No "amazing,"
"breathtaking," "must-visit," "stunning," "hidden gem," or other
review-site filler. Lead with the concrete thing: a number, a named
feature, an activity, an historical fact.

Models from the Seattle hub:

- `'268-ft waterfall with viewing platforms and a short trail.'`
- `'Iconic steep day hike; sweeping views of the Snoqualmie Valley.'`
- `'Bavarian-themed town in the Cascades; shopping and river walks.'`
- `'Tulip fields every April; farmland, roadside stands, festival gardens.'`

Note the pattern: a noun phrase identifying *what it is*, often
followed by a semicolon and a list of *what you do there*. Aim for
that shape.

---

## 8. Required: do real web research

**Do not generate destinations from training-data recall alone.**
That's how the existing Seattle hub ended up missing whale-watching
trips out of Anacortes (a major regional thing) and the Skagit tulip
festival's specific timing.

Open the web. Search:

- `"day trips from {city}"`
- `"weekend trips near {city}"`
- `"{city} hiking"`, `"{city} state parks"`, `"{city} waterfalls"`
- `"hidden gems near {city}"`
- The state's tourism site (`visit{state}.com`-style URLs)
- `r/{city}` and `r/{state}` for local recommendations

Cross-reference at least 3–5 sources. The goal is a *complete*
list of what people in this metro actually do for day trips, not a
plausible-sounding subset.

### Verify before editing

If a reviewer agent, another source, or your own recollection says
an existing entry has a factual issue, **verify against the primary
source before editing**. Reviewer agents can be confidently wrong
(e.g. one recent review claimed Chisholm Trail wasn't one of
Lockhart's four historic BBQ joints — it is). Check TPWD for Texas
state parks, WTA for Washington hikes, NPS for national park units,
the attraction's own website for hours / features, etc. A bad "fix"
is worse than an original error.

---

## 9. Workflow

1. **Confirm the hub doesn't already exist.** Check `src/hubs/` —
   each hub is one file. If it's there, suggest editing it instead
   of creating a duplicate.
2. **Confirm continental-US coverage** (§2). If not, stop and explain.
3. **Pick the hub center** (§3).
4. **Research destinations** (§5, §6, §8). Aim for 25–40.
5. **Draft `src/hubs/<id>.ts`** following the schema (§1). Use
   `src/hubs/seattle.ts` as the structural template. Hub `id` is
   kebab-case (e.g. `austin`, `bay-area`, `nyc`).
6. **Register the hub in `src/hubs/index.ts`**: import it, append to
   the `HUBS` array. Don't change `defaultHub` unless the maintainer
   asks.
7. **Validate**: `npm run validate-hub <id>`. The script checks all
   the rules in §1, §2, §4, §5, §7. **Aim for 0 errors and 0
   warnings.** Under-threshold warnings ("only N destinations") mean
   "keep researching until you clear 15." Fix every error.
8. **Typecheck**: `npm run typecheck`. Must pass cleanly.
9. **Open a PR.** Title: `Add {Name} hub` (e.g. `Add Austin hub`).
   Body: where you sourced destinations from, anything you were
   uncertain about, anything notable you deliberately excluded.

---

## 10. What gets your PR rejected

- Hub outside the continental US (§2).
- Validator errors not addressed.
- Marketing-tone blurbs (§7).
- Padded destinations or chains (§5, §6).
- Inventing new `reasons_to_visit` values (§4).
- Generated from training-data alone with no evidence of real research (§8).

---

## 11. What gets your PR a thank-you

- Specific local knowledge — places no national list would have, with
  blurbs that show you read about them.
- Clean validator + typecheck on first push.
- A PR description that names your sources and your judgment calls.

---

If anything in this file conflicts with your default behavior or
training, follow this file. The maintainer wrote these rules
specifically for this project.
