import type { Hub } from './types';

// Boston metro hub. Center is downtown Boston per AGENTS.md §3. Destinations
// span the North Shore (Salem, Cape Ann — Rockport/Gloucester/Essex,
// Ipswich/Crane, Newburyport/Plum Island, Lowell, Saugus), the Concord
// and Lexington revolutionary corridor, the South Shore (Blue Hills,
// World's End, Adams NHP, Plymouth), Cape Cod (Falmouth/Woods Hole,
// Provincetown, Wellfleet, Chatham), the islands (Martha's Vineyard and
// Nantucket, both via Cape ferries), southern NH/ME (Portsmouth,
// York/Nubble, Ogunquit, Mt Monadnock), RI/CT (Newport, Providence,
// Mystic), and the central/western belt (Sturbridge, Mt Wachusett,
// Purgatory Chasm, Historic Deerfield, Shelburne Falls,
// Stockbridge/Lenox/Tanglewood, MASS MoCA, Mt Greylock). Boston Harbor
// Islands (Spectacle + Georges) round out the list. Acadia, the White
// Mountains, and Montreal sit outside the 250 km haversine cap and are
// intentionally excluded; Portland ME is within range but left off as a
// weekend trip rather than a day trip (~2 hr drive each way, with
// Ogunquit and York/Nubble covering coastal southern Maine).
export const bostonHub: Hub = {
  id: 'boston',
  name: 'Boston',
  center: {
    name: 'Boston, MA',
    lat: 42.3601,
    lon: -71.0589,
  },
  destinations: [
    {
      id: 'salem',
      name: 'Salem (Peabody Essex + 7 Gables)',
      lat: 42.5195,
      lon: -70.8967,
      reasons_to_visit: ['town', 'historic', 'museum'],
      blurb:
        '1692 witch-trial port; Peabody Essex Museum holds the original court documents, plus the 1668 House of the Seven Gables.',
    },
    {
      id: 'marblehead',
      name: 'Marblehead',
      lat: 42.5001,
      lon: -70.8578,
      reasons_to_visit: ['town', 'historic', 'coast'],
      blurb:
        'Colonial fishing port with 1600s houses, Fort Sewall headland, and the "Spirit of \'76" at Abbott Hall.',
    },
    {
      id: 'rockport',
      name: 'Rockport (Motif No. 1)',
      lat: 42.6637,
      lon: -70.6175,
      reasons_to_visit: ['town', 'coast'],
      blurb:
        'Bearskin Neck galleries and the red fishing shack Motif No. 1 — reputed the most-painted building in America.',
    },
    {
      id: 'gloucester',
      name: 'Gloucester (Cape Ann whale watch)',
      lat: 42.6159,
      lon: -70.6620,
      reasons_to_visit: ['town', 'coast', 'wildlife'],
      blurb:
        'Working fishing port and whale-watch fleet to Stellwagen Bank; Fishermen\'s Memorial and Rocky Neck art colony.',
    },
    {
      id: 'essex',
      name: 'Essex (antiques + fried clams)',
      lat: 42.6320,
      lon: -70.7830,
      reasons_to_visit: ['town'],
      blurb:
        '"America\'s Antique Capital" with 30+ shops in one mile; Woodman\'s claims to have invented the fried clam here in 1916.',
    },
    {
      id: 'crane-beach',
      name: 'Crane Beach / Castle Hill (Ipswich)',
      lat: 42.6836,
      lon: -70.7673,
      reasons_to_visit: ['coast', 'historic', 'wildlife'],
      blurb:
        'Four miles of dune-backed beach plus the 1929 Crane Estate mansion and Grand Allee; piping plover nesting area.',
    },
    {
      id: 'newburyport',
      name: 'Newburyport',
      lat: 42.8126,
      lon: -70.8773,
      reasons_to_visit: ['town', 'historic', 'coast'],
      blurb:
        'Federal-era seaport at the mouth of the Merrimack; brick downtown, waterfront boardwalk, Maudslay SP across the river.',
    },
    {
      id: 'plum-island',
      name: 'Plum Island / Parker River NWR',
      lat: 42.7495,
      lon: -70.7879,
      reasons_to_visit: ['wildlife', 'coast', 'hike'],
      blurb:
        '4,600-acre federal refuge on a barrier island; 300+ bird species, piping plover nesting, beach and salt-marsh boardwalks.',
    },
    {
      id: 'concord-nb',
      name: 'Concord / Walden / Minute Man NHP',
      lat: 42.4697,
      lon: -71.3507,
      reasons_to_visit: ['historic', 'hike', 'lake'],
      blurb:
        'North Bridge "shot heard \'round the world," 5-mi Battle Road, and Thoreau\'s Walden Pond 2 miles south.',
    },
    {
      id: 'lexington',
      name: 'Lexington Battle Green',
      lat: 42.4493,
      lon: -71.2305,
      reasons_to_visit: ['historic'],
      blurb:
        'Triangular green where the first Revolutionary War shots were fired on April 19, 1775; Buckman Tavern and visitor center.',
    },
    {
      id: 'lowell-nhp',
      name: 'Lowell NHP',
      lat: 42.6450,
      lon: -71.3118,
      reasons_to_visit: ['historic', 'museum'],
      blurb:
        'Restored 19th-century mill city on the Merrimack; Boott Cotton Mills weave room, canal boat rides, Kerouac sites.',
    },
    {
      id: 'saugus-iron',
      name: 'Saugus Iron Works NHS',
      lat: 42.4686,
      lon: -71.0091,
      reasons_to_visit: ['historic', 'museum'],
      blurb:
        'Reconstructed 1646 blast furnace, forge, and rolling mill — the first integrated ironworks in English North America.',
    },
    {
      id: 'blue-hills',
      name: 'Blue Hills Reservation',
      lat: 42.2110,
      lon: -71.1147,
      elevation_m: 194,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        '7,000-acre reservation 10 mi south of downtown; 125 mi of trails, Great Blue Hill summit, 1885 weather observatory.',
    },
    {
      id: 'worlds-end',
      name: "World's End (Hingham)",
      lat: 42.2577,
      lon: -70.8701,
      reasons_to_visit: ['hike', 'coast', 'viewpoint'],
      blurb:
        'Olmsted-designed carriage paths over drumlins at the mouth of Hingham Harbor; 4.5 mi of trails, Boston skyline views.',
    },
    {
      id: 'adams-nhp',
      name: 'Adams NHP (Quincy)',
      lat: 42.2565,
      lon: -71.0118,
      reasons_to_visit: ['historic', 'museum'],
      blurb:
        'Birthplaces of John and John Quincy Adams plus the Old House; Stone Library holds 14,000+ volumes in 12 languages.',
    },
    {
      id: 'plymouth',
      name: 'Plymouth (Plimoth Patuxet + Rock)',
      lat: 41.9584,
      lon: -70.6620,
      reasons_to_visit: ['historic', 'museum', 'town'],
      blurb:
        'Plymouth Rock, the Mayflower II replica at State Pier, and the Plimoth Patuxet living-history village 3 miles south.',
    },
    {
      id: 'spectacle-island',
      name: 'Spectacle Island (Harbor Islands)',
      lat: 42.3255,
      lon: -70.9867,
      reasons_to_visit: ['island', 'coast', 'hike'],
      blurb:
        '30-min ferry from Long Wharf to a 114-acre former dump rebuilt with Big Dig fill; beaches, 5 mi of paths, skyline views.',
    },
    {
      id: 'georges-island',
      name: "Georges Island (Fort Warren)",
      lat: 42.3199,
      lon: -70.9304,
      reasons_to_visit: ['island', 'historic'],
      blurb:
        '45-min harbor ferry to 1833 Fort Warren, a Civil War prison and National Historic Landmark on a 39-acre island.',
    },
    {
      id: 'woods-hole-falmouth',
      name: 'Woods Hole / Falmouth',
      lat: 41.5246,
      lon: -70.6728,
      reasons_to_visit: ['town', 'coast'],
      blurb:
        'Oceanographic village at the MV ferry dock; WHOI, the 10-mi Shining Sea bike path, Nobska Light, Falmouth Main Street.',
    },
    {
      id: 'marthas-vineyard',
      name: "Martha's Vineyard (Oak Bluffs)",
      lat: 41.4552,
      lon: -70.5619,
      reasons_to_visit: ['island', 'town', 'coast'],
      blurb:
        '45-min Steamship Authority ferry from Woods Hole; gingerbread cottages in Oak Bluffs, Edgartown harbor, Aquinnah cliffs.',
    },
    {
      id: 'nantucket',
      name: 'Nantucket',
      lat: 41.2835,
      lon: -70.0995,
      reasons_to_visit: ['island', 'town', 'coast', 'historic'],
      blurb:
        '1-hr fast ferry from Hyannis to the cobblestoned former whaling capital; Whaling Museum and 14 mi of beach.',
    },
    {
      id: 'provincetown',
      name: 'Provincetown (Pilgrim Monument)',
      lat: 42.0494,
      lon: -70.1810,
      reasons_to_visit: ['town', 'coast', 'historic'],
      blurb:
        '252-ft granite Pilgrim Monument, Commercial Street galleries, Race Point dune beach; 90-min fast ferry from Seaport.',
    },
    {
      id: 'wellfleet-ccns',
      name: 'Wellfleet (Cape Cod NS)',
      lat: 41.9136,
      lon: -69.9733,
      reasons_to_visit: ['coast', 'hike', 'wildlife'],
      blurb:
        'Marconi Beach dune cliffs, the 1.25-mi Atlantic White Cedar Swamp boardwalk, and Wellfleet Bay Audubon oyster flats.',
    },
    {
      id: 'chatham',
      name: 'Chatham (Cape Cod elbow)',
      lat: 41.6711,
      lon: -69.9500,
      reasons_to_visit: ['town', 'coast', 'wildlife'],
      blurb:
        'Chatham Light, Fish Pier seal watching, and the Monomoy NWR barrier islands on the Cape\'s elbow.',
    },
    {
      id: 'portsmouth-nh',
      name: 'Portsmouth, NH (Strawbery Banke)',
      lat: 43.0718,
      lon: -70.7572,
      reasons_to_visit: ['town', 'historic', 'museum'],
      blurb:
        'Tidewater port at the Piscataqua; Strawbery Banke\'s 10-acre outdoor museum of 40+ houses from the 1690s onward.',
    },
    {
      id: 'york-nubble',
      name: 'York, ME (Nubble Light)',
      lat: 43.1653,
      lon: -70.5914,
      reasons_to_visit: ['coast', 'historic', 'town'],
      blurb:
        '1879 Cape Neddick Light on its own rocky island; Long Sands Beach, York Village colonial district nearby.',
    },
    {
      id: 'ogunquit',
      name: 'Ogunquit, ME (Marginal Way)',
      lat: 43.2510,
      lon: -70.5884,
      reasons_to_visit: ['coast', 'town', 'hike'],
      blurb:
        '1.25-mi paved cliff walk from downtown to Perkins Cove; 3.5-mi Ogunquit Beach barrier bar at the Josias River mouth.',
    },
    {
      id: 'newport-ri',
      name: 'Newport, RI (Cliff Walk + mansions)',
      lat: 41.4700,
      lon: -71.2975,
      reasons_to_visit: ['town', 'historic', 'coast'],
      blurb:
        '3.5-mi Cliff Walk past Gilded Age mansions — the Breakers, Marble House, Elms — plus 10-mi Ocean Drive loop.',
    },
    {
      id: 'providence',
      name: 'Providence, RI',
      lat: 41.8240,
      lon: -71.4128,
      reasons_to_visit: ['town', 'museum', 'historic'],
      blurb:
        'RISD Museum, Benefit Street\'s Federal-era row, Roger Williams Park Zoo; WaterFire lights 80 braziers on select nights.',
    },
    {
      id: 'mystic-ct',
      name: 'Mystic, CT (Seaport + Aquarium)',
      lat: 41.3715,
      lon: -71.9661,
      reasons_to_visit: ['museum', 'historic', 'town'],
      blurb:
        'Mystic Seaport\'s 19th-century shipyard village and tall ships; Mystic Aquarium with belugas and Robert Ballard exhibits.',
    },
    {
      id: 'sturbridge',
      name: 'Sturbridge (Old Sturbridge Village)',
      lat: 42.1076,
      lon: -72.0923,
      reasons_to_visit: ['historic', 'museum', 'town'],
      blurb:
        "New England's largest living-history museum; 40+ 1790s–1830s buildings, working farms, water-powered mills on 200 acres.",
    },
    {
      id: 'mt-wachusett',
      name: 'Mt Wachusett (Princeton)',
      lat: 42.4902,
      lon: -71.8862,
      elevation_m: 611,
      reasons_to_visit: ['hike', 'viewpoint', 'ski'],
      blurb:
        '2,006-ft peak with 17 mi of trails and an auto road to the summit; 27-trail ski area on the north slope in winter.',
    },
    {
      id: 'mt-monadnock',
      name: 'Mt Monadnock, NH',
      lat: 42.8605,
      lon: -72.1085,
      elevation_m: 965,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        '3,165-ft bald granite summit; the 3.9-mi White Dot/White Cross loop is the classic 3–5 hr round trip.',
    },
    {
      id: 'purgatory-chasm',
      name: 'Purgatory Chasm (Sutton)',
      lat: 42.1287,
      lon: -71.7115,
      reasons_to_visit: ['hike'],
      blurb:
        'Quarter-mile glacial cleft with 70-ft granite walls; short scramble trails named the Corn Crib, Coffin, and Lovers\' Leap.',
    },
    {
      id: 'historic-deerfield',
      name: 'Historic Deerfield',
      lat: 42.5473,
      lon: -72.6073,
      reasons_to_visit: ['historic', 'museum'],
      blurb:
        'Mile-long 17th-century street in the Pioneer Valley; 11 house museums spanning the 1730s–1840s.',
    },
    {
      id: 'shelburne-falls',
      name: 'Shelburne Falls (Mohawk Trail)',
      lat: 42.6056,
      lon: -72.7395,
      reasons_to_visit: ['town', 'garden'],
      blurb:
        '1908 Bridge of Flowers over the Deerfield River plus 50 glacial potholes carved into the riverbed below.',
    },
    {
      id: 'stockbridge',
      name: 'Stockbridge (Norman Rockwell)',
      lat: 42.2733,
      lon: -73.3290,
      reasons_to_visit: ['town', 'museum'],
      blurb:
        '574 Rockwell originals on a 36-acre Berkshire campus with his moved-in studio; Main Street unchanged since he painted it.',
    },
    {
      id: 'lenox-tanglewood',
      name: 'Lenox (Tanglewood + The Mount)',
      lat: 42.3442,
      lon: -73.3060,
      reasons_to_visit: ['town', 'garden', 'museum'],
      blurb:
        'BSO\'s summer home since 1937 on a lawn over Stockbridge Bowl; Edith Wharton\'s 1902 estate The Mount is 2 mi south.',
    },
    {
      id: 'mass-moca',
      name: 'MASS MoCA (North Adams)',
      lat: 42.7011,
      lon: -73.1134,
      reasons_to_visit: ['museum', 'town'],
      blurb:
        '250,000 sq ft of contemporary art in a converted 19th-century factory; Sol LeWitt wall-drawing retrospective on permanent view.',
    },
    {
      id: 'mt-greylock',
      name: 'Mt Greylock',
      lat: 42.6376,
      lon: -73.1658,
      elevation_m: 1064,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        "Massachusetts' highest peak at 3,489 ft; summit road, War Memorial tower, and Appalachian Trail through the reservation.",
    },
  ],
};
