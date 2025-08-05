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
        incomeInput: document.getElementById('income'),
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
        rentIncomeRatioEl: document.getElementById('rent-income-ratio'),
        ratioDescriptionEl: document.getElementById('ratio-description'),
        heatLevels: document.querySelectorAll('.heat-level'),
        safetyRating: document.getElementById('safety-rating'),
        amenitiesScore: document.getElementById('amenities-score'),
        transitAccess: document.getElementById('transit-access'),
        schoolQuality: document.getElementById('school-quality'),
        unemploymentRate: document.getElementById('unemployment-rate'),
        jobGrowth: document.getElementById('job-growth'),
        populationChange: document.getElementById('population-change'),
        migrationRate: document.getElementById('migration-rate'),
        inventoryLevel: document.getElementById('inventory-level'),
        constructionRate: document.getElementById('construction-rate'),
        currentTimeEl: document.getElementById('current-time'),
        apiStatusEl: document.getElementById('api-status'),
        lastUpdatedEl: document.getElementById('last-updated'),
        tipsModal: document.getElementById('tips-modal'),
        tipsBtn: document.getElementById('tips-btn'),
        faqBtn: document.getElementById('faq-btn'),
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
        const income = elements.incomeInput.value ? parseInt(elements.incomeInput.value) : null;
        
        if (!location) {
            showError('Please enter a location');
            return;
        }
        
        try {
            showLoading(true);
            const rentData = await getRentData(location, bedrooms, state.selectedYears);
            displayResults(rentData, income);
            generateInsights(location);
            generateNeighborhoodData(location);
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
                    bedrooms,
                    heatIndex: baseData.heatIndex
                });
            }, 800);
        });
    }

    function getBaseRentData(location) {
        const stateData = {
            'california': { medianRent: 2450, trend: 1.03, volatility: 0.08, heatIndex: 4 },
            'new york': { medianRent: 2200, trend: 1.04, volatility: 0.07, heatIndex: 5 },
            'texas': { medianRent: 1380, trend: 1.05, volatility: 0.09, heatIndex: 3 },
            'florida': { medianRent: 1620, trend: 1.07, volatility: 0.10, heatIndex: 4 },
            'illinois': { medianRent: 1550, trend: 1.04, volatility: 0.07, heatIndex: 2 },
            'colorado': { medianRent: 1850, trend: 1.05, volatility: 0.08, heatIndex: 3 },
            'washington': { medianRent: 1950, trend: 1.06, volatility: 0.09, heatIndex: 4 },
            'default': { medianRent: 1500, trend: 1.04, volatility: 0.07, heatIndex: 2 }
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
    function displayResults(data, income) {
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
        
        // Update heat index
        updateHeatIndex(data.heatIndex);
        
        // Calculate rent to income ratio if income provided
        if (income) {
            const monthlyIncome = income / 12;
            const ratio = ((data.current / monthlyIncome) * 100).toFixed(1);
            elements.rentIncomeRatioEl.textContent = `${ratio}%`;
            
            let description = '';
            if (ratio > 30) {
                description = 'Above recommended threshold (30%)';
            } else if (ratio > 20) {
                description = 'Within recommended range (20-30%)';
            } else {
                description = 'Below recommended threshold (20%)';
            }
            elements.ratioDescriptionEl.textContent = description;
        } else {
            elements.rentIncomeRatioEl.textContent = '--';
            elements.ratioDescriptionEl.textContent = 'Enter income to calculate ratio';
        }
    }

    function updateHeatIndex(level) {
        elements.heatLevels.forEach((el, index) => {
            if (index < level) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        });
    }

    function generateNeighborhoodData(location) {
        // Simulate neighborhood data based on location
        setTimeout(() => {
            const safetyRating = Math.min(100, Math.max(60, Math.floor(Math.random() * 100)));
            const amenitiesScore = Math.min(100, Math.max(40, Math.floor(Math.random() * 100)));
            const transitAccess = Math.min(100, Math.max(50, Math.floor(Math.random() * 100)));
            const schoolQuality = Math.min(100, Math.max(30, Math.floor(Math.random() * 100)));
            
            elements.safetyRating.style.width = `${safetyRating}%`;
            elements.amenitiesScore.style.width = `${amenitiesScore}%`;
            elements.transitAccess.style.width = `${transitAccess}%`;
            elements.schoolQuality.style.width = `${schoolQuality}%`;
        }, 500);
    }

    function generateInsights(location) {
        setTimeout(() => {
            // Employment insights
            document.getElementById('employment-insight').innerHTML = `
                <h3>EMPLOYMENT TRENDS</h3>
                <p>Tech sector growth driving demand in ${location}. Unemployment below national average.</p>
                <div class="insight-stats">
                    <div class="stat">
                        <span class="stat-value" id="unemployment-rate">3.8%</span>
                        <span class="stat-label">Unemployment</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="job-growth">+2.4%</span>
                        <span class="stat-label">Job Growth</span>
                    </div>
                </div>
            `;
            
            // Migration insights
            document.getElementById('migration-insight').innerHTML = `
                <h3>POPULATION FLOW</h3>
                <p>Net migration +2.4% last year. Primary sources: ${getRandomCities(3)}.</p>
                <div class="insight-stats">
                    <div class="stat">
                        <span class="stat-value" id="population-change">+1.8%</span>
                        <span class="stat-label">Population Δ</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="migration-rate">2.1%</span>
                        <span class="stat-label">Migration Rate</span>
                    </div>
                </div>
            `;
            
            // Construction insights
            document.getElementById('construction-insight').innerHTML = `
                <h3>HOUSING SUPPLY</h3>
                <p>Only 1.2 months of inventory available. ${getRandomConstructionStats()}.</p>
                <div class="insight-stats">
                    <div class="stat">
                        <span class="stat-value" id="inventory-level">1.2mo</span>
                        <span class="stat-label">Inventory</span>
                    </div>
                    <div class="stat">
                        <span class="stat-value" id="construction-rate">+850</span>
                        <span class="stat-label">New Units</span>
                    </div>
                </div>
            `;
        }, 1000);
    }

    // [Rest of the utility functions remain the same]

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