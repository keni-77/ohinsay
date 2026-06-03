export let currentUser = null;

export function localSignUp() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;

    if (!user || !pass) { alert("ユーザー名とパスワードを入力してください"); return; }

    let users = JSON.parse(localStorage.getItem('ide_users') || '{}');

    if (users[user]) {
        alert("そのユーザー名はすでに登録されています");
        return;
    }

    users[user] = { password: pass };
    localStorage.setItem('ide_users', JSON.stringify(users));
    alert("登録が完了しました！そのままログインしてください。");
}

export function localSignIn() {
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;

    let users = JSON.parse(localStorage.getItem('ide_users') || '{}');

    if (users[user] && users[user].password === pass) {
        currentUser = user;
        showLoggedInUI();
        loadLocalCodes();
    } else {
        alert("ユーザー名またはパスワードが違います");
    }
}

export function showLoggedInUI() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('saveSection').style.display = 'block';
    document.getElementById('userDisplay').innerText = currentUser;
}

export function localLogout() {
    currentUser = null;
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('saveSection').style.display = 'none';
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
}

export function saveCodeLocal() {
    if (!currentUser) return;

    const title = document.getElementById('codeTitle').value.trim() || "無題のコード";
    const code = document.getElementById('sourceCode').value;
    const stdin = document.getElementById('stdin').value;

    let allCodes = JSON.parse(localStorage.getItem('ide_saved_codes') || '[]');

    allCodes.push({
        user: currentUser,
        title: title,
        code: code,
        stdin: stdin,
        date: new Date().toLocaleString()
    });

    localStorage.setItem('ide_saved_codes', JSON.stringify(allCodes));
    alert("コードをこのパソコン内に保存しました！");
    document.getElementById('codeTitle').value = "";
    loadLocalCodes();
}

export function loadLocalCodes() {
    if (!currentUser) return;

    const listElement = document.getElementById('savedCodesList');
    listElement.innerHTML = "";

    let allCodes = JSON.parse(localStorage.getItem('ide_saved_codes') || '[]');

    let myCodes = allCodes
        .map((item, originalIndex) => ({ ...item, originalIndex }))
        .filter(item => item.user === currentUser);

    if (myCodes.length === 0) {
        listElement.innerHTML = `<li style="color: #666; font-size: 13px;">保存されたコードはありません。</li>`;
        return;
    }

    myCodes.forEach((item) => {
        const li = document.createElement('li');
        li.style.margin = "8px 0";
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.style.alignItems = "center";
        li.style.maxWidth = "400px";

        li.innerHTML = `
            <div style="flex-grow: 1;">
                <a href="#" onclick="loadSelectedCode(${item.originalIndex}); return false;" style="color: #007bff; text-decoration: none; font-weight: bold;">
                    ${item.title}
                </a> 
                <br>
                <span style="font-size: 11px; color: #666;">(${item.date})</span>
            </div>
            <button onclick="deleteCodeLocal(${item.originalIndex})" style="background: #dc3545; color: white; border: none; padding: 3px 8px; font-size: 12px; border-radius: 3px; cursor: pointer; margin-left: 10px;">
                削除
            </button>
        `;
        listElement.appendChild(li);
    });
}

export function loadSelectedCode(originalIndex) {
    let allCodes = JSON.parse(localStorage.getItem('ide_saved_codes') || '[]');
    const target = allCodes[originalIndex];

    if (target && target.user === currentUser) {
        document.getElementById('sourceCode').value = target.code;
        document.getElementById('stdin').value = target.stdin;
        alert(`「${target.title}」を読み込みました！`);
    }
}

export function deleteCodeLocal(originalIndex) {
    let allCodes = JSON.parse(localStorage.getItem('ide_saved_codes') || '[]');
    const target = allCodes[originalIndex];

    if (!target || target.user !== currentUser) return;

    if (!confirm(`「${target.title}」を本当に削除してもよろしいですか？\n※この操作は取り消せません。`)) {
        return;
    }

    allCodes.splice(originalIndex, 1);
    localStorage.setItem('ide_saved_codes', JSON.stringify(allCodes));
    loadLocalCodes();
}
