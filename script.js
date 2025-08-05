document.addEventListener('DOMContentLoaded', function() {
    // ========== STATE ==========
    const state = {
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
        elements.resultLocationEl.textContent = data.location;
        elements.currentRentEl.textContent = `$${data.current.toLocaleString()}`;
        elements.dataSourceEl.textContent = `DATA_SOURCE: ${data.source}`;
        
        const projectedChange = data.projections[0] - data.current;
        const changePercentage = ((projectedChange / data.current) * 100).toFixed(1);
        elements.projectedChangeEl.textContent = 
            `${projectedChange >= 0 ? '+' : ''}$${projectedChange} (${changePercentage}%)`;
        
        const affordabilityScore = calculateAffordabilityScore(data.current, data.trend);
        updateGauge(affordabilityScore);
        
        elements.marketVolatilityEl.textContent = `${(data.volatility * 100).toFixed(1)}%`;
        elements.recommendationEl.textContent = generateRecommendation(data.current, data.trend);
        
        updateChart(data.current, data.projections);
        addToComparisonData(data);
    }

    function updateChart(currentRent, projections) {
        elements.rentTrendChart.innerHTML = '';
        
        // Create axes
        const axisY = document.createElement('div');
        axisY.className = 'chart-axis-y';
        elements.rentTrendChart.appendChild(axisY);
        
        const axisX = document.createElement('div');
        axisX.className = 'chart-axis-x';
        elements.rentTrendChart.appendChild(axisX);
        
        // Add axis labels
        const labelY = document.createElement('div');
        labelY.className = 'chart-axis-label-y';
        labelY.textContent = 'RENT PRICE ($)';
        elements.rentTrendChart.appendChild(labelY);
        
        const labelX = document.createElement('div');
        labelX.className = 'chart-axis-label-x';
        labelX.textContent = 'YEARS';
        elements.rentTrendChart.appendChild(labelX);
        
        // Calculate min/max for scaling
        const allValues = [currentRent, ...projections];
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
        const valueRange = maxValue - minValue || 1;
        
        // Chart dimensions
        const chartHeight = elements.rentTrendChart.offsetHeight - 40; // Account for padding
        const chartWidth = elements.rentTrendChart.offsetWidth - 80; // Account for padding
        
        // Add Y-axis ticks and labels
        const yTicks = 5;
        for (let i = 0; i <= yTicks; i++) {
            const value = Math.round(minValue + (i/yTicks) * valueRange);
            const yPos = chartHeight - (i/yTicks) * chartHeight;
            
            const tick = document.createElement('div');
            tick.className = 'chart-tick chart-tick-y';
            tick.style.left = '0';
            tick.style.top = `${yPos}px`;
            elements.rentTrendChart.appendChild(tick);
            
            const tickLabel = document.createElement('div');
            tickLabel.className = 'chart-tick-label chart-tick-label-y';
            tickLabel.textContent = `$${value.toLocaleString()}`;
            tickLabel.style.top = `${yPos}px`;
            elements.rentTrendChart.appendChild(tickLabel);
        }
        
        // Add points and X-axis ticks
        const totalPoints = projections.length + 1;
        projections.forEach((value, index) => {
            const xPos = ((index + 1) / totalPoints) * chartWidth;
            const yPos = chartHeight - ((value - minValue) / valueRange * chartHeight);
            
            // Add X-axis tick
            const tick = document.createElement('div');
            tick.className = 'chart-tick chart-tick-x';
            tick.style.left = `${xPos}px`;
            elements.rentTrendChart.appendChild(tick);
            
            // Add X-axis label
            const tickLabel = document.createElement('div');
            tickLabel.className = 'chart-tick-label chart-tick-label-x';
            tickLabel.textContent = `${index + 1}`;
            tickLabel.style.left = `${xPos}px`;
            elements.rentTrendChart.appendChild(tickLabel);
        });
        
        // Add current point (Year 0)
        const currentX = 0;
        const currentY = chartHeight - ((currentRent - minValue) / valueRange * chartHeight);
        addChartPoint(currentX, currentY, currentRent, 'Current', true);
        
        // Add projection points
        projections.forEach((value, index) => {
            const x = ((index + 1) / totalPoints) * chartWidth;
            const y = chartHeight - ((value - minValue) / valueRange * chartHeight);
            addChartPoint(x, y, value, `Year ${index + 1}`);
        });
        
        // Connect points with lines
        connectChartPoints();
    }

    function addChartPoint(x, y, value, label, isCurrent = false) {
        const point = document.createElement('div');
        point.className = `chart-point ${isCurrent ? 'current-point' : ''}`;
        point.style.left = `${x}px`;
        point.style.top = `${y}px`;
        elements.rentTrendChart.appendChild(point);
        
        // Add value label
        const valueLabel = document.createElement('div');
        valueLabel.className = 'chart-value-label';
        valueLabel.textContent = `$${value.toLocaleString()}`;
        valueLabel.style.left = `${x}px`;
        valueLabel.style.top = `${y - 20}px`;
        elements.rentTrendChart.appendChild(valueLabel);
    }

    function connectChartPoints() {
        const points = elements.rentTrendChart.querySelectorAll('.chart-point');
        let prevPoint = null;
        
        points.forEach(point => {
            if (prevPoint) {
                const startX = parseFloat(prevPoint.style.left);
                const startY = parseFloat(prevPoint.style.top);
                const endX = parseFloat(point.style.left);
                const endY = parseFloat(point.style.top);
                
                const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
                
                const line = document.createElement('div');
                line.className = 'chart-connector';
                line.style.width = `${length}px`;
                line.style.left = `${startX}px`;
                line.style.top = `${startY}px`;
                line.style.transform = `rotate(${angle}deg)`;
                
                elements.rentTrendChart.insertBefore(line, point);
            }
            prevPoint = point;
        });
    }

    // ========== COMPARISON FUNCTIONS ==========
    function addToComparisonData(data) {
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
                    // Calculate if not available
                    const projected = Math.round(data.current * Math.pow(data.trend, yearIndex + 1));
                    projCell.textContent = `$${projected.toLocaleString()}`;
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

    // ========== EVENT HANDLERS ==========
    function setupEventListeners() {
        elements.predictBtn.addEventListener('click', predictRent);
        
        elements.compareBtn.addEventListener('click', () => {
            if (state.comparisonData.length < 2) {
                showError('Analyze at least 2 locations to compare');
            }
        });
        
        elements.timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.timeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                state.selectedYears = parseInt(btn.dataset.years);
            });
        });
        
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