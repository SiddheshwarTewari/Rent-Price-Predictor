document.addEventListener('DOMContentLoaded', function() {
    // ========== STATE ==========
    const state = {
        currentView: 'simple',
        selectedYears: 1,
        comparisonData: [],
        lastUpdated: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    };

    // ========== DOM ELEMENTS ==========
    const elements = {
        locationInput: document.getElementById('location'),
        bedroomSelect: document.getElementById('bedrooms'),
        predictBtn: document.getElementById('predict-btn'),
        compareBtn: document.getElementById('compare-btn'),
        timeButtons: document.querySelectorAll('.time-btn'),
        techModeBtn: document.getElementById('tech-mode'),
        simpleModeBtn: document.getElementById('simple-mode'),
        currentRentEl: document.getElementById('current-rent'),
        projectedChangeEl: document.getElementById('projected-change'),
        affordabilityGauge: document.querySelector('.gauge-fill'),
        resultLocationEl: document.getElementById('result-location'),
        marketVolatilityEl: document.getElementById('market-volatility'),
        recommendationEl: document.getElementById('recommendation'),
        dataSourceEl: document.getElementById('data-source'),
        rentTrendChart: document.getElementById('rent-trend-chart'),
        comparisonTable: document.getElementById('comparison-data'),
        currentTimeEl: document.getElementById('current-time'),
        apiStatusEl: document.getElementById('api-status'),
        lastUpdatedEl: document.getElementById('last-updated'),
        tipsModal: document.getElementById('tips-modal'),
        tipsBtn: document.getElementById('tips-btn'),
        modalCloseBtn: document.querySelector('.modal-close')
    };

    // ========== INITIALIZATION ==========
    function init() {
        elements.lastUpdatedEl.textContent = state.lastUpdated;
        updateClock();
        setInterval(updateClock, 1000);
        checkApiStatus();
        setupEventListeners();
        
        // Start in simple mode by default
        switchToView('simple');
    }

    // ========== CORE FUNCTIONS ==========
    async function predictRent() {
        const location = elements.locationInput.value.trim();
        const bedrooms = elements.bedroomSelect.value;
        
        if (!location) {
            showError('Please enter a location');
            return;
        }
        
        try {
            showLoading(true);
            const rentData = await getRentData(location, bedrooms, state.selectedYears);
            displayResults(rentData);
            generateInsights(location);
        } catch (error) {
            console.error('Prediction error:', error);
            showError(error.message || 'Failed to generate prediction');
        } finally {
            showLoading(false);
        }
    }

    function getRentData(location, bedrooms, years) {
        return new Promise((resolve) => {
            // Simulate API delay
            setTimeout(() => {
                const baseData = getBaseRentData(location);
                const adjustedRent = adjustForBedrooms(baseData.medianRent, bedrooms);
                const projections = calculateProjections(adjustedRent, baseData.trend, years);
                
                resolve({
                    location: baseData.locationName,
                    current: adjustedRent,
                    trend: baseData.trend,
                    volatility: baseData.volatility,
                    projections,
                    source: 'Census+MarketAdj',
                    bedrooms
                });
            }, 800);
        });
    }

    function getBaseRentData(location) {
        const stateData = {
            'california': { medianRent: 2450, trend: 1.03, volatility: 0.08 },
            'new york': { medianRent: 2200, trend: 1.04, volatility: 0.07 },
            'texas': { medianRent: 1380, trend: 1.05, volatility: 0.09 },
            'florida': { medianRent: 1620, trend: 1.07, volatility: 0.10 },
            'illinois': { medianRent: 1550, trend: 1.04, volatility: 0.07 },
            'colorado': { medianRent: 1850, trend: 1.05, volatility: 0.08 },
            'washington': { medianRent: 1950, trend: 1.06, volatility: 0.09 },
            'default': { medianRent: 1500, trend: 1.04, volatility: 0.07 }
        };
        
        const normalizedLocation = location.toLowerCase();
        const data = stateData[normalizedLocation] || stateData.default;
        
        return {
            ...data,
            locationName: location.charAt(0).toUpperCase() + location.slice(1)
        };
    }

    function adjustForBedrooms(baseRent, bedrooms) {
        const adjustments = {
            'studio': 0.85,
            '1': 1.0,
            '2': 1.25,
            '3': 1.5,
            'house': 1.8
        };
        return Math.round(baseRent * (adjustments[bedrooms] || 1));
    }

    function calculateProjections(currentRent, trend, years) {
        const projections = [];
        for (let i = 1; i <= years; i++) {
            projections.push(Math.round(currentRent * Math.pow(trend, i)));
        }
        return projections;
    }

    // ========== DISPLAY FUNCTIONS ==========
    function displayResults(data) {
        // Basic info
        elements.resultLocationEl.textContent = data.location;
        elements.currentRentEl.textContent = `$${data.current.toLocaleString()}`;
        elements.dataSourceEl.textContent = `DATA_SOURCE: ${data.source}`;
        
        // Calculate metrics
        const projectedChange = data.projections[0] - data.current;
        const changePercentage = ((projectedChange / data.current) * 100).toFixed(1);
        elements.projectedChangeEl.textContent = 
            `${projectedChange >= 0 ? '+' : ''}$${projectedChange} (${changePercentage}%)`;
        
        // Affordability gauge
        const affordabilityScore = calculateAffordabilityScore(data.current, data.trend);
        updateGauge(affordabilityScore);
        
        // Market volatility
        elements.marketVolatilityEl.textContent = `${(data.volatility * 100).toFixed(1)}%`;
        
        // Recommendation
        elements.recommendationEl.textContent = generateRecommendation(data.current, data.trend);
        
        // Update chart
        updateChart(data.current, data.projections);
        
        // Add to comparison data
        addToComparisonData(data);
    }

    function updateChart(currentRent, projections) {
        // Clear previous chart
        elements.rentTrendChart.innerHTML = '';
        
        // Create chart line
        const chartLine = document.createElement('div');
        chartLine.className = 'chart-line';
        elements.rentTrendChart.appendChild(chartLine);
        
        // Calculate positions
        const allValues = [currentRent, ...projections];
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
        const range = maxValue - minValue || 1; // Avoid division by zero
        
        // Add current point
        addChartPoint(0, currentRent, 'Current', minValue, range, true);
        
        // Add projection points
        projections.forEach((value, index) => {
            addChartPoint(index + 1, value, `Year ${index + 1}`, minValue, range);
        });
        
        // Connect points with lines
        connectChartPoints();
    }

    function addChartPoint(xIndex, value, label, minValue, range, isCurrent = false) {
        const point = document.createElement('div');
        point.className = `chart-point ${isCurrent ? 'current-point' : ''}`;
        
        // Position calculation
        const xPos = (xIndex / (state.selectedYears)) * 90 + 5;
        const yPos = 100 - ((value - minValue) / range * 80);
        
        point.style.left = `${xPos}%`;
        point.style.bottom = `${yPos}%`;
        elements.rentTrendChart.appendChild(point);
        
        // Add label
        const labelEl = document.createElement('div');
        labelEl.className = 'chart-label';
        labelEl.textContent = `$${value.toLocaleString()}`;
        labelEl.style.left = `${xPos}%`;
        elements.rentTrendChart.appendChild(labelEl);
        
        return point;
    }

    function connectChartPoints() {
        const points = elements.rentTrendChart.querySelectorAll('.chart-point');
        
        for (let i = 0; i < points.length - 1; i++) {
            const start = points[i];
            const end = points[i + 1];
            
            const startX = parseFloat(start.style.left);
            const startY = 100 - parseFloat(start.style.bottom);
            const endX = parseFloat(end.style.left);
            const endY = 100 - parseFloat(end.style.bottom);
            
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            
            const line = document.createElement('div');
            line.className = 'chart-connector';
            line.style.width = `${length}%`;
            line.style.left = `${startX}%`;
            line.style.top = `${startY}%`;
            line.style.transform = `rotate(${angle}deg)`;
            
            elements.rentTrendChart.appendChild(line);
        }
    }

    function updateGauge(score) {
        elements.affordabilityGauge.style.width = `${score}%`;
        
        // Change color based on score
        if (score > 70) {
            elements.affordabilityGauge.style.background = 
                'linear-gradient(90deg, var(--neon-pink), var(--neon-purple))';
        } else if (score > 30) {
            elements.affordabilityGauge.style.background = 
                'linear-gradient(90deg, var(--neon-yellow), var(--neon-pink))';
        } else {
            elements.affordabilityGauge.style.background = 
                'linear-gradient(90deg, var(--neon-green), var(--neon-blue))';
        }
    }

    function generateInsights(location) {
        // Simulate AI-generated insights
        setTimeout(() => {
            document.getElementById('employment-insight').innerHTML = `
                <h3>EMPLOYMENT TRENDS</h3>
                <p>Tech sector growth driving demand in ${location}. Unemployment at 3.8%, below national average.</p>
            `;
            
            document.getElementById('migration-insight').innerHTML = `
                <h3>POPULATION FLOW</h3>
                <p>Net migration +2.4% last year. Primary sources: ${getRandomCities(3)}.</p>
            `;
            
            document.getElementById('construction-insight').innerHTML = `
                <h3>HOUSING SUPPLY</h3>
                <p>Only 1.2 months of inventory available. ${getRandomConstructionStats()}.</p>
            `;
        }, 1000);
    }

    // ========== COMPARISON FUNCTIONS ==========
    function addToComparisonData(data) {
        // Check if location already exists
        const existingIndex = state.comparisonData.findIndex(item => 
            item.location.toLowerCase() === data.location.toLowerCase()
        );
        
        if (existingIndex >= 0) {
            state.comparisonData[existingIndex] = data;
        } else {
            state.comparisonData.push(data);
        }
        
        updateComparisonTable();
    }

    function updateComparisonTable() {
        elements.comparisonTable.innerHTML = '';
        
        state.comparisonData.forEach(data => {
            const row = document.createElement('tr');
            
            // Location cell
            const locationCell = document.createElement('td');
            locationCell.textContent = data.location;
            row.appendChild(locationCell);
            
            // Current rent cell
            const currentCell = document.createElement('td');
            currentCell.textContent = `$${data.current.toLocaleString()}`;
            row.appendChild(currentCell);
            
            // Projection cells (1YR, 3YR, 5YR)
            [0, 2, 4].forEach(yearIndex => {
                const projCell = document.createElement('td');
                if (data.projections.length > yearIndex) {
                    projCell.textContent = `$${data.projections[yearIndex].toLocaleString()}`;
                } else {
                    projCell.textContent = '--';
                }
                row.appendChild(projCell);
            });
            
            elements.comparisonTable.appendChild(row);
        });
    }

    // ========== UTILITY FUNCTIONS ==========
    function calculateAffordabilityScore(rent, trend) {
        const baseScore = Math.min(100, Math.max(0, (rent - 800) / 20));
        const trendImpact = (trend - 1) * 500;
        return Math.min(100, Math.max(0, baseScore + trendImpact));
    }

    function generateRecommendation(rent, trend) {
        if (rent > 2500 && trend > 1.05) return 'HIGH RISK - Consider alternative markets';
        if (rent > 2000 || trend > 1.04) return 'MODERATE RISK - Monitor market closely';
        return 'FAVORABLE - Good investment potential';
    }

    function checkApiStatus() {
        setTimeout(() => {
            elements.apiStatusEl.textContent = 'CENSUS_API: ONLINE';
            elements.apiStatusEl.classList.add('active');
        }, 1500);
    }

    function updateClock() {
        const now = new Date();
        elements.currentTimeEl.textContent = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function showLoading(show) {
        // Implement loading indicator if needed
    }

    function showError(message) {
        const errorEl = document.createElement('div');
        errorEl.className = 'cyber-alert';
        errorEl.innerHTML = `
            <div class="cyber-alert-content">
                <span class="alert-icon">⚠️</span>
                <span class="alert-text">${message}</span>
            </div>
        `;
        document.body.appendChild(errorEl);
        
        setTimeout(() => {
            errorEl.classList.add('fade-out');
            setTimeout(() => errorEl.remove(), 500);
        }, 5000);
    }

    function getRandomCities(count) {
        const cities = ['New York', 'Chicago', 'Los Angeles', 'Houston', 'Miami', 
                       'San Francisco', 'Seattle', 'Boston', 'Atlanta', 'Denver'];
        return shuffleArray(cities).slice(0, count).join(', ');
    }

    function getRandomConstructionStats() {
        const stats = [
            'Permits down 12% year-over-year',
            'High-rise construction up 18%',
            'Single-family permits at 10-year low',
            'Zoning changes expected to increase supply'
        ];
        return stats[Math.floor(Math.random() * stats.length)];
    }

    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    function switchToView(view) {
        state.currentView = view;
        document.body.classList.toggle('tech-mode', view === 'technical');
        elements.techModeBtn.classList.toggle('active', view === 'technical');
        elements.simpleModeBtn.classList.toggle('active', view === 'simple');
    }

    // ========== EVENT HANDLERS ==========
    function setupEventListeners() {
        // Main prediction button
        elements.predictBtn.addEventListener('click', predictRent);
        
        // Compare button
        elements.compareBtn.addEventListener('click', () => {
            if (state.comparisonData.length < 2) {
                showError('Analyze at least 2 locations to compare');
            }
        });
        
        // Time range buttons
        elements.timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.timeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.selectedYears = parseInt(btn.dataset.years);
            });
        });
        
        // Mode switchers
        elements.techModeBtn.addEventListener('click', () => switchToView('technical'));
        elements.simpleModeBtn.addEventListener('click', () => switchToView('simple'));
        
        // Tips modal
        elements.tipsBtn.addEventListener('click', () => {
            elements.tipsModal.classList.add('active');
        });
        
        elements.modalCloseBtn.addEventListener('click', () => {
            elements.tipsModal.classList.remove('active');
        });
        
        elements.tipsModal.addEventListener('click', (e) => {
            if (e.target === elements.tipsModal) {
                elements.tipsModal.classList.remove('active');
            }
        });
    }

    // ========== INITIALIZE APP ==========
    init();
});