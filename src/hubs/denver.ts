import type { Hub } from './types';

// Denver metro hub. Center is downtown Denver (Civic Center / 16th St Mall)
// per AGENTS.md §3. Destinations span the Front Range foothills and Jeffco
// Open Space (Red Rocks, Golden, Mt Falcon, Roxborough, Staunton, Golden
// Gate Canyon), the I-70 mountain corridor (Idaho Springs, Georgetown,
// Mt Blue Sky, Loveland Pass, Summit County, Winter Park, Vail, Eldora),
// Rocky Mountain NP + Estes Park, Boulder / Nederland / Brainard Lake,
// the Colorado Springs / Pikes Peak region (Garden of the Gods, Pikes Peak,
// Manitou Springs, Mueller, Florissant, Cripple Creek, Royal Gorge, Paint
// Mines), and the Arkansas Valley (Buena Vista, Leadville). Great Sand
// Dunes is at the outer edge of the 250 km haversine cap — a real day
// trip only via the fastest US-285 route.
export const denverHub: Hub = {
  id: 'denver',
  name: 'Denver',
  center: {
    name: 'Denver, CO',
    lat: 39.7392,
    lon: -104.9903,
  },
  destinations: [
    {
      id: 'red-rocks',
      name: 'Red Rocks Park & Amphitheatre',
      lat: 39.6654,
      lon: -105.2057,
      reasons_to_visit: ['hike', 'viewpoint', 'historic'],
      blurb:
        '868-acre sandstone park west of Denver; Trading Post Trail, concert amphitheater, Morrison Slide loop.',
    },
    {
      id: 'golden',
      name: 'Golden (Clear Creek + Coors)',
      lat: 39.7555,
      lon: -105.2211,
      reasons_to_visit: ['town', 'historic', 'paddle'],
      blurb:
        'Historic main street on Clear Creek; Coors brewery tours, tubing and kayak park, Colorado School of Mines museum.',
    },
    {
      id: 'lookout-mountain',
      name: 'Lookout Mtn / Buffalo Bill Grave',
      lat: 39.7339,
      lon: -105.2389,
      elevation_m: 2225,
      reasons_to_visit: ['viewpoint', 'museum', 'historic', 'hike'],
      blurb:
        'Buffalo Bill museum and grave above Golden; Front Range overlooks and short Lookout Mtn Preserve trails on the Lariat Loop byway.',
    },
    {
      id: 'boulder',
      name: 'Boulder (Pearl St + Flatirons)',
      lat: 40.015,
      lon: -105.2705,
      reasons_to_visit: ['town', 'hike', 'viewpoint'],
      blurb:
        'Pearl Street pedestrian mall and Chautauqua Park trailheads for the 1st/2nd Flatirons and Royal Arch hikes.',
    },
    {
      id: 'eldorado-canyon-sp',
      name: 'Eldorado Canyon St Park',
      lat: 39.9317,
      lon: -105.2942,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        'Red sandstone canyon south of Boulder; 11 mi of trails, world-class rock climbing, timed entry on summer weekends.',
    },
    {
      id: 'nederland',
      name: 'Nederland',
      lat: 39.9614,
      lon: -105.5108,
      reasons_to_visit: ['town'],
      blurb:
        'Quirky mountain town west of Boulder; Carousel of Happiness, Caribou ghost town, Frozen Dead Guy Days in March.',
    },
    {
      id: 'brainard-lake',
      name: 'Brainard Lake (Indian Peaks)',
      lat: 40.08,
      lon: -105.565,
      elevation_m: 3130,
      reasons_to_visit: ['lake', 'hike', 'viewpoint', 'paddle'],
      blurb:
        'Gateway to Indian Peaks Wilderness; Mitchell and Long Lake trailheads, timed-entry parking, open mid-June to mid-October.',
    },
    {
      id: 'eldora-mountain',
      name: 'Eldora Mountain Resort',
      lat: 39.9369,
      lon: -105.5828,
      elevation_m: 2843,
      reasons_to_visit: ['ski'],
      blurb:
        '680-acre Front Range ski area above Nederland; closest resort to Boulder and Denver.',
    },
    {
      id: 'rmnp-bear-lake',
      name: 'RMNP - Bear Lake Corridor',
      lat: 40.3117,
      lon: -105.6458,
      elevation_m: 2888,
      reasons_to_visit: ['hike', 'lake', 'viewpoint', 'wildlife'],
      blurb:
        '9.2-mi road into Rocky Mountain NP; trailheads for Bear, Nymph, Dream, Emerald, and Sky Pond, timed-entry permit in peak season.',
    },
    {
      id: 'rmnp-trail-ridge',
      name: 'RMNP - Trail Ridge Road',
      lat: 40.4148,
      lon: -105.7278,
      elevation_m: 3713,
      reasons_to_visit: ['viewpoint', 'wildlife', 'hike'],
      blurb:
        'Highest continuously paved road in the US at 12,183 ft; alpine tundra pull-outs, typically open Memorial Day to mid-October.',
    },
    {
      id: 'estes-park',
      name: 'Estes Park (Stanley Hotel)',
      lat: 40.3772,
      lon: -105.5217,
      reasons_to_visit: ['town', 'historic', 'lake'],
      blurb:
        'Gateway town to RMNP; 1909 Stanley Hotel tours, Lake Estes paved loop, Elkhorn Avenue shops.',
    },
    {
      id: 'mt-blue-sky',
      name: 'Mt Blue Sky Byway (ex-Mt Evans)',
      lat: 39.5883,
      lon: -105.6438,
      elevation_m: 4307,
      reasons_to_visit: ['viewpoint', 'hike', 'wildlife'],
      blurb:
        'Highest paved road in North America to 14,130 ft; Echo Lake, Mt Goliath bristlecone pines, mountain goats, timed entry when open.',
    },
    {
      id: 'idaho-springs',
      name: 'Idaho Springs (Argo Mill)',
      lat: 39.7425,
      lon: -105.5136,
      reasons_to_visit: ['town', 'historic', 'museum'],
      blurb:
        'Gold-rush town on I-70; Argo Mill & Tunnel tour, Indian Hot Springs, Clear Creek whitewater rafting.',
    },
    {
      id: 'georgetown',
      name: 'Georgetown (Loop Railroad)',
      lat: 39.7061,
      lon: -105.6972,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        '1867 silver-mining town with 200+ restored buildings; Georgetown Loop narrow-gauge steam train runs to Silver Plume.',
    },
    {
      id: 'guanella-pass',
      name: 'Guanella Pass / Mt Bierstadt TH',
      lat: 39.596,
      lon: -105.7116,
      elevation_m: 3557,
      reasons_to_visit: ['viewpoint', 'hike'],
      blurb:
        '22-mi scenic byway from Georgetown to Grant; Mt Bierstadt 14er trailhead, fall aspens, seasonal May–October.',
    },
    {
      id: 'loveland-pass',
      name: 'Loveland Pass',
      lat: 39.6634,
      lon: -105.8789,
      elevation_m: 3655,
      reasons_to_visit: ['viewpoint', 'hike', 'ski'],
      blurb:
        '11,990-ft Continental Divide pass on US-6; ridge hikes toward Grizzly Peak, backcountry skiing in winter.',
    },
    {
      id: 'arapahoe-basin',
      name: 'Arapahoe Basin',
      lat: 39.6425,
      lon: -105.8719,
      elevation_m: 3280,
      reasons_to_visit: ['ski'],
      blurb:
        'Highest skiable terrain in Colorado; long season often running into June, East Wall steeps and the Beach tailgate.',
    },
    {
      id: 'keystone',
      name: 'Keystone',
      lat: 39.6042,
      lon: -105.9556,
      elevation_m: 2800,
      reasons_to_visit: ['ski'],
      blurb:
        'Three-mountain ski resort with night skiing; summer gondola, Keystone Lake ice rink and paddle boats.',
    },
    {
      id: 'dillon-reservoir',
      name: 'Dillon Reservoir (Frisco/Dillon)',
      lat: 39.6303,
      lon: -106.0433,
      elevation_m: 2750,
      reasons_to_visit: ['lake', 'paddle', 'fish', 'viewpoint'],
      blurb:
        '3,200-acre reservoir in Summit County; Frisco and Dillon marinas, Sapphire Point overlook, 18-mi paved Recpath.',
    },
    {
      id: 'breckenridge',
      name: 'Breckenridge',
      lat: 39.4817,
      lon: -106.0384,
      elevation_m: 2926,
      reasons_to_visit: ['ski', 'town', 'historic', 'hike'],
      blurb:
        '1859 mining-town Main Street and 2,900-acre ski resort; summer BreckConnect gondola and alpine coaster.',
    },
    {
      id: 'copper-mountain',
      name: 'Copper Mountain',
      lat: 39.5022,
      lon: -106.1497,
      elevation_m: 2960,
      reasons_to_visit: ['ski'],
      blurb:
        '2,500-acre ski resort off I-70; naturally divided beginner / intermediate / expert terrain, summer Woodward park.',
    },
    {
      id: 'winter-park',
      name: 'Winter Park Resort',
      lat: 39.8867,
      lon: -105.7628,
      elevation_m: 2743,
      reasons_to_visit: ['ski', 'hike'],
      blurb:
        "Colorado's longest-operating resort; Amtrak Ski Train from Union Station, summer Trestle Bike Park and alpine slide.",
    },
    {
      id: 'vail',
      name: 'Vail',
      lat: 39.6403,
      lon: -106.3742,
      elevation_m: 2476,
      reasons_to_visit: ['ski', 'town'],
      blurb:
        'Back Bowls and 5,317 skiable acres; Bavarian-styled pedestrian village, summer Epic Discovery alpine park.',
    },
    {
      id: 'st-marys-glacier',
      name: "St Mary's Glacier",
      lat: 39.8278,
      lon: -105.6406,
      elevation_m: 3292,
      reasons_to_visit: ['hike', 'lake'],
      blurb:
        '1.5-mi rocky climb to a year-round snowfield and alpine lake off I-70; summer sledding, $20 private parking.',
    },
    {
      id: 'central-city-blackhawk',
      name: 'Central City / Black Hawk',
      lat: 39.7978,
      lon: -105.5094,
      reasons_to_visit: ['historic', 'town'],
      blurb:
        '1859 gold-rush twin towns; Central City Opera House (1878), Teller House, 24-hr casinos along Gregory Gulch.',
    },
    {
      id: 'golden-gate-canyon-sp',
      name: 'Golden Gate Canyon St Park',
      lat: 39.8578,
      lon: -105.42,
      reasons_to_visit: ['hike', 'viewpoint', 'picnic'],
      blurb:
        '12,000-acre park above Golden; 35 mi of trails and the Panorama Point overlook with 100-mi Continental Divide views.',
    },
    {
      id: 'evergreen',
      name: 'Evergreen (Evergreen Lake)',
      lat: 39.6333,
      lon: -105.3172,
      reasons_to_visit: ['lake', 'paddle', 'town'],
      blurb:
        'Mountain town 30 min from Denver; 55-acre Evergreen Lake with paddleboard rentals, winter outdoor ice skating.',
    },
    {
      id: 'roxborough-sp',
      name: 'Roxborough St Park',
      lat: 39.4286,
      lon: -105.0689,
      reasons_to_visit: ['hike', 'viewpoint', 'wildlife'],
      blurb:
        '3,300-acre park of 300-million-year-old red sandstone fins; no dogs or bikes, Fountain Valley and Carpenter Peak trails.',
    },
    {
      id: 'waterton-canyon',
      name: 'Waterton Canyon (South Platte)',
      lat: 39.5106,
      lon: -105.1031,
      reasons_to_visit: ['hike', 'wildlife', 'fish'],
      blurb:
        'Flat 6.2-mi service road along the South Platte to Strontia Springs Dam; resident bighorn sheep herd, no dogs.',
    },
    {
      id: 'castlewood-canyon-sp',
      name: 'Castlewood Canyon St Park',
      lat: 39.3239,
      lon: -104.7411,
      reasons_to_visit: ['hike', 'historic', 'waterfall'],
      blurb:
        'Cherry Creek canyon southeast of Denver; 14 mi of trails past the 1933 dam-failure ruins and a small cascade.',
    },
    {
      id: 'staunton-sp',
      name: 'Staunton St Park (Elk Falls)',
      lat: 39.5097,
      lon: -105.3831,
      reasons_to_visit: ['hike', 'waterfall', 'viewpoint'],
      blurb:
        '3,800-acre park near Conifer; 29 mi of trails, 12-mi round-trip to the 100-ft Elk Falls overlook.',
    },
    {
      id: 'rocky-mtn-arsenal-nwr',
      name: 'Rocky Mtn Arsenal NWR',
      lat: 39.8361,
      lon: -104.8769,
      reasons_to_visit: ['wildlife'],
      blurb:
        '15,000-acre shortgrass-prairie refuge NE of Denver; free 11-mi Wildlife Drive, ~250 bison, raptors, prairie dogs.',
    },
    {
      id: 'devils-head',
      name: 'Devils Head Lookout (Rampart Range)',
      lat: 39.2686,
      lon: -105.1036,
      elevation_m: 2907,
      reasons_to_visit: ['hike', 'viewpoint', 'historic'],
      blurb:
        'Last staffed fire lookout in Colorado; 2.9-mi round-trip ending in 143 steel steps, 100-mi Front Range views.',
    },
    {
      id: 'kenosha-pass',
      name: 'Kenosha Pass (Colorado Trail)',
      lat: 39.4078,
      lon: -105.7508,
      elevation_m: 3051,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        '10,000-ft pass on US-285 with huge aspen groves; Colorado Trail segments east and west, peak gold late September.',
    },
    {
      id: 'fort-collins',
      name: 'Fort Collins / Horsetooth',
      lat: 40.5853,
      lon: -105.0844,
      reasons_to_visit: ['town', 'lake', 'paddle', 'hike'],
      blurb:
        'College town 65 mi north of Denver; Old Town, 20+ craft breweries, 6.5-mi Horsetooth Reservoir and Horsetooth Rock hike.',
    },
    {
      id: 'garden-of-the-gods',
      name: 'Garden of the Gods',
      lat: 38.8783,
      lon: -104.8859,
      reasons_to_visit: ['hike', 'viewpoint', 'historic'],
      blurb:
        '1,340-acre red sandstone park in Colorado Springs; free entry, 21 mi of trails, Balanced Rock and Kissing Camels.',
    },
    {
      id: 'pikes-peak',
      name: 'Pikes Peak Summit',
      lat: 38.8405,
      lon: -105.0442,
      elevation_m: 4302,
      reasons_to_visit: ['viewpoint', 'hike'],
      blurb:
        'One of 58 Colorado 14ers; 19-mi Pikes Peak Highway toll road or Broadmoor cog railway to the 14,115-ft summit.',
    },
    {
      id: 'manitou-springs',
      name: 'Manitou Springs (Incline + Caves)',
      lat: 38.8597,
      lon: -104.9172,
      reasons_to_visit: ['town', 'historic', 'hike', 'museum'],
      blurb:
        'Victorian spa town at the base of Pikes Peak; Manitou Incline stairway, cog railway depot, Cave of the Winds tours nearby.',
    },
    {
      id: 'paint-mines',
      name: 'Paint Mines Interpretive Park',
      lat: 39.0178,
      lon: -104.2858,
      reasons_to_visit: ['hike', 'historic'],
      blurb:
        '750-acre El Paso County park east of Calhan; colored clay hoodoos and spires, 4 mi of trails, 9,000-year archaeology.',
    },
    {
      id: 'florissant-fossil-beds',
      name: 'Florissant Fossil Beds Nl Mon',
      lat: 38.9097,
      lon: -105.2856,
      reasons_to_visit: ['museum', 'hike', 'historic'],
      blurb:
        '34-million-year-old Eocene lakebed; 14-ft petrified redwood stumps, visitor center, 14 mi of meadow trails.',
    },
    {
      id: 'cripple-creek',
      name: 'Cripple Creek',
      lat: 38.7472,
      lon: -105.1783,
      reasons_to_visit: ['historic', 'town', 'museum'],
      blurb:
        '1890s gold-camp town at 9,494 ft; Mollie Kathleen Mine tours, Cripple Creek & Victor narrow-gauge railroad, wild donkeys.',
    },
    {
      id: 'mueller-sp',
      name: 'Mueller St Park',
      lat: 38.8728,
      lon: -105.1733,
      reasons_to_visit: ['hike', 'viewpoint', 'wildlife'],
      blurb:
        '5,100-acre park west of Pikes Peak; 55 mi of trails, elk and black bear habitat, Dome Rock wildlife area.',
    },
    {
      id: 'royal-gorge',
      name: 'Royal Gorge Bridge & Park',
      lat: 38.4611,
      lon: -105.3289,
      reasons_to_visit: ['viewpoint', 'historic'],
      blurb:
        '1929 suspension bridge 955 ft above the Arkansas River; gondola, zip line, Royal Gorge Route railroad excursions.',
    },
    {
      id: 'buena-vista',
      name: 'Buena Vista (Collegiate Peaks)',
      lat: 38.8422,
      lon: -106.1311,
      reasons_to_visit: ['town', 'paddle', 'viewpoint'],
      blurb:
        'Arkansas River town under the Collegiate Peaks 14ers; Browns Canyon rafting, Mt Princeton Hot Springs nearby.',
    },
    {
      id: 'leadville',
      name: 'Leadville',
      lat: 39.2508,
      lon: -106.2925,
      elevation_m: 3094,
      reasons_to_visit: ['historic', 'town', 'hike'],
      blurb:
        'Highest incorporated city in the US at 10,152 ft; National Mining Hall of Fame, 11.6-mi paved Mineral Belt Trail.',
    },
    {
      id: 'great-sand-dunes',
      name: 'Great Sand Dunes Nl Park',
      lat: 37.7326,
      lon: -105.5139,
      elevation_m: 2500,
      reasons_to_visit: ['hike', 'viewpoint', 'wildlife'],
      blurb:
        'Tallest dunes in North America (Star Dune, 741 ft); Medano Creek beach May–June, ~4 hr via US-285 from Denver.',
    },
  ],
};
