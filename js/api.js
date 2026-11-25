// No alojamento web (versão PHP) js/config.js define window.QR_API = 'api.php'
const API_BASE = window.QR_API || 'https://2co2apkwxwzkrzg27nfbrcwaz40vcamu.lambda-url.eu-central-1.on.aws/';
const TOKEN_KEY = 'qr_token';

const Auth = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (t) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => localStorage.removeItem(TOKEN_KEY),
};

async function api(action, data = {}) {
    const headers = { 'Content-Type': 'application/json' };
    const token = Auth.get();
    if (token) headers.Authorization = `Bearer ${token}`;
    // o token segue também no corpo: alguns alojamentos removem o cabeçalho Authorization
    const isPhp = /\.php$/.test(API_BASE);
    const hint = isPhp ? ' Abra a página verificar.php para ver o diagnóstico.' : '';
    let res;
    try {
        res = await fetch(API_BASE, { method: 'POST', headers, body: JSON.stringify({ action, ...data, _token: token || undefined }) });
    } catch {
        throw new Error('Sem ligação ao servidor.' + hint);
    }
    if (isPhp && res.status === 405) {
        throw new Error('Este alojamento não executa PHP (ex.: GitHub Pages). Use a versão "GitHub Pages / sem PHP" do menu Backup.');
    }
    let body;
    try {
        body = JSON.parse(await res.text());
    } catch {
        throw new Error(`O servidor não respondeu corretamente (código ${res.status}).` + hint);
    }
    if (res.status === 401 && action !== 'login') {
        Auth.clear();
        location.href = 'index.html';
        throw new Error('Sessão expirada');
    }
    if (!res.ok) throw new Error(body.error || 'Erro inesperado');
    return body;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'qrcode';

function toast(msg) {
    const t = document.getElementById('toast');
    t.innerHTML = '<svg class="i" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>' + esc(msg);
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), 2400);
}

function bindLogout() {
    document.getElementById('logout').addEventListener('click', () => {
        Auth.clear();
        location.href = 'index.html';
    });
}

/** Desenha o QR code num canvas de exatamente `size` x `size` px. */
function drawQr(canvas, text, size = 200) {
    const qr = qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const n = qr.getModuleCount();
    const quiet = 4;
    const cell = Math.max(1, Math.floor(size / (n + quiet * 2)));
    const offset = Math.floor((size - cell * n) / 2);

    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000000';
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (qr.isDark(r, c)) ctx.fillRect(offset + c * cell, offset + r * cell, cell, cell);
        }
    }
    return canvas;
}
