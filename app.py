import os
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.orm import DeclarativeBase
from openai import OpenAI
import PyPDF2
from werkzeug.utils import secure_filename

class Base(DeclarativeBase):
    pass

db = SQLAlchemy(model_class=Base)
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET")

# Database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///quiz.db")
app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
    "pool_recycle": 300,
    "pool_pre_ping": True,
}
db.init_app(app)

# File upload configuration
UPLOAD_FOLDER = 'temp_uploads'
ALLOWED_EXTENSIONS = {'pdf', 'txt', 'doc', 'docx'}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10MB max file size
CHUNK_SIZE = 1024 * 1024  # 1MB chunks

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

# OpenAI configuration
openai = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('quiz.html')

@app.route('/creator')
def creator():
    return render_template('creator.html')

@app.route('/stats')
def stats():
    return render_template('stats.html')

@app.route('/api/extract-pdf', methods=['POST'])
def extract_pdf():
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'Aucun fichier fourni'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'Aucun fichier sélectionné'}), 400

        if not allowed_file(file.filename):
            return jsonify({'error': 'Type de fichier non autorisé'}), 400

        # Check file size before processing
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)

        if size > MAX_CONTENT_LENGTH:
            return jsonify({'error': f'La taille du fichier dépasse la limite maximale de {MAX_CONTENT_LENGTH/1024/1024}MB'}), 413

        if file.filename.endswith('.pdf'):
            # Save PDF temporarily with unique filename
            filename = secure_filename(f"{datetime.now().timestamp()}_{file.filename}")
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)

            try:
                file.save(filepath)

                # Extract text from PDF with chunking
                text = ''
                with open(filepath, 'rb') as pdf_file:
                    pdf_reader = PyPDF2.PdfReader(pdf_file)
                    total_pages = len(pdf_reader.pages)

                    if total_pages > 50:  # Limit number of pages
                        return jsonify({'error': 'Le fichier PDF contient trop de pages (maximum 50)'}), 413

                    # Process pages in chunks
                    for page_num in range(total_pages):
                        try:
                            page = pdf_reader.pages[page_num]
                            chunk_text = page.extract_text()
                            if len(chunk_text) > CHUNK_SIZE:
                                return jsonify({'error': 'Le contenu de la page est trop volumineux'}), 413
                            text += chunk_text + "\n"
                        except Exception as e:
                            print(f"Erreur d'extraction de la page {page_num}: {str(e)}")
                            continue

            except Exception as e:
                return jsonify({'error': f'Erreur de traitement du PDF: {str(e)}'}), 500
            finally:
                # Clean up temporary file
                if os.path.exists(filepath):
                    os.remove(filepath)

            if not text.strip():
                return jsonify({'error': 'Impossible d\'extraire le texte du PDF'}), 422

            return jsonify({'content': text})
        else:
            # For text files, read directly
            content = file.read().decode('utf-8')
            if not content.strip():
                return jsonify({'error': 'Le fichier est vide'}), 422
            if len(content) > MAX_CONTENT_LENGTH:
                return jsonify({'error': f'Le contenu du fichier dépasse la limite maximale de {MAX_CONTENT_LENGTH/1024/1024}MB'}), 413
            return jsonify({'content': content})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    content = request.json.get('content')
    subject = request.json.get('subject')

    try:
        # Generate quiz using OpenAI
        response = openai.chat.completions.create(
            model="gpt-4o",  # Latest model as of May 2024
            messages=[{
                "role": "system",
                "content": "Generate a quiz with various question types (multiple choice, true/false, short answer) based on the following content. Return JSON format."
            }, {
                "role": "user",
                "content": f"Subject: {subject}\nContent: {content}"
            }],
            response_format={"type": "json_object"}
        )

        quiz_data = response.choices[0].message.content
        return jsonify({"questions": quiz_data})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

with app.app_context():
    from models import *
    db.create_all()