#!/usr/bin/env node

var Canvas = require('canvas')
  , d3 = require('d3')
  , fs = require('fs')
  , path = require('path')
  , topojson = require('topojson');

var DATA_DIR = path.resolve(__dirname, '..', 'data');

var width = 960
  , height = 600;

var canvas = new Canvas([width, height])
  , context = canvas.getContext('2d');

var file = fs.createWriteStream(process.argv[2]);

var colors = {
    black: "#000"
};

context.fillStyle = colors.black;
context.strokeStyle = colors.black;
context.lineWidth = 0.5;
context.lineJoin = "round";

var projection = d3.geo.albersUsa()
    .scale(1280);

var geopath = d3.geo.path()
    .projection(projection)
    .context(context);

// read the US topojson file
fs.readFile(path.join(DATA_DIR, 'us.json'), function(err, data) {
    if (err) throw err;
    data = JSON.parse(data);
    
    var states = topojson.feature(data, data.objects.states);
    states.features.forEach(function(state) {
        context.beginPath();
        geopath(state);
        context.stroke();
    });

    canvas.pngStream().pipe(file);
});