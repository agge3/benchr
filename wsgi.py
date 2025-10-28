from api import app
from config import Config

if __name__ == "__main__":
    app.run(
            host=Config.FLASK_HOST,
            port=Config.FLASK_PORT,
            #debug=Config.FLASK_DEBUG,
            debug=True
            )
