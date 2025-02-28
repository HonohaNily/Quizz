from app import db
from datetime import datetime

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Quiz(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(100))
    creator_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    questions = db.relationship('Question', backref='quiz', lazy=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    quiz_id = db.Column(db.Integer, db.ForeignKey('quiz.id'))
    type = db.Column(db.String(50), nullable=False)  # mcq, true_false, short_answer, etc.
    question = db.Column(db.Text, nullable=False)
    options = db.Column(db.JSON)  # For MCQ options
    correct_answer = db.Column(db.Text, nullable=False)
    time_limit = db.Column(db.Integer)  # In seconds, for timed questions

class Score(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100))  # Can be anonymous
    quiz_id = db.Column(db.Integer, db.ForeignKey('quiz.id'))
    score = db.Column(db.Float)
    max_score = db.Column(db.Float)
    completion_time = db.Column(db.Integer)  # In seconds
    date = db.Column(db.DateTime, default=datetime.utcnow)
