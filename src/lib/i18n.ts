import { useMemo } from 'react';
import { useSettings } from '@/lib/settings';

// -----------------------------------------------------------------------------
// Minimal i18n for Haolio. English is the source of truth (keys fall back to
// it); 'id' ships the full Bahasa Indonesia translation. UI language follows
// the OS by default and can be pinned in Settings → Appearance.
// -----------------------------------------------------------------------------

export type Lang = 'en' | 'id';
export type LangPref = 'system' | Lang;

type Dict = Record<string, { en: string; id: string }>;

export const STRINGS: Dict = {
  // --- common ---
  'common.cancel': { en: 'Cancel', id: 'Batal' },
  'common.save': { en: 'Save', id: 'Simpan' },
  'common.delete': { en: 'Delete', id: 'Hapus' },
  'common.rename': { en: 'Rename', id: 'Ganti nama' },
  'common.duplicate': { en: 'Duplicate', id: 'Duplikat' },
  'common.copy': { en: 'Copy', id: 'Salin' },
  'common.cut': { en: 'Cut', id: 'Potong' },
  'common.paste': { en: 'Paste', id: 'Tempel' },
  'common.open': { en: 'Open', id: 'Buka' },
  'common.retry': { en: 'Retry', id: 'Coba lagi' },
  'common.remove': { en: 'Remove', id: 'Hapus' },

  // --- dashboard ---
  'dash.newProject': { en: 'New Project', id: 'Proyek Baru' },
  'dash.openProject': { en: 'Open Project', id: 'Buka Proyek' },
  'dash.recent': { en: 'Recent Projects', id: 'Proyek Terbaru' },
  'dash.empty': { en: 'No projects yet. Create your first one to get started.', id: 'Belum ada proyek. Buat proyek pertamamu untuk mulai.' },
  'dash.optionsFor': { en: 'Options for {name}', id: 'Opsi untuk {name}' },
  'dash.renameProject': { en: 'Rename project', id: 'Ganti nama proyek' },
  'dash.removeFromList': { en: 'Remove from list', id: 'Hapus dari daftar' },
  'dash.removeTitle': { en: 'Remove “{name}”?', id: 'Hapus “{name}”?' },
  'dash.removeDesc': { en: 'The project and its local data will be deleted from this computer. This cannot be undone.', id: 'Proyek dan datanya akan dihapus dari komputer ini. Tindakan ini tidak bisa dibatalkan.' },
  'dash.deleteProject': { en: 'Delete project', id: 'Hapus proyek' },
  'dash.footer': { en: 'Haolio v{version} · Offline · Your data never leaves this PC', id: 'Haolio v{version} · Offline · Data kamu tidak pernah keluar dari PC ini' },
  'dash.boards': { en: '{n} board | {n} boards', id: '{n} papan | {n} papan' },
  'dash.objects': { en: '{n} objects', id: '{n} objek' },
  'dash.justNow': { en: 'just now', id: 'baru saja' },
  'dash.minutesAgo': { en: '{n}m ago', id: '{n} mnt lalu' },
  'dash.hoursAgo': { en: '{n}h ago', id: '{n} jam lalu' },
  'dash.daysAgo': { en: '{n}d ago', id: '{n} hari lalu' },
  'dash.lightDark': { en: 'Light / dark', id: 'Terang / gelap' },

  // --- new project dialog ---
  'np.title': { en: 'New Project', id: 'Proyek Baru' },
  'np.desc': { en: 'Projects are stored locally on this computer.', id: 'Proyek disimpan secara lokal di komputer ini.' },
  'np.name': { en: 'Project name', id: 'Nama proyek' },
  'np.placeholder': { en: 'e.g. My Game GDD', id: 'cth. GDD Game Saya' },
  'np.startFrom': { en: 'Start from', id: 'Mulai dari' },
  'np.tplWelcome': { en: 'Guided tour', id: 'Tur singkat' },
  'np.tplWelcomeDesc': { en: 'A small example board that teaches the basics.', id: 'Papan contoh kecil untuk mengenal dasar-dasarnya.' },
  'np.tplMindmap': { en: 'Mind map starter', id: 'Peta pikiran awal' },
  'np.tplMindmapDesc': { en: 'A root idea with a few branches, ready to grow.', id: 'Satu ide utama dengan beberapa cabang, siap dikembangkan.' },
  'np.tplBlank': { en: 'Blank board', id: 'Papan kosong' },
  'np.tplBlankDesc': { en: 'A single empty board. Start from scratch.', id: 'Satu papan kosong. Mulai dari nol.' },
  'np.create': { en: 'Create project', id: 'Buat proyek' },

  // --- topbar ---
  'top.newProject': { en: 'New project', id: 'Proyek baru' },
  'top.openFile': { en: 'Open .haolio file…', id: 'Buka berkas .haolio…' },
  'top.saveSnapshot': { en: 'Save snapshot (.haolio)', id: 'Simpan snapshot (.haolio)' },
  'top.exportBoard': { en: 'Export board', id: 'Ekspor papan' },
  'top.scope': { en: 'Scope', id: 'Cakupan' },
  'top.pngBoard': { en: 'PNG — entire board', id: 'PNG — seluruh papan' },
  'top.svgBoard': { en: 'SVG — entire board', id: 'SVG — seluruh papan' },
  'top.scopeSel': { en: 'Selection / view', id: 'Seleksi / tampilan' },
  'top.pngSel': { en: 'PNG — selection', id: 'PNG — seleksi' },
  'top.svgSel': { en: 'SVG — selection', id: 'SVG — seleksi' },
  'top.pngViewport': { en: 'PNG — visible viewport', id: 'PNG — area terlihat' },
  'top.pdfBoard': { en: 'PDF — entire board', id: 'PDF — seluruh papan' },
  'top.pdfSel': { en: 'PDF — selection', id: 'PDF — seleksi' },
  'top.exportJson': { en: 'Export project JSON', id: 'Ekspor JSON proyek' },
  'top.settings': { en: 'Settings', id: 'Pengaturan' },
  'top.saving': { en: 'Saving…', id: 'Menyimpan…' },
  'top.saved': { en: 'Saved', id: 'Tersimpan' },
  'top.saveFailed': { en: 'Save failed — Retry', id: 'Gagal menyimpan — Coba lagi' },
  'top.saveFailedTitle': { en: 'Click to retry saving', id: 'Klik untuk mencoba menyimpan lagi' },
  'top.ttUndo': { en: 'Undo — Ctrl+Z', id: 'Urungkan — Ctrl+Z' },
  'top.ttRedo': { en: 'Redo — Ctrl+Shift+Z', id: 'Ulangi — Ctrl+Shift+Z' },
  'top.ttSearch': { en: 'Search — Ctrl+F', id: 'Cari — Ctrl+F' },
  'top.ttBoards': { en: 'Boards sidebar', id: 'Bilah papan' },
  'top.ttSettings': { en: 'Settings', id: 'Pengaturan' },
  'top.appMenu': { en: 'Application menu', id: 'Menu aplikasi' },
  'common.undo': { en: 'Undo', id: 'Urungkan' },
  'common.redo': { en: 'Redo', id: 'Ulangi' },
  'common.search': { en: 'Search', id: 'Cari' },
  'pr.resize': { en: 'Resize object', id: 'Ubah ukuran objek' },
  'pr.rotate': { en: 'Rotate object', id: 'Putar objek' },
  'pr.layout': { en: 'Layout', id: 'Tata letak' },
  'pr.width': { en: 'Width', id: 'Lebar' },
  'pr.group': { en: 'Group', id: 'Grupkan' },

  // --- toolbar ---
  'tb.select': { en: 'Select', id: 'Pilih' },
  'tb.hand': { en: 'Hand', id: 'Tangan' },
  'tb.text': { en: 'Text', id: 'Teks' },
  'tb.sticky': { en: 'Sticky note', id: 'Catatan tempel' },
  'tb.shape': { en: 'Shape', id: 'Bentuk' },
  'tb.connector': { en: 'Connector', id: 'Konektor' },
  'tb.mindmap': { en: 'Mind map', id: 'Peta pikiran' },
  'tb.importImage': { en: 'Import image', id: 'Impor gambar' },
  'tb.imageHint': { en: 'PNG · SVG', id: 'PNG · SVG' },
  'tb.frame': { en: 'Frame', id: 'Bingkai' },

  // --- boards sidebar ---
  'bd.boards': { en: 'Boards', id: 'Papan' },
  'bd.new': { en: 'New board', id: 'Papan baru' },
  'bd.moveUp': { en: 'Move up', id: 'Naikkan' },
  'bd.moveDown': { en: 'Move down', id: 'Turunkan' },
  'bd.deleteTitle': { en: 'Delete board “{name}”?', id: 'Hapus papan “{name}”?' },
  'bd.deleteDesc': { en: 'Everything on this board will be permanently removed. This cannot be undone.', id: 'Semua isi papan ini akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.' },
  'bd.deleteConfirm': { en: 'Delete board', id: 'Hapus papan' },

  // --- canvas context menu ---
  'cm.addChild': { en: 'Add child', id: 'Tambah anak' },
  'cm.addSibling': { en: 'Add sibling', id: 'Tambah sejajar' },
  'cm.collapse': { en: 'Collapse branch', id: 'Lipat cabang' },
  'cm.expand': { en: 'Expand branch', id: 'Buka cabang' },
  'cm.layoutH': { en: 'Layout: Horizontal', id: 'Tata letak: Horizontal' },
  'cm.layoutV': { en: 'Layout: Vertical', id: 'Tata letak: Vertikal' },
  'cm.layoutR': { en: 'Layout: Radial', id: 'Tata letak: Radial' },
  'cm.bringFront': { en: 'Bring to front', id: 'Bawa ke depan' },
  'cm.sendBack': { en: 'Send to back', id: 'Kirim ke belakang' },
  'cm.groupSel': { en: 'Group selection', id: 'Grupkan seleksi' },
  'cm.ungroup': { en: 'Ungroup', id: 'Bongkar grup' },
  'cm.delete': { en: 'Delete', id: 'Hapus' },
  'cm.newSticky': { en: 'New sticky note', id: 'Catatan tempel baru' },
  'cm.newMindmap': { en: 'New mind map', id: 'Peta pikiran baru' },
  'cm.newText': { en: 'New text', id: 'Teks baru' },
  'cm.selectAll': { en: 'Select all', id: 'Pilih semua' },
  'cm.lineStraight': { en: 'Straight line', id: 'Garis lurus' },
  'cm.lineCurved': { en: 'Curved line', id: 'Garis lengkung' },
  'cm.lineElbow': { en: 'Elbow line', id: 'Garis siku' },
  'cm.noArrow': { en: 'No arrow', id: 'Tanpa panah' },
  'cm.arrow': { en: 'Arrow', id: 'Panah' },
  'cm.doubleArrow': { en: 'Double arrow', id: 'Panah ganda' },
  'cm.deleteConnection': { en: 'Delete connection', id: 'Hapus koneksi' },
  'cm.clipboardEmpty': { en: 'Clipboard is empty', id: 'Papan klip kosong' },
  'cm.nothingToCopy': { en: 'Nothing to copy', id: 'Tidak ada yang bisa disalin' },
  'cm.groupHint': { en: 'Select at least two objects to group (Ctrl+G).', id: 'Pilih minimal dua objek untuk digrup (Ctrl+G).' },

  // --- search ---
  'se.placeholder': { en: 'Search boards, notes, nodes and text…', id: 'Cari papan, catatan, node, dan teks…' },
  'se.noMatches': { en: 'No matches for “{q}”.', id: 'Tidak ada hasil untuk “{q}”.' },
  'se.hint': { en: 'Type to search this project. Results focus the canvas when selected.', id: 'Ketik untuk mencari di proyek ini. Hasil akan memfokuskan kanvas saat dipilih.' },
  'se.board': { en: 'Board', id: 'Papan' },
  'se.object': { en: 'object', id: 'objek' },

  // --- settings ---
  'st.appearance': { en: 'Appearance', id: 'Tampilan' },
  'st.canvas': { en: 'Canvas', id: 'Kanvas' },
  'st.editor': { en: 'Editor', id: 'Editor' },
  'st.storage': { en: 'Storage', id: 'Penyimpanan' },
  'st.shortcuts': { en: 'Shortcuts', id: 'Pintasan' },
  'st.about': { en: 'About', id: 'Tentang' },
  'st.theme': { en: 'Theme', id: 'Tema' },
  'st.light': { en: 'Light', id: 'Terang' },
  'st.dark': { en: 'Dark', id: 'Gelap' },
  'st.system': { en: 'System', id: 'Sistem' },
  'st.language': { en: 'Language', id: 'Bahasa' },
  'st.langSystem': { en: 'System', id: 'Ikuti sistem' },
  'st.gridStyle': { en: 'Grid style', id: 'Gaya grid' },
  'st.dots': { en: 'Dots', id: 'Titik' },
  'st.lines': { en: 'Lines', id: 'Garis' },
  'st.gridSize': { en: 'Grid size', id: 'Ukuran grid' },
  'st.snap': { en: 'Snap to grid', id: 'Snap ke grid' },
  'st.snapDesc': { en: 'Objects snap to the grid while dragging.', id: 'Objek menempel ke grid saat digeser.' },
  'st.minimap': { en: 'Show minimap', id: 'Tampilkan minimap' },
  'st.autosave': { en: 'Autosave', id: 'Simpan otomatis' },
  'st.autosaveDesc': { en: 'Continuously save your work to this computer. A manual snapshot can always be written to a .haolio file.', id: 'Menyimpan pekerjaanmu terus-menerus ke komputer ini. Snapshot manual selalu bisa ditulis ke berkas .haolio.' },
  'st.projects': { en: 'Projects', id: 'Proyek' },
  'st.boardsOpen': { en: 'Boards (open)', id: 'Papan (aktif)' },
  'st.objectsOpen': { en: 'Objects (open)', id: 'Objek (aktif)' },
  'st.storageText': { en: "All projects live in Haolio's local database on this computer. Nothing is uploaded — Haolio works fully offline.", id: 'Semua proyek tersimpan di basis data lokal Haolio di komputer ini. Tidak ada yang diunggah — Haolio sepenuhnya offline.' },
  'st.aboutName': { en: 'Haolio', id: 'Haolio' },
  'st.aboutDesc': { en: 'Offline Infinite Canvas & Mind Mapping', id: 'Kanvas Tanpa Batas & Peta Pikiran Offline' },
  'st.aboutTag': { en: 'Think. Map. Create.', id: 'Think. Map. Create.' },
  'st.version': { en: 'Version {version}', id: 'Versi {version}' },
  'st.aboutText': { en: 'Haolio runs entirely on your machine. No account, no cloud, no tracking — your ideas never leave this PC.', id: 'Haolio berjalan sepenuhnya di komputermu. Tanpa akun, tanpa cloud, tanpa pelacakan — idemu tidak pernah keluar dari PC ini.' },
  'sc.selectHand': { en: 'Select / Hand tool', id: 'Alat Pilih / Tangan' },
  'sc.textStickyShape': { en: 'Text / Sticky note / Shape', id: 'Teks / Catatan tempel / Bentuk' },
  'sc.connectorMindFrame': { en: 'Connector / Mind map / Frame', id: 'Konektor / Peta pikiran / Bingkai' },
  'sc.tabChild': { en: 'Mind map: add child node', id: 'Peta pikiran: tambah node anak' },
  'sc.enterSibling': { en: 'Mind map: add sibling node', id: 'Peta pikiran: tambah node sejajar' },
  'sc.spaceCollapse': { en: 'Mind map: collapse · hold to pan', id: 'Peta pikiran: lipat · tahan untuk geser' },
  'sc.deleteSel': { en: 'Delete selection', id: 'Hapus seleksi' },
  'sc.undoRedo': { en: 'Undo / Redo', id: 'Urungkan / Ulangi' },
  'sc.clipboard': { en: 'Copy · Paste · Duplicate', id: 'Salin · Tempel · Duplikat' },
  'sc.cut': { en: 'Cut', id: 'Potong' },
  'sc.group': { en: 'Group / Ungroup', id: 'Grup / Bongkar grup' },
  'sc.selectAll': { en: 'Select all', id: 'Pilih semua' },
  'sc.search': { en: 'Search', id: 'Cari' },
  'sc.saveSnapshot': { en: 'Save .haolio snapshot', id: 'Simpan snapshot .haolio' },
  'sc.zoomFit': { en: 'Zoom 100% / Fit board', id: 'Zoom 100% / Pas papan' },
  'sc.zoomSel': { en: 'Zoom to selection', id: 'Zoom ke seleksi' },
  'sc.scrollPan': { en: 'Zoom · Pan', id: 'Zoom · Geser' },
  'sc.pasteImage': { en: 'Paste image from clipboard', id: 'Tempel gambar dari papan klip' },

  // --- properties panel ---
  'pr.positionSize': { en: 'Position & size', id: 'Posisi & ukuran' },
  'pr.layerOpacity': { en: 'Layer & opacity', id: 'Lapisan & opasitas' },
  'pr.stickyColor': { en: 'Sticky color', id: 'Warna catatan' },
  'pr.typography': { en: 'Typography', id: 'Tipografi' },
  'pr.shape': { en: 'Shape', id: 'Bentuk' },
  'pr.image': { en: 'Image', id: 'Gambar' },
  'pr.frame': { en: 'Frame', id: 'Bingkai' },
  'pr.mindmap': { en: 'Mind map', id: 'Peta pikiran' },
  'pr.actions': { en: 'Actions', id: 'Aksi' },
  'pr.connection': { en: 'Connection', id: 'Koneksi' },
  'pr.rotation': { en: 'Rotation', id: 'Rotasi' },
  'pr.opacity': { en: 'Opacity', id: 'Opasitas' },
  'pr.fontSize': { en: 'Font size', id: 'Ukuran font' },
  'pr.color': { en: 'Color', id: 'Warna' },
  'pr.fill': { en: 'Fill', id: 'Isian' },
  'pr.border': { en: 'Border', id: 'Garis tepi' },
  'pr.borderWidth': { en: 'Border width', id: 'Tebal garis tepi' },
  'pr.textColor': { en: 'Text color', id: 'Warna teks' },
  'pr.fit': { en: 'Fit', id: 'Penyesuaian' },
  'pr.fitCover': { en: 'Fill (crop)', id: 'Penuh (potong)' },
  'pr.fitContain': { en: 'Fit (letterbox)', id: 'Muat (berbingkai)' },
  'pr.cornerRadius': { en: 'Corner radius', id: 'Radius sudut' },
  'pr.title': { en: 'Title', id: 'Judul' },
  'pr.line': { en: 'Line', id: 'Garis' },
  'pr.arrows': { en: 'Arrows', id: 'Panah' },
  'pr.front': { en: 'Front', id: 'Depan' },
  'pr.back': { en: 'Back', id: 'Belakang' },
  'pr.collapseShort': { en: 'Collapse', id: 'Lipat' },
  'pr.expandShort': { en: 'Expand', id: 'Buka' },
  'pr.autoArrange': { en: 'Auto-arrange branch', id: 'Rapikan cabang otomatis' },
  'pr.typeText': { en: 'Text', id: 'Teks' },
  'pr.typeSticky': { en: 'Sticky note', id: 'Catatan tempel' },
  'pr.typeShape': { en: 'Shape', id: 'Bentuk' },
  'pr.typeImage': { en: 'Image', id: 'Gambar' },
  'pr.typeFrame': { en: 'Frame', id: 'Bingkai' },
  'pr.typeMind': { en: 'Mind map node', id: 'Node peta pikiran' },
  'pr.count': { en: '{n} objects{links}', id: '{n} objek{links}' },
  'pr.links': { en: ' + {n} links', id: ' + {n} koneksi' },
  'sh.rectangle': { en: 'Rectangle', id: 'Persegi' },
  'sh.rounded': { en: 'Rounded rectangle', id: 'Persegi membulat' },
  'sh.roundedShort': { en: 'Rounded', id: 'Membulat' },
  'sh.circle': { en: 'Circle', id: 'Lingkaran' },
  'sh.diamond': { en: 'Diamond', id: 'Wajik' },
  'sh.triangle': { en: 'Triangle', id: 'Segitiga' },
  'sh.hexagon': { en: 'Hexagon', id: 'Segi enam' },

  // --- viewport controls ---
  'vc.zoomOut': { en: 'Zoom out — Ctrl−', id: 'Perkecil — Ctrl−' },
  'vc.zoomIn': { en: 'Zoom in — Ctrl+', id: 'Perbesar — Ctrl+' },
  'vc.resetZoom': { en: 'Reset zoom — Ctrl+0', id: 'Reset zoom — Ctrl+0' },
  'vc.fitBoard': { en: 'Fit board — Ctrl+1', id: 'Pas papan — Ctrl+1' },
  'vc.zoomSel': { en: 'Zoom to selection — Shift+F', id: 'Zoom ke seleksi — Shift+F' },
  'vc.centerOrigin': { en: 'Center on origin', id: 'Pusatkan ke titik nol' },
  'vc.goOrigin': { en: 'Go to origin', id: 'Ke titik nol' },
  'mm.title': { en: 'Minimap — drag to navigate', id: 'Minimap — seret untuk bernavigasi' },
  'toast.dismiss': { en: 'Dismiss', id: 'Tutup' },
  'mk.title': { en: 'Make a connected…', id: 'Buat yang terhubung…' },

  // --- placeholders ---
  'ph.text': { en: 'Text', id: 'Teks' },
  'ph.sticky': { en: 'Write something…', id: 'Tulis sesuatu…' },
  'ph.label': { en: 'Label', id: 'Label' },

  // --- toasts & flows ---
  'msg.selectToExport': { en: 'Select objects to export a selection.', id: 'Pilih objek untuk mengekspor seleksi.' },
  'msg.unableSave': { en: 'Unable to save project.', id: 'Tidak bisa menyimpan proyek.' },
  'msg.savedToFile': { en: 'Project saved to file.', id: 'Proyek tersimpan ke berkas.' },
  'msg.exportedJson': { en: 'Project exported as JSON.', id: 'Proyek diekspor sebagai JSON.' },
  'msg.exportedPng': { en: 'Board exported as PNG.', id: 'Papan diekspor sebagai PNG.' },
  'msg.exportedSvg': { en: 'Board exported as SVG.', id: 'Papan diekspor sebagai SVG.' },
  'msg.exportedPdf': { en: 'Board exported as PDF.', id: 'Papan diekspor sebagai PDF.' },
  'msg.unableExport': { en: 'Unable to export image. {message}', id: 'Tidak bisa mengekspor gambar. {message}' },
  'msg.unableOpenFile': { en: 'Unable to open project. {message}', id: 'Tidak bisa membuka proyek. {message}' },
  'msg.opened': { en: 'Opened “{name}”', id: 'Membuka “{name}”' },
  'msg.invalidProject': { en: 'Invalid Haolio project. {message}', id: 'Proyek Haolio tidak valid. {message}' },
  'msg.projectMissing': { en: 'Unable to open project. Its local data may be missing.', id: 'Tidak bisa membuka proyek. Data lokalnya mungkin hilang.' },
  'msg.alreadyExists': { en: '“{name}” already exists — loaded its newest copy.', id: '“{name}” sudah ada — memuat salinan terbarunya.' },
  'msg.importUnsupported': { en: 'Unable to import image. Supported: PNG, JPG, WEBP, SVG.', id: 'Tidak bisa mengimpor gambar. Didukung: PNG, JPG, WEBP, SVG.' },
  'msg.importTooBig': { en: 'Unable to import image “{name}” — it is larger than 10 MB.', id: 'Tidak bisa mengimpor gambar “{name}” — ukurannya lebih dari 10 MB.' },
  'msg.importFail': { en: 'Unable to import image “{name}”.', id: 'Tidak bisa mengimpor gambar “{name}”.' },
};

export function resolveLang(pref: LangPref): Lang {
  if (pref === 'en' || pref === 'id') return pref;
  if (typeof navigator !== 'undefined' && navigator.language) {
    return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
  }
  return 'en';
}

export type Translate = (key: string, params?: Record<string, string | number>) => string;

export function tFor(lang: Lang): Translate {
  return (key, params) => {
    const entry = STRINGS[key];
    let text = entry ? entry[lang] : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replaceAll(`{${k}}`, String(v));
      }
    }
    return text;
  };
}

/** For non-React contexts (stores, flows): translate with the current language pref. */
export function tNow(key: string, params?: Record<string, string | number>): string {
  return tFor(resolveLang(useSettings.getState().lang))(key, params);
}

/** React hook: a stable translate function bound to the current language. */
export function useT(): Translate {
  const langPref = useSettings((s) => s.lang);
  return useMemo(() => tFor(resolveLang(langPref)), [langPref]);
}

/** Plural helper for the '{n} board | {n} boards' pattern. */
export function plural(t: Translate, key: string, n: number): string {
  const raw = t(key, { n });
  const parts = raw.split('|');
  if (parts.length < 2) return raw;
  return n === 1 ? parts[0]!.trim() : parts[1]!.trim();
}
