import type { Hub } from './types';

// Bay Area hub. Center is downtown San Francisco per AGENTS.md §3 —
// the hub name is "Bay Area" (what locals call the metro) but the
// drive-time anchor is SF. Destinations span Marin + West Marin
// (Muir Woods, Mt Tam, Marin Headlands, Point Reyes, Stinson/Bolinas,
// Angel Island, Sausalito), the Sonoma Coast and wine country (Sonoma
// Plaza, Healdsburg, Armstrong Redwoods, Bodega Bay, Jenner, Jack
// London SHP), Napa Valley (Napa, Calistoga geothermal), the East Bay
// (Mt Diablo, Tilden, Mission Peak, Livermore wine, Oakland Zoo), the
// Peninsula (Filoli, Half Moon Bay, Pigeon Point, Año Nuevo,
// Pescadero, Purisima Creek), the Santa Cruz Mountains (Big Basin,
// Castle Rock, Henry Cowell/Roaring Camp, Hakone Gardens), Santa
// Cruz + Wilder Ranch, the Monterey Peninsula (Aquarium, 17-Mile
// Drive, Carmel, Point Lobos), and the inland outliers (Pinnacles
// NP, San Juan Bautista). Tahoe, Yosemite, and Big Sur south of
// Point Lobos all fall outside the 250 km haversine cap.
export const bayAreaHub: Hub = {
  id: 'bay-area',
  name: 'Bay Area',
  center: {
    name: 'San Francisco, CA',
    lat: 37.7749,
    lon: -122.4194,
  },
  destinations: [
    {
      id: 'muir-woods',
      name: 'Muir Woods NM',
      lat: 37.8961,
      lon: -122.5817,
      reasons_to_visit: ['hike'],
      blurb:
        'Old-growth coast redwoods on 554 acres of Mt Tamalpais; parking and shuttle reservations required year-round.',
    },
    {
      id: 'mt-tamalpais',
      name: 'Mt Tamalpais SP (East Peak)',
      lat: 37.9236,
      lon: -122.5796,
      elevation_m: 784,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        '2,571-ft Marin summit; Verna Dunshee loop and short Plank Walk to the CCC-era Gardner Fire Lookout, 360° bay views.',
    },
    {
      id: 'marin-headlands',
      name: 'Marin Headlands (Point Bonita + Rodeo Beach)',
      lat: 37.8266,
      lon: -122.5009,
      reasons_to_visit: ['coast', 'hike', 'historic', 'viewpoint'],
      blurb:
        'Battery Spencer Golden Gate overlook, pebbled Rodeo Beach, and the 1855 Point Bonita Lighthouse via a suspension bridge.',
    },
    {
      id: 'sausalito',
      name: 'Sausalito',
      lat: 37.8591,
      lon: -122.4853,
      reasons_to_visit: ['town', 'coast'],
      blurb:
        'Waterfront Marin town reached by ferry; houseboat colony, Bay Model visitor center, and harbor-view boutiques.',
    },
    {
      id: 'angel-island',
      name: 'Angel Island SP',
      lat: 37.8610,
      lon: -122.4311,
      reasons_to_visit: ['island', 'hike', 'historic', 'viewpoint'],
      blurb:
        'Ferry-only bay island; 5-mile Perimeter Road loop, Mt Caroline Livermore summit, and the Immigration Station museum.',
    },
    {
      id: 'stinson-beach',
      name: 'Stinson Beach',
      lat: 37.9002,
      lon: -122.6413,
      reasons_to_visit: ['coast', 'picnic'],
      blurb:
        '3-mile sandy beach below Mt Tam; lifeguarded swimming May–Sept, surfing, tide-pooling, and Parkside picnic tables.',
    },
    {
      id: 'bolinas',
      name: 'Bolinas',
      lat: 37.9093,
      lon: -122.6863,
      reasons_to_visit: ['town', 'coast', 'wildlife'],
      blurb:
        'Unsigned West Marin surf hamlet; Bolinas Lagoon seal haul-outs and the Palomarin trailhead into Point Reyes.',
    },
    {
      id: 'point-reyes',
      name: 'Point Reyes NS (Lighthouse + Chimney Rock)',
      lat: 38.0402,
      lon: -122.7999,
      reasons_to_visit: ['coast', 'wildlife', 'historic', 'hike'],
      blurb:
        '71,000-acre seashore; 1870 lighthouse via 313 steps, winter gray-whale migration, and the Chimney Rock elephant-seal colony.',
    },
    {
      id: 'point-reyes-station',
      name: 'Point Reyes Station / Tomales Bay',
      lat: 38.0697,
      lon: -122.8072,
      reasons_to_visit: ['town', 'coast', 'paddle'],
      blurb:
        'West Marin hub town; Bovine Bakery, Cowgirl Creamery, and Hog Island / Tomales Bay Oyster Co picnic shucks on the bay.',
    },
    {
      id: 'sonoma-plaza',
      name: 'Sonoma (Plaza + Mission)',
      lat: 38.2919,
      lon: -122.4580,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        "Largest town square in California; 1823 Mission San Francisco Solano, Bear Flag site, and downtown tasting rooms.",
    },
    {
      id: 'napa-downtown',
      name: 'Napa (Downtown + Oxbow Market)',
      lat: 38.2975,
      lon: -122.2869,
      reasons_to_visit: ['town'],
      blurb:
        'Napa River downtown; Oxbow Public Market food hall, riverfront tasting rooms, and the Napa Valley Wine Train depot.',
    },
    {
      id: 'calistoga',
      name: 'Calistoga (Old Faithful + Petrified Forest)',
      lat: 38.5903,
      lon: -122.5965,
      reasons_to_visit: ['town'],
      blurb:
        'Geothermal upper Napa Valley town; 60-ft Old Faithful Geyser erupts at variable intervals (~15-30 min) plus petrified-redwood forest nearby.',
    },
    {
      id: 'healdsburg',
      name: 'Healdsburg',
      lat: 38.6103,
      lon: -122.8693,
      reasons_to_visit: ['town'],
      blurb:
        '1850s plaza with 25+ walkable tasting rooms; hub for Dry Creek, Russian River, and Alexander Valley wineries.',
    },
    {
      id: 'armstrong-redwoods',
      name: 'Armstrong Redwoods SNR',
      lat: 38.5382,
      lon: -123.0055,
      reasons_to_visit: ['hike', 'picnic'],
      blurb:
        '805 acres of old-growth coast redwoods above Guerneville; flat 1.5-mi Pioneer Nature Trail past the 1,400-yr Colonel Armstrong tree.',
    },
    {
      id: 'bodega-bay',
      name: 'Bodega Bay',
      lat: 38.3332,
      lon: -123.0486,
      reasons_to_visit: ['coast', 'fish', 'town'],
      blurb:
        "Working Sonoma Coast fishing harbor; Bodega Head whale viewing, Hitchcock's 'The Birds' locations, and crab season Nov–June.",
    },
    {
      id: 'jenner-goat-rock',
      name: 'Jenner / Goat Rock (Sonoma Coast SP)',
      lat: 38.4469,
      lon: -123.1232,
      reasons_to_visit: ['coast', 'wildlife', 'viewpoint'],
      blurb:
        'Russian River mouth at the Pacific; harbor-seal rookery on the beach (pupping March–June) and Hwy 1 coastal overlooks.',
    },
    {
      id: 'jack-london-shp',
      name: 'Jack London SHP (Glen Ellen)',
      lat: 38.3556,
      lon: -122.5518,
      reasons_to_visit: ['historic', 'hike', 'museum'],
      blurb:
        'Writer Jack London\'s 1,400-acre Beauty Ranch; House of Happy Walls museum, Wolf House ruins, and Sonoma Mountain trail.',
    },
    {
      id: 'mt-diablo',
      name: 'Mt Diablo SP',
      lat: 37.8817,
      lon: -121.9147,
      elevation_m: 1173,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        '3,849-ft East Bay summit; drivable to the 1939 stone Summit Visitor Center with one of the largest view-sheds in the US.',
    },
    {
      id: 'tilden-park',
      name: 'Tilden Regional Park (Berkeley Hills)',
      lat: 37.8967,
      lon: -122.2437,
      reasons_to_visit: ['hike', 'garden', 'farm', 'picnic'],
      blurb:
        '2,079 acres above Berkeley; Little Farm petting barn, Regional Parks Botanic Garden, Lake Anza swim, and Nimitz Way views.',
    },
    {
      id: 'mission-peak',
      name: 'Mission Peak (Fremont)',
      lat: 37.5123,
      lon: -121.8803,
      elevation_m: 767,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        'Steep 6-mi out-and-back to the iconic summit pole; 2,100-ft gain over bare grassland with Bay-wide views at the top.',
    },
    {
      id: 'livermore-valley',
      name: 'Livermore Valley Wine Country',
      lat: 37.6580,
      lon: -121.7149,
      reasons_to_visit: ['farm', 'town'],
      blurb:
        '50+ wineries east of the Bay; Wente (1883) and Concannon anchor a walkable cluster of family-run Cab/Petite Sirah tasting rooms.',
    },
    {
      id: 'oakland-zoo',
      name: 'Oakland Zoo',
      lat: 37.7498,
      lon: -122.1463,
      reasons_to_visit: ['zoo'],
      blurb:
        '100-acre zoo in Knowland Park; California Trail gondola ride up to native species (bears, condors, jaguars) above the Bay.',
    },
    {
      id: 'filoli',
      name: 'Filoli (Woodside)',
      lat: 37.4713,
      lon: -122.3098,
      reasons_to_visit: ['garden', 'historic'],
      blurb:
        '1917 Bourn estate above Crystal Springs Reservoir; 16 acres of formal English gardens and an Edwardian country house.',
    },
    {
      id: 'purisima-creek',
      name: 'Purisima Creek Redwoods',
      lat: 37.4396,
      lon: -122.3586,
      reasons_to_visit: ['hike'],
      blurb:
        'Second-growth redwood canyon on the Skyline-Hwy 1 side of the Peninsula; 4,700 acres of MROSD trails, free entry.',
    },
    {
      id: 'half-moon-bay',
      name: 'Half Moon Bay',
      lat: 37.4636,
      lon: -122.4286,
      reasons_to_visit: ['coast', 'town', 'farm'],
      blurb:
        'Coastside farm town; 8-mile coastal trail, Mavericks surf break in winter, and October pumpkin festival plus U-pick farms.',
    },
    {
      id: 'pigeon-point',
      name: 'Pigeon Point Light Station',
      lat: 37.1828,
      lon: -122.3944,
      reasons_to_visit: ['historic', 'coast', 'viewpoint'],
      blurb:
        '115-ft 1872 lighthouse on Hwy 1 south of Pescadero; bluff-top grounds, tide pools, and seal/whale watching offshore.',
    },
    {
      id: 'ano-nuevo',
      name: 'Año Nuevo SP',
      lat: 37.1083,
      lon: -122.3359,
      reasons_to_visit: ['wildlife', 'coast', 'hike'],
      blurb:
        'Northern elephant-seal breeding colony; docent-led walks Dec 15–Mar 31 required, self-guided permits rest of year.',
    },
    {
      id: 'pescadero',
      name: 'Pescadero (Town + Marsh)',
      lat: 37.2555,
      lon: -122.3830,
      reasons_to_visit: ['town', 'wildlife', 'farm', 'coast'],
      blurb:
        "Coastside village; Duarte's Tavern, Harley Farms goat dairy, and the 235-acre Pescadero Marsh birding preserve.",
    },
    {
      id: 'big-basin',
      name: 'Big Basin Redwoods SP',
      lat: 37.1723,
      lon: -122.2225,
      reasons_to_visit: ['hike', 'waterfall', 'picnic'],
      blurb:
        "California's first state park (1902); old-growth redwoods regrowing post-2020 fire, Berry Creek Falls loop, parking reservation.",
    },
    {
      id: 'castle-rock-sp',
      name: 'Castle Rock SP',
      lat: 37.2310,
      lon: -122.0951,
      elevation_m: 980,
      reasons_to_visit: ['hike', 'waterfall', 'viewpoint'],
      blurb:
        'Sandstone outcrops on the Skyline ridge above Saratoga; bouldering, 75-ft Castle Rock Falls, and Goat Rock overlook.',
    },
    {
      id: 'hakone-gardens',
      name: 'Hakone Estate & Gardens (Saratoga)',
      lat: 37.2538,
      lon: -122.0477,
      reasons_to_visit: ['garden', 'historic'],
      blurb:
        '18-acre 1917 Japanese garden in the Saratoga hills; koi ponds, moon bridge, tea house; one of the oldest Japanese-style residential estates in the western hemisphere.',
    },
    {
      id: 'henry-cowell',
      name: 'Henry Cowell Redwoods / Roaring Camp (Felton)',
      lat: 37.0422,
      lon: -122.0631,
      reasons_to_visit: ['hike', 'historic'],
      blurb:
        '40-acre old-growth grove and an 1880s narrow-gauge steam train through the redwoods to Bear Mountain and Santa Cruz.',
    },
    {
      id: 'santa-cruz-boardwalk',
      name: 'Santa Cruz (Boardwalk + Natural Bridges)',
      lat: 36.9641,
      lon: -122.0169,
      reasons_to_visit: ['coast', 'town', 'wildlife'],
      blurb:
        '1907 beach boardwalk with the 1924 Giant Dipper wooden coaster; Natural Bridges sea arch and monarch grove west of town.',
    },
    {
      id: 'wilder-ranch',
      name: 'Wilder Ranch SP',
      lat: 36.9591,
      lon: -122.0830,
      reasons_to_visit: ['hike', 'coast', 'historic'],
      blurb:
        'Working 1897 Victorian dairy above the Santa Cruz coast; 34 miles of bluff and canyon trails, tide-pool pocket beaches.',
    },
    {
      id: 'monterey-aquarium',
      name: 'Monterey Bay Aquarium / Cannery Row',
      lat: 36.6181,
      lon: -121.9017,
      reasons_to_visit: ['zoo', 'coast', 'historic'],
      blurb:
        '200-exhibit aquarium in a 1916 Hovden sardine cannery; sea otters, kelp forest, and Steinbeck-era Cannery Row next door.',
    },
    {
      id: '17-mile-drive',
      name: '17-Mile Drive / Pebble Beach',
      lat: 36.5701,
      lon: -121.9708,
      reasons_to_visit: ['coast', 'viewpoint'],
      blurb:
        "Paid scenic loop through Del Monte Forest; Bird Rock sea-lion haul-out, Lone Cypress, and Pebble Beach's 18th green.",
    },
    {
      id: 'carmel',
      name: 'Carmel-by-the-Sea',
      lat: 36.5552,
      lon: -121.9233,
      reasons_to_visit: ['town', 'coast'],
      blurb:
        'One-square-mile coastal village on a white-sand beach; 1770 Carmel Mission (Junípero Serra basilica) and galleries downtown.',
    },
    {
      id: 'point-lobos',
      name: 'Point Lobos SNR',
      lat: 36.5161,
      lon: -121.9475,
      reasons_to_visit: ['coast', 'hike', 'wildlife'],
      blurb:
        '"Greatest meeting of land and water" per Robert Louis Stevenson; Cypress Grove loop, sea-lion coves, winter gray-whale viewing.',
    },
    {
      id: 'pinnacles',
      name: 'Pinnacles NP',
      lat: 36.4903,
      lon: -121.1814,
      elevation_m: 1009,
      reasons_to_visit: ['hike', 'wildlife', 'viewpoint'],
      blurb:
        '23-million-year-old volcanic spires; High Peaks and Bear Gulch talus caves; California condor release and viewing site.',
    },
    {
      id: 'san-juan-bautista',
      name: 'San Juan Bautista SHP',
      lat: 36.8456,
      lon: -121.5367,
      reasons_to_visit: ['historic', 'town', 'museum'],
      blurb:
        '1797 mission on the San Andreas fault; largest preserved Spanish plaza in California, featured in Hitchcock\'s "Vertigo".',
    },
  ],
};
