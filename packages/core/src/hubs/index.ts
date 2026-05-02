import { austinHub } from './austin';
import { bayAreaHub } from './bay-area';
import { bostonHub } from './boston';
import { denverHub } from './denver';
import { laHub } from './la';
import { nycHub } from './nyc';
import { seattleHub } from './seattle';
import type { Hub } from './types';

// Registry of all hubs. Adding a new hub = create the file in this
// directory, import it, and append to HUBS. The agent flow described in
// AGENTS.md does both steps automatically when generating a hub.
export const HUBS: Hub[] = [
  seattleHub,
  austinHub,
  bayAreaHub,
  nycHub,
  denverHub,
  laHub,
  bostonHub,
];

export const HUBS_BY_ID = new Map<string, Hub>(HUBS.map((h) => [h.id, h]));

export const defaultHub: Hub = seattleHub;

export type { Hub, Destination, ReasonsToVisit } from './types';
