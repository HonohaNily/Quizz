class QuizCreator {
    constructor() {
        this.questions = [];
        this.currentMode = 'ai';
        this.currentFile = null;
        this.maxFileSize = 10 * 1024 * 1024; // 10MB
        this.maxPages = 50;

        // Bind event listeners
        this.bindEvents();
        this.initializeFormHandlers();
        this.initializeDropZone();
    }

    bindEvents() {
        // Mode selection
        document.querySelectorAll('input[name="generationMode"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.switchMode(e.target.value));
        });

        // Button actions
        document.getElementById('generateQuiz').addEventListener('click', () => this.generateAIQuiz());
        document.getElementById('addQuestion').addEventListener('click', () => this.addQuestion());
        document.getElementById('previewQuiz').addEventListener('click', () => this.previewQuiz());
        document.getElementById('saveQuiz').addEventListener('click', () => this.saveQuiz());

        // Question type change
        document.getElementById('questionType').addEventListener('change', (e) => {
            this.updateQuestionForm(e.target.value);
        });
    }

    switchMode(mode) {
        this.currentMode = mode;
        document.getElementById('aiSection').style.display = mode === 'ai' ? 'block' : 'none';
        document.getElementById('manualSection').style.display = mode === 'manual' ? 'block' : 'none';
    }

    async generateAIQuiz() {
        const content = document.getElementById('contentInput').value;
        const subject = document.getElementById('quizSubject').value;

        if (!content) {
            alert('Veuillez fournir du contenu pour générer le quiz');
            return;
        }

        try {
            const response = await fetch('/api/generate-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, subject })
            });

            const quiz = await response.json();
            this.questions = quiz.questions;
            this.previewQuiz();
        } catch (error) {
            console.error('Error generating quiz:', error);
            alert('Erreur lors de la génération du quiz');
        }
    }

    addQuestion() {
        const type = document.getElementById('questionType').value;
        const questionTemplate = this.createQuestionTemplate(type);

        const questionDiv = document.createElement('div');
        questionDiv.className = 'card mb-3';
        questionDiv.innerHTML = questionTemplate;

        document.getElementById('questionsList').appendChild(questionDiv);

        // Setup handlers for the new question
        this.setupQuestionHandlers(questionDiv);
    }

    createQuestionTemplate(type) {
        let template = `
            <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <h5 class="card-title">Question ${this.questions.length + 1}</h5>
                    <button class="btn btn-danger btn-sm delete-question">×</button>
                </div>
                <div class="mb-3">
                    <input type="text" class="form-control question-text" placeholder="Texte de la question">
                </div>
        `;

        switch (type) {
            case 'mcq':
                template += `
                    <div class="options-container">
                        <div class="mb-2">
                            <input type="text" class="form-control option-text" placeholder="Option 1">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" value="0">
                                <label class="form-check-label">Correct</label>
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm add-option">+ Ajouter une option</button>
                `;
                break;

            case 'true_false':
                template += `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="correct${this.questions.length}" value="true">
                        <label class="form-check-label">Vrai</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" name="correct${this.questions.length}" value="false">
                        <label class="form-check-label">Faux</label>
                    </div>
                `;
                break;

            case 'short_answer':
                template += `
                    <div class="mb-3">
                        <input type="text" class="form-control correct-answer" placeholder="Réponse correcte">
                    </div>
                `;
                break;

            case 'ordering':
                template += `
                    <div class="items-container">
                        <div class="mb-2">
                            <input type="text" class="form-control item-text" placeholder="Élément 1">
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm add-item">+ Ajouter un élément</button>
                `;
                break;

            case 'matching':
                template += `
                    <div class="pairs-container">
                        <div class="row mb-2">
                            <div class="col">
                                <input type="text" class="form-control left-item" placeholder="Élément gauche">
                            </div>
                            <div class="col">
                                <input type="text" class="form-control right-item" placeholder="Élément droit">
                            </div>
                        </div>
                    </div>
                    <button class="btn btn-secondary btn-sm add-pair">+ Ajouter une paire</button>
                `;
                break;

            case 'timed':
                template += `
                    <div class="mb-3">
                        <input type="number" class="form-control time-limit" placeholder="Temps limite (secondes)">
                    </div>
                    <div class="mb-3">
                        <input type="text" class="form-control correct-answer" placeholder="Réponse correcte">
                    </div>
                `;
                break;
        }

        template += `</div>`;
        return template;
    }

    setupQuestionHandlers(questionDiv) {
        // Delete question
        questionDiv.querySelector('.delete-question').addEventListener('click', () => {
            questionDiv.remove();
        });

        // Add option for MCQ
        const addOptionBtn = questionDiv.querySelector('.add-option');
        if (addOptionBtn) {
            addOptionBtn.addEventListener('click', () => {
                const optionsContainer = questionDiv.querySelector('.options-container');
                const newOption = document.createElement('div');
                newOption.className = 'mb-2';
                newOption.innerHTML = `
                    <input type="text" class="form-control option-text" placeholder="Nouvelle option">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="${optionsContainer.children.length}">
                        <label class="form-check-label">Correct</label>
                    </div>
                `;
                optionsContainer.appendChild(newOption);
            });
        }

        // Add item for ordering
        const addItemBtn = questionDiv.querySelector('.add-item');
        if (addItemBtn) {
            addItemBtn.addEventListener('click', () => {
                const itemsContainer = questionDiv.querySelector('.items-container');
                const newItem = document.createElement('div');
                newItem.className = 'mb-2';
                newItem.innerHTML = `
                    <input type="text" class="form-control item-text" placeholder="Nouvel élément">
                `;
                itemsContainer.appendChild(newItem);
            });
        }

        // Add pair for matching
        const addPairBtn = questionDiv.querySelector('.add-pair');
        if (addPairBtn) {
            addPairBtn.addEventListener('click', () => {
                const pairsContainer = questionDiv.querySelector('.pairs-container');
                const newPair = document.createElement('div');
                newPair.className = 'row mb-2';
                newPair.innerHTML = `
                    <div class="col">
                        <input type="text" class="form-control left-item" placeholder="Élément gauche">
                    </div>
                    <div class="col">
                        <input type="text" class="form-control right-item" placeholder="Élément droit">
                    </div>
                `;
                pairsContainer.appendChild(newPair);
            });
        }
    }

    previewQuiz() {
        const modal = new bootstrap.Modal(document.getElementById('previewModal'));
        const previewContent = document.getElementById('previewContent');

        let preview = '<div class="quiz-preview">';
        this.questions.forEach((question, index) => {
            preview += this.renderQuestionPreview(question, index);
        });
        preview += '</div>';

        previewContent.innerHTML = preview;
        modal.show();
    }

    renderQuestionPreview(question, index) {
        let html = `
            <div class="card mb-3">
                <div class="card-body">
                    <h5>Question ${index + 1}</h5>
                    <p>${question.question}</p>
        `;

        switch (question.type) {
            case 'mcq':
                html += question.options.map((option, i) => `
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" disabled>
                        <label class="form-check-label">${option}</label>
                    </div>
                `).join('');
                break;

            case 'true_false':
                html += `
                    <div class="form-check">
                        <input class="form-check-input" type="radio" disabled>
                        <label class="form-check-label">Vrai</label>
                    </div>
                    <div class="form-check">
                        <input class="form-check-input" type="radio" disabled>
                        <label class="form-check-label">Faux</label>
                    </div>
                `;
                break;

            // Add other question type previews here
        }

        html += `</div></div>`;
        return html;
    }

    async saveQuiz() {
        const title = document.getElementById('quizTitle').value;
        const subject = document.getElementById('quizSubject').value;

        if (!title) {
            alert('Veuillez donner un titre au quiz');
            return;
        }

        const quiz = {
            title,
            subject,
            questions: this.questions
        };

        try {
            const response = await fetch('/api/save-quiz', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quiz)
            });

            if (response.ok) {
                alert('Quiz enregistré avec succès !');
                window.location.href = '/';
            } else {
                throw new Error('Erreur lors de l\'enregistrement');
            }
        } catch (error) {
            console.error('Error saving quiz:', error);
            alert('Erreur lors de l\'enregistrement du quiz');
        }
    }

    initializeFormHandlers() {
        // Add any additional form initialization here
    }

    initializeDropZone() {
        const dropZone = document.getElementById('dropZone');
        const fileInput = document.getElementById('fileInput');
        const filePreview = document.getElementById('filePreview');
        const removeFile = document.getElementById('removeFile');

        // Click to select file
        dropZone.addEventListener('click', () => fileInput.click());

        // File input change
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFiles(e.target.files);
            }
        });

        // Drag and drop events
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });

        // Remove file
        removeFile.addEventListener('click', () => {
            this.currentFile = null;
            fileInput.value = '';
            filePreview.classList.add('d-none');
            document.getElementById('contentInput').value = '';
        });
    }

    async handleFiles(files) {
        const file = files[0];
        if (!file) return;

        // Check file size first
        if (file.size > this.maxFileSize) {
            alert(`Le fichier est trop volumineux. La taille maximale est de 10MB.`);
            return;
        }

        const filePreview = document.getElementById('filePreview');
        const previewName = filePreview.querySelector('.file-preview-name');
        const previewSize = filePreview.querySelector('.file-preview-size');
        const progressBar = document.getElementById('uploadProgress');
        const progressBarInner = progressBar.querySelector('.progress-bar');
        const progressText = progressBar.querySelector('.progress-text');
        const uploadStatus = document.getElementById('uploadStatus');
        const statusText = uploadStatus.querySelector('.status-text');
        let abortController = new AbortController();

        // Show progress bar and status
        progressBar.classList.remove('d-none');
        uploadStatus.classList.remove('d-none');
        uploadStatus.classList.add('alert-info');
        progressBarInner.style.width = '0%';
        progressText.textContent = 'Préparation...';

        // Setup cancel button
        const cancelButton = progressBar.querySelector('.cancel-upload');
        cancelButton.onclick = () => {
            abortController.abort();
            progressBar.classList.add('d-none');
            uploadStatus.classList.add('d-none');
            this.currentFile = null;
            document.getElementById('fileInput').value = '';
        };

        // Update preview
        previewName.textContent = file.name;
        previewSize.textContent = this.formatFileSize(file.size);
        filePreview.classList.add('d-none');

        this.currentFile = file;

        try {
            // Initial status
            statusText.textContent = 'Analyse du fichier...';
            let progress = 0;
            const updateProgress = setInterval(() => {
                if (progress < 20) {
                    progress += 2;
                    progressBarInner.style.width = `${progress}%`;
                }
            }, 100);

            // Prepare FormData
            const formData = new FormData();
            formData.append('file', file);

            // Send file to server with progress tracking and timeout
            const timeoutDuration = 60000; // 1 minute timeout
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), timeoutDuration);

            try {
                const response = await fetch('/api/extract-pdf', {
                    method: 'POST',
                    body: formData,
                    signal: controller.signal
                });

                clearTimeout(timeout);
                clearInterval(updateProgress);

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.error || 'Erreur lors de l\'extraction du fichier');
                }

                progressBarInner.style.width = '60%';
                statusText.textContent = 'Extraction du texte...';

                const data = await response.json();

                // Update content
                document.getElementById('contentInput').value = data.content;

                // Complete progress
                progressBarInner.style.width = '100%';
                progressText.textContent = 'Terminé !';
                uploadStatus.classList.remove('alert-info');
                uploadStatus.classList.add('alert-success');
                statusText.textContent = 'Fichier traité avec succès !';

                // Show preview after short delay
                setTimeout(() => {
                    progressBar.classList.add('d-none');
                    uploadStatus.classList.add('d-none');
                    filePreview.classList.remove('d-none');
                }, 1000);

            } catch (error) {
                if (error.name === 'AbortError') {
                    throw new Error('Le traitement a pris trop de temps');
                }
                throw error;
            }

        } catch (error) {
            console.error('Error reading file:', error);

            if (error.message === 'Le traitement a pris trop de temps') {
                statusText.textContent = 'Le fichier est trop volumineux ou complexe à traiter';
                uploadStatus.classList.remove('alert-info');
                uploadStatus.classList.add('alert-warning');
            } else {
                progressBarInner.classList.remove('bg-primary');
                progressBarInner.classList.add('bg-danger');
                progressText.textContent = 'Erreur';
                uploadStatus.classList.remove('alert-info');
                uploadStatus.classList.add('alert-danger');
                statusText.textContent = error.message || 'Erreur lors du traitement du fichier';
            }

            // Reset after error
            setTimeout(() => {
                progressBar.classList.add('d-none');
                uploadStatus.classList.add('d-none');
                this.currentFile = null;
                document.getElementById('fileInput').value = '';
            }, 3000);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    async readFileContent(file) {
        if (file.type === 'application/pdf') {
            // Handle PDF files
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/extract-pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erreur lors de l\'extraction du PDF');
            }

            const data = await response.json();
            return data.content;
        } else {
            // Handle text files
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = (e) => reject(new Error('Erreur de lecture du fichier'));
                reader.readAsText(file);
            });
        }
    }
}

// Initialize creator when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.quizCreator = new QuizCreator();
});