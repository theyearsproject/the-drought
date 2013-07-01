The Drought
===========

The US drought over the past few years has been absolutely awful. Texas saw its [worst single-year drought][tx] in 2011. By summer of 2012, [three-quarters of the US][us] was in some stage of drought, half of it severe or worse.

Here's where the drought stands now: http://eyeseast.github.io/visible-data/2013/05/23/state-of-the-drought/.

I can build a version of this that updates automatically, and lets users drill down to their own county, essentially a combination of Your Warming World and what I did at NPR. My goal would be to continuously give users an answer to these questions:

 - How bad is the drought now?
 - How bad is it where I am?
 - Is it getting worse (locally and nationally)?

Bonus points if it's embeddable.

 [tx]: http://stateimpact.npr.org/texas/drought/
 [us]: http://www.npr.org/2012/07/18/156989764/interactive-mapping-the-u-s-drought


How to build this
-----------------

First, all US data comes from the [UNL Drought Monitor](http://droughtmonitor.unl.edu/dmshps_archive.htm). It needs to be reprojected into EPSG:4326 with `ogr2ogr`. (I could just convert it into GeoJSON at the same time and skip the TopoJSON step.)

The NPR examples used Mapnik to render the continental US in Mercator. It used XML stylesheets, with one rendered for each weekly snapshot. Each snapshot produced a single PNG. Moving a slider flipped through those images, creating an animation.

For this version, I want to render it in Albers (a better, equal-area projection) and include Alaska and Hawaii, which have their own drought conditions. I'd also like to avoid all those XML files.

D3's built-in AlbersUSA projection includes Alaska, Hawaii and Puerto Rico. Rendering in SVG in the browser isn't as performant as I'd like, and I had weird fill issues with Alaska (the entire bounding box turned red).

So, I think I should stick with prerendering images. I should be able to do that using [node-canvas](https://github.com/LearnBoost/node-canvas), [D3](http://d3js.org/) and [shapefile](https://github.com/mbostock/shapefile) (or convert to GeoJSON with `ogr2ogr`).

Once that's done, I'll have my series of images, properly projected.

In parallel to this, I want to graph drought conditions over time, much like we did at NPR, and let users drill down to specific counties.

The Drought Monitor has area data in Excel files. They're in weekly snapshots, so I'll need to re-aggregate, but that shouldn't be hard. I may need to stash intermediate data in Redis or SQLite, then export. The goal is a JSON file for each county listing the area in each drought stage (DM1-4), much like the Drought Monitor has [for the US and states here](http://droughtmonitor.unl.edu/dmtabs_archive.htm).

To let people drill down, I need selectable regions on the image. One way to do that: Wrap the image in SVG, then overlay the image with county polygons. Clicking on a county gives us an event with an id we can use to look up the right JSON file.

That last part isn't going to work in IE8. Have to find out if it needs to.

Also, Backbone could provide some useful eventing and routing. Permalinks would be useful here.

