// js/editor.js
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
        const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'", "<": ">" };
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
