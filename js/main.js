// js/main.js
import { transpileToCpp } from './transpiler.js';

window.runCode = async function () {
    const output = document.getElementById('output');
    output.innerText = "実行中...";

    const customCode = document.getElementById('sourceCode').value;
    const cppCode = transpileToCpp(customCode);

    const requestData = {
        code: cppCode,
        compiler: "gcc-head",
        stdin: document.getElementById('stdin').value,
        save: false
    };

    try {
        const res = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestData)
        });

        const result = await res.json();
        output.innerText =
            result.program_output ||
            "[コンパイルエラー]\n" + result.compiler_error ||
            "[実行時エラー]\n" + result.program_error ||
            "正常に終了しました（出力なし）";

    } catch (err) {
        output.innerText = "通信エラー: " + err.message;
    }
};
