#!/usr/bin/env node

var Canvas = require('canvas')
  , d3 = require('d3')
  , fs = require('fs')
  , path = require('path')
  , topojson = require('topojson');

var DATA_DIR = path.resolve(__dirname, '..', 'data');

var width = 960
  , height = 600;

var canvas = new Canvas(width, height)
  , context = canvas.getContext('2d');

// var file = fs.createWriteStream(process.argv[2]);

var colors = {
    black: "#000"
};

context.fillStyle = colors.black;
context.strokeStyle = colors.black;
context.lineWidth = 0.5;
context.lineJoin = "round";

var projection = d3.geo.albersUsa()
    .scale(1280)
    .translate([width / 2, height / 2]);

var geopath = d3.geo.path()
    .projection(projection)
    .context(context)
    .pointRadius(2.5);

// read the US topojson file
fs.readFile(path.join(DATA_DIR, 'us.json'), function(err, data) {
    if (err) throw err;
    data = JSON.parse(data);
    
    //geopath(topojson.feature(data, data.objects.counties));
    //context.stroke();
    var states = topojson.feature(data, data.objects.states);
    geopath(states); context.stroke();
    /***
    states.features.forEach(function(feature) {
        //console.dir(state);
        //context.beginPath();
        geopath(feature);
        if (/Point$/.test(feature.geometry.type)) context.fill();
        else context.stroke();
    });
    ***/
    canvas.pngStream().pipe(process.stdout);

});