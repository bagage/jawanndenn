# Copyright (C) 2016 Sebastian Pipping <sebastian@pipping.org>
# Licensed under GNU Affero GPL v3 or later

import json
import logging
import os

import flask
from flask import render_template
from flask_mail import Mail, Message

from config import MAIL_ADMINISTRATORS

from jawanndenn.metadata import APP_NAME
from jawanndenn.poll import PollDatabase


_log = logging.getLogger(__name__)


filename = os.path.expanduser('~/jawanndenn.pickle')
db = PollDatabase(filename)
try:
    db.load()
except:
    db.save()
app = flask.Flask(__name__)
app.config.from_object('config')
mail = Mail(app)


def to_json(e):
    return json.dumps(e)


def send_email(subject, sender, recipients, text_body, html_body):
    msg = Message(subject, sender=sender, recipients=recipients)
    msg.body = text_body
    msg.html = html_body
    mail.send(msg)


@app.route('/')
def index():
    return app.send_static_file('html/setup.html')


@app.route('/list')
def list():
    return app.send_static_file('html/list.html')


@app.route('/create', methods=['POST'])
def create():
    config = json.loads(flask.request.form['config'])
    poll_id = db.add(config)
    send_email("[{}] New poll created".format(APP_NAME),
               MAIL_ADMINISTRATORS[0],
               MAIL_ADMINISTRATORS,
               render_template("email/new_poll.txt", url=flask.url_for(
                   'poll', poll_id=poll_id, _external=True), title=config['title']),
               render_template("email/new_poll.html",
                               url=flask.url_for(
                                   'poll', poll_id=poll_id, _external=True),
                               title=config['title']))

    return flask.redirect(flask.url_for('poll', poll_id=poll_id))


@app.route('/polls')
def polls():
    return to_json({
        'polls': db.get_summaries()
    })


@app.route('/poll/<poll_id>')
def poll(poll_id):
    db.get(poll_id)
    return app.send_static_file('html/poll.html')


@app.route('/reminder/<poll_id>')
def reminder(poll_id):
    poll = db.get(poll_id)
    voters = [v[0].lower() for v in poll.votes]
    people = [p[:p.index("<")-1]
              for p in poll.config['people'] if '<' in p]
    missings = [p for p in people if p.lower() not in voters]
    return to_json({
        'config': poll.config,
        'people': missings
    })


@app.route('/data/<poll_id>')
def data(poll_id):
    poll = db.get(poll_id)
    return to_json({
        'config': poll.config,
        'votes': poll.votes,
    })


@app.route('/vote/<poll_id>', methods=['POST'])
def vote(poll_id):
    voterName = flask.request.form['voterName']
    poll = db.get(poll_id)

    d = {"on": 1, "on-indeterminate": 2}
    votes = [d.get(flask.request.form.get('option%d' % i), 0)
             for i in range(len(poll.options))]

    poll.vote(voterName, votes)

    return flask.redirect(flask.url_for('poll', poll_id=poll_id))


# def run_server(options):
#     if options.debug:
#         bottle.debug(True)

#     try:
#         bottle.run(
#             host=options.host,
#             port=options.port,
#             reloader=options.debug
#         )
#     except ImportError:
#         log.error('WSGI server "%s" does not seem to be available.'
#                    % options.server)
#         sys.exit(2)
