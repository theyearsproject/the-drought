#!/usr/bin/env node

var Canvas = require('canvas')
  , d3 = require('d3')
  , fs = require('fs')
  , path = require('path')
  , queue = require('queue-async')
  , topojson = require('topojson')
  , week = process.argv[2];

var DATA_DIR = path.resolve(__dirname, '..', 'data');

var width = 960
  , height = 600;

var canvas = new Canvas(width, height)
  , context = canvas.getContext('2d');

// var file = fs.createWriteStream(process.argv[2]);

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
    .scale(1280)
    .translate([width / 2, height / 2]);

var geopath = d3.geo.path()
    .projection(projection)
    .context(context)
    .pointRadius(2.5);

queue()
    .defer(fs.readFile, path.join(DATA_DIR, 'us.json'))
    .defer(fs.readFile, path.join(DATA_DIR, 'drought.json'))
    .await(render);

function render(err, us, drought) {
    if (err) throw err;

    // parse all our json
    us = JSON.parse(us);
    drought = JSON.parse(drought);

    var states = topojson.feature(us, us.objects.states)
      , land = topojson.feature(us, us.objects.land);

    // fill in land
    context.fillStyle = colors.land;
    context.strokeStyle = colors.border;
    context.lineWidth = 0.5;
    context.lineJoin = "round";

    context.beginPath();
    geopath(land);
    context.stroke();
    context.fill();

    var weekly = topojson.feature(drought, drought.objects[week]);
    weekly.features.forEach(function(feature) {
        var color = colors['DM-' + feature.id];
        context.fillStyle = color;
        context.strokeStyle = color;
        context.beginPath();
        geopath(feature);
        context.stroke();
        context.fill();
    });

    // draw statelines over drought colors
    context.fillStyle = colors.border;
    context.strokeStyle = colors.border;
    context.lineWidth = 0.75;
    context.lineJoin = "round";

    context.beginPath();
    geopath(states); 
    context.stroke();

    canvas.pngStream().pipe(process.stdout);
}


