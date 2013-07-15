import datetime
import glob
import json
import os
import urllib

from fabric.api import *

DATE_FORMAT = "usdm%y%m%d"
ROOT = os.path.realpath(os.path.dirname(__file__))
URL = "http://droughtmonitor.unl.edu/shapefiles_combined/%(year)s/usdm%(year)s.zip"
YEARS = range(2000, 2014)

_f = lambda *fn: os.path.join(ROOT, *fn)

env.exclude_requirements = [
    'wsgiref', 'readline', 'ipython',
    'git-remote-helpers',
]

def deploy():
    """
    Push to master and gh-pages.
    """
    local('git push origin master')
    local('git push origin master:gh-pages')


def freeze():
    """
    pip freeze > requirements.txt, excluding virtualenv clutter
    """
    reqs = local('pip freeze', capture=True).split('\n')
    reqs = [r for r in reqs if r.split('==')[0] not in env.exclude_requirements]
    reqs = '\n'.join(reqs)

    with open('requirements.txt', 'wb') as f:
        f.write(reqs)

    print reqs


def raster():
    """
    Create a raster image for each weekly drought snapshot.
    This runs one year at a time to isolate errors.
    """
    for year in YEARS:
        local(_f('bin/raster.js --year %i' % year))

    # update weeks.js
    weeksjs()


def reproject(infile):
    """
    Project a file to EPSG:4326.
    """
    filename = os.path.basename(infile).lower()
    files = {
        'outfile': _f('data/shapefiles', filename),
        'infile' : infile
    }
    # ogr2ogr won't overwrite
    if os.path.exists(files['outfile']):
        local('rm %(outfile)s' % files)

    local('ogr2ogr -t_srs EPSG:4326 %(outfile)s %(infile)s' % files)


def reproject_year(year):
    """
    Project shapefiles for a single year.
    """
    year = str(year)
    for shp in glob.iglob(_f('data/raw', year, '*.shp')):
        reproject(shp)


def reproject_all():
    """
    Find all the shapefiles with glob, and loop through them
    reproject each one
    """
    for shp in glob.iglob(_f('data/raw/**/*.shp')):
        reproject(shp)


def topojson():
    """
    Create a single topojson file from every shapefile.
    """
    shapefiles = _f('data/shapefiles/*.shp')
    local('topojson --id-property DM -o %s -- %s' % (_f('data/drought.json'), shapefiles))


def update_shapefiles(year=2013):
    """
    Download, unzip and reproject all shapefiles from US Drought Monitor
    """
    year = str(year)
    url = URL % {'year': year}

    # ensure directories exist
    local('mkdir -p %s' % _f('data/raw'))
    local('mkdir -p %s' % _f('data/shapefiles'))

    # grab the url
    # need to make this generic
    zipfile = _f('data/raw', year + '.zip')
    local('curl %s > %s' % (url, zipfile))

    # unzip files into a year directory, just to keep things sane
    dest = _f('data/raw/', year)
    local('unzip -u -d %s %s' % (dest, zipfile))

    reproject_year(year)


def update(start=2000, end=2013):
    """
    Run update_shapefiles for years between start and end.
    """
    start = int(start)
    end = int(end)

    for year in range(start, end + 1):
        update_shapefiles(year)


def weeks():
    """
    Get a list of weeks represented in our shapefile directory.
    These will match names of shapefiles embedded in drought.json.
    """
    images = glob.glob(_f('img/drought', '*.png'))
    for image in images:
        name = os.path.basename(image)
        name, ext = os.path.splitext(name)
        yield name


def weeksjs():
    """
    Render a javascript file for weekly shapefile snapshots.
    """
    outfile = _f('js/weeks.js')
    js = "var WEEKS = %s;" % json.dumps(list(weeks()), indent=4)
    with open(outfile, 'wb') as f:
        f.write(js)


