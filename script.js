// 独自言語をC++に変換する関数（トランスパイラ）
function transpileToCpp(customCode) {
    // 【最重要クレンジング】ソースコード内の特殊空白(NBSPや全角)を半角スペースに自動統一
    let cpp = customCode.replace(/[\u3000\u00a0]/g, " ");

    // ==========================================
    // 1. コメント・文字列リテラルの完全保護（バグ防止の最重要処理）
    // ==========================================
    let literals = [];
    cpp = cpp.replace(/(\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, function(match) {
        literals.push(match);
        return `__ANT_LITERAL_${literals.length - 1}__`;
    });

    // ==========================================
    // 1.5 【打ち間違い自動救済ロジック】型名だけで書いた入力を IN() に変換
    // ==========================================
    cpp = cpp.replace(/\b(I|S|B|D|C)\(([^)]+)\);/g, "IN($2);");

    // ==========================================
    // 2. 特殊リテラル・定数・独自演算子の置換
    // ==========================================
    cpp = cpp.replace(/\bE\b/g, "any_empty{}");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*\^=\s*([^;\n]+)/g, "$1 = _ant_pow($1, $2)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*\^\s*([a-zA-Z0-9_$.\[\]()_+-]+)/g, "_ant_pow($1, $2)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*\*\*/g, "$1 *= 2");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*\/\//g, "$1 /= 2");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*-=\s*([^;\n]+)/g, "_ant_minus_assign($1, $2)");

    // ==========================================
    // 3. 関数・入出力・ループマクロの置換
    // ==========================================
    cpp = cpp.replace(/\bIN\((.*?)\);/g, function(match, p1) {
        if (!p1.trim()) return "std::cin;";
        let args = p1.split(',').map(arg => arg.trim()).join(' >> ');
        return `std::cin >> ${args};`;
    });

    cpp = cpp.replace(/\bO\((.*?)\);/g, function(match, p1) {
        if (!p1.trim()) return "std::cout;";
        let args = p1.split(',').map(arg => arg.trim()).join(' << ');
        return `std::cout << ${args};`;
    });

    cpp = cpp.replace(/\bFP\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "for(long long int $1 = $2; $1 < $3; $1++)");
    cpp = cpp.replace(/\bFM\(([^,]+),\s*([^,]+),\s*([^)]+)\)/g, "for(long long int $1 = $2; $1 > $3; $1--)");
    cpp = cpp.replace(/\bF\s*\(/g, "for(");

    // ==========================================
    // 4. 独自文字列メソッド（L, RV, ST, RST, RP, SP, CT, FD）
    // ==========================================
    cpp = cpp.replace(/\.L\b/g, ".length()");
    cpp = cpp.replace(/\bRV\((.*?)\);/g, "std::reverse($1.begin(), $1.end());");
    cpp = cpp.replace(/\bST\((.*?)\);/g, "std::sort($1.begin(), $1.end());");
    cpp = cpp.replace(/\bRST\((.*?)\);/g, "std::sort($1.begin(), $1.end(), std::greater<>());");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\.RV\b/g, "_ant_rv_f($1)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\.ST\b/g, "_ant_st_f($1)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\.RST\b/g, "_ant_rst_f($1)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\.RP\((.*?)\s+to\s+(.*?)\)/g, "$1 = _ant_rp($1, $2, $3)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\.SP\((.*?)\)/g, "_ant_sp($1, $2)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\.CT\((.*?)\)/g, "_ant_ct($1, $2)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\.FD\((.*?)\)/g, "_ant_fd($1, $2)");

    // ==========================================
    // 5. 文字列スライス機能 (s[0] ~ s[n], s[n] ~ 3)
    // ==========================================
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\[([^\]]+)\]\s*~\s*\1\[([^\]]+)\]/g, "$1.substr($2, ($3) - ($2) + 1)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\[([^\]]+)\]\s*~\s*([^;\n\s]+)/g, "$1.substr($2, $3)");

    // ==========================================
    // 6. [ ] や ( )、および C++風 < > を使った独自型指定表記の置換（ネスト対応）
    // ==========================================
    let changed = true;
    while (changed) {
        let old = cpp;
        cpp = cpp.replace(/\bV<([^<>]+?)>/g, "vector<$1>");
        cpp = cpp.replace(/\bM<([^<>]+?)>/g, "map<$1>");
        
        cpp = cpp.replace(/\bP<\s*([^<>]+?)\s*>/g, "pair<$1>");
        cpp = cpp.replace(/\bT<\s*([^<>]+?)\s*>/g, "tuple<$1>");
        if (old === cpp) changed = false;
    }
    // 代入右辺の配列リテラルを { ... } に変換（空配列も含む）
    cpp = cpp.replace(/=\s*\[([^\[\]]*?)\]/g, "= {$1}");

    // ==========================================
    // 7. 基本型・キーワードの最終置換
    // ==========================================
    cpp = cpp.replace(/\bM\s*\{/g, 'int main(){');
    cpp = cpp.replace(/\bI\b/g, 'long long int');
    cpp = cpp.replace(/\bS\b/g, 'string');
    cpp = cpp.replace(/\bB\b/g, 'bool');
    cpp = cpp.replace(/\bD\b/g, 'long double');
    cpp = cpp.replace(/\bC\b/g, 'char');
    cpp = cpp.replace(/\bA\b/g, 'auto');
    cpp = cpp.replace(/\bF\b/g, 'void'); 
    cpp = cpp.replace(/\bR\b/g, 'return');
    cpp = cpp.replace(/\bIF\b/g, 'if');
    cpp = cpp.replace(/\bW\b/g, 'while');

    cpp = cpp.replace(/long long int\s+([a-zA-Z0-9_]+);/g, "long long int $1 = 0;");

    // ==========================================
    // 8. 保護していた文字列リテラル・コメントの復元
    // ==========================================
    for (let i = literals.length - 1; i >= 0; i--) {
        cpp = cpp.replaceAll(`__ANT_LITERAL_${i}__`, literals[i]);
    }

    // ==========================================
    // 9. C++ ヘッダー ＆ 独自言語コアエンジン
    // ==========================================
    const header = `#include <bits/stdc++.h>
using namespace std;

struct any_empty {
    template<typename T> operator vector<T>() const { return vector<T>(); }
    operator string() const { return ""; }
    template<typename T> bool operator==(const vector<T>& v) const { return v.empty(); }
    template<typename T> friend bool operator==(const vector<T>& v, const any_empty&) { return v.empty(); }
    bool operator==(const string& s) const { return s.empty(); }
    friend bool operator==(const string& s, const any_empty&) { return s.empty(); }
};

struct AntPow {
    long double val;
    template<typename T> operator T() const {
        if constexpr (std::is_integral_v<T>) return (T)std::round(val);
        else return (T)val;
    }
    template<typename T> bool operator==(T other) const { return val == other; }
    template<typename T> friend bool operator==(T other, AntPow p) { return other == p.val; }
    friend ostream& operator<<(ostream& os, const AntPow& p) {
        if (floor(p.val) == p.val) os << (long long int)p.val;
        else os << p.val;
        return os;
    }
};
template<typename T, typename U>
AntPow _ant_pow(T x, U n) { return AntPow{ std::pow((long double)x, (long double)n) }; }

void _ant_minus_assign(string& s, int n) { if((int)s.length() >= n) s.erase(s.length() - n); }
template<typename T> void _ant_minus_assign(T& x, T n) { x -= n; }

string _ant_rv_f(string s) { reverse(s.begin(), s.end()); return s; }
string _ant_st_f(string s) { sort(s.begin(), s.end()); return s; }
string _ant_rst_f(string s) { sort(s.begin(), s.end(), greater<char>()); return s; }

vector<string> _ant_sp(const string& s, const string& delim) {
    vector<string> res; if(delim.empty()) return res;
    size_t start = 0, end = s.find(delim);
    while(end != string::npos) {
        res.push_back(s.substr(start, end - start));
        start = end + delim.length();
        end = s.find(delim, start);
    }
    res.push_back(s.substr(start));
    return res;
}

long long int _ant_ct(const string& s, char c) { return count(s.begin(), s.end(), c); }
long long int _ant_ct(const string& s, const string& sub) {
    if(sub.empty()) return 0;
    long long int cnt = 0; size_t pos = s.find(sub);
    while(pos != string::npos) { cnt++; pos = s.find(sub, pos + sub.length()); }
    return cnt;
}

vector<long long int> _ant_fd(const string& s, char c) {
    vector<long long int> res;
    for(size_t i=0; i<s.length(); ++i) if(s[i] == c) res.push_back(i);
    return res;
}
vector<long long int> _ant_fd(const string& s, const string& sub) {
    vector<long long int> res; if(sub.empty()) return res;
    size_t pos = s.find(sub);
    while(pos != string::npos) { res.push_back(pos); pos = s.find(sub, pos + 1); }
    return res;
}

string _ant_rp(string s, const string& from, const string& to) {
    if(from.empty()) return s;
    string res = ""; size_t pos = 0, next = s.find(from);
    while(next != string::npos) {
        res += s.substr(pos, next - pos) + to;
        pos = next + from.length(); next = s.find(from, pos);
    }
    res += s.substr(pos); return res;
}
string _ant_rp(string s, char from, const string& to) { return _ant_rp(s, string(1, from), to); }
string _ant_rp(string s, const string& from, char to) { return _ant_rp(s, from, string(1, to)); }
string _ant_rp(string s, char from, char to) { return _ant_rp(s, string(1, from), string(1, to)); }

\n`;
    
    return header + cpp;
}

