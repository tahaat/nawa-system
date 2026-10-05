// محوّل مجلد المتصفح (File System Access API) إلى واجهة dir التي يتوقعها محرك مزامنة المجلد
export function dirFromHandle(root) {
  const sub = async (ch, create = false) => root.getDirectoryHandle(ch, { create });
  return {
    async channels() { const out = []; for await (const [name, h] of root.entries()) if (h.kind === 'directory' && !name.startsWith('.')) out.push(name); return out; },
    async ensure(ch) { await sub(ch, true); },
    async list(ch) { const d = await sub(ch), out = []; for await (const [name, h] of d.entries()) if (h.kind === 'file') { const f = await h.getFile(); out.push({ name, mtime: f.lastModified, size: f.size }); } return out; },
    async read(ch, name) { const d = await sub(ch); return (await (await d.getFileHandle(name)).getFile()).text(); },
    async write(ch, name, text) { const d = await sub(ch); const fh = await d.getFileHandle(name, { create: true }); const w = await fh.createWritable(); await w.write(text); await w.close(); },
  };
}
export const folderSupported = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;
