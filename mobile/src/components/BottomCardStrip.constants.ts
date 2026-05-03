// Layout constants for BottomCardStrip — extracted so smoke tests can
// import them without pulling in the JSX component tree.

import { spacing } from '../theme/spacing';

export const CARD_WIDTH = 260;
const GAP = spacing.sm; // 8pt
export const SNAP_INTERVAL = CARD_WIDTH + GAP;
