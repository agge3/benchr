from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/')
def index():
    return jsonify({"message": "Chairry is running!"})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)