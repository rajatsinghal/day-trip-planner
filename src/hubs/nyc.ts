import type { Hub } from './types';

// NYC metro hub. Center is midtown Manhattan per AGENTS.md §3 (downtown
// of the most-recognized city in the metro). Destinations cluster in
// five day-trippable rings: the Hudson Valley / Hudson Highlands (Cold
// Spring, Beacon, Storm King, West Point, Hyde Park), the Catskills
// (Kaaterskill, Phoenicia, Hunter, Woodstock), the Shawangunks /
// Ulster County (New Paltz, Minnewaska, Mohonk), Long Island (Jones
// Beach, Fire Island, Montauk, North Fork, Oyster Bay), and the
// Jersey / PA arc (Sandy Hook, Asbury Park, Delaware Water Gap,
// Princeton, Philadelphia, Grounds For Sculpture) plus coastal CT
// (New Haven, Mystic). Saratoga Springs and Lake George fall outside
// the 250 km cap.
export const nycHub: Hub = {
  id: 'nyc',
  name: 'NYC',
  center: {
    name: 'New York, NY',
    lat: 40.758,
    lon: -73.9855,
  },
  destinations: [
    // --- Hudson Highlands / Lower Hudson Valley ---
    {
      id: 'cold-spring',
      name: 'Cold Spring',
      lat: 41.4187,
      lon: -73.9593,
      reasons_to_visit: ['town', 'historic', 'hike'],
      blurb:
        'Walkable Main Street on the east bank of the Hudson; antique shops, riverfront park, Hudson Highlands trailheads.',
    },
    {
      id: 'breakneck-ridge',
      name: 'Breakneck Ridge (Hudson Highlands)',
      lat: 41.4481,
      lon: -73.9758,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        'Scramble up a 1,260-ft ridge with Hudson views; trail closed 2025–2027 for the Fjord Trail connector — check status first.',
    },
    {
      id: 'boscobel',
      name: 'Boscobel House and Gardens',
      lat: 41.4272,
      lon: -73.9451,
      reasons_to_visit: ['historic', 'museum', 'garden', 'viewpoint'],
      blurb:
        '1808 Federal-period mansion overlooking Constitution Marsh and West Point; Hudson Valley Shakespeare Festival in summer.',
    },
    {
      id: 'beacon',
      name: 'Beacon (Dia:Beacon + Mt Beacon)',
      lat: 41.5049,
      lon: -73.9699,
      reasons_to_visit: ['town', 'museum', 'hike'],
      blurb:
        'Dia:Beacon minimalist art in a former Nabisco factory, Main Street galleries, steep hike to the Mt Beacon fire tower.',
    },
    {
      id: 'storm-king',
      name: 'Storm King Art Center',
      lat: 41.4251,
      lon: -74.0593,
      reasons_to_visit: ['museum'],
      blurb:
        '500-acre outdoor sculpture park with large-scale Calder, Serra, di Suvero; bike rentals, seasonal shuttle from Beacon.',
    },
    {
      id: 'west-point',
      name: 'West Point (US Military Academy)',
      lat: 41.3915,
      lon: -73.9567,
      reasons_to_visit: ['historic', 'museum', 'viewpoint'],
      blurb:
        'Guided bus tour of the oldest continuously occupied military post in the US; West Point Museum and Trophy Point overlook.',
    },
    {
      id: 'bear-mountain-sp',
      name: 'Bear Mountain St Park',
      lat: 41.3131,
      lon: -73.9887,
      elevation_m: 391,
      reasons_to_visit: ['hike', 'viewpoint', 'picnic', 'zoo'],
      blurb:
        'Perkins Memorial Tower summit with four-state views; Hessian Lake loop, trailside museum + zoo, Appalachian Trail crossing.',
    },
    {
      id: 'harriman-sp',
      name: 'Harriman St Park',
      lat: 41.2531,
      lon: -74.1264,
      reasons_to_visit: ['hike', 'lake', 'picnic'],
      blurb:
        "NY's second-largest state park: 200+ mi of trails, 31 lakes, swimming at Lake Welch and Lake Sebago.",
    },
    {
      id: 'sleepy-hollow',
      name: 'Sleepy Hollow / Tarrytown',
      lat: 41.0862,
      lon: -73.8587,
      reasons_to_visit: ['historic', 'town'],
      blurb:
        "Washington Irving's Sunnyside, Sleepy Hollow Cemetery, Philipsburg Manor, and the Old Dutch Church; Kykuit tours suspended for 2026.",
    },

    // --- Upper Hudson Valley / Dutchess County ---
    {
      id: 'fdr-home',
      name: 'FDR Home / Presidential Library (Hyde Park)',
      lat: 41.7686,
      lon: -73.9337,
      reasons_to_visit: ['historic', 'museum'],
      blurb:
        "Springwood: FDR's birthplace, the first presidential library, and the Roosevelt gravesite in the rose garden.",
    },
    {
      id: 'vanderbilt-mansion',
      name: 'Vanderbilt Mansion (Hyde Park)',
      lat: 41.8006,
      lon: -73.9319,
      reasons_to_visit: ['historic', 'museum', 'garden'],
      blurb:
        '54-room Beaux-Arts country house by McKim, Mead & White; formal Italian gardens and Hudson River bluff walk.',
    },
    {
      id: 'rhinebeck',
      name: 'Rhinebeck',
      lat: 41.926,
      lon: -73.9123,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        'Dutchess County village with the 1766 Beekman Arms (oldest continuously operating inn in the US) and a weekly farmers market.',
    },
    {
      id: 'innisfree-garden',
      name: 'Innisfree Garden (Millbrook)',
      lat: 41.7957,
      lon: -73.6459,
      reasons_to_visit: ['garden'],
      blurb:
        '150-acre cup garden around Tyrrel Lake, designed by Lester Collins on Chinese scroll-painting principles; Wed–Sun, May–Oct.',
    },
    {
      id: 'hudson-ny',
      name: 'Hudson, NY',
      lat: 42.2528,
      lon: -73.7907,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        'Former whaling port on the east bank; Warren Street antique shops, galleries, Olana viewpoint across the river.',
    },

    // --- Shawangunks / Ulster ---
    {
      id: 'new-paltz',
      name: 'New Paltz',
      lat: 41.7476,
      lon: -74.0868,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        '17th-century Huguenot Street stone houses, SUNY campus, farm-to-table main street at the foot of the Shawangunks.',
    },
    {
      id: 'mohonk-preserve',
      name: 'Mohonk Preserve (The Gunks)',
      lat: 41.7624,
      lon: -74.1677,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        "8,000-acre Shawangunk preserve adjacent to Mohonk Mountain House; trad climbing at 'the Gunks', carriage-road loops.",
    },
    {
      id: 'minnewaska-sp',
      name: 'Minnewaska St Park Preserve',
      lat: 41.7258,
      lon: -74.2394,
      reasons_to_visit: ['hike', 'lake', 'viewpoint', 'waterfall'],
      blurb:
        'Shawangunk ridge preserve with three sky lakes, Awosting and Rainbow Falls, 50 mi of carriage roads and 35 mi of footpaths.',
    },

    // --- Catskills ---
    {
      id: 'kaaterskill-falls',
      name: 'Kaaterskill Falls',
      lat: 42.1957,
      lon: -74.0641,
      reasons_to_visit: ['waterfall', 'hike', 'viewpoint'],
      blurb:
        'Two-tier 260-ft waterfall, highest cascade in NY; accessible from the Laurel House overlook or a 1.6-mi trail to the base.',
    },
    {
      id: 'hunter-mountain',
      name: 'Hunter Mountain',
      lat: 42.2031,
      lon: -74.2294,
      elevation_m: 1234,
      reasons_to_visit: ['ski', 'viewpoint', 'hike'],
      blurb:
        "Vail-owned Catskills ski resort; summer Skyride to NY's highest fire tower (4,040 ft) and NY Zipline Adventure Tours canopy courses.",
    },
    {
      id: 'phoenicia',
      name: 'Phoenicia (Esopus tubing)',
      lat: 42.0826,
      lon: -74.3152,
      reasons_to_visit: ['town', 'paddle'],
      blurb:
        'Catskills village with Town Tinker tube rental on the Esopus Creek class-II whitewater; Empire State Railway Museum.',
    },
    {
      id: 'woodstock-ny',
      name: 'Woodstock, NY',
      lat: 42.0412,
      lon: -74.1179,
      reasons_to_visit: ['town'],
      blurb:
        'Tinker Street galleries, Bearsville Theater, Overlook Mountain trailhead; not the actual 1969 concert site.',
    },
    {
      id: 'bethel-woods',
      name: 'Bethel Woods (1969 Woodstock site)',
      lat: 41.7023,
      lon: -74.8782,
      reasons_to_visit: ['museum', 'historic'],
      blurb:
        'Museum and preserved festival field at the actual 1969 Woodstock site in Sullivan County; amphitheater concerts in summer.',
    },

    // --- Long Island ---
    {
      id: 'jones-beach',
      name: 'Jones Beach St Park',
      lat: 40.5982,
      lon: -73.5117,
      reasons_to_visit: ['coast', 'picnic'],
      blurb:
        '6.5 mi of Atlantic beach on a barrier island, a 2-mi boardwalk, Art Deco bathhouses; summer concert amphitheater.',
    },
    {
      id: 'robert-moses-sp',
      name: 'Robert Moses SP / Fire Island Lighthouse',
      lat: 40.6277,
      lon: -73.2546,
      reasons_to_visit: ['coast', 'historic'],
      blurb:
        "Drive-to beach on Fire Island's west end; 168-ft Fire Island Lighthouse is a 0.75-mi walk east from Field 5.",
    },
    {
      id: 'fire-island-sunken-forest',
      name: 'Sunken Forest (Fire Island NS)',
      lat: 40.6558,
      lon: -73.0781,
      reasons_to_visit: ['coast', 'hike', 'island'],
      blurb:
        '40-acre 300-year-old maritime holly forest reached only by the Sayville ferry to Sailors Haven; half-mile boardwalk loop.',
    },
    {
      id: 'sagamore-hill',
      name: 'Sagamore Hill (Oyster Bay)',
      lat: 40.8866,
      lon: -73.5024,
      reasons_to_visit: ['historic', 'museum'],
      blurb:
        "Theodore Roosevelt's home 1885-1919, 'Summer White House' during his presidency; 83-acre NHS with hunting-trophy North Room and salt-marsh trail.",
    },
    {
      id: 'planting-fields',
      name: 'Planting Fields / Coe Hall',
      lat: 40.8711,
      lon: -73.5408,
      reasons_to_visit: ['garden', 'historic'],
      blurb:
        "409-acre Gold Coast arboretum; Tudor Revival Coe Hall, the Northeast's largest camellia collection, Italian Blue Pool garden.",
    },
    {
      id: 'montauk-point',
      name: 'Montauk Point Lighthouse',
      lat: 41.0712,
      lon: -71.8575,
      reasons_to_visit: ['coast', 'historic', 'viewpoint'],
      blurb:
        '1796 lighthouse commissioned by George Washington; first public works project in the US, climbable tower at the eastern tip.',
    },
    {
      id: 'sag-harbor',
      name: 'Sag Harbor',
      lat: 40.997,
      lon: -72.2977,
      reasons_to_visit: ['town', 'historic', 'coast'],
      blurb:
        "Former whaling port on Long Island's South Fork; Whaling Museum, Main Street bookshops, working marina, Havens Beach walk.",
    },
    {
      id: 'greenport-north-fork',
      name: 'Greenport / North Fork wineries',
      lat: 41.1032,
      lon: -72.362,
      reasons_to_visit: ['town', 'farm', 'coast'],
      blurb:
        "Working waterfront village at the end of the LIRR; the North Fork's 40+ wineries and farm stands line Route 25 west.",
    },

    // --- New Jersey coast / shore ---
    {
      id: 'sandy-hook',
      name: 'Sandy Hook (Gateway NRA)',
      lat: 40.4299,
      lon: -73.9821,
      reasons_to_visit: ['coast', 'historic', 'wildlife'],
      blurb:
        '7-mi barrier-beach NPS unit; 1764 Sandy Hook Lighthouse (oldest working lighthouse in the US) and Fort Hancock; Seastreak ferry from Manhattan.',
    },
    {
      id: 'asbury-park',
      name: 'Asbury Park',
      lat: 40.2204,
      lon: -74.0121,
      reasons_to_visit: ['coast', 'town', 'historic'],
      blurb:
        'Restored boardwalk with the Stone Pony, Convention Hall, Wonder Bar; music scene that launched Springsteen and Southside Johnny.',
    },
    {
      id: 'island-beach-sp',
      name: 'Island Beach St Park',
      lat: 39.802,
      lon: -74.0873,
      reasons_to_visit: ['coast', 'wildlife', 'fish'],
      blurb:
        "10 mi of undeveloped barrier island with NJ's largest osprey colony; surf fishing for striped bass and bluefish.",
    },
    {
      id: 'cape-may',
      name: 'Cape May',
      lat: 38.9351,
      lon: -74.906,
      reasons_to_visit: ['coast', 'town', 'historic', 'wildlife'],
      blurb:
        "Victorian seaside town on NJ's southern tip; 1859 Cape May Lighthouse, fall raptor migration at Cape May Point, warmer water than the north shore.",
    },

    // --- Inland NJ / PA / Bucks County ---
    {
      id: 'delaware-water-gap',
      name: 'Delaware Water Gap NRA',
      lat: 40.9709,
      lon: -75.1324,
      reasons_to_visit: ['hike', 'waterfall', 'paddle', 'viewpoint'],
      blurb:
        "Kittatinny Ridge river gap; Mt Tammany loop (3.6 mi) and the Dingmans Falls boardwalk to PA's second-tallest waterfall.",
    },
    {
      id: 'new-hope-lambertville',
      name: 'New Hope, PA / Lambertville, NJ',
      lat: 40.3634,
      lon: -74.9508,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        'Paired river towns on the Delaware; antique row on the NJ side, galleries and the 1867 mule-drawn canal towpath on the PA side.',
    },
    {
      id: 'grounds-for-sculpture',
      name: 'Grounds For Sculpture (Hamilton, NJ)',
      lat: 40.2269,
      lon: -74.7108,
      reasons_to_visit: ['museum', 'garden'],
      blurb:
        '42-acre outdoor sculpture park founded by Seward Johnson; 270+ contemporary works, arboretum plantings, six indoor galleries.',
    },
    {
      id: 'princeton',
      name: 'Princeton',
      lat: 40.3573,
      lon: -74.6672,
      reasons_to_visit: ['town', 'historic', 'museum'],
      blurb:
        '1746 Gothic Revival campus; Nassau Hall, the Princeton University Art Museum, Palmer Square shops, Princeton Battlefield SP.',
    },
    {
      id: 'philadelphia',
      name: 'Philadelphia (Old City)',
      lat: 39.9496,
      lon: -75.15,
      reasons_to_visit: ['historic', 'museum', 'town'],
      blurb:
        'Independence Hall, the Liberty Bell, Reading Terminal Market, the Philadelphia Museum of Art; ~95 mi via I-95 or Acela.',
    },

    // --- Connecticut ---
    {
      id: 'new-haven',
      name: 'New Haven / Yale',
      lat: 41.3083,
      lon: -72.9279,
      reasons_to_visit: ['town', 'historic', 'museum'],
      blurb:
        'Yale campus; Yale University Art Gallery + Center for British Art, Peabody Museum, East Rock summit, apizza on Wooster Street.',
    },
    {
      id: 'mystic-ct',
      name: 'Mystic (Seaport + Aquarium)',
      lat: 41.3543,
      lon: -71.9661,
      reasons_to_visit: ['town', 'historic', 'museum', 'zoo'],
      blurb:
        'Mystic Seaport Museum with the last wooden whaling ship afloat (Charles W. Morgan); Mystic Aquarium beluga whales and sea lions.',
    },
  ],
};
