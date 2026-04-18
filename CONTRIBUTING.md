# Contributing

The contribution most needed right now is **adding a hub for your
metro area** so the app works for people there.

## How to add a hub

Open Claude, Codex, Grok, Cursor, or whatever AI agent you use.
Point it at this repo and ask it to add a hub for your city. For
example:

> Read https://github.com/<your-fork>/day-trip-planner and add a
> hub for the Denver area.

The agent will read [`AGENTS.md`](./AGENTS.md) and follow the rules
there: research destinations, write the hub file, run the validator,
and open a PR. Review the PR before merging — agentic doesn't mean
auto-merge.

For now, hubs must be in the continental US (the weather API is
US-only). See `AGENTS.md` §2 for the full constraint.

## Anything else

For bugs, UX polish, or non-hub code changes: open an issue first to
check whether the change fits the project's scope.
