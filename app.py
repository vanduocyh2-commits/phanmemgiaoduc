import os
import base64
import requests
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)

GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
GITHUB_REPO = os.environ.get("GITHUB_REPO", "vanduocyh2-commits/phanmemgiaoduc")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/upload-exam-file', methods=['POST'])
def upload_exam_file():
    if not GITHUB_TOKEN:
        return jsonify({"success": False, "message": "Chưa cấu hình GITHUB_TOKEN!"}), 500

    file = request.files.get('file')
    exam_code = request.form.get('code', '101')
    
    if not file:
        return jsonify({"success": False, "message": "Không tìm thấy file!"}), 400

    filename = f"de_thi_{exam_code}_{file.filename}"
    encoded_content = base64.b64encode(file.read()).decode('utf-8')
    github_path = f"de_thi_luu/{filename}"
    api_url = f"https://api.github.com/repos/{GITHUB_REPO}/contents/{github_path}"

    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
    }

    get_res = requests.get(api_url, headers=headers)
    sha = get_res.json().get('sha') if get_res.status_code == 200 else None

    payload = {
        "message": f"Tu dong day file de thi ma {exam_code}",
        "content": encoded_content,
        "branch": "main"
    }
    if sha:
        payload["sha"] = sha

    put_res = requests.put(api_url, headers=headers, json=payload)

    if put_res.status_code in [200, 201]:
        raw_url = f"https://raw.githubusercontent.com/{GITHUB_REPO}/main/{github_path}"
        return jsonify({"success": True, "fileUrl": raw_url, "message": "Đã đẩy file lên GitHub thành công!"})
    else:
        return jsonify({"success": False, "message": "Lỗi đẩy file lên GitHub"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)