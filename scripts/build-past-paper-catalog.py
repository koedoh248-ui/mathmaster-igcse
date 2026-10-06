"""Refresh the public PapaCambridge 0580 link catalogue; does not download paper contents."""
import concurrent.futures
import datetime
import html
import json
import re
import subprocess
from pathlib import Path

ORIGIN = 'https://pastpapers.papacambridge.com/'
INDEX = ORIGIN + 'papers/caie/igcse-mathematics-0580'
ROOT = Path(__file__).resolve().parent.parent

def fetch(url):
    return subprocess.check_output(['curl', '-fsSL', '--max-time', '45', url], stderr=subprocess.PIPE).decode()

def listing(url):
    page = fetch(url)
    links = set(html.unescape(link) for link in re.findall(r'https://pastpapers\.papacambridge\.com/directories/[^\"<>\s]+?\.pdf', page, re.I))
    files = []
    for link in sorted(links):
        match = re.search(r'0580_([smw])(\d{2})_(qp|ms)_([1-4][1-3]?)\.pdf$', link, re.I)
        if match:
            files.append([*match.groups(), link])
    if not files:
        raise ValueError(f'No indexed papers in {url}; review listing before updating.')
    return {'url': url, 'files': files}

def build(listings, checked):
    files = {}
    for item in listings:
        for session, year, kind, code, url in item['files']:
            key = (int('20' + year), session.lower(), code)
            record = files.setdefault(key, {'year': key[0], 'session': key[1], 'code': code, 'sourceUrl': item['url']})
            record['questionUrl' if kind.lower() == 'qp' else 'markSchemeUrl'] = url
    records = []
    for (year, session, code), item in sorted(files.items(), key=lambda row: (-row[0][0], {'w': 0, 's': 1, 'm': 2}[row[0][1]], row[0][2])):
        if 'questionUrl' not in item:
            continue
        item.update(id=f'0580-{session}{str(year)[2:]}-{code}', paper=int(code[0]), variant=code[1:] or 'Single', level='Core' if code[0] in '13' else 'Extended')
        records.append(item)
    output = '// Public link metadata only. Refresh with scripts/build-past-paper-catalog.py.\n'
    output += f'export const catalogChecked = {json.dumps(checked)};\n'
    output += f'export const catalogSource = {json.dumps(INDEX)};\n'
    output += 'export const pastPapers = ' + json.dumps(records, indent=2) + ';\n'
    (ROOT / 'src/past-paper-catalog.js').write_text(output)
    print(f'{len(records)} question papers; {sum("markSchemeUrl" in r for r in records)} paired mark schemes; {len(listings)} sessions.')

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--listings', help='Use a previously fetched listing JSON')
    args = parser.parse_args()
    if args.listings:
        listings = json.loads(Path(args.listings).read_text())
    else:
        page = fetch(INDEX)
        paths = list(dict.fromkeys(re.findall(r'href=[\"\'](papers/caie/igcse-mathematics-0580-20[^\"\']+)[\"\']', page)))
        with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
            listings = list(pool.map(listing, [ORIGIN + path for path in paths]))
    build(listings, datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).date().isoformat())
