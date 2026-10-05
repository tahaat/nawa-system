// تعديل خلايا ملف xlsx مباشرة على مستوى XML للحفاظ على المخططات والصور والتنسيق الأصلي
import JSZip from 'jszip';

export const colIdx = (c) => [...c].reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0);
export const colName = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
const splitRef = (r) => { const m = /^([A-Z]+)(\d+)$/.exec(r); return [m[1], +m[2]]; };
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const excelSerial = (d) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);

export async function openXlsx(buf, DOMParserCtor, XMLSerializerCtor) {
  const zip = await JSZip.loadAsync(buf);
  const parse = (s) => new DOMParserCtor().parseFromString(s, 'application/xml');
  const wb = parse(await zip.file('xl/workbook.xml').async('string'));
  const rels = parse(await zip.file('xl/_rels/workbook.xml.rels').async('string'));
  const relMap = {}; for (const r of Array.from(rels.getElementsByTagName('Relationship'))) relMap[r.getAttribute('Id')] = r.getAttribute('Target');
  const sheets = {};
  for (const s of Array.from(wb.getElementsByTagName('sheet'))) {
    const rid = s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || s.getAttribute('r:id');
    sheets[s.getAttribute('name')] = 'xl/' + relMap[rid].replace(/^\/?(xl\/)?/, '');
  }
  const docs = {};
  const ser = new XMLSerializerCtor();
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  return {
    zip, sheets,
    async sheet(name) { if (!docs[name]) { if (!sheets[name]) throw new Error('ورقة غير موجودة: ' + name); docs[name] = parse(await zip.file(sheets[name]).async('string')); } return docs[name]; },
    async set(name, cells) { // cells: {A1: value}
      const doc = await this.sheet(name), sd = doc.getElementsByTagName('sheetData')[0];
      const rows = new Map(Array.from(sd.getElementsByTagName('row')).map((r) => [+r.getAttribute('r'), r]));
      const sorted = Object.entries(cells).map(([ref, v]) => [...splitRef(ref), v]).sort((a, b) => a[1] - b[1] || colIdx(a[0]) - colIdx(b[0]));
      for (const [col, rn, v] of sorted) {
        let row = rows.get(rn);
        if (!row) {
          row = doc.createElementNS(NS, 'row'); row.setAttribute('r', String(rn));
          const after = [...rows.keys()].filter((k) => k < rn).sort((a, b) => b - a)[0];
          if (after) { const ar = rows.get(after); ar.parentNode.insertBefore(row, ar.nextSibling); } else sd.insertBefore(row, sd.firstChild);
          rows.set(rn, row);
        }
        const ref = col + rn; let cell = Array.from(row.childNodes).find((c) => c.nodeType === 1 && c.getAttribute('r') === ref);
        if (!cell) {
          cell = doc.createElementNS(NS, 'c'); cell.setAttribute('r', ref);
          const nxt = Array.from(row.childNodes).find((c) => c.nodeType === 1 && colIdx(splitRef(c.getAttribute('r'))[0]) > colIdx(col));
          row.insertBefore(cell, nxt || null);
        }
        while (cell.firstChild) cell.removeChild(cell.firstChild);
        cell.removeAttribute('t');
        if (v === null || v === undefined || v === '') continue;
        if (typeof v === 'boolean') { cell.setAttribute('t', 'b'); const e = doc.createElementNS(NS, 'v'); e.appendChild(doc.createTextNode(v ? '1' : '0')); cell.appendChild(e); }
        else if (typeof v === 'object' && v.f) { const e = doc.createElementNS(NS, 'f'); e.appendChild(doc.createTextNode(v.f)); cell.appendChild(e); } // معادلة
        else if (typeof v === 'number') { const e = doc.createElementNS(NS, 'v'); e.appendChild(doc.createTextNode(String(v))); cell.appendChild(e); }
        else { cell.setAttribute('t', 'inlineStr'); const is = doc.createElementNS(NS, 'is'), t = doc.createElementNS(NS, 't'); t.setAttribute('xml:space', 'preserve'); t.appendChild(doc.createTextNode(String(v))); is.appendChild(t); cell.appendChild(is); }
      }
    },
    async save() {
      for (const [n, d] of Object.entries(docs)) this.zip.file(sheets[n], ser.serializeToString(d));
      // حذف القيم المخزّنة للمعادلات (قديمة) كي تُحسب من جديد ولا تظهر أرقام قديمة في أي عارض
      for (const f of Object.keys(this.zip.files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))) {
        const t = await this.zip.file(f).async('string');
        this.zip.file(f, t.replace(/(<f(?:\s[^>]*)?\/>|<f(?:\s[^>]*)?>[\s\S]*?<\/f>)<v>[\s\S]*?<\/v>/g, '$1').replace(/(<c [^>]*?) t="(?:e|str)"([^>]*>)(<f)/g, '$1$2$3'));
      }
      // إجبار Excel على إعادة حساب كل المعادلات عند الفتح + حذف سلسلة الحساب القديمة
      let w = await this.zip.file('xl/workbook.xml').async('string');
      w = /<calcPr[^>]*\/>/.test(w) ? w.replace(/<calcPr([^>]*?)\/>/, (m, a) => `<calcPr${a.replace(/\sfullCalcOnLoad="[^"]*"/, '')} fullCalcOnLoad="1"/>`) : w.replace('</workbook>', '<calcPr fullCalcOnLoad="1"/></workbook>');
      this.zip.file('xl/workbook.xml', w);
      if (this.zip.file('xl/calcChain.xml')) {
        this.zip.remove('xl/calcChain.xml');
        const r = await this.zip.file('xl/_rels/workbook.xml.rels').async('string'); this.zip.file('xl/_rels/workbook.xml.rels', r.replace(/<Relationship [^>]*calcChain[^>]*\/>/, ''));
        const c = await this.zip.file('[Content_Types].xml').async('string'); this.zip.file('[Content_Types].xml', c.replace(/<Override [^>]*calcChain[^>]*\/>/, ''));
      }
      return this.zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    },
  };
}
