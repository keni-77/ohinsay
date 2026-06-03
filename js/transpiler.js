// js/transpiler.js
function parsePowerExpression(expr) {
    let i = 0;

    function skip() {
        while (i < expr.length && /\s/.test(expr[i])) i++;
    }

    function parseAtom() {
        skip();
        if (expr[i] === '(') {
            i++;
            let inside = parseExpr();
            skip();
            if (expr[i] !== ')') throw new Error("Missing )");
            i++;
            return "(" + inside + ")";
        }

        let start = i;
        while (i < expr.length && /[A-Za-z0-9_]/.test(expr[i])) i++;
        return expr.slice(start, i);
    }

    function parsePower() {
        let left = parseAtom();
        skip();
        while (expr[i] === '^') {
            i++;
            let right = parseAtom();
            left = `_ant_pow(${left}, ${right})`;
            skip();
        }
        return left;
    }

    function parseExpr() {
        let left = parsePower();
        skip();
        while (/[+\-*/]/.test(expr[i])) {
            let op = expr[i++];
            let right = parsePower();
            left = `${left} ${op} ${right}`;
            skip();
        }
        return left;
    }

    return parseExpr();
}

export function transpileToCpp(customCode) {
    let cpp = customCode.replace(/[\u3000\u00a0]/g, " ");

    let literals = [];
    cpp = cpp.replace(/(\/\/.*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, function(match) {
        literals.push(match);
        return `__ANT_LITERAL_${literals.length - 1}__`;
    });
    cpp = cpp.replace(/\bE\b/g, "any_empty{}");
    cpp = cpp.replace(/([A-Za-z0-9_() +\-*/]+)/g, (m) => {if (m.includes("^")) return parsePowerExpression(m); return m;});
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*\*\*/g, "$1 *= 2");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*\/\//g, "$1 /= 2");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\s*-=\s*([^;\n]+)/g, "_ant_minus_assign($1, $2)");
    cpp = cpp.replace(/\bI\((.*?)\);/g, function(match, p1) {
        if (!p1.trim()) return "std::cin;";
        let args = p1.split(',').map(arg => arg.trim()).join(' >> ');
        return `std::cin >> ${args};`;
    });

    cpp = cpp.replace(/\bO\((.*?)\);/g, function(match, p1) {
        if (!p1.trim()) return "std::cout;";
        let args = p1.split(',').map(arg => arg.trim()).join(' << ');
        return `std::cout << ${args};`;
    });

    cpp = cpp.replace(/\bFP\(([^,]+),\s*([^,]+),\s*((?:[^()]|\([^()]*\))*)\)\s*\{/g,"for(long long int $1 = $2; $1 < $3; $1++){");
    cpp = cpp.replace(/\bFP\(([^,]+),\s*([^,]+),\s*((?:[^()]|\([^()]*\))*)\)/g,"for(long long int $1 = $2; $1 < $3; $1++)");
    cpp = cpp.replace(/\bFM\(([^,]+),\s*([^,]+),\s*((?:[^()]|\([^()]*\))*)\)\s*\{/g,"for(long long int $1 = $2; $1 > $3; $1--){");
    cpp = cpp.replace(/\bFM\(([^,]+),\s*([^,]+),\s*((?:[^()]|\([^()]*\))*)\)/g,"for(long long int $1 = $2; $1 > $3; $1--)");
    cpp = cpp.replace(/\bF\s*\(/g, "for(");

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
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\[([^\]]+)\]\s*~\s*\1\[([^\]]+)\]/g, "$1.substr($2, ($3) - ($2) + 1)");
    cpp = cpp.replace(/([a-zA-Z0-9_$.\[\]()_]+)\[([^\]]+)\]\s*~\s*([^;\n\s]+)/g, "$1.substr($2, $3)");

    let changed = true;
    while (changed) {
        let old = cpp;
        cpp = cpp.replace(/\bV<([^<>]+?)>/g, "vector<$1>");
        cpp = cpp.replace(/\bM<([^<>]+?)>/g, "map<$1>");
        cpp = cpp.replace(/\bP<([^<>]+?)>/g, "pair<$1>");
        cpp = cpp.replace(/\bT<([^<>]+?)>/g, "tuple<$1>");
        changed = (old !== cpp);
    }
    cpp = cpp.replace(/=\s*\[([^\[\]]*?)\]/g, "= {$1}");
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

    for (let i = literals.length - 1; i >= 0; i--) {
        cpp = cpp.replaceAll(`__ANT_LITERAL_${i}__`, literals[i]);
    }

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

template<typename T, typename U>
T _ant_pow(T x, U n) {return (T)std::pow((long double)x, (long double)n);}
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

`;

    return header + cpp;
}
