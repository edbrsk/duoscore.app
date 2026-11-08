# Serves the site like GitHub Pages (text compressed, 10-minute cache), so local Lighthouse runs match the live site.
# python3 scripts/serve.py . 8766
import gzip, sys, os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
TEXT = ('text/', 'application/javascript', 'application/json', 'image/svg+xml')
class H(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)
        if os.path.isdir(path): path = os.path.join(path, 'index.html')
        ctype = self.guess_type(path)
        if not os.path.isfile(path) or not ctype.startswith(TEXT) or 'gzip' not in self.headers.get('Accept-Encoding', ''):
            return super().send_head()
        body = gzip.compress(open(path, 'rb').read(), 6)
        self.send_response(200)
        self.send_header('Content-Type', ctype); self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(body))); self.send_header('Cache-Control', 'max-age=600')
        self.end_headers()
        from io import BytesIO
        return BytesIO(body)
    def log_message(self, *a): pass
ThreadingHTTPServer(('127.0.0.1', int(sys.argv[2])), partial(H, directory=sys.argv[1])).serve_forever()
