import type { Hub } from './types';

// Austin metro hub. Center is downtown Austin per the convention in
// AGENTS.md. Destinations span the Texas Hill Country (Pedernales, LBJ
// Ranch, Fredericksburg, Enchanted Rock, Highland Lakes), the I-35
// corridor (Georgetown, Salado, Waco, San Antonio, New Braunfels), the
// BBQ belt east of Austin (Lockhart, Elgin, Taylor, Smithville,
// Bastrop), and the Washington County bluebonnet/antique loop (Round
// Top, Brenham, Washington-on-the-Brazos).
export const austinHub: Hub = {
  id: 'austin',
  name: 'Austin',
  center: {
    name: 'Austin, TX',
    lat: 30.2672,
    lon: -97.7431,
  },
  destinations: [
    {
      id: 'pedernales-falls-sp',
      name: 'Pedernales Falls St Park',
      lat: 30.3093,
      lon: -98.2517,
      reasons_to_visit: ['waterfall', 'hike', 'paddle', 'picnic'],
      blurb:
        'Stepped limestone cascades on the Pedernales River; 40+ miles of trails; swimming only in the designated area downstream from the falls.',
    },
    {
      id: 'hamilton-pool',
      name: 'Hamilton Pool Preserve',
      lat: 30.3418,
      lon: -98.1255,
      reasons_to_visit: ['waterfall', 'hike'],
      blurb:
        '50-ft waterfall into a jade grotto under a collapsed limestone dome; reservations required May–October.',
    },
    {
      id: 'westcave',
      name: 'Westcave Outdoor Discovery Center',
      lat: 30.339,
      lon: -98.1408,
      reasons_to_visit: ['waterfall', 'hike', 'wildlife'],
      blurb:
        'Guided tours only; a 40-ft waterfall into a fern-walled grotto on the Pedernales, plus upland savanna trail.',
    },
    {
      id: 'reimers-ranch',
      name: 'Milton Reimers Ranch Park',
      lat: 30.3594,
      lon: -98.1558,
      reasons_to_visit: ['hike', 'paddle'],
      blurb:
        'Three miles of Pedernales River frontage; mountain biking, rock-climbing routes, and swimming holes.',
    },
    {
      id: 'krause-springs',
      name: 'Krause Springs (Spicewood)',
      lat: 30.4805,
      lon: -98.1547,
      reasons_to_visit: ['paddle', 'picnic', 'garden'],
      blurb:
        'Family-owned 115-acre property; 32 natural springs, a cypress-lined swimming hole, and a butterfly garden.',
    },
    {
      id: 'inner-space-cavern',
      name: 'Inner Space Cavern (Georgetown)',
      lat: 30.6006,
      lon: -97.6767,
      reasons_to_visit: ['museum'],
      blurb:
        "Walking tours of Texas' 5th-longest cave, discovered in 1963 during I-35 construction.",
    },
    {
      id: 'balcones-canyonlands-nwr',
      name: 'Balcones Canyonlands NWR',
      lat: 30.6495,
      lon: -97.9995,
      reasons_to_visit: ['wildlife', 'hike'],
      blurb:
        '26,000 acres set aside for the golden-cheeked warbler and black-capped vireo; Warbler Vista trails.',
    },
    {
      id: 'bastrop-sp',
      name: 'Bastrop St Park',
      lat: 30.11,
      lon: -97.2755,
      reasons_to_visit: ['hike', 'picnic'],
      blurb:
        "'Lost Pines' loblolly forest 30 miles east of Austin; CCC cabins and scenic park road to Buescher SP.",
    },
    {
      id: 'smithville',
      name: 'Smithville',
      lat: 30.0085,
      lon: -97.1564,
      reasons_to_visit: ['town'],
      blurb:
        "Small-town filming location for 'Hope Floats' and 'Tree of Life'; historic main street and BBQ stops.",
    },
    {
      id: 'lockhart',
      name: 'Lockhart',
      lat: 29.8843,
      lon: -97.67,
      reasons_to_visit: ['town'],
      blurb:
        "BBQ Capital of Texas; four legendary joints (Kreuz, Black's, Smitty's, Chisholm Trail) within walking distance.",
    },
    {
      id: 'elgin',
      name: 'Elgin',
      lat: 30.3499,
      lon: -97.3703,
      reasons_to_visit: ['town'],
      blurb:
        "'Sausage Capital of Texas'; Southside Market (est. 1882) hot rings and the start of the Bastrop County BBQ trail.",
    },
    {
      id: 'taylor',
      name: 'Taylor',
      lat: 30.5699,
      lon: -97.4094,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        'Walkable early-1900s main street; Louie Mueller Barbecue, antique rows, and the Texas Antique Trail.',
    },
    {
      id: 'salado',
      name: 'Salado',
      lat: 30.9483,
      lon: -97.5383,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        'Spring-fed creek village between Austin and Waco; galleries, glassblowers, antique shops, Stagecoach Inn.',
    },
    {
      id: 'wimberley',
      name: 'Wimberley',
      lat: 29.9974,
      lon: -98.0983,
      reasons_to_visit: ['town'],
      blurb:
        'Hill Country town on Cypress Creek; art-glass galleries, First Saturday market, and river-access swim spots.',
    },
    {
      id: 'jacobs-well',
      name: "Jacob's Well Natural Area",
      lat: 30.0344,
      lon: -98.1144,
      reasons_to_visit: ['paddle', 'hike'],
      blurb:
        "Artesian spring feeding Texas' second-longest submerged cave (~140 ft deep); swimming by reservation, short trails around the well.",
    },
    {
      id: 'blue-hole-wimberley',
      name: 'Blue Hole Regional Park (Wimberley)',
      lat: 30.0021,
      lon: -98.0972,
      reasons_to_visit: ['paddle', 'picnic'],
      blurb:
        'Cypress-lined spring swimming hole with rope swings; reservation required in summer, lawn and short trails.',
    },
    {
      id: 'blanco-sp',
      name: 'Blanco St Park',
      lat: 30.0908,
      lon: -98.4187,
      reasons_to_visit: ['paddle', 'picnic', 'fish'],
      blurb:
        'One-mile stretch of the Blanco River; swimming, CCC-era stonework, shaded picnic lawns.',
    },
    {
      id: 'gruene',
      name: 'Gruene Historic District',
      lat: 29.7411,
      lon: -98.1053,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        "19th-century German cotton town on the Guadalupe; Texas' oldest dance hall, antique shops, Gristmill dining.",
    },
    {
      id: 'landa-park-nb',
      name: 'Landa Park (New Braunfels)',
      lat: 29.7086,
      lon: -98.1255,
      reasons_to_visit: ['paddle', 'picnic', 'town'],
      blurb:
        'Spring-fed Comal River park; paddle boats, miniature train, swimming pool, 51 acres of oaks near downtown.',
    },
    {
      id: 'canyon-lake',
      name: 'Canyon Lake',
      lat: 29.8747,
      lon: -98.2647,
      reasons_to_visit: ['lake', 'paddle', 'fish'],
      blurb:
        'Guadalupe River reservoir north of New Braunfels; eight public parks, boating, and the 2002-flood gorge trail.',
    },
    {
      id: 'guadalupe-river-sp',
      name: 'Guadalupe River St Park',
      lat: 29.8756,
      lon: -98.4833,
      reasons_to_visit: ['paddle', 'hike', 'fish'],
      blurb:
        'Four miles of cypress-shaded riverbank; tubing, swimming, fishing, and short canyon-rim hikes.',
    },
    {
      id: 'san-marcos-river',
      name: 'San Marcos River',
      lat: 29.8833,
      lon: -97.9414,
      reasons_to_visit: ['paddle'],
      blurb:
        'Spring-fed 72°F river through downtown San Marcos; tubing with outfitters and glass-bottom boat tours at Spring Lake.',
    },
    {
      id: 'lbj-ranch',
      name: 'LBJ Ranch (Stonewall)',
      lat: 30.238,
      lon: -98.6357,
      reasons_to_visit: ['historic', 'museum', 'farm'],
      blurb:
        'LBJ NHP: the Texas White House, one-room schoolhouse, and Sauer-Beckmann living-history farm.',
    },
    {
      id: 'fredericksburg',
      name: 'Fredericksburg',
      lat: 30.2752,
      lon: -98.872,
      reasons_to_visit: ['town', 'historic', 'museum'],
      blurb:
        'German Hill Country town; Main Street shopping, 50+ area wineries, and the National Museum of the Pacific War.',
    },
    {
      id: 'wildseed-farms',
      name: 'Wildseed Farms',
      lat: 30.2661,
      lon: -98.7692,
      reasons_to_visit: ['garden', 'farm'],
      blurb:
        "Nation's largest working wildflower farm; 200 acres of bluebonnets, poppies, and on-site winery.",
    },
    {
      id: 'old-tunnel-sp',
      name: 'Old Tunnel St Park',
      lat: 30.1139,
      lon: -98.8193,
      reasons_to_visit: ['wildlife', 'historic'],
      blurb:
        'May–October bat emergence from an abandoned 1913 railroad tunnel; up to 3 million Mexican free-tailed bats at dusk.',
    },
    {
      id: 'enchanted-rock',
      name: 'Enchanted Rock St Natural Area',
      lat: 30.5059,
      lon: -98.8184,
      elevation_m: 556,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        'Pink granite dome rising 425 ft above the Hill Country; steep summit hike, rock climbing, stargazing.',
    },
    {
      id: 'marble-falls',
      name: 'Marble Falls',
      lat: 30.5782,
      lon: -98.2737,
      reasons_to_visit: ['town', 'lake'],
      blurb:
        'Town on Lake Marble Falls; Blue Bonnet Cafe, lake cruises, and Sweet Berry Farm pick-your-own in spring.',
    },
    {
      id: 'longhorn-cavern-sp',
      name: 'Longhorn Cavern St Park',
      lat: 30.6843,
      lon: -98.3511,
      reasons_to_visit: ['historic', 'hike'],
      blurb:
        'CCC-era park with guided walking tours through a river-carved cavern; aboveground ridgeline trails in the Hill Country.',
    },
    {
      id: 'inks-lake-sp',
      name: 'Inks Lake St Park',
      lat: 30.7339,
      lon: -98.3711,
      reasons_to_visit: ['lake', 'paddle', 'fish', 'hike'],
      blurb:
        "Constant-level Highland Lakes reservoir; swimming, paddling, and granite-shoreline trails to Devil's Waterhole.",
    },
    {
      id: 'colorado-bend-sp',
      name: 'Colorado Bend St Park',
      lat: 31.0864,
      lon: -98.4548,
      reasons_to_visit: ['waterfall', 'hike', 'paddle'],
      blurb:
        '70-ft Gorman Falls over travertine formations; 35+ miles of trails, Spicewood Springs swimming, cave tours.',
    },
    {
      id: 'boerne',
      name: 'Boerne',
      lat: 29.7947,
      lon: -98.732,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        'Hill Country town on Cibolo Creek; Main Plaza shops, Cibolo Nature Center, nearby Cave Without A Name.',
    },
    {
      id: 'natural-bridge-caverns',
      name: 'Natural Bridge Caverns',
      lat: 29.6912,
      lon: -98.3422,
      reasons_to_visit: ['museum'],
      blurb:
        'Largest commercial cave in Texas; multiple guided tours, aboveground ropes course, maze, and gem-panning sluice.',
    },
    {
      id: 'san-antonio-river-walk',
      name: 'San Antonio (The Alamo + River Walk)',
      lat: 29.4252,
      lon: -98.4946,
      reasons_to_visit: ['town', 'historic'],
      blurb:
        'Walkable canal below street level; the Alamo, restaurants, river barges, and 15 miles of connected paths.',
    },
    {
      id: 'san-antonio-missions',
      name: 'San Antonio Missions NHP',
      lat: 29.383,
      lon: -98.4824,
      reasons_to_visit: ['historic', 'museum'],
      blurb:
        'Four Spanish colonial missions on a continuous trail south of downtown; UNESCO World Heritage site.',
    },
    {
      id: 'round-top',
      name: 'Round Top',
      lat: 30.0802,
      lon: -96.6976,
      reasons_to_visit: ['town'],
      blurb:
        'Population under 100; biannual Antiques Fair sprawls over 11 miles with thousands of vendors in March and October.',
    },
    {
      id: 'brenham',
      name: 'Brenham (Blue Bell)',
      lat: 30.1669,
      lon: -96.3977,
      reasons_to_visit: ['town', 'garden'],
      blurb:
        'Bluebonnet Capital of Texas; Blue Bell Creameries visitor center, antique shops, spring wildflower driving loops.',
    },
    {
      id: 'washington-brazos',
      name: 'Washington-on-the-Brazos',
      lat: 30.3288,
      lon: -96.1448,
      reasons_to_visit: ['historic', 'museum', 'farm'],
      blurb:
        'Birthplace of the Texas Republic; Independence Hall, Star of the Republic Museum, Barrington Living History Farm.',
    },
    {
      id: 'waco',
      name: 'Waco (Magnolia + Mammoth NM)',
      lat: 31.5493,
      lon: -97.1467,
      reasons_to_visit: ['town', 'zoo', 'museum'],
      blurb:
        'Magnolia Market silos, Cameron Park Zoo, Waco Mammoth National Monument, and the Dr Pepper Museum.',
    },
    {
      id: 'lost-maples',
      name: 'Lost Maples St Natural Area',
      lat: 29.8194,
      lon: -99.5783,
      reasons_to_visit: ['hike', 'viewpoint'],
      blurb:
        'Isolated canyon grove of Uvalde bigtooth maples; peak fall color early-to-mid November, 11 miles of trails.',
    },
  ],
};