// Wandbox APIを使ってコードを実行する関数
async function runCode() {
    const outputArea = document.getElementById('output');
    outputArea.innerText = "実行中...";

    const customCode = document.getElementById('sourceCode').value;
    const cppCode = transpileToCpp(customCode);
    
    const requestData = {
        code: cppCode,
        compiler: "gcc-head",
        stdin: document.getElementById('stdin').value,
        save: false
    };

    try {
        const response = await fetch('https://wandbox.org/api/compile.json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        const result = await response.json();

        if (result.program_output) {
            outputArea.innerText = result.program_output;
        } else if (result.compiler_error) {
            outputArea.innerText = "[コンパイルエラー]\n" + result.compiler_error;
        } else if (result.program_error) {
            outputArea.innerText = "[実行時エラー]\n" + result.program_error;
        } else {
            outputArea.innerText = "正常に終了しました（出力なし）";
        }
    } catch (error) {
        outputArea.innerText = "通信エラーが発生しました: " + error.message;
    }
}

// --- エディタ補助機能（Tabのスペース化、カッコの自動補完、オートインデントなど） ---
document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('sourceCode');

    editor.addEventListener('keydown', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const value = this.value;

        // 1. Backspaceキーの処理（カッコのペア削除 ＆ Tab一括削除）
        if (e.key === 'Backspace' && start === end && start > 0) {
            const charBefore = value.substring(start - 1, start);
            const charAfter = value.substring(start, start + 1);
            const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };

            if (pairs[charBefore] && pairs[charBefore] === charAfter) {
                e.preventDefault();
                this.value = value.substring(0, start - 1) + value.substring(start + 1);
                this.selectionStart = this.selectionEnd = start - 1;
                return;
            }

            if (start >= 2 && value.substring(start - 2, start) === "  ") {
                e.preventDefault();
                this.value = value.substring(0, start - 2) + value.substring(start);
                this.selectionStart = this.selectionEnd = start - 2;
                return;
            }
        }

        // 2. Enterキーの処理（オートインデント ＆ {}のスマート改行）
        if (e.key === 'Enter') {
            e.preventDefault();
            
            let lineStart = value.lastIndexOf('\n', start - 1);
            lineStart = lineStart === -1 ? 0 : lineStart + 1;
            const currentLine = value.substring(lineStart, start);
            const indentMatch = currentLine.match(/^\s*/);
            const currentIndent = indentMatch ? indentMatch[0] : "";

            const charBefore = value.substring(start - 1, start);
            const charAfter = value.substring(start, start + 1);

            if (charBefore === '{') {
                if (charAfter === '}') {
                    const newIndent = currentIndent + "  ";
                    this.value = value.substring(0, start) + "\n" + newIndent + "\n" + currentIndent + value.substring(start);
                    this.selectionStart = this.selectionEnd = start + 1 + newIndent.length;
                } else {
                    const newIndent = currentIndent + "  ";
                    this.value = value.substring(0, start) + "\n" + newIndent + value.substring(start);
                    this.selectionStart = this.selectionEnd = start + 1 + newIndent.length;
                }
            } else {
                this.value = value.substring(0, start) + "\n" + currentIndent + value.substring(start);
                this.selectionStart = this.selectionEnd = start + 1 + currentIndent.length;
            }
            return;
        }

        // 3. Tabキーを押したときの処理（2文字のスペースを挿入）
        if (e.key === 'Tab') {
            e.preventDefault();
            this.value = value.substring(0, start) + "  " + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 2;
            return;
        }

        // 4. カッコやクォーテーションの自動補完
        const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
        if (pairs[e.key]) {
            e.preventDefault();
            const char = e.key;
            const closingChar = pairs[char];

            if (start !== end) {
                const selectedText = value.substring(start, end);
                this.value = value.substring(0, start) + char + selectedText + closingChar + value.substring(end);
                this.selectionStart = start;
                this.selectionEnd = end + 2;
            } else {
                this.value = value.substring(0, start) + char + closingChar + value.substring(end);
                this.selectionStart = this.selectionEnd = start + 1;
            }
        }
    });
});

