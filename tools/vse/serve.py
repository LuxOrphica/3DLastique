"""Simple HTTP server for VSE review pages."""
import http.server, socketserver, os, webbrowser

PORT = 8765
DIR  = "C:/temp"

os.chdir(DIR)

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"  {self.address_string()} -> {args[0]}")

print(f"VSE Review Server")
print(f"  Local:   http://localhost:{PORT}/vse_registry.html")
print(f"  Network: http://192.168.1.67:{PORT}/vse_registry.html")
print(f"  Callout: http://192.168.1.67:{PORT}/vse_callout_graph.html")
print(f"  Stop:    Ctrl+C\n")

with socketserver.TCPServer(("0.0.0.0", PORT), Handler) as httpd:
    httpd.serve_forever()
