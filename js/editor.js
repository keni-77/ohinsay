// js/editor.js
document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('sourceCode');
    if (!editor) return;

    editor.addEventListener('keydown', function(e) {
        const start = this.selectionStart;
        const end = this.selectionEnd;
        const value = this.value;

        if (e.key === 'Tab') {
            e.preventDefault();
            this.value = value.substring(0, start) + "  " + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 2;
            return;
        }

        if (e.key === 'Backspace' && start === end && start > 0) {
            const before = value[start - 1];
            const after = value[start];
            const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
            if (pairs[before] && pairs[before] === after) {
                e.preventDefault();
                this.value = value.slice(0, start - 1) + value.slice(start + 1);
                this.selectionStart = this.selectionEnd = start - 1;
                return;
            }
        }

        const pairs = { '(': ')', '{': '}', '[': ']', '"': '"', "'": "'" };
        if (pairs[e.key]) {
            e.preventDefault();
            const close = pairs[e.key];
            this.value = value.substring(0, start) + e.key + close + value.substring(end);
            this.selectionStart = this.selectionEnd = start + 1;
        }
    });
});
