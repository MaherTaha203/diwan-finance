#!/usr/bin/env python3
"""
tools/_extract_mcp_bundle.py — split a saved Supabase-MCP result into per-table JSON files.

The MCP server saves oversized results to a file shaped like:
    {"result": "<preamble>\\n<untrusted-data-UUID>\\n<QUERY_RESULT>\\n\\nUse this data ..."}
where <QUERY_RESULT> is `[{"bundle": "<json-text>"}]` produced by
`SELECT json_build_object('table', (...), ...)::text AS bundle`.

Usage: python3 -I tools/_extract_mcp_bundle.py <result_file> <out_dir>
Writes <out_dir>/<table>.json (compact, UTF-8) for every key in the bundle.
No hand-transcription — byte-exact extraction from the saved result.
"""
import json, sys, os, re

def main():
    src, outdir = sys.argv[1], sys.argv[2]
    os.makedirs(outdir, exist_ok=True)
    raw = open(src, encoding='utf-8').read()

    # The file may be the wrapper object, or (rarely) the inner text directly.
    try:
        payload = json.loads(raw)['result']
    except (json.JSONDecodeError, KeyError, TypeError):
        payload = raw

    m = re.search(r'<untrusted-data-([0-9a-fA-F-]+)>\n(.*)\n</untrusted-data-\1>', payload, re.S)
    inner = m.group(2) if m else payload
    rows = json.loads(inner)
    if not (isinstance(rows, list) and rows):
        raise SystemExit('unexpected result shape: not a non-empty array')

    cell = rows[0].get('bundle', rows[0])
    obj = json.loads(cell) if isinstance(cell, str) else cell  # ::text → string; else object
    if not isinstance(obj, dict):
        raise SystemExit('bundle is not an object of {table: rows[]}')

    for table, data in obj.items():
        if data is None:
            data = []
        with open(os.path.join(outdir, f'{table}.json'), 'w', encoding='utf-8') as fh:
            json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))
        print(f'  wrote {table}.json  ({len(data)} rows)')

if __name__ == '__main__':
    main()
