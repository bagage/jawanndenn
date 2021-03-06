# Copyright (C) 2016 Sebastian Pipping <sebastian@pipping.org>
# Licensed under GNU Affero GPL v3 or later

import argparse
import errno
import logging
import os
import sys

from jawanndenn.poll import (apply_limits,
                             DEFAULT_MAX_POLLS, DEFAULT_MAX_VOTER_PER_POLL)

_log = logging.getLogger(__name__)


def _require_hash_randomization():
    if not sys.flags.hash_randomization:
        _log.info('Hash randomization found to be disabled.')
        if os.environ.get('PYTHONHASHSEED') == 'random':
            _log.error('Unexpected re-execution loop detected, shutting down.')
            sys.exit(1)

        _log.info('Re-executing with hash randomization enabled...')
        env = os.environ.copy()
        env['PYTHONHASHSEED'] = 'random'
        argv = [sys.executable] + sys.argv
        os.execve(argv[0], argv, env)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug', action='store_true',
                        help='Enable debug mode (default: disabled)')
    parser.add_argument('--host', default='127.0.0.1', metavar='HOST',
                        help='Hostname or IP address to listen at (default: %(default)s)')
    parser.add_argument('--port', default=8080, type=int, metavar='PORT',
                        help='Port to listen at (default: %(default)s)')

    limits = parser.add_argument_group('limit configuration')
    limits.add_argument('--max-polls', type=int, metavar='COUNT',
                        default=DEFAULT_MAX_POLLS,
                        help='Maximum number of polls total (default: %(default)s)')
    limits.add_argument('--max-votes-per-poll', type=int, metavar='COUNT',
                        default=DEFAULT_MAX_VOTER_PER_POLL,
                        help='Maximum number of votes per poll (default: %(default)s)')

    options = parser.parse_args()

    logging.basicConfig(level=logging.DEBUG if options.debug else logging.INFO)

    _require_hash_randomization()

    # Heavy imports are down here to keep --help fast
    from jawanndenn.app import db, run_server

    apply_limits(
        polls=options.max_polls,
        votes_per_poll=options.max_votes_per_poll,
    )

    filename = os.path.expanduser('~/jawanndenn.pickle')

    try:
        db.load(filename)
    except IOError as e:
        if e.errno != errno.ENOENT:
            raise
        db.save(filename)  # catch saving trouble early

    try:
        run_server(options)
    finally:
        db.save(filename)


if __name__ == '__main__':
    main()
