const ICONS = {
    download: '<svg class="i" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
    open: '<svg class="i" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>',
    trash: '<svg class="i" viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/></svg>',
    qr: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
    plus: '<svg class="i" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    check: '<svg class="i" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
};

let items = [];
let pendingDelete = null;

const listEl = document.getElementById('list');
const searchEl = document.getElementById('search');

const fmtDate = (d) => new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
const prettyUrl = (u) => u.replace(/^https?:\/\//, '').replace(/\/$/, '');

function render() {
    const q = searchEl.value.trim().toLowerCase();
    const visible = q ? items.filter((it) => it.name.toLowerCase().includes(q) || it.url.toLowerCase().includes(q)) : items;

    document.getElementById('total').textContent = String(items.length).padStart(2, '0');
    document.getElementById('nav-count').textContent = items.length;
    listEl.className = '';

    if (!items.length) {
        listEl.innerHTML = `
            <div class="empty">
                <div class="ico">${ICONS.qr}</div>
                <h3>Ainda sem QR codes</h3>
                <p>Crie o primeiro QR code com o link do site de um cliente. Ficará guardado aqui para descarregar quando quiser.</p>
                <button class="btn btn-primary" data-new>${ICONS.plus} Novo QR code</button>
            </div>`;
        return;
    }
    if (!visible.length) {
        listEl.innerHTML = `<div class="empty"><h3>Sem resultados</h3><p>Nenhum cliente corresponde a “${esc(q)}”.</p></div>`;
        return;
    }

    listEl.innerHTML = '<div class="grid"></div>';
    const grid = listEl.firstChild;
    visible.forEach((it, i) => {
        const card = document.createElement('article');
        card.className = 'card';
        card.style.setProperty('--i', Math.min(i, 12));
        card.innerHTML = `
            <a class="qr-frame" href="${esc(it.url)}" target="_blank" rel="noopener" title="Abrir ${esc(it.url)}">
                <canvas></canvas>
                <div class="open-hint"><span>${ICONS.open} Abrir site</span></div>
            </a>
            <div class="card-meta">
                <h3 title="${esc(it.name)}">${esc(it.name)}</h3>
                <a class="url" href="${esc(it.url)}" target="_blank" rel="noopener">${esc(prettyUrl(it.url))}</a>
                <time>Criado a ${fmtDate(it.created_at)}</time>
            </div>
            <div class="card-actions">
                <button class="btn btn-primary" data-download>${ICONS.download} Download</button>
                <a class="btn btn-ghost icon-btn" href="${esc(it.url)}" target="_blank" rel="noopener" title="Abrir site">${ICONS.open}</a>
                <button class="btn btn-ghost icon-btn del" data-delete title="Eliminar">${ICONS.trash}</button>
            </div>`;
        const canvas = drawQr(card.querySelector('canvas'), it.url, 200);
        card.querySelector('[data-download]').addEventListener('click', () => download(canvas, it.name));
        card.querySelector('[data-delete]').addEventListener('click', () => askDelete(it));
        grid.appendChild(card);
    });
}

function download(canvas, name) {
    canvas.toBlob((blob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `qrcode-${slug(name)}.png`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, 'image/png');
}

async function load() {
    try {
        const { items: data } = await api('list');
        items = data;
        render();
    } catch (err) {
        listEl.className = 'loading';
        listEl.textContent = err.message;
    }
}

/* ---------- Modais ---------- */
function openModal(id) { document.getElementById(id).hidden = false; }
function closeModal(id) { document.getElementById(id).hidden = true; }

document.querySelectorAll('.modal-backdrop').forEach((bd) => {
    bd.addEventListener('click', (e) => {
        if (e.target === bd || e.target.closest('[data-close]')) bd.hidden = true;
    });
});
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-backdrop').forEach((bd) => (bd.hidden = true));
});

/* ---------- Novo ---------- */
const form = document.getElementById('new-form');
const nameIn = document.getElementById('f-name');
const urlIn = document.getElementById('f-url');
const preview = document.getElementById('preview');
const newError = document.getElementById('new-error');
const saveBtn = document.getElementById('save-btn');

function normalizeUrl(v) {
    v = v.trim();
    if (!v) return '';
    return /^https?:\/\//i.test(v) ? v : 'https://' + v;
}

function updatePreview() {
    const url = normalizeUrl(urlIn.value);
    if (!url) {
        preview.innerHTML = '<div class="placeholder">Escreva o link para ver o QR code</div>';
        return;
    }
    preview.innerHTML = '<div class="qr-frame"><canvas></canvas></div>';
    drawQr(preview.querySelector('canvas'), url, 200);
}

function openNew() {
    form.reset();
    newError.textContent = '';
    updatePreview();
    openModal('new-modal');
    setTimeout(() => nameIn.focus(), 50);
}

urlIn.addEventListener('input', updatePreview);
document.getElementById('new-btn').addEventListener('click', openNew);
listEl.addEventListener('click', (e) => { if (e.target.closest('[data-new]')) openNew(); });

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    newError.textContent = '';
    saveBtn.disabled = true;
    try {
        const { item } = await api('create', { name: nameIn.value, url: normalizeUrl(urlIn.value) });
        items.unshift(item);
        searchEl.value = '';
        render();
        closeModal('new-modal');
        toast('QR code criado');
    } catch (err) {
        newError.textContent = err.message;
    } finally {
        saveBtn.disabled = false;
    }
});

/* ---------- Eliminar ---------- */
function askDelete(it) {
    pendingDelete = it;
    document.getElementById('del-text').innerHTML = `O QR code de <strong>${esc(it.name)}</strong> será eliminado definitivamente.`;
    openModal('del-modal');
}

document.getElementById('del-confirm').addEventListener('click', async (e) => {
    if (!pendingDelete) return;
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
        await api('delete', { id: pendingDelete.id });
        items = items.filter((x) => x.id !== pendingDelete.id);
        render();
        closeModal('del-modal');
        toast('QR code eliminado');
    } catch (err) {
        alert(err.message);
    } finally {
        btn.disabled = false;
        pendingDelete = null;
    }
});

/* ---------- Outros ---------- */
searchEl.addEventListener('input', render);
bindLogout();

load();
