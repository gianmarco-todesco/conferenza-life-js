#!/usr/bin/env python3
"""Static server for the slides, with caching disabled.

    python serve.py          ->  http://127.0.0.1:8766/
    python serve.py 9000     ->  on port 9000

Caching has to be disabled on the server: the slides are ES modules, and a
module imported by another module is not reached by any cache-busting query on
the <script> tag, so a stale copy would be used without any sign of it.
"""

import functools
import http.server
import os
import sys

DEFAULT_PORT = 8766


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write('%s\n' % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PORT
    root = os.path.dirname(os.path.abspath(__file__))
    handler = functools.partial(NoCache, directory=root)
    server = http.server.ThreadingHTTPServer(('127.0.0.1', port), handler)
    print('Root   : %s' % root)
    print('Slides : http://127.0.0.1:%d/' % port)
    print('Ctrl-C to stop.\n')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nstopped.')


if __name__ == '__main__':
    main()
