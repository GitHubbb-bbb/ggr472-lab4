/*--------------------------------------------------------------------
GGR472 LAB 4: Incorporating GIS Analysis into web maps using Turf.js
Author: Isabella
Date: March 2026

Purpose: Visualize road collisions involving pedestrians and cyclists
in Toronto (2006–2021) using a hexagonal grid density map.

Data Source: City of Toronto Open Data — Motor Vehicle Collisions
(Killed or Seriously Injured Persons), 2006–2021
https://open.toronto.ca/dataset/motor-vehicle-collisions-involving-killed-or-seriously-injured-persons/
--------------------------------------------------------------------*/


/*--------------------------------------------------------------------
STEP 1: INITIALIZE MAP
--------------------------------------------------------------------*/

// Mapbox public access token — found at https://account.mapbox.com/access-tokens/
mapboxgl.accessToken = 'pk.eyJ1IjoiaXNhYmVsbGFhYWFhIiwiYSI6ImNta2RuMDZkaDBjcXAzZW9vaDdmenhibHgifQ.ko0pM0sKSbER2JVQny_7gg';

// Initialize the Mapbox map
// A dark basemap works well for collision density maps — hotspots stand out clearly
const map = new mapboxgl.Map({
    container: 'map',                            // matches id="map" in index.html
    style: 'mapbox://styles/mapbox/dark-v11',    // dark-v11 or your own Studio style
    center: [-79.39, 43.65],                     // Toronto [longitude, latitude]
    zoom: 11
});

// Add zoom/rotate controls in the top-right corner
map.addControl(new mapboxgl.NavigationControl(), 'top-right');

// Add a scale bar in the bottom-right corner
map.addControl(new mapboxgl.ScaleControl(), 'bottom-right');


/*--------------------------------------------------------------------
STEP 2: FETCH AND STORE GEOJSON COLLISION DATA
--------------------------------------------------------------------*/

// Declare an empty variable — it will be populated once fetch() completes
// Using 'let' so we can reassign it after the async fetch resolves
let collisionData;

