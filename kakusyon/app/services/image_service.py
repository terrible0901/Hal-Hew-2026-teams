# 実装予定の概要（実装済みを示すものではありません）
# PNG形式・寸法・容量を検証してファイルを保存する。
# 合成画像は1,024×1,024px・5MiB以内。安全なファイル名と保存先を使用する。
# 公開用画像と認可付き原寸データを区別する。正式保存の完了はPNGとZIPの両方で判定する。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

import os, uuid
from flask import jsonify, request, send_from_directory
from kakusyon.app.common import app

app.config["MAX_CONTENT_LENGTH"] = 5*1024*1024 
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "art")
os.makedirs(UPLOAD_DIR, exist_ok=True)

def save_image(file_storage) -> str:
    filename = f"{uuid.uuid4().hex}.png"
    file_storage.save(os.path.join(UPLOAD_DIR, filename))
    return filename #change to cloud key

@app.route('/upload_image')
def upload_image():
    file = request.files.get("image")
    if not file:
        return jsonify(error="no image"), 400
    if file.mimetype != "image/png":
        return jsonify(error="PNG only"), 400
    return jsonify(ok=True, filename=save_image(file))

# htmlにscriptを入れて
# canvas.toBlob(async (blob) => {
#   const fd = new FormData();
#     fd.append("image", blob, "drawing.png");   // "image" must match request.files["image"]

#     const res = await fetch("/upload", { method: "POST", body: fd });
#     const data = await res.json();
# }, "image/png");

@app.route("/drawings/<filename>")
def get_drawing(filename):
    return send_from_directory(UPLOAD_DIR, filename)