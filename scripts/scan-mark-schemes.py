"""Index public matching mark schemes. Retain numeric facts/page references only.
Full wording and diagrams stay in the original PDFs. Build-time PyMuPDF only.
"""
import argparse, concurrent.futures, json, re, subprocess
from pathlib import Path
import pymupdf
ROOT = Path(__file__).resolve().parent.parent

def scan(path):
    rows, flags, pages = [], set(), 0
    with pymupdf.open(path) as doc:
        pages = len(doc)
        for page_no, page in enumerate(doc, 1):
            words = page.get_text('words')
            if not words: continue
            # Some landscape tables are embedded sideways rather than PDF-rotated.
            header = [w for w in words if w[4] == 'Question']
            if header and header[0][3]-header[0][1] > header[0][2]-header[0][0]:
                words = [(page.rect.height-w[3],w[0],page.rect.height-w[1],w[2],*w[4:]) for w in words]
            qs = next((w for w in words if w[4] == 'Question'), None)
            answer = next((w for w in words if w[4] == 'Answer' and qs and abs(w[1]-qs[1])<10),None)
            mark = next((w for w in words if w[4] == 'Marks' and answer and w[0]>answer[0] and abs(w[1]-qs[1])<10),None)
            if not (qs and answer and mark): continue
            labels = [w for w in words if re.fullmatch(r'\d{1,2}(?:\([a-zivx]+\))*',w[4]) and abs(w[0]-qs[0])<48 and w[0]<answer[0]-10 and w[1]>qs[3]]
            labels = list({(w[4],round(w[1],1)):w for w in labels}.values())
            labels.sort(key=lambda w:w[1])
            for index, label in enumerate(labels):
                bottom = labels[index+1][1]-2 if index+1<len(labels) else max(w[3] for w in words)-22
                region = [w for w in words if label[1]-3<=w[1]<bottom and w[0]>=label[0]-3]
                mark_words = [w for w in region if mark[0]-5<=w[0]<=mark[2]+12 and re.fullmatch(r'(?:[MAB])?[1-9]',w[4])]
                if not mark_words: continue
                maximum = sum(int(w[4][-1]) for w in mark_words) if all(re.fullmatch(r'[MAB][1-9]',w[4]) for w in mark_words) else int(mark_words[0][4][-1])
                # A plain number in one answer token is unambiguous; fractions,
                # multiline formulae, diagrams and conditionals are never guessed.
                answer_words = sorted([w for w in region if qs[0]+48<=w[0]<mark[0]-15],key=lambda w:(round(w[1]/4),w[0]))
                tokens = [w[4] for w in answer_words]
                numbers = [t.replace('−','-').replace('–','-') for t in tokens if re.fullmatch(r'[−–-]?\d+(?:\.\d+)?',t)]
                plain = len(numbers)==1 and all(re.fullmatch(r'[−–-]?\d+(?:\.\d+)?|oe|cao', t) for t in tokens)
                rowtext = ' '.join(w[4] for w in region)
                conventions = sorted(set(re.findall(r'\b(?:FT|SC|dep|nfww|cao|awrt|isw|oe|soi)\b',rowtext)))
                codes = sorted(set(re.findall(r'\b[MAB][1-9]\b',rowtext)))
                record = {'label':'Q'+label[4],'page':page_no,'maximum':maximum,'codes':codes,'rules':conventions}
                if plain and maximum==1 and not any(rule in conventions for rule in ['FT','SC','dep','nfww','awrt']): record['numericAnswer']=numbers[0]
                rows.append(record)
                flags.update(conventions)
    # Duplicate question labels/page overlaps are retained for inspection but
    # never considered a verified reference index.
    merged={}
    for row in rows:
        if row['label'] in merged:
            current=merged[row['label']];current['maximum']+=row['maximum'];current['codes']=sorted(set(current['codes']+row['codes']));current['rules']=sorted(set(current['rules']+row['rules']));current.pop('numericAnswer',None)
        else: merged[row['label']]=row
    rows=list(merged.values())
    labels=[r['label'] for r in rows]
    return {'status':'scanned' if rows else 'needs-review','pages':pages,'rows':rows,'rules':sorted(flags),'detectedMarks':sum(r['maximum'] for r in rows),'uniqueLabels':len(set(labels))==len(labels)}

def task(args):
    paper, cache = args
    if not paper.get('markSchemeUrl'): return paper['id'],{'status':'missing','rows':[]}
    path=Path(cache)/(paper['id']+'-ms.pdf')
    try:
        if not path.exists():
            temp=path.with_suffix('.download')
            subprocess.run(['curl','-fsSL','--retry','1','--max-time','30','-o',str(temp),paper['markSchemeUrl']],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
            temp.replace(path)
        return paper['id'],scan(path)
    except Exception as e: return paper['id'],{'status':'unavailable','rows':[],'error':type(e).__name__}

def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--workers',type=int,default=6);parser.add_argument('--limit',type=int);parser.add_argument('--cache',default='/private/tmp/mathmaster-mark-schemes');args=parser.parse_args()
    papers=json.loads((ROOT/'src/past-paper-catalog.js').read_text().split('export const pastPapers = ',1)[1].strip().removesuffix(';'))
    structure=json.loads((ROOT/'src/past-paper-structure.js').read_text().split('export const pastPaperStructure = ',1)[1].strip().removesuffix(';'))
    if args.limit: papers=papers[:args.limit]
    cache=Path(args.cache);cache.mkdir(parents=True,exist_ok=True);data={}
    with concurrent.futures.ProcessPoolExecutor(max_workers=args.workers) as pool:
        for i,(key,record) in enumerate(pool.map(task,[(p,str(cache)) for p in papers]),1):
            total=structure.get(key,{}).get('totalMarks')
            if record['status']=='scanned':
                grouped={}
                for row in record['rows']:
                    number=int(re.match(r'Q(\d+)',row['label'])[1]);grouped[number]=grouped.get(number,0)+row['maximum']
                expected={q['number']:q['marks'] for q in structure.get(key,{}).get('questions',[])}
                record['status']='verified-index' if total and record['detectedMarks']==total and grouped==expected and record['uniqueLabels'] else 'needs-review'
            data[key]=record
            print(f'{i}/{len(papers)} {key} {record["status"]}',flush=True)
    (cache/'scan.json').write_text(json.dumps(data,indent=2))
    (ROOT/'src/mark-scheme-index.js').write_text('// Numeric mark metadata only; verify criteria in the linked originals.\nexport const markSchemeIndex = '+json.dumps(data,separators=(',',':'))+';\n')
if __name__=='__main__':main()
