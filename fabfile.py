import csv
import datetime
import glob
import json
import os
import urllib

from fabric.api import *
from lxml import etree

DATE_FORMAT = "USDM_%Y%m%d_M"
WEEK_FORMAT = "USDM_%Y%m%d"
SHORT_DATE_FORMAT = "%Y%m%d"

START_YEAR = 2000
END_YEAR = datetime.datetime.now().year

# http://droughtmonitor.unl.edu/data/shapefiles_m//2013_USDM_M.zip
DROUGHT_URL = "http://droughtmonitor.unl.edu/data/shapefiles_m//%(year)s_USDM_M.zip"

ROOT = os.path.realpath(os.path.dirname(__file__))

_f = lambda *fn: os.path.join(ROOT, *fn)

env.exclude_requirements = set([
    'wsgiref', 'readline', 'ipython',
    'git-remote-helpers',
])

env.repos = {
    'origin': ['master', 'master:gh-pages'],
    'years': ['master', 'master:gh-pages']
}

env.states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", 
              "DE", "DC", "FL", "GA", "HI", "ID", "IL", 
              "IN", "IA", "KS", "KY", "LA", "ME", "MD", 
              "MA", "MI", "MN", "MS", "MO", "MT", "NE", 
              "NV", "NH", "NJ", "NM", "NY", "NC", "ND", 
              "OH", "OK", "OR", "PA", "PR", "RI", "SC", 
              "SD", "TN", "TX", "UT", "VT", "VA", "WA", 
              "WV", "WI", "WY"]


def deploy():
    for remote, branches in env.repos.items():
        for branch in branches:
            local('git push %s %s' % (remote, branch))


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


def load_all():
    """
    Load all US and state-level data.
    """
    load_data('US')
    
    for state in env.states:
        load_data(state)


def load_data(locale='US'):
    """
    Grab drought coverage data as XML and convert to CSV.

    <week name="total" date="130716">
        <Nothing>46.45</Nothing>
        <D0>53.55</D0>
        <D1>41.02</D1>
        <D2>28.66</D2>
        <D3>11.15</D3>
        <D4>3.63</D4>
    </week>

    """
    if locale == "US":
        url = "http://droughtmonitor.unl.edu/tabular/total.xml"

    else:
        locale = locale.upper()
        url = "http://droughtmonitor.unl.edu/tabular/%s.xml" % locale

    # grab xml from the drought monitor
    root = etree.parse(url).getroot()

    # get an outfile
    filename = _f('data/csv', '%s.csv' % locale.lower())
    fields = ('Week', 'Nothing', 'D0', 'D1', 'D2', 'D3', 'D4')

    with open(filename, 'wb') as f:
        writer = csv.DictWriter(f, fields)
        writer.writeheader()

        # and load!
        for week in root.findall('week'):

            # extract a row
            row = dict((e.tag, e.text) for e in week if e.tag in fields)
            row['Week'] = datetime.datetime.strptime(week.get('date'), SHORT_DATE_FORMAT).date()

            writer.writerow(row)

    print "Wrote file: %s" % filename


def raster(start=START_YEAR, end=END_YEAR):
    """
    Create a raster image for each weekly drought snapshot.
    This runs one year at a time to isolate errors.
    """
    for year in xrange(int(start), int(end) + 1):
        local(_f('bin/raster.js --year %i' % year))

    # update weeks.js
    weeksjs()


def reproject(infile):
    """
    Project a file to EPSG:4326.
    """
    filename = os.path.basename(infile)
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


def update_all_shapefiles(start=START_YEAR, end=END_YEAR):
    """
    Run update_shapefiles for years between start and end.
    """
    start = int(start)
    end = int(end)

    for year in range(start, end + 1):
        update_shapefiles(year)


def update_shapefiles(year=END_YEAR):
    """
    Download, unzip and reproject all shapefiles from US Drought Monitor

    Each year gets a zipfile that unpacks to a directory of zipfiles,
    so we need to unzip the year file, then unzip each week file.

    Weekly zips are named like weekly shapefiles.
    """
    year = str(year)
    url = DROUGHT_URL % {'year': year}

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

    # each year zip unpacks into a directory of weekly zips
    # so we need to walk through the directory and unzip each week
    for zipfile in glob.glob(_f(dest, '*.zip')):

        # just put everything into the same directory for simplicity
        local('unzip -u -d %s %s' % (dest, zipfile))
        #base = os.path.basename(zipfile)
        #name, ext = os.path.splitext(base)
        #date = datetime.datetime.strptime(name, DATE_FORMAT).date()

    reproject_year(year)


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


