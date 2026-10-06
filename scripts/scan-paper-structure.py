"""Scan public PDFs for cover settings and numeric question/page/mark metadata only.
Requires PyMuPDF in a build-time Python environment; the website needs no Python/API.
Downloaded originals stay in a temporary cache and are not included in the website.
"""
import argparse
import concurrent.futures
import json
import re
import subprocess
import sys
from collections import Counter
from pathlib import Path
import pymupdf
ROOT = Path(__file__).resolve().parent.parent


def scan_pdf(path):
    with pymupdf.open(path) as document:
        cover = '\n'.join(document[i].get_text() for i in range(min(2, len(document))))
        duration = re.search(r'(?:(\d+)\s*hours?\s*(?:(\d+)\s*minutes?)?|(\d+)\s*minutes?)', cover, re.I)
        marks = re.search(r'(?:total (?:of the |number of )?marks?[^\n]{0,35}?|maximum mark[^\n]{0,15}?)(\d{2,3})', cover, re.I)
        minutes = ((int(duration[1] or 0) * 60 + int(duration[2] or duration[3] or 0)) if duration else None)
        total = int(marks[1]) if marks else None
        pages = [page.get_text('words', sort=True) for page in document]
        # Question numbers occupy the leftmost text column, unlike chart labels.
        candidates = []
        for page_no, words in enumerate(pages[1:], 2):
            width, height = document[page_no - 1].rect.width, document[page_no - 1].rect.height
            for x0, y0, x1, y1, text, *_ in words:
                if re.fullmatch(r'\d{1,2}', text) and .04 * width <= x0 <= .11 * width and 40 < y0 < height - 55:
                    candidates.append((round(x0), int(text), page_no, y0))
        columns = Counter(c[0] for c in candidates)
        margin = columns.most_common(1)[0][0] if columns else None
        questions, current = [], None
        for page_no, words in enumerate(pages[1:], 2):
            # Some older archive files contain a publisher page and two copies.
            # Stop at the second exam cover once the first full mark total is reached.
            if len(questions) >= 3 and total and sum(q['marks'] for q in questions) == total and re.search(r'total (?:of the )?marks?[^\n]{0,35}\d{2,3}', document[page_no - 1].get_text(), re.I):
                break
            height = document[page_no - 1].rect.height
            for x0, y0, x1, y1, text, *_ in words:
                if not (40 < y0 < height - 30):
                    continue
                if margin is not None and abs(x0 - margin) <= 1.7 and y0 < height - 55 and text == str(len(questions) + 1):
                    current = {'number': len(questions) + 1, 'page': page_no, 'marks': 0}
                    questions.append(current)
                match = re.search(r'\[(\d{1,2})\]', text)
                if current and match:
                    current['marks'] += int(match[1])
        allocated = sum(q['marks'] for q in questions)
        verified = bool(total and minutes and len(questions) >= 3 and all(q['marks'] > 0 for q in questions) and allocated == total)
        return {'pages': len(document), 'minutes': minutes, 'totalMarks': total,
                'status': 'verified' if verified else 'needs-review',
                'questions': questions if verified else [],
                'detectedQuestions': len(questions), 'detectedMarks': allocated}


def fetch_scan(task):
    paper, cache_path = task
    cache = Path(cache_path)
    path = cache / (paper['id'] + '.pdf')
    try:
        if not path.exists():
            temp = path.with_suffix('.download')
            subprocess.run(['curl', '-fsSL', '--retry', '2', '--max-time', '35', '-o', str(temp), paper['questionUrl']], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            temp.replace(path)
        return paper['id'], scan_pdf(path)
    except Exception as error:
        return paper['id'], {'status': 'unavailable', 'questions': [], 'error': type(error).__name__}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--cache', default='/private/tmp/mathmaster-paper-cache')
    parser.add_argument('--limit', type=int)
    parser.add_argument('--workers', type=int, default=6)
    parser.add_argument('--output', default=str(ROOT / 'src/past-paper-structure.js'))
    args = parser.parse_args()
    source = (ROOT / 'src/past-paper-catalog.js').read_text()
    papers = json.loads(source.split('export const pastPapers = ', 1)[1].strip().removesuffix(';'))
    if args.limit:
        papers = papers[:args.limit]
    cache = Path(args.cache); cache.mkdir(parents=True, exist_ok=True)
    metadata_file = cache / 'structure.json'
    records = json.loads(metadata_file.read_text()) if metadata_file.exists() else {}
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(fetch_scan, (p, str(cache))): p for p in papers}
        for index, future in enumerate(concurrent.futures.as_completed(futures), 1):
            key, record = future.result(); records[key] = record
            metadata_file.write_text(json.dumps(records, indent=2))
            if index % 20 == 0 or index == len(papers):
                counts = Counter(records[p['id']]['status'] for p in papers if p['id'] in records)
                print(f'{index}/{len(papers)} scanned: {dict(counts)}', flush=True)
    ordered = {p['id']: records[p['id']] for p in papers}
    Path(args.output).write_text('// Numeric metadata scanned from original PDFs. No question text is copied.\nexport const pastPaperStructure = ' + json.dumps(ordered, separators=(',', ':')) + ';\n')
    print(f"Saved {len(ordered)} records to {args.output}", flush=True)

if __name__ == '__main__':
    main()
