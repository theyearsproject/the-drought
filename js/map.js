var urls = {
    drought: "/data/drought.json",
    us: "/data/us.json"
};

var margin = {top: 10, right: 10, bottom: 10, left: 10}
  , width = parseInt(d3.select('#map').style('width'))
  , width = width - margin.right - margin.left
  , height = parseInt(d3.select('#map').style('height'))
  , height = height - margin.top - margin.bottom,
  data;

var dateFormat = d3.time.format('usdm%y%m%d');

var map = d3.select('#map').append('svg')
    .style('width', width)
    .style('height', height);

var albers = d3.geo.albersUsa();

var path = d3.geo.path()
    .projection(albers);

queue()
    .defer(d3.json, urls.us)
    .defer(d3.json, urls.drought)
    .await(render);

function render(err, us, drought) {

    data = {
        drought: drought,
        us: us,
        weeks: {}
    };

    var weeks = d3.keys(drought.objects)
      , dm = topojson.feature(drought, drought.objects[weeks[weeks.length - 1]])
      , land = topojson.mesh(us, us.objects.land)
      , states = data.states =  topojson.feature(us, us.objects.states)
      , week;

    map.append('path')
        .attr('class', 'land')
        .datum(land)
        .attr('d', path);

    map.selectAll('path.drought')
        .data(dm.features)
      .enter().append('path')
        .attr('d', path)
        .attr('class', function(d) { return "drought DM-" + d.id; });

    map.selectAll('path.states')
        .data(states.features)
      .enter().append('path')
        .attr('d', path)
        .attr('class', 'states');

    for (var i = weeks.length - 1; i >= 0; i--) {
        week = weeks[i];
        data.weeks[week] = topojson.feature(drought, drought.objects[week])
    };

};

function update(week) {
    console.time('update');
    var dm = data.weeks[week];

    map.selectAll('path.drought')
        .data(dm.features)
        .attr('d', path);

    map.selectAll('path.states').attr('d', path);
    console.timeEnd('update');
}
