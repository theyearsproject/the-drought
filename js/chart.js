var url = "data/csv/us.csv"
  , margin = {top: 25, right: 25, bottom: 25, left: 50}
  , height = parseInt(d3.select('#chart').style('height'))
  , height = height - margin.top - margin.bottom
  , width = parseInt(d3.select('#chart').style('width'))
  , width = width - margin.left - margin.right;

var formats = {
    file: d3.time.format('usdm%y%m%d'),
    date: d3.time.format('%b %d, %Y'),
    week: d3.time.format('%Y-%m-%d'),
    percent: function(d) { return d3.round(d) + '%'; }
};

// scales and axes
var dates = _.map(WEEKS, function(d) {
    return formats.file.parse(d);
});

var drought = crossfilter()
  , byDate = drought.dimension(function(d) { return d.Week; })
  , extent = [dates[0], dates[dates.length - 1]]
  , levels = ['D0-D4', 'D1-D4', 'D2-D4', 'D3-D4', 'D4'];

var x = d3.time.scale()
    .domain(extent)
    .range([0, width]);

var y = d3.scale.linear()
    .domain([0, 100]) // dealing in percents
    .range([height, 0]);

var xAxis = d3.svg.axis()
    .orient('bottom')
    .scale(x)
    .ticks(3)
    .tickFormat(formats.date);

var yAxis = d3.svg.axis()
    .orient('left')
    .scale(y)
    .tickFormat(function(d) { return d + '%'; });

var area = function(accessor) {
    return d3.svg.area()
        .x(function(d) { return x(d.Week); })
        .y0(height)
        .y1(function(d) { return y(d[accessor]); });
}

var zoom = d3.behavior.zoom()
    .x(x)
    .scaleExtent([1, 15])
    .on('zoom', update);

var svg = d3.select('#chart').append('svg')
    .style('height', height + margin.top + margin.bottom)
  .append('g')
    .attr('transform', translate(margin.left, margin.top));

svg.append('defs').append('clipPath')
    .attr('id', 'clip')
  .append('rect')
    .attr('width', width)
    .attr('height', height);

svg.append('g')
    .attr('class', 'x axis')
    .attr('transform', translate(0, height));

svg.append('g')
    .attr('class', 'y axis');

var paths = svg.append('g')
    .attr('class', 'drought')
    .attr('clip-path', 'url(#clip)');

var verticle = svg.append('line')
    .attr('class', 'verticle')
    .attr('y1', 0)
    .attr('y2', height);

var template = d3.select('#caption-template').html()
  , template = _.template(template);

function showCaption() {

    var position = d3.mouse(this)
      , week = x.invert(position[0])
      , datum = byDate.filter(function(d) { return d < week; }).top(1)[0];

    verticle
        .attr('x1', position[0])
        .attr('x2', position[0])
        .style('stroke-width', 1);

    if (datum) {
        datum.formats = formats;
        d3.select('.caption.national').html(template(datum));
    }
}

function hideCaption() {

    verticle
        .style('stroke-width', 0);
}

function update() {
    // freeze the domain so we can't slide off the scale
    var domain = x.domain();
    x.domain([
        // the first date, or the last year
        d3.max([dates[0], d3.min([domain[0], dates[dates.length - 52]])]),
        
        // don't go earler than the first date or later than the last
        d3.min( [ d3.max([domain[1], dates[51]]), extent[1]] )
    ]);

    _.each(levels, function(level) {
        paths.select('path.' + level).attr('d', area(level));
    });

    svg.select('g.x.axis').call(xAxis);
}

function translate(x, y) {
    return "translate(" + x + "," + y + ")";
}

// load it up
d3.csv(url).row(function(d) {
    // numerize
    // Nothing D0-D4   D1-D4   D2-D4   D3-D4   D4
    d.Week = formats.week.parse(d.Week);
    d.Nothing = +d.Nothing;
    d['D0-D4'] = +d['D0-D4'];
    d['D1-D4'] = +d['D1-D4'];
    d['D2-D4'] = +d['D2-D4'];
    d['D3-D4'] = +d['D3-D4'];
    d['D4'] = +d['D4'];

    d['D0'] = d['D0-D4'] - d['D1-D4'];
    d['D1'] = d['D1-D4'] - d['D2-D4'];
    d['D2'] = d['D2-D4'] - d['D3-D4'];
    d['D3'] = d['D3-D4'] - d['D4'];

    return d;

}).get(function(err, data) {
    // render the chart
    drought.add(data);

    _.each(levels, function(level) {
        paths.append('path')
            .datum(data)
            .attr('class', 'drought ' + level)
            .attr('d', area(level));
    });

    // add a zoom pane overlay
    svg.append('rect')
        .attr('class', 'pane')
        .attr('width', width)
        .attr('height', height)
        .call(zoom)
        .on('mousemove', showCaption)
        .on('touchstart', showCaption)
        .on('mouseout', hideCaption);

    svg.select('g.x.axis').call(xAxis);
    svg.select('g.y.axis').call(yAxis);
});