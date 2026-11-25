// Ficheiros da aplicação incluídos no ZIP para alojamento web: [caminho no site, caminho no ZIP]
const APP_FILES = [
    ['index.html', 'index.html'],
    ['painel.html', 'painel.html'],
    ['backup.html', 'backup.html'],
    ['css/app.css', 'css/app.css'],
    ['js/api.js', 'js/api.js'],
    ['js/login.js', 'js/login.js'],
    ['js/painel.js', 'js/painel.js'],
    ['js/backup.js', 'js/backup.js'],
    ['vendor/qrcode.js', 'vendor/qrcode.js'],
    ['vendor/jszip.min.js', 'vendor/jszip.min.js'],
    ['hosting/api.php.txt', 'api.php'],
    ['hosting/htaccess.txt', '.htaccess'],
    ['hosting/data-htaccess.txt', 'data/.htaccess'],
    ['hosting/LEIA-ME.txt', 'LEIA-ME.txt'],
    ['hosting/verificar.php.txt', 'verificar.php'],
    // modelos mantidos para que a cópia alojada também consiga gerar o seu próprio ZIP
    ['hosting/api.php.txt', 'hosting/api.php.txt'],
    ['hosting/htaccess.txt', 'hosting/htaccess.txt'],
    ['hosting/data-htaccess.txt', 'hosting/data-htaccess.txt'],
    ['hosting/LEIA-ME.txt', 'hosting/LEIA-ME.txt'],
    ['hosting/verificar.php.txt', 'hosting/verificar.php.txt'],
];

// Ficheiros só da versão PHP (não entram na versão estática)
const PHP_ONLY = ['api.php', '.htaccess', 'data/.htaccess', 'LEIA-ME.txt', 'verificar.php'];

// API na nuvem, usada pela versão estática (GitHub Pages)
const CLOUD_API = 'https://2co2apkwxwzkrzg27nfbrcwaz40vcamu.lambda-url.eu-central-1.on.aws/';

const STATIC_README = `KANTATUGA QR — VERSÃO PARA GITHUB PAGES / ALOJAMENTO SEM PHP
==============================================================

Esta versão só tem ficheiros estáticos (HTML, CSS, JS). O login e os
clientes ficam na base de dados na nuvem — são os mesmos do painel
original, por isso tudo o que criar aqui aparece lá e vice-versa.

INSTALAÇÃO NO GITHUB PAGES
1. Extraia este ZIP.
2. No repositório, apague os ficheiros antigos e envie todo o
   conteúdo (Add file → Upload files) e faça "Commit changes".
3. Aguarde 1 a 2 minutos e abra o endereço do site.

Funciona também em qualquer alojamento estático (Netlify, Vercel,
ou um alojamento normal sem PHP).
`;

const dlClients = document.getElementById('dl-clients');
const dlApp = document.getElementById('dl-app');
const dlStatic = document.getElementById('dl-static');

const stamp = () => new Date().toISOString().slice(0, 10);

function saveBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

const canvasPng = (canvas) => new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));

const csvCell = (v) => `"${String(v).replace(/"/g, '""')}"`;

async function withBusy(btn, label, fn) {
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.textContent = label;
    try {
        await fn();
    } catch (err) {
        alert(err.message);
    } finally {
        btn.innerHTML = html;
        btn.disabled = false;
    }
}

async function buildClientsZip() {
    const { items } = await api('list');
    const zip = new JSZip();
    const folder = zip.folder('qrcodes');
    const used = new Set();

    for (const it of items) {
        let name = slug(it.name);
        for (let n = 2; used.has(name); n++) name = `${slug(it.name)}-${n}`;
        used.add(name);
        folder.file(`${name}.png`, await canvasPng(drawQr(document.createElement('canvas'), it.url, 200)));
    }

    const rows = [['Cliente', 'Link', 'Criado em'], ...items.map((it) => [it.name, it.url, new Date(it.created_at).toLocaleString('pt-PT')])];
    // BOM para o Excel reconhecer os acentos; ";" é o separador do Excel em português
    zip.file('clientes.csv', '﻿' + rows.map((r) => r.map(csvCell).join(';')).join('\r\n'));
    zip.file('clientes.json', JSON.stringify(items.map(({ name, url, created_at }) => ({ name, url, created_at })), null, 2));

    saveBlob(await zip.generateAsync({ type: 'blob' }), `backup-clientes-${stamp()}.zip`);
    toast(`Backup de ${items.length} clientes descarregado`);
}

async function buildAppZip(isStatic = false) {
    const { items, config } = await api('export');
    const zip = new JSZip();
    const files = isStatic ? APP_FILES.filter(([, dest]) => !PHP_ONLY.includes(dest)) : APP_FILES;

    await Promise.all(files.map(async ([src, dest]) => {
        const res = await fetch(src, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Não foi possível obter ${src}`);
        zip.file(dest, await res.blob());
    }));

    if (isStatic) {
        zip.file('js/config.js', `// API na nuvem (versão sem PHP)\nwindow.QR_API = '${CLOUD_API}';\n`);
        zip.file('LEIA-ME.txt', STATIC_README);
        zip.file('.nojekyll', '');
    } else {
        zip.file('js/config.js', "// API desta instalação (PHP)\nwindow.QR_API = 'api.php';\n");
        zip.file('config.php', config);
    }

    saveBlob(await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' }), `kantatuga-qr-app-${isStatic ? 'github-pages' : 'php'}-${stamp()}.zip`);
    toast(isStatic ? 'Versão GitHub Pages descarregada' : `Aplicação descarregada com ${items.length} clientes`);
}

dlClients.addEventListener('click', () => withBusy(dlClients, 'A gerar ZIP…', buildClientsZip));
dlApp.addEventListener('click', () => withBusy(dlApp, 'A gerar ZIP…', () => buildAppZip(false)));
dlStatic.addEventListener('click', () => withBusy(dlStatic, 'A gerar ZIP…', () => buildAppZip(true)));

(async () => {
    try {
        const { items } = await api('list');
        document.getElementById('stat-count').textContent = items.length;
        document.getElementById('nav-count').textContent = items.length;
    } finally {
        dlClients.disabled = false;
        dlApp.disabled = false;
        dlStatic.disabled = false;
    }
})();

bindLogout();