// --- フィルター回避用：完全ローカル認証＆コード保存システム ---
let currentUser = null;

function localSignUp() {
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

function localSignIn() {
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

function showLoggedInUI() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('saveSection').style.display = 'block';
    document.getElementById('userDisplay').innerText = currentUser;
}

function localLogout() {
    currentUser = null;
    document.getElementById('authSection').style.display = 'block';
    document.getElementById('saveSection').style.display = 'none';
    document.getElementById('username').value = "";
    document.getElementById('password').value = "";
}

function saveCodeLocal() {
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

function loadLocalCodes() {
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
        li.style.justifyContent = "space-between"; // ⭕️ between から space-between に修正
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
        `; // ⭕️ 安全のためonclick引数から '${item.title}' を削除
        listElement.appendChild(li);
    });
}

function loadSelectedCode(originalIndex) {
    let allCodes = JSON.parse(localStorage.getItem('ide_saved_codes') || '[]');
    const target = allCodes[originalIndex];

    if (target && target.user === currentUser) {
        document.getElementById('sourceCode').value = target.code;
        document.getElementById('stdin').value = target.stdin;
        alert(`「${target.title}」を読み込みました！`);
    }
}

function deleteCodeLocal(originalIndex) {
    let allCodes = JSON.parse(localStorage.getItem('ide_saved_codes') || '[]');
    const target = allCodes[originalIndex];

    // 安全チェック: 該当データが存在し、かつ自分のコードか確認
    if (!target || target.user !== currentUser) return;

    // ⭕️ タイトルは引数経由ではなく、LocalStorageのデータから直接取得して安全にダイアログ表示
    if (!confirm(`「${target.title}」を本当に削除してもよろしいですか？\n※この操作は取り消せません。`)) {
        return;
    }

    allCodes.splice(originalIndex, 1);
    localStorage.setItem('ide_saved_codes', JSON.stringify(allCodes));
    loadLocalCodes();
}
