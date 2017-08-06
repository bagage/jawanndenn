# Copyright (C) 2016 Sebastian Pipping <sebastian@pipping.org>
# Licensed under GNU Affero GPL v3 or later

import json
import logging
import os
import sys

import bottle
import pkg_resources

from jawanndenn.metadata import APP_NAME
from jawanndenn.poll import PollDatabase


_log = logging.getLogger(__name__)


STATIC_HOME_LOCAL = os.path.abspath(os.path.normpath(
    os.path.join(os.path.dirname(__file__), 'static')
    if os.path.exists(os.path.join(os.path.dirname(__file__),
                                   '..', 'setup.py')) else
    pkg_resources.resource_filename(APP_NAME, 'static')
))
_STATIC_HOME_REMOTE = '/static'
db = PollDatabase()


def _to_json(e):
    return json.dumps(e)


@bottle.get('/static/<path:path>')
def _static(path):
    content_type = {
        'css': 'text/css',
        'js': 'application/javascript',
        'xhtml': 'application/xhtml+xml',
    }[path.split('.')[-1]]
    bottle.response.content_type = content_type
    return bottle.static_file(path, root=STATIC_HOME_LOCAL)


@bottle.get('/')
def _index():
    bottle.response.content_type = 'application/xhtml+xml'
    return bottle.static_file('html/setup.xhtml', root=STATIC_HOME_LOCAL)


@bottle.get('/list')
def _list():
    bottle.response.content_type = 'application/xhtml+xml'
    return bottle.static_file('html/list.xhtml', root=STATIC_HOME_LOCAL)


@bottle.post('/create')
def _create():
    config = json.loads(bottle.request.forms['config'])
    poll_id = db.add(config)
    bottle.redirect('/poll/%s' % poll_id)


@bottle.get('/polls')
def _polls():
    return _to_json({
        'polls': db.get_summaries()
    })


@bottle.get('/poll/<poll_id>')
def _poll(poll_id):
    db.get(poll_id)
    bottle.response.content_type = 'application/xhtml+xml'
    return bottle.static_file('html/poll.xhtml', root=STATIC_HOME_LOCAL)


@bottle.get('/reminder/<poll_id>')
def _reminder(poll_id):
    poll = db.get(poll_id)
    voters = [v[0].lower() for v in poll.votes]
    people = [p[:p.index("<")-1]
              for p in poll.config['people'] if '<' in p]
    missings = [p for p in people if p.lower() not in voters]
    return _to_json({
        'config': poll.config,
        'people': missings
    })


@bottle.get('/data/<poll_id>')
def _data(poll_id):
    poll = db.get(poll_id)
    return _to_json({
        'config': poll.config,
        'votes': poll.votes,
    })


@bottle.post('/vote/<poll_id>')
def _vote(poll_id):
    voterName = bottle.request.forms['voterName']
    poll = db.get(poll_id)

    if voterName.lower() in [x[0].lower() for x in poll.votes]:
        bottle.response.status = 400
        return "This name is already taken"

    d = {"on": 1, "on-indeterminate": 2}
    votes = [d.get(bottle.request.forms.get('option%d' % i), 0)
             for i in xrange(len(poll.options))]

    poll.vote(voterName, votes)

    bottle.redirect('/poll/%s' % poll_id)


def run_server(options):
    if options.debug:
        bottle.debug(True)

    try:
        bottle.run(
            host=options.host,
            port=options.port,
            server=options.server,
            reloader=options.debug
        )
    except ImportError:
        _log.error('WSGI server "%s" does not seem to be available.'
                   % options.server)
        sys.exit(2)