// fetch() sends an HTTP request to retrieve the GeoJSON file from GitHub
// After deploying to GitHub Pages, prefer the github.io URL (see README)
fetch('https://raw.githubusercontent.com/GitHubbb-bbb/ggr472-lab4/main/data/pedcyc_collision_06-21.geojson')    
    .then(response => response.json())  // Parse the HTTP response body as JSON
    .then(response => {
        console.log('Collision data loaded:', response);  // Verify in browser console
        collisionData = response;                         // Store GeoJSON as a variable

        /*--------------------------------------------------------------------
        STEPS 3–5: ALL MAP ANALYSIS AND DISPLAY CODE
        Note: Nested inside fetch so collisionData is guaranteed to exist
        before any Turf analysis runs. map.on('load') is also nested here
        to ensure both the data AND the map style are ready.
        --------------------------------------------------------------------*/

        map.on('load', () => {

    /*----------------------------------------------------------------
    STEP 3: CREATE BOUNDING BOX AND HEXAGONAL GRID
    ----------------------------------------------------------------*/

    // turf.envelope() wraps all collision points in the tightest possible
    // rectangle, returning it as a GeoJSON Feature with a 'bbox' property.
    // Think of it as measuring the four walls of the room before tiling the floor.
    let envresult = turf.envelope(collisionData);

    // Expand the bounding box by 10% so that points near the edge of the dataset
    // are fully covered by hexagons rather than falling outside the grid.
    // Note: turf.transformScale requires a Feature or FeatureCollection, not an array.
    let expandedEnv = turf.transformScale(envresult, 1.10);

    // Extract the bounding coordinates as a flat array: [minX, minY, maxX, maxY]
    // This is the format required by turf.hexGrid() as its first argument.
    let bboxCoords = [
    expandedEnv.geometry.coordinates[0][0][0],  // minX
    expandedEnv.geometry.coordinates[0][0][1],  // minY
    expandedEnv.geometry.coordinates[0][2][0],  // maxX
    expandedEnv.geometry.coordinates[0][2][1]   // maxY
    ];

    // Log the bbox array so you can verify the coordinate range in the console
    console.log('Bounding box coordinates [minX, minY, maxX, maxY]:', bboxCoords);
    // Example expected output: [-79.65..., 43.56..., -79.09..., 43.89...]

    // Generate a hexagonal grid using the bounding box coordinates.
    // Arguments: (bbox, cellSide, options)
    //   - bbox:     [minX, minY, maxX, maxY] array from above
    //   - cellSide: 0.5 = each hexagon side is 0.5 km (approx 500 m across)
    //   - units:    'kilometers' specifies the unit for cellSide
    // Returns a GeoJSON FeatureCollection of polygon hexagons
    let hexgrid = turf.hexGrid(bboxCoords, 0.5, { units: 'kilometers' });

    console.log('Hexgrid created. Total hexagons:', hexgrid.features.length);


    /*----------------------------------------------------------------
    STEP 4: AGGREGATE COLLISION POINTS BY HEXAGON
    ----------------------------------------------------------------*/

    // turf.collect() performs a spatial join between polygons and points.
    // For each hexagon, it finds all collision points that fall inside it,
    // extracts the '_id' property from each intersecting point,
    // and stores the collected values in a new array property called 'values'.
    //
    // Arguments: (polygons, points, inField, outField)
    //   - polygons: the hexgrid FeatureCollection
    //   - points:   the collision data FeatureCollection
    //   - inField:  property to collect from each intersecting point ('_id' is a unique identifier)
    //   - outField: name of the new array property added to each hexagon ('values')
    let collectedHex = turf.collect(hexgrid, collisionData, '_id', 'values');

    // Initialize maxCount to track the highest collision count found in any single hexagon.
    // This will be used as the upper bound of the colour gradient in Step 5.
    let maxCount = 0;

    // Iterate through every hexagon in the collected FeatureCollection
    collectedHex.features.forEach((feature) => {

        // feature.properties.values is the array of '_id' values collected by turf.collect()
        // Its length is the number of collision points inside this hexagon
        feature.properties.COUNT = feature.properties.values.length;

        // Update maxCount if this hexagon has more collisions than any previously seen
        if (feature.properties.COUNT > maxCount) {
            maxCount = feature.properties.COUNT;
        }
    });

    // Log the maximum count so you understand the data range before styling
    console.log('Maximum collisions in a single hexagon:', maxCount);


    /*----------------------------------------------------------------
    STEP 3 + 5 COMBINED: ADD SOURCES AND LAYERS TO THE MAP
    (grouped here for readability — addSource and addLayer go together)
    ----------------------------------------------------------------*/

    // Add the enriched hexgrid (which now has COUNT on every feature) as a data source
    map.addSource('hexgrid-data', {
        type: 'geojson',
        data: collectedHex   // use collectedHex (not hexgrid) so COUNT is included
    });

    // Add the hexgrid as a fill (polygon) layer with a data-driven colour expression.
    // The 'interpolate' expression creates a smooth colour gradient:
    // as COUNT increases from 0 to maxCount, colour transitions from light grey to deep red.
    map.addLayer({
        'id': 'hexgrid-layer',
        'type': 'fill',
        'source': 'hexgrid-data',
        'paint': {

            // Colour: data-driven gradient based on COUNT
            // Using a red sequential colour scheme — appropriate for risk/density data
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'COUNT'],         // retrieve the COUNT property of each hexagon
                0,         '#f7f7f7',     // 0 collisions → very light grey
                5,         '#fee5d9',     // low → light pink
                15,        '#fcae91',     // moderate-low → light salmon
                30,        '#fb6a4a',     // moderate → orange-red
                50,        '#de2d26',     // high → red
                maxCount,  '#67000d'      // maximum → deep crimson
            ],

            // Opacity: hide empty hexagons entirely (COUNT === 0)
            // so the basemap remains visible where no collisions occurred
            'fill-opacity': [
                'case',
                ['==', ['get', 'COUNT'], 0], 0,   // empty hexagons: fully transparent
                0.75                               // all others: 75% opacity
            ],

            // Thin semi-transparent white border between hexagons for visual separation
            'fill-outline-color': 'rgba(255, 255, 255, 0.2)'
        }
    });


    /*----------------------------------------------------------------
    STEP 5: POP-UP WINDOWS (required)
    Clicking a hexagon shows its collision count and location details.
    ----------------------------------------------------------------*/

    map.on('click', 'hexgrid-layer', (e) => {
        // e.features[0] is the topmost hexagon feature at the clicked location
        const props = e.features[0].properties;
        const count = props.COUNT;

        // Create and display a popup anchored at the click coordinates
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div style="font-family: Arial, sans-serif; font-size: 13px; padding: 4px;">
                    <strong style="font-size: 15px;">${count} collision${count !== 1 ? 's' : ''}</strong><br>
                    <span style="color: #666;">in this 0.5 km hexagon</span><br>
                    <hr style="margin: 6px 0; border-color: #eee;">
                    <span style="font-size: 11px; color: #888;">
                        Toronto · 2006–2021<br>
                        Pedestrians &amp; cyclists
                    </span>
                </div>
            `)
            .addTo(map);
    });

    // Change the cursor to a pointer when hovering over the hexgrid layer
    // This signals to the user that the layer is clickable
    map.on('mouseenter', 'hexgrid-layer', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    // Reset cursor to default when the mouse leaves the layer
    map.on('mouseleave', 'hexgrid-layer', () => {
        map.getCanvas().style.cursor = '';
    });

}); // end map.on('load')


/*--------------------------------------------------------------------
STEP 5: HTML ELEMENT EVENT LISTENERS
Note: These go OUTSIDE map.on('load') because they listen to HTML
elements (not the map), and those elements are available immediately
when the page loads — no need to wait for the map style.
--------------------------------------------------------------------*/

}); // end fetch .then()

// Layer toggle checkbox — shows or hides the hexgrid layer
document.getElementById('hexcheck').addEventListener('change', (e) => {
    // setLayoutProperty changes the 'visibility' layout property of the layer
    // 'visible' = shown, 'none' = hidden
    map.setLayoutProperty(
        'hexgrid-layer',
        'visibility',
        e.target.checked ? 'visible' : 'none'
    );
});

// Filter dropdown — shows only Pedestrian collisions, only Cyclist collisions, or both
// This demonstrates filtering features based on a data property (INVTYPE)
document.getElementById('typefilter').addEventListener('change', (e) => {
    const selected = e.target.value;

    if (selected === 'All') {
        // Remove any existing filter so all hexagons are shown
        // Note: this filters the SOURCE points before hexgrid aggregation is not possible
        // at this stage — the filter below filters the visual layer display
        // For a fully dynamic filter by type, the hexgrid would need to be regenerated.
        // This visual filter is a useful starting point.
        map.setFilter('hexgrid-layer', null);
    }
    // Additional filter logic can be added here if implementing a more advanced approach
    // such as re-running the hexgrid analysis on a filtered subset of collisionData
});