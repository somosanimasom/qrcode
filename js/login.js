if (Auth.get()) location.replace('painel.html');

document.getElementById('year').textContent = new Date().getFullYear();

// Padrão decorativo inspirado num QR code
const pattern = [
    1,1,1,0,1,0,1,
    1,0,1,0,0,1,0,
    1,1,1,0,1,1,1,
    0,0,0,1,0,0,0,
    1,0,1,1,1,0,1,
    0,1,0,0,1,0,0,
    1,1,0,1,0,1,1,
];
const pixels = document.getElementById('pixels');
pattern.forEach((on, i) => {
    const s = document.createElement('span');
    if (on) {
        s.className = 'on';
        s.style.animationDelay = `${(i * 137) % 3200}ms`;
    }
    pixels.appendChild(s);
});

const passInput = document.getElementById('pass');
document.getElementById('toggle-pass').addEventListener('click', () => {
    passInput.type = passInput.type === 'password' ? 'text' : 'password';
});

const form = document.getElementById('login-form');
const errorEl = document.getElementById('error');
const submit = document.getElementById('submit');

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.textContent = '';
    submit.disabled = true;
    try {
        const { token } = await api('login', {
            user: document.getElementById('user').value.trim(),
            pass: passInput.value,
        });
        Auth.set(token);
        location.href = 'painel.html';
    } catch (err) {
        errorEl.textContent = err.message;
        submit.disabled = false;
    }
});
