class Quiz {
    constructor() {
        this.questions = [];
        this.currentIndex = 0;
        this.score = 0;
        this.timer = null;
        this.timeLeft = 0;
        this.mode = 'practice';
        this.userAnswers = new Map();
        
        // DOM Elements
        this.settingsEl = document.getElementById('quiz-settings');
        this.contentEl = document.getElementById('quiz-content');
        this.resultsEl = document.getElementById('quiz-results');
        this.questionEl = document.getElementById('questionContent');
        this.answerEl = document.getElementById('answerArea');
        this.timerEl = document.getElementById('timer');
        this.progressBar = document.querySelector('.progress-bar');
        
        // Bind event listeners
        document.getElementById('startQuiz').addEventListener('click', () => this.start());
        document.getElementById('prevQuestion').addEventListener('click', () => this.previousQuestion());
        document.getElementById('nextQuestion').addEventListener('click', () => this.nextQuestion());
        document.getElementById('retryQuiz').addEventListener('click', () => this.retry());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportResults());
    }

    async start() {
        this.mode = document.getElementById('gameMode').value;
        const subject = document.getElementById('subject').value;
        
        try {
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject })
            });
            
            this.questions = await response.json();
            this.currentIndex = 0;
            this.score = 0;
            this.userAnswers.clear();
            
            this.settingsEl.style.display = 'none';
            this.contentEl.style.display = 'block';
            this.resultsEl.style.display = 'none';
            
            this.displayQuestion();
            
            if (this.mode === 'timed') {
                this.startTimer();
            }
        } catch (error) {
            console.error('Failed to start quiz:', error);
        }
    }

    displayQuestion() {
        const question = this.questions[this.currentIndex];
        this.progressBar.style.width = `${(this.currentIndex + 1) * 100 / this.questions.length}%`;
        
        let html = `<h5>${question.question}</h5>`;
        
        switch (question.type) {
            case 'mcq':
                html += this.renderMCQ(question);
                break;
            case 'true_false':
                html += this.renderTrueFalse(question);
                break;
            case 'short_answer':
                html += this.renderShortAnswer(question);
                break;
            case 'ordering':
                html += this.renderOrdering(question);
                break;
            case 'matching':
                html += this.renderMatching(question);
                break;
        }
        
        this.questionEl.innerHTML = html;
        this.setupAnswerHandlers();
    }

    renderMCQ(question) {
        return question.options.map((option, index) => `
            <div class="form-check mb-2">
                <input class="form-check-input" type="checkbox" id="option${index}" 
                    value="${index}" ${this.userAnswers.get(this.currentIndex)?.includes(index) ? 'checked' : ''}>
                <label class="form-check-label" for="option${index}">${option}</label>
            </div>
        `).join('');
    }

    renderTrueFalse(question) {
        return `
            <div class="btn-group w-100">
                <button class="btn btn-outline-primary ${this.userAnswers.get(this.currentIndex) === true ? 'active' : ''}" 
                    data-answer="true">Vrai</button>
                <button class="btn btn-outline-primary ${this.userAnswers.get(this.currentIndex) === false ? 'active' : ''}" 
                    data-answer="false">Faux</button>
            </div>
        `;
    }

    renderShortAnswer(question) {
        return `
            <input type="text" class="form-control" placeholder="Votre réponse"
                value="${this.userAnswers.get(this.currentIndex) || ''}">
        `;
    }

    renderOrdering(question) {
        const items = question.items || [];
        return `
            <div class="list-group sortable">
                ${items.map((item, index) => `
                    <div class="list-group-item" draggable="true" data-index="${index}">
                        ${item}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderMatching(question) {
        const pairs = question.pairs || [];
        return `
            <div class="row">
                <div class="col-6">
                    ${pairs.map((pair, index) => `
                        <div class="card mb-2">
                            <div class="card-body" data-left="${index}">${pair.left}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="col-6">
                    ${pairs.map((pair, index) => `
                        <div class="card mb-2">
                            <div class="card-body" data-right="${index}">${pair.right}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    setupAnswerHandlers() {
        const question = this.questions[this.currentIndex];
        
        switch (question.type) {
            case 'mcq':
                this.answerEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    input.addEventListener('change', () => this.saveAnswer());
                });
                break;
            case 'true_false':
                this.answerEl.querySelectorAll('[data-answer]').forEach(btn => {
                    btn.addEventListener('click', () => this.saveAnswer(btn.dataset.answer === 'true'));
                });
                break;
            case 'short_answer':
                const input = this.answerEl.querySelector('input');
                input.addEventListener('input', () => this.saveAnswer(input.value));
                break;
            case 'ordering':
                this.setupDragAndDrop();
                break;
            case 'matching':
                this.setupMatchingHandlers();
                break;
        }
    }

    saveAnswer(answer) {
        this.userAnswers.set(this.currentIndex, answer);
    }

    nextQuestion() {
        if (this.currentIndex < this.questions.length - 1) {
            this.currentIndex++;
            this.displayQuestion();
        } else {
            this.showResults();
        }
    }

    previousQuestion() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.displayQuestion();
        }
    }

    startTimer() {
        this.timeLeft = 60; // 60 seconds per question
        this.updateTimer();
        
        this.timer = setInterval(() => {
            this.timeLeft--;
            this.updateTimer();
            
            if (this.timeLeft <= 0) {
                this.nextQuestion();
            }
        }, 1000);
    }

    updateTimer() {
        if (this.timerEl) {
            const minutes = Math.floor(this.timeLeft / 60);
            const seconds = this.timeLeft % 60;
            this.timerEl.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    async showResults() {
        clearInterval(this.timer);
        
        this.contentEl.style.display = 'none';
        this.resultsEl.style.display = 'block';
        
        const score = this.calculateScore();
        document.getElementById('finalScore').textContent = `${Math.round(score * 100)}%`;
        
        // Save score
        await fetch('/api/save-score', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                quiz_id: 1, // Replace with actual quiz ID
                score: score * 100,
                max_score: 100,
                completion_time: 0 // Add actual completion time
            })
        });
    }

    calculateScore() {
        let correct = 0;
        this.questions.forEach((question, index) => {
            const userAnswer = this.userAnswers.get(index);
            if (this.isCorrectAnswer(question, userAnswer)) {
                correct++;
            }
        });
        return correct / this.questions.length;
    }

    isCorrectAnswer(question, userAnswer) {
        switch (question.type) {
            case 'mcq':
                return JSON.stringify(userAnswer.sort()) === JSON.stringify(question.correct_answers.sort());
            case 'true_false':
                return userAnswer === question.correct_answer;
            case 'short_answer':
                return userAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
            case 'ordering':
                return JSON.stringify(userAnswer) === JSON.stringify(question.correct_order);
            case 'matching':
                return JSON.stringify(userAnswer) === JSON.stringify(question.correct_pairs);
            default:
                return false;
        }
    }

    exportResults() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.text('Résultats du Quiz', 20, 20);
        doc.text(`Score final: ${Math.round(this.calculateScore() * 100)}%`, 20, 30);
        
        this.questions.forEach((question, index) => {
            const y = 40 + (index * 10);
            const userAnswer = this.userAnswers.get(index);
            const isCorrect = this.isCorrectAnswer(question, userAnswer);
            
            doc.text(`Q${index + 1}: ${isCorrect ? '✓' : '✗'}`, 20, y);
        });
        
        doc.save('resultats-quiz.pdf');
    }

    retry() {
        this.start();
    }
}

// Initialize quiz when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.quiz = new Quiz();
});
