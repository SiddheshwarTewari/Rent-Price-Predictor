document.addEventListener('DOMContentLoaded', function() {
    // ========== CONSTANTS ==========
    const CENSUS_API_KEY = '5ababc1dc641315e24f27d9eb0de6713ea365673';
    const LAST_UPDATED = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    
    // ========== STATE ==========
    let currentView = 'simple'; // 'simple' or 'technical'
    let selectedYears = 1;
    let comparisonLocations = [];
    
    // ========== DOM ELEMENTS ==========
    // Input Elements
    const locationInput = document.getElementById('location');
    const bedroomSelect = document.getElementById('bedrooms');
    const predictBtn = document.getElementById('predict-btn');
    const compareBtn = document.getElementById('compare-btn');
    const timeButtons = document.querySelectorAll('.time-btn');
    
    // Mode Switchers
    const techModeBtn = document.getElementById('tech-mode');
    const simpleModeBtn = document.getElementById('simple-mode');
    
    // Result Elements
    const currentRentEl = document.getElementById('current-rent');
    const projectedChangeEl = document.getElementById('projected-change');
    const affordabilityGauge = document.getElementById('affordability-gauge');
    const resultLocationEl = document.getElementById('result-location');
    const marketVolatilityEl = document.getElementById('market-volatility');
    const recommendationEl = document.getElementById('recommendation');
    const dataSourceEl = document.getElementById('data-source');
    
    // Chart Elements
    const rentTrendChart = document.getElementById('rent-trend-chart');
    
    // Comparison Elements
    const comparisonTable = document.querySelector('.comparison-table');
    
    // System Elements
    const currentTimeEl = document.getElementById('current-time');
    const apiStatusEl = document.getElementById('api-status');
    const lastUpdatedEl = document.getElementById('last-updated');
    
    // Modal Elements
    const tipsModal = document.getElementById('tips-modal');
    const tipsBtn = document.getElementById('tips-btn');
    const modalCloseBtn = document.querySelector('.modal-close');
    
    // ========== INITIALIZATION ==========
    function init() {
        // Set last updated date
        lastUpdatedEl.textContent = LAST_UPDATED;
        
        // Start clock
        updateClock();
        setInterval(updateClock, 1000);
        
        // Check API status
        checkApiStatus();
        
        // Set up event listeners
        setupEventListeners();
    }
    
    // ========== CORE FUNCTIONS ==========
    async function predictRent() {
        const location = locationInput.value.trim();
        const bedrooms = bedroomSelect.value;
        
        if (!location) {
            showError('Please enter a location');
            return;
        }
        
        try {
            // Show loading state
            showLoading(true);
            
            // Get rent data
            const rentData = await getRentData(location, bedrooms);
            
            // Display results
            displayResults(rentData);
            
            // Generate insights
            generateInsights(location);
            
        } catch (error) {
            console.error('Prediction error:', error);
            showError(error.message || 'Failed to generate prediction');
        } finally {
            showLoading(false);
        }
    }
    
    async function getRentData(location, bedrooms) {
        // In a real app, this would call your API
        // Here we simulate with realistic data
        
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Get base data based on location
        const baseData = getBaseRentData(location);
        
        // Adjust for bedroom type
        const adjustedRent = adjustForBedrooms(baseData.medianRent, bedrooms);
        
        // Calculate projections
        const projections = calculateProjections(adjustedRent, baseData.trend, selectedYears);
        
        return {
            location: baseData.locationName,
            current: adjustedRent,
            trend: baseData.trend,
            volatility: baseData.volatility,
            projections,
            source: 'Census+MarketAdj'
        };
    }
    
    function getBaseRentData(location) {
        // This would normally come from API
        // Using hardcoded data for demonstration
        
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
            const projection = Math.round(currentRent * Math.pow(trend, i));
            projections.push(projection);
        }
        return projections;
    }
    
    // ========== DISPLAY FUNCTIONS ==========
    function displayResults(data) {
        // Basic info
        resultLocationEl.textContent = data.location;
        currentRentEl.textContent = `$${data.current.toLocaleString()}`;
        dataSourceEl.textContent = `DATA_SOURCE: ${data.source}`;
        
        // Calculate metrics
        const projectedChange = Math.round(data.projections[0] - data.current);
        const changePercentage = ((projectedChange / data.current) * 100).toFixed(1);
        
        projectedChangeEl.textContent = `${projectedChange >= 0 ? '+' : ''}${projectedChange} (${changePercentage}%)`;
        
        // Affordability gauge (0-100)
        const affordabilityScore = calculateAffordabilityScore(data.current, data.trend);
        updateGauge(affordabilityScore);
        
        // Market volatility
        marketVolatilityEl.textContent = `${(data.volatility * 100).toFixed(1)}%`;
        
        // Recommendation
        recommendationEl.textContent = generateRecommendation(data.current, data.trend);
        
        // Update chart
        updateChart(data.current, data.projections);
        
        // Show technical details if in tech mode
        if (currentView === 'technical') {
            showTechnicalDetails(data);
        }
    }
    
    function updateGauge(score) {
        const gaugeFill = document.querySelector('.gauge-fill');
        gaugeFill.style.width = `${score}%`;
        
        // Change color based on score
        if (score > 70) {
            gaugeFill.style.background = 'linear-gradient(90deg, var(--neon-pink), var(--neon-purple))';
        } else if (score > 30) {
            gaugeFill.style.background = 'linear-gradient(90deg, var(--neon-yellow), var(--neon-pink))';
        } else {
            gaugeFill.style.background = 'linear-gradient(90deg, var(--neon-green), var(--neon-blue))';
        }
    }
    
    function updateChart(currentRent, projections) {
        // Clear previous chart
        rentTrendChart.innerHTML = '';
        
        // Create new chart elements
        const chartLine = document.createElement('div');
        chartLine.className = 'chart-line';
        rentTrendChart.appendChild(chartLine);
        
        const chartPoints = document.createElement('div');
        chartPoints.className = 'chart-points';
        rentTrendChart.appendChild(chartPoints);
        
        const chartLabels = document.createElement('div');
        chartLabels.className = 'chart-labels';
        rentTrendChart.appendChild(chartLabels);
        
        // Calculate points
        const allValues = [currentRent, ...projections];
        const maxValue = Math.max(...allValues);
        const minValue = Math.min(...allValues);
        const valueRange = maxValue - minValue;
        
        // Add current point
        addChartPoint(chartPoints, chartLabels, 0, currentRent, 'Current', minValue, valueRange);
        
        // Add projection points
        projections.forEach((value, index) => {
            addChartPoint(chartPoints, chartLabels, index + 1, value, `Year ${index + 1}`, minValue, valueRange);
        });
        
        // Connect points with lines
        drawChartLines(chartPoints);
    }
    
    function addChartPoint(container, labelsContainer, xPos, value, label, minValue, valueRange) {
        const point = document.createElement('div');
        point.className = 'chart-point';
        
        // Position calculation
        const yPos = 100 - ((value - minValue) / valueRange * 80);
        
        point.style.left = `${(xPos / (projections.length + 1)) * 90 + 5}%`;
        point.style.bottom = `${yPos}%`;
        
        // Add glow effect for current value
        if (xPos === 0) {
            point.classList.add('current-point');
        }
        
        container.appendChild(point);
        
        // Add label
        const labelEl = document.createElement('div');
        labelEl.className = 'chart-label';
        labelEl.textContent = `$${value.toLocaleString()}`;
        labelEl.style.left = `${(xPos / (projections.length + 1)) * 90 + 5}%`;
        labelsContainer.appendChild(labelEl);
    }
    
    function drawChartLines(pointsContainer) {
        const points = pointsContainer.querySelectorAll('.chart-point');
        
        for (let i = 0; i < points.length - 1; i++) {
            const line = document.createElement('div');
            line.className = 'chart-connector';
            
            const startPoint = points[i];
            const endPoint = points[i + 1];
            
            const startX = parseFloat(startPoint.style.left);
            const startY = 100 - parseFloat(startPoint.style.bottom);
            const endX = parseFloat(endPoint.style.left);
            const endY = 100 - parseFloat(endPoint.style.bottom);
            
            const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
            const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
            
            line.style.width = `${length}%`;
            line.style.left = `${startX}%`;
            line.style.top = `${startY}%`;
            line.style.transform = `rotate(${angle}deg)`;
            line.style.transformOrigin = '0 0';
            
            pointsContainer.appendChild(line);
        }
    }
    
    function generateInsights(location) {
        // Simulate AI-generated insights
        const employmentInsight = document.getElementById('employment-insight');
        const migrationInsight = document.getElementById('migration-insight');
        const constructionInsight = document.getElementById('construction-insight');
        
        // These would come from API in real app
        setTimeout(() => {
            employmentInsight.innerHTML = `
                <h3>EMPLOYMENT TRENDS</h3>
                <p>Tech sector growth driving demand in ${location}. Unemployment at 3.8%, below national average.</p>
            `;
            
            migrationInsight.innerHTML = `
                <h3>POPULATION FLOW</h3>
                <p>Net migration +2.4% last year. Primary sources: ${getRandomCities(3)}.</p>
            `;
            
            constructionInsight.innerHTML = `
                <h3>HOUSING SUPPLY</h3>
                <p>Only 1.2 months of inventory available. ${getRandomConstructionStats()}.</p>
            `;
        }, 1000);
    }
    
    // ========== UTILITY FUNCTIONS ==========
    function calculateAffordabilityScore(rent, trend) {
        // Simple algorithm - in real app this would consider local incomes
        const baseScore = Math.min(100, Math.max(0, (rent - 800) / 20));
        const trendImpact = (trend - 1) * 500;
        return Math.min(100, Math.max(0, baseScore + trendImpact));
    }
    
    function generateRecommendation(rent, trend) {
        if (rent > 2500 && trend > 1.05) {
            return 'HIGH RISK - Consider alternative markets';
        } else if (rent > 2000 || trend > 1.04) {
            return 'MODERATE RISK - Monitor market closely';
        } else {
            return 'FAVORABLE - Good investment potential';
        }
    }
    
    function showTechnicalDetails(data) {
        // Additional technical metrics would be shown here
        console.log('Technical details:', data);
    }
    
    function checkApiStatus() {
        // Simulate API check
        setTimeout(() => {
            apiStatusEl.textContent = 'CENSUS_API: ONLINE';
            apiStatusEl.classList.add('active');
        }, 1500);
    }
    
    function updateClock() {
        const now = new Date();
        currentTimeEl.textContent = now.toLocaleTimeString('en-US', {
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }
    
    function showLoading(show) {
        // Would show/hide loading indicator
        console.log('Loading:', show);
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
        // Main prediction button
        predictBtn.addEventListener('click', predictRent);
        
        // Compare button
        compareBtn.addEventListener('click', () => {
            showError('Comparison feature coming in v2.0');
        });
        
        // Time range buttons
        timeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                timeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedYears = parseInt(btn.dataset.years);
            });
        });
        
        // Mode switchers
        techModeBtn.addEventListener('click', () => {
            currentView = 'technical';
            techModeBtn.classList.add('active');
            simpleModeBtn.classList.remove('active');
            document.body.classList.add('tech-mode');
        });
        
        simpleModeBtn.addEventListener('click', () => {
            currentView = 'simple';
            simpleModeBtn.classList.add('active');
            techModeBtn.classList.remove('active');
            document.body.classList.remove('tech-mode');
        });
        
        // Tips modal
        tipsBtn.addEventListener('click', () => {
            tipsModal.classList.add('active');
        });
        
        modalCloseBtn.addEventListener('click', () => {
            tipsModal.classList.remove('active');
        });
        
        tipsModal.addEventListener('click', (e) => {
            if (e.target === tipsModal) {
                tipsModal.classList.remove('active');
            }
        });
        
        // Start in simple mode by default
        simpleModeBtn.click();
    }
    
    // ========== INITIALIZE APP ==========
    init();
});