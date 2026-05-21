#!/usr/bin/env bash
set -euo pipefail

if [ $# -eq 0 ]; then
  cat <<EOF >&2
Usage: $0 <url> [<url> ...]

Hits each URL twice and reports the cache-relevant headers, so you can
tell whether Cloudflare is edge-caching the response. Useful URLs to
compare while diagnosing cache rules:

  https://widgets.changebot.ai/latest/widgets.esm.js
  https://widgets.changebot.ai/latest/p-CNK_Apd7.js
  https://api.changebot.ai/v1/widgets/<slug>/updates

Look for:
  cf-cache-status: HIT on the 2nd request    -> edge caching is working
  cf-cache-status: DYNAMIC                   -> CF is not caching at all
  cf-cache-status: MISS / EXPIRED / REVALIDATED on the 2nd request
                                             -> rule matched but a heuristic
                                                / TTL prevented caching
EOF
  exit 1
fi

UA='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

for url in "$@"; do
  echo "=== $url"
  for i in 1 2; do
    echo "  --- request $i ---"
    printf '    $ curl -s -D - -o /dev/null -A %q %q\n' "$UA" "$url"
    curl -s -D - -o /dev/null -A "$UA" "$url" \
      | grep -iE '^(HTTP/|cache-control:|cf-cache-status:|age:|etag:|last-modified:)' \
      | sed 's/^/    /' \
      || true
  done
  echo
done
