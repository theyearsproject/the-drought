#!/usr/bin/env node

var Canvas = require('canvas')
  , d3 = require('d3')
  , fs = require('fs')
  , glob = require('glob')
  , path = require('path')
  , queue = require('queue-async')
  , shapefile = require('shapefile')
  , topojson = require('topojson');

var DATA_DIR = path.resolve(__dirname, '..', 'data')
  , IMG_DIR = path.resolve(__dirname, '..', 'img/drought');

var scale = .75
  , width = 960 * scale
  , height = 600 * scale;

var colors = {
    black: "#000",
    border: "#ddd",
    land: "#eee",
    'DM-0': d3.rgb(255, 255, 0).toString(),
    'DM-1': d3.rgb(252, 211, 127).toString(),
    'DM-2': d3.rgb(255, 170, 0).toString(),
    'DM-3': d3.rgb(230, 0, 0).toString(),
    'DM-4': d3.rgb(115, 0, 0).toString()
};

var projection = d3.geo.albersUsa()
    .scale(1280 * scale)
    .translate([width / 2, height / 2])
    .precision(0);

// let's do this
queue()
    .defer(fs.readFile, path.join(DATA_DIR, 'us.json'))
    .defer(glob, path.join(DATA_DIR, 'shapefiles', '*.shp'))
    .await(render);

function render(err, us, shapefiles) {
    if (err) {throw err;}

    // parse all our json
    us = JSON.parse(us);

    // queue up files to render
    // two years at a time
    var q = queue(52 * 2);
    shapefiles.forEach(function(filename) {
        /***
        try { raster(us, filename); }
        catch(err) {
            console.error(err);
        }
        ***/
        q.defer(raster, us, filename);
    });

    // let me know when we're done
    q.awaitAll(function(err, filenames) {
        if (err) { throw err; }
        console.log('Rendered %i files', filenames.length);
    });
}

function raster(us, filename, callback) {
    // render a png image from a US topojson object
    // and a shapefile path
    var canvas = new Canvas(width, height)
      , context = canvas.getContext('2d');

    var geopath = d3.geo.path()
        .projection(projection)
        .context(context);

    var states = topojson.feature(us, us.objects.states)
      , land = topojson.feature(us, us.objects.land);

    // fill in land
    context.fillStyle = colors.land;
    context.strokeStyle = colors.border;
    context.lineWidth = 0.5;
    context.lineJoin = "round";

    context.beginPath();
    geopath(land);
    context.fill();
    context.stroke();

    shapefile.readStream(filename)
        .on('error', function(err) { 
            callback(err); 
        })
        .on('feature', function(feature) {
            // draw this drought region
            var color = colors['DM-' + feature.properties.DM];
            context.fillStyle = color;
            context.strokeStyle = color;
            
            // draw the path
            context.beginPath();
            geopath(feature);
            context.stroke();
            context.fill();

        })
        .on('end', function() {
            // draw statelines over drought colors
            context.fillStyle = colors.border;
            context.strokeStyle = colors.border;
            context.lineWidth = 0.75;
            context.lineJoin = "round";

            context.beginPath();
            geopath(states);
            context.stroke();

            // get an outfile
            var name = path.basename(filename, '.shp').toLowerCase()
              , file = fs.createWriteStream(path.join(IMG_DIR, name + '.png'));

            // then write the final file
            canvas.pngStream().pipe(file);
            console.info('Rendered: %s', filename);

            // run the callback with no error and pass the filename along
            callback(null, filename);
        });
}

