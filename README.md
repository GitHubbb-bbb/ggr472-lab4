# GGR472 Lab 4: Toronto Pedestrian & Cyclist Collision Map

An interactive hexgrid web map visualizing road collisions involving 
pedestrians and cyclists in Toronto between 2006 and 2021.

## Live Map
[View on GitHub Pages](https://GitHubbb-bbb.github.io/ggr472-lab4/)

## Purpose
This map aggregates individual collision points into 0.5 km hexagonal 
grid cells to reveal spatial patterns and high-risk areas across Toronto.

## Data Source
City of Toronto Open Data — Motor Vehicle Collisions (Killed or Seriously 
Injured Persons), 2006–2021  
https://open.toronto.ca/dataset/motor-vehicle-collisions-involving-killed-or-seriously-injured-persons/

## Features
- Hexgrid density map coloured by collision count per hexagon
- Click pop-ups showing collision count per hexagon
- Layer toggle to show/hide the hexgrid
- Scale bar and navigation controls

## GIS Analysis (Turf.js)
- `turf.envelope()` — bounding box around collision points
- `turf.transformScale()` — expand bbox by 10% for full coverage
- `turf.hexGrid()` — generate 0.5 km hexagonal grid
- `turf.collect()` — spatial join to count collisions per hexagon

## Technologies
- Mapbox GL JS v3.10.0
- Turf.js v7.2.0
- HTML5 / CSS3 / JavaScript ES6

## Author
Isabella — GGR472, University of Toronto, Winter 2026