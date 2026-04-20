import type { Hub } from './types';

// Los Angeles metro hub. Center is downtown LA per the AGENTS.md §3
// convention (downtown of the most-recognized city in the metro).
// Destinations span the Santa Monica Mountains / Malibu coast, the
// San Gabriel Mountains and Angeles National Forest north of Pasadena,
// the San Bernardino Mountains (Big Bear, Arrowhead, Idyllwild, Oak
// Glen), the low desert (Joshua Tree, Palm Springs, Pioneertown),
// the Central Coast as far as Santa Barbara / Solvang / La Purisima,
// Orange County beaches and the San Juan Capistrano mission, Channel
// Islands via Ventura, Catalina via ferry, and the Antelope Valley
// (Vasquez Rocks, Poppy Reserve). Within-LA-city picks (Griffith,
// Hollywood, downtown, Santa Monica Pier, Getty Villa) are excluded
// per AGENTS.md §6 — the app is about driving away from the hub.
export const laHub: Hub = {
  id: 'la',
  name: 'LA',
  center: {
    name: 'Los Angeles, CA',
    lat: 34.0522,
    lon: -118.2437,
  },
  destinations: [
    // ========== Malibu coast / Santa Monica Mountains ==========
    {
      id: 'el-matador',
      name: 'El Matador St Beach (Malibu)',
      lat: 34.0371,
      lon: -118.8713,
      reasons_to_visit: ['coast', 'viewpoint'],
      blurb:
        'Pocket cove under a coastal bluff; sea stacks, sea caves, and arches at low tide off PCH.',
    },
    {
      id: 'zuma-point-dume',
      name: 'Zuma Beach / Point Dume (Malibu)',
      lat: 34.0158,
      lon: -118.8217,
      reasons_to_visit: ['coast', 'hike', 'wildlife'],
      blurb:
        '1.8-mi sand beach plus the Point Dume headland trail; winter gray-whale watching from the bluff.',
    },
    {
      id: 'leo-carrillo-sp',
      name: 'Leo Carrillo St Park (Malibu)',
      lat: 34.046,
      lon: -118.9353,
      reasons_to_visit: ['coast', 'hike', 'picnic'],
      blurb:
        '1.5 mi of beach with tidepools, sea caves, and reef; canyon trails run up into the Santa Monica Mtns.',
    },
    {
      id: 'escondido-falls',
      name: 'Escondido Falls (Malibu)',
      lat: 34.0343,
      lon: -118.8378,
      reasons_to_visit: ['waterfall', 'hike'],
      blurb:
        '3.8-mi out-and-back to a two-tier cascade; lower falls ~50 ft, upper tier reaches about 150 ft.',
    },
    {
      id: 'sandstone-peak',
      name: 'Sandstone Peak / Mishe Mokwa Loop',
      lat: 34.1057,
      lon: -118.9285,
      elevation_m: 948,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        '6.25-mi loop to the 3,111-ft high point of the Santa Monica Mtns; Echo Cliffs and Balanced Rock en route.',
    },
    {
      id: 'malibu-creek-sp',
      name: 'Malibu Creek St Park (M*A*S*H site)',
      lat: 34.0967,
      lon: -118.7253,
      reasons_to_visit: ['hike', 'historic', 'picnic'],
      blurb:
        '4.75-mi out-and-back past Century Lake to the preserved M*A*S*H set; former 20th Century Fox ranch.',
    },
    {
      id: 'paramount-ranch',
      name: 'Paramount Ranch (Agoura Hills)',
      lat: 34.1351,
      lon: -118.7574,
      reasons_to_visit: ['historic', 'hike'],
      blurb:
        'NPS-run former movie ranch; Western Town filming set rebuilt after the 2018 Woolsey Fire, short trails.',
    },
    {
      id: 'point-mugu-sp',
      name: 'Point Mugu St Park (Sycamore Canyon)',
      lat: 34.0853,
      lon: -119.0293,
      reasons_to_visit: ['coast', 'hike', 'picnic'],
      blurb:
        '70+ mi of trails through Sycamore and La Jolla canyons; beach, dunes, and coastal bluffs on PCH.',
    },

    // ========== San Gabriel Mountains / Angeles NF ==========
    {
      id: 'eaton-canyon',
      name: 'Eaton Canyon Falls (Pasadena)',
      lat: 34.1816,
      lon: -118.0966,
      reasons_to_visit: ['waterfall', 'hike'],
      blurb:
        '3.5-mi canyon walk to a 40-ft waterfall off Altadena; check USFS closure status after the 2025 Eaton Fire.',
    },
    {
      id: 'switzer-falls',
      name: 'Switzer Falls (Angeles NF)',
      lat: 34.2688,
      lon: -118.1425,
      reasons_to_visit: ['waterfall', 'hike', 'historic'],
      blurb:
        '3.6-mi Gabrielino Trail hike down Arroyo Seco past Switzer Camp ruins to a 50-ft cascade.',
    },
    {
      id: 'sturtevant-falls',
      name: 'Sturtevant Falls (Chantry Flat)',
      lat: 34.2071,
      lon: -118.0207,
      reasons_to_visit: ['waterfall', 'hike', 'historic'],
      blurb:
        '3.3-mi Big Santa Anita Canyon loop to a 60-ft waterfall past century-old cabin communities.',
    },
    {
      id: 'mt-wilson',
      name: 'Mt Wilson Observatory',
      lat: 34.2267,
      lon: -118.0583,
      elevation_m: 1742,
      reasons_to_visit: ['viewpoint', 'historic', 'museum', 'hike'],
      blurb:
        '100-inch Hooker telescope, astronomical museum, and antenna farm on a 5,715-ft San Gabriel summit.',
    },
    {
      id: 'mt-baldy',
      name: 'Mt Baldy (Manker Flats)',
      lat: 34.2892,
      lon: -117.6459,
      elevation_m: 3068,
      reasons_to_visit: ['hike', 'viewpoint', 'ski'],
      blurb:
        '10,064-ft range high point; summer loop via Devils Backbone, winter lift skiing — avalanche-prone off-season.',
    },
    {
      id: 'bridge-to-nowhere',
      name: 'Bridge to Nowhere (East Fork)',
      lat: 34.2644,
      lon: -117.7446,
      reasons_to_visit: ['hike', 'historic'],
      blurb:
        '10-mi round-trip up the East Fork San Gabriel to a 1936 arch bridge stranded mid-canyon; river fords required.',
    },
    {
      id: 'wrightwood',
      name: 'Wrightwood / Mountain High',
      lat: 34.3606,
      lon: -117.6331,
      elevation_m: 1940,
      reasons_to_visit: ['ski', 'town', 'hike'],
      blurb:
        'San Gabriels mountain town on Angeles Crest; Mountain High winter skiing, summer PCT and Mt Baden-Powell access.',
    },

    // ========== San Bernardino Mountains ==========
    {
      id: 'big-bear-lake',
      name: 'Big Bear Lake',
      lat: 34.2439,
      lon: -116.9114,
      elevation_m: 2058,
      reasons_to_visit: ['lake', 'ski', 'hike', 'paddle', 'fish'],
      blurb:
        'Alpine reservoir at 6,750 ft; Snow Summit and Bear Mountain ski, summer boating, Castle Rock and Cougar Crest trails.',
    },
    {
      id: 'lake-arrowhead',
      name: 'Lake Arrowhead',
      lat: 34.2486,
      lon: -117.1891,
      elevation_m: 1570,
      reasons_to_visit: ['lake', 'town'],
      blurb:
        'Private-shore alpine lake 90 min from LA; Lake Arrowhead Queen paddle-wheel tours and Heaps Peak Arboretum.',
    },
    {
      id: 'idyllwild',
      name: 'Idyllwild (San Jacinto Mtns)',
      lat: 33.7401,
      lon: -116.7187,
      elevation_m: 1650,
      reasons_to_visit: ['town', 'hike'],
      blurb:
        'Pine-forest town at 5,400 ft; Ernie Maxwell Scenic Trail, Tahquitz climbing, Deer Springs PCT access.',
    },
    {
      id: 'oak-glen',
      name: 'Oak Glen (Los Rios Rancho)',
      lat: 34.0664,
      lon: -116.9553,
      reasons_to_visit: ['farm', 'town'],
      blurb:
        'Apple-orchard hamlet in the San Bernardinos; Los Rios Rancho u-pick, cider pressing, and Riley\'s Farm.',
    },

    // ========== Low desert / Palm Springs ==========
    {
      id: 'palm-springs-tramway',
      name: 'Palm Springs Aerial Tramway',
      lat: 33.8367,
      lon: -116.5489,
      elevation_m: 2596,
      reasons_to_visit: ['viewpoint', 'hike'],
      blurb:
        'Rotating tram climbs Chino Canyon from 2,600 to 8,516 ft; Mt San Jacinto SP trails and Round Valley at the top.',
    },
    {
      id: 'indian-canyons',
      name: 'Indian Canyons (Palm Springs)',
      lat: 33.7483,
      lon: -116.5422,
      reasons_to_visit: ['hike', 'historic', 'waterfall'],
      blurb:
        'Agua Caliente tribal land; Palm, Andreas, and Murray canyons — the world\'s largest California fan palm oasis.',
    },
    {
      id: 'joshua-tree-hidden-valley',
      name: 'Joshua Tree Nl Park (Hidden Valley)',
      lat: 33.9886,
      lon: -116.1658,
      elevation_m: 1240,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        '1-mi boulder-ringed loop in the park\'s core; Barker Dam, Hall of Horrors, and Keys View are nearby on Park Blvd.',
    },
    {
      id: 'pioneertown',
      name: 'Pioneertown (Pappy & Harriet\'s)',
      lat: 34.1606,
      lon: -116.4884,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        '1946 Hollywood Western movie set turned high-desert village; Mane Street facades and live music at Pappy & Harriet\'s.',
    },
    {
      id: 'integratron',
      name: 'Integratron (Landers)',
      lat: 34.2953,
      lon: -116.4047,
      reasons_to_visit: ['historic'],
      blurb:
        'White-domed 1950s structure built by ufologist George Van Tassel; reserved sound-bath sessions in the acoustic chamber.',
    },
    {
      id: 'noah-purifoy',
      name: 'Noah Purifoy Desert Art Museum',
      lat: 34.1548,
      lon: -116.2906,
      reasons_to_visit: ['museum'],
      blurb:
        '10 acres of large-scale assemblage sculpture by Noah Purifoy, built from found materials; free, open sunup to sundown.',
    },

    // ========== Central Coast / Santa Barbara County ==========
    {
      id: 'ventura',
      name: 'Ventura (Harbor + Main St)',
      lat: 34.2746,
      lon: -119.229,
      reasons_to_visit: ['town', 'coast', 'historic'],
      blurb:
        'Beach town 70 mi northwest of LA; Mission San Buenaventura, Main St antiques, Harbor Village ferry docks.',
    },
    {
      id: 'channel-islands',
      name: 'Channel Islands Nl Park (Ventura)',
      lat: 34.2469,
      lon: -119.2609,
      reasons_to_visit: ['island', 'wildlife', 'hike', 'paddle'],
      blurb:
        'Island Packers ferry from Ventura Harbor to Santa Cruz and Anacapa islands; sea caves, island fox, nesting seabirds.',
    },
    {
      id: 'ojai',
      name: 'Ojai (Meditation Mount)',
      lat: 34.448,
      lon: -119.2429,
      reasons_to_visit: ['town', 'garden', 'viewpoint'],
      blurb:
        'Mountain-ringed valley town; Bart\'s open-air bookstore, Meditation Mount gardens, and the sunset "pink moment".',
    },
    {
      id: 'santa-barbara',
      name: 'Santa Barbara (Wharf + Mission)',
      lat: 34.4208,
      lon: -119.6982,
      reasons_to_visit: ['town', 'coast', 'historic'],
      blurb:
        '"American Riviera" 90 mi up the coast; 1872 Stearns Wharf, Spanish Revival courthouse tower, 1786 Mission.',
    },
    {
      id: 'solvang',
      name: 'Solvang',
      lat: 34.5958,
      lon: -120.1376,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        '1911 Danish settlement in the Santa Ynez Valley; half-timbered storefronts, aebleskiver bakeries, 70+ area tasting rooms.',
    },
    {
      id: 'los-olivos',
      name: 'Los Olivos (Santa Ynez wine)',
      lat: 34.6691,
      lon: -120.1177,
      reasons_to_visit: ['town'],
      blurb:
        'Flag-pole village of ~1,000 on SR-154; about 30 Santa Ynez tasting rooms clustered in a walkable grid.',
    },
    {
      id: 'la-purisima',
      name: 'La Purisima Mission St Hist Park',
      lat: 34.6704,
      lon: -120.4223,
      reasons_to_visit: ['historic', 'museum', 'hike'],
      blurb:
        'Most completely restored California mission; 10 CCC-reconstructed buildings and 25 mi of trails outside Lompoc.',
    },

    // ========== Antelope Valley / north LA County ==========
    {
      id: 'vasquez-rocks',
      name: 'Vasquez Rocks Natural Area',
      lat: 34.4881,
      lon: -118.3211,
      reasons_to_visit: ['hike', 'historic', 'viewpoint'],
      blurb:
        '932-acre county park of tilted sandstone slabs near Agua Dulce; PCT route and 300+ film shoots since the 1930s.',
    },
    {
      id: 'antelope-valley-poppy',
      name: 'Antelope Valley Poppy Reserve',
      lat: 34.7265,
      lon: -118.3884,
      reasons_to_visit: ['garden', 'hike'],
      blurb:
        '1,780-acre state reserve west of Lancaster; California poppies peak late March through mid-April.',
    },
    {
      id: 'exotic-feline',
      name: 'Exotic Feline Breeding Ctr (Rosamond)',
      lat: 34.8772,
      lon: -118.1978,
      reasons_to_visit: ['zoo', 'wildlife'],
      blurb:
        'Small nonprofit conservation center in the Antelope Valley; 70+ endangered cats including snow leopards and ocelots.',
    },
    {
      id: 'reagan-library',
      name: 'Reagan Library (Simi Valley)',
      lat: 34.2601,
      lon: -118.8208,
      reasons_to_visit: ['museum', 'historic'],
      blurb:
        'Hilltop presidential library; full-scale Air Force One pavilion, Berlin Wall segment, replica Oval Office.',
    },

    // ========== Inland LA / close-in suburbs ==========
    {
      id: 'huntington',
      name: 'Huntington Library (San Marino)',
      lat: 34.1292,
      lon: -118.1142,
      reasons_to_visit: ['garden', 'museum'],
      blurb:
        '120 acres of themed botanical gardens, rare-book library, and European-and-American art in San Marino.',
    },
    {
      id: 'descanso-gardens',
      name: 'Descanso Gardens (La Cañada)',
      lat: 34.2036,
      lon: -118.2075,
      reasons_to_visit: ['garden'],
      blurb:
        '150-acre botanic garden in La Cañada Flintridge; camellia forest, rose garden, tulip bloom in March.',
    },

    // ========== Orange County / south coast ==========
    {
      id: 'crystal-cove',
      name: 'Crystal Cove St Park',
      lat: 33.5696,
      lon: -117.8407,
      reasons_to_visit: ['coast', 'hike', 'historic'],
      blurb:
        '3.2 mi of OC coast between Corona del Mar and Laguna; tidepools at Reef Point, 1930s Historic District cottages.',
    },
    {
      id: 'laguna-beach',
      name: 'Laguna Beach (coves + tidepools)',
      lat: 33.5427,
      lon: -117.7854,
      reasons_to_visit: ['coast', 'town', 'wildlife'],
      blurb:
        'Seven-mile string of coves and headlands; Heisler Park tidepools, Treasure Island Beach, downtown art galleries.',
    },
    {
      id: 'san-juan-capistrano',
      name: 'San Juan Capistrano Mission',
      lat: 33.5017,
      lon: -117.6631,
      reasons_to_visit: ['historic', 'museum', 'garden'],
      blurb:
        '1776 Mission San Juan Capistrano; ruins of the Great Stone Church and the cliff swallows\' return each spring.',
    },
    {
      id: 'balboa-island',
      name: 'Balboa Island / Fun Zone (Newport)',
      lat: 33.6061,
      lon: -117.8911,
      reasons_to_visit: ['coast', 'town'],
      blurb:
        '1.5-mi bayfront loop around Balboa Island; $1.50 auto ferry to the Peninsula Fun Zone and its 1936 Ferris wheel.',
    },
    {
      id: 'nixon-library',
      name: 'Nixon Library (Yorba Linda)',
      lat: 33.8822,
      lon: -117.8184,
      reasons_to_visit: ['museum', 'historic'],
      blurb:
        'Presidential library on Nixon\'s birthplace lot; restored 1912 farmhouse and a decommissioned Sikorsky VH-3A.',
    },
    {
      id: 'temecula-wine',
      name: 'Temecula Valley Wine Country',
      lat: 33.5169,
      lon: -117.0994,
      reasons_to_visit: ['town', 'farm'],
      blurb:
        '40+ wineries on rolling Riverside County hills; De Portola and Rancho California wine trails, hot-air balloon rides.',
    },

    // ========== Islands ==========
    {
      id: 'catalina-avalon',
      name: 'Catalina Island (Avalon)',
      lat: 33.3428,
      lon: -118.3278,
      reasons_to_visit: ['island', 'coast', 'town'],
      blurb:
        'Catalina Express ferry (~1 hr from Long Beach/San Pedro) to Avalon; glass-bottom boats, golf-cart streets, 1929 Casino.',
    },

    // ========== Far south desert ==========
    {
      id: 'julian',
      name: 'Julian (apple country)',
      lat: 33.0784,
      lon: -116.6015,
      elevation_m: 1290,
      reasons_to_visit: ['town', 'farm', 'historic'],
      blurb:
        '1870s San Diego County gold-rush town; apple orchards and pie shops, Fall Apple Harvest Sept–Nov.',
    },
    {
      id: 'borrego-springs',
      name: 'Borrego Springs (Anza-Borrego)',
      lat: 33.2577,
      lon: -116.4097,
      reasons_to_visit: ['hike', 'wildlife', 'viewpoint'],
      blurb:
        'Gateway to 600,000-acre Anza-Borrego Desert SP; Borrego Palm Canyon trail, Galleta Meadows metal sculptures, dark sky.',
    },
  ],
};
