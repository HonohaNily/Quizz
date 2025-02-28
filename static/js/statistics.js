class Statistics {
    constructor() {
        this.charts = {};
        this.initializeCharts();
        this.loadStatistics();
    }

    async loadStatistics() {
        try {
            const response = await fetch('/api/statistics');
            const data = await response.json();

            this.updateOverview(data.overview);
            this.updateCharts(data);
            this.updateHistory(data.history);
        } catch (error) {
            console.error('Error loading statistics:', error);
            // Afficher des données de démonstration en cas d'erreur
            this.showDemoData();
        }
    }

    showDemoData() {
        const demoData = {
            overview: {
                averageScore: 75,
                totalQuizzes: 5,
                averageTime: 300
            },
            performance: {
                dates: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
                scores: [65, 70, 75, 80, 85]
            },
            subjects: {
                scores: [80, 75, 85, 70, 90, 65]
            },
            questionTypes: {
                counts: [30, 25, 20, 15, 5, 5]
            }
        };

        this.updateOverview(demoData.overview);
        this.updateCharts(demoData);
    }

    initializeCharts() {
        // Performance over time chart
        this.charts.performance = new Chart(
            document.getElementById('performanceChart'),
            {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Score',
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1,
                        fill: true,
                        backgroundColor: 'rgba(75, 192, 192, 0.1)'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                display: false
                            },
                            grid: {
                                display: false
                            }
                        },
                        x: {
                            grid: {
                                display: false
                            }
                        }
                    }
                }
            }
        );

        // Subject performance chart
        this.charts.subjects = new Chart(
            document.getElementById('subjectChart'),
            {
                type: 'radar',
                data: {
                    labels: ['Mathématiques', 'Français', 'Histoire-Géo', 'Sciences', 'Physique-Chimie', 'Anglais'],
                    datasets: [{
                        label: 'Niveau de maîtrise',
                        data: [],
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        borderColor: 'rgb(75, 192, 192)',
                        pointBackgroundColor: 'rgb(75, 192, 192)'
                    }]
                },
                options: {
                    responsive: true,
                    scales: {
                        r: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                display: false
                            }
                        }
                    }
                }
            }
        );

        // Question types chart
        this.charts.questionTypes = new Chart(
            document.getElementById('questionTypeChart'),
            {
                type: 'doughnut',
                data: {
                    labels: ['QCM', 'Vrai/Faux', 'Réponse courte', 'Classement', 'Association', 'Chronométré'],
                    datasets: [{
                        data: [],
                        backgroundColor: [
                            '#FF6384',
                            '#36A2EB',
                            '#FFCE56',
                            '#4BC0C0',
                            '#9966FF',
                            '#FF9F40'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'right'
                        }
                    }
                }
            }
        );
    }

    updateOverview(overview) {
        document.getElementById('averageScore').textContent = `${Math.round(overview.averageScore)}%`;
        document.getElementById('completedQuizzes').textContent = overview.totalQuizzes;
        document.getElementById('averageTime').textContent = this.formatTime(overview.averageTime);
    }

    updateCharts(data) {
        // Update performance chart
        this.charts.performance.data.labels = data.performance.dates;
        this.charts.performance.data.datasets[0].data = data.performance.scores;
        this.charts.performance.update();

        // Update subjects chart
        this.charts.subjects.data.datasets[0].data = data.subjects.scores;
        this.charts.subjects.update();

        // Update question types chart
        this.charts.questionTypes.data.datasets[0].data = data.questionTypes.counts;
        this.charts.questionTypes.update();
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.statistics = new Statistics();
});

// Export function for PDF generation
async function exportQuizPDF(quizId) {
    try {
        const response = await fetch(`/api/quiz/${quizId}/pdf`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `quiz-${quizId}-results.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting PDF:', error);
    }
}