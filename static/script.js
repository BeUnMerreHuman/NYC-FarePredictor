// TaxiFare Oracle - Main Application Script

class TaxiFarePredictor {
    constructor() {
        this.taxiZoneData = [];
        this.heuristicData = [];
        this.currentPickupLocationID = null;
        this.currentDropoffLocationID = null;
        this.currentTimeMode = 'now'; // 'now' or 'later'
        this.isLoading = false;
        
        // Initialize the application
        this.init();
    }
    
    async init() {
        // Load CSV data
        await this.loadCSVData();
        
        // Initialize UI components
        this.initUI();
        
        // Update current time display
        this.updateCurrentTime();
        setInterval(() => this.updateCurrentTime(), 60000); // Update every minute
        
        // Setup event listeners
        this.setupEventListeners();
    }
    
    async loadCSVData() {
        try {
            console.log('Loading CSV data...');
            
            // Load taxi_zone_lookup.csv
            const taxiZoneResponse = await fetch('taxi_zone_lookup.csv');
            const taxiZoneText = await taxiZoneResponse.text();
            this.taxiZoneData = this.parseCSV(taxiZoneText);
            
            // Load heuristic_map.csv
            const heuristicResponse = await fetch('heuristic_map.csv');
            const heuristicText = await heuristicResponse.text();
            this.heuristicData = this.parseCSV(heuristicText);
            
            console.log('CSV data loaded successfully:', {
                taxiZones: this.taxiZoneData.length,
                heuristicEntries: this.heuristicData.length
            });
            
            // Populate filter options
            this.populateFilterOptions();
            
        } catch (error) {
            console.error('Error loading CSV data:', error);
            this.showError('Data Loading Error', 'Unable to load required data files. Please refresh the page.');
        }
    }
    
    parseCSV(csvText) {
        const lines = csvText.split('\n');
        
        // FIX: Remove quotes (") and extra spaces from headers
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        
        return lines.slice(1).map(line => {
            // FIX: Remove quotes from values too
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            
            const obj = {};
            headers.forEach((header, index) => {
                // Ensure we don't map undefined values if line is trailing empty space
                if (values[index] !== undefined) {
                    obj[header] = values[index];
                }
            });
            return obj;
        }).filter(obj => obj[headers[0]]); // Filter out empty rows
    }
    
    populateFilterOptions() {
        // Get unique boroughs and service zones
        const boroughs = [...new Set(this.taxiZoneData.map(zone => zone.Borough))].sort();
        const serviceZones = [...new Set(this.taxiZoneData.map(zone => zone.service_zone))].sort();
        
        // Update UI
        this.updateFilterDropdown('pickupFilter', 'borough', boroughs);
        this.updateFilterDropdown('dropoffFilter', 'borough', boroughs);
        
        // Store for later use
        this.boroughs = boroughs;
        this.serviceZones = serviceZones;
    }
    
    updateFilterDropdown(elementId, filterType, options) {
        const select = document.getElementById(elementId);
        select.innerHTML = '<option value="">Select ' + (filterType === 'borough' ? 'borough' : 'service zone') + '...</option>';
        
        options.forEach(option => {
            if (option) { // Skip empty values
                const opt = document.createElement('option');
                opt.value = option;
                opt.textContent = option;
                select.appendChild(opt);
            }
        });
    }
    
    initUI() {
        // Populate month dropdown
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const monthSelect = document.getElementById('pickupMonth');
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index + 1;
            option.textContent = month;
            monthSelect.appendChild(option);
        });
        
        // Populate day of week dropdown
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const daySelect = document.getElementById('pickupDay');
        days.forEach((day, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = day;
            daySelect.appendChild(option);
        });
        
        // Populate hour dropdown
        const hourSelect = document.getElementById('pickupHour');
        for (let i = 1; i <= 12; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = i;
            hourSelect.appendChild(option);
        }
    }
    
    updateCurrentTime() {
        const now = new Date();
        const formattedTime = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
        const formattedDate = now.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        
        document.getElementById('currentTime').textContent = `${formattedDate} at ${formattedTime}`;
    }
    
    setupEventListeners() {
        // Time mode toggle
        document.getElementById('leaveNowBtn').addEventListener('click', () => this.setTimeMode('now'));
        document.getElementById('scheduleLaterBtn').addEventListener('click', () => this.setTimeMode('later'));
        
        // Filter type changes
        document.querySelectorAll('input[name="pickupFilterType"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.onFilterTypeChange('pickup', e.target.value));
        });
        
        document.querySelectorAll('input[name="dropoffFilterType"]').forEach(radio => {
            radio.addEventListener('change', (e) => this.onFilterTypeChange('dropoff', e.target.value));
        });
        
        // Filter selection changes
        document.getElementById('pickupFilter').addEventListener('change', (e) => this.onFilterChange('pickup', e.target.value));
        document.getElementById('dropoffFilter').addEventListener('change', (e) => this.onFilterChange('dropoff', e.target.value));
        
        // Zone selection changes
        document.getElementById('pickupZone').addEventListener('change', (e) => this.onZoneChange('pickup', e.target.value));
        document.getElementById('dropoffZone').addEventListener('change', (e) => this.onZoneChange('dropoff', e.target.value));
        
        // Calculate fare button
        document.getElementById('calculateFareBtn').addEventListener('click', () => this.calculateFare());
        
        // New calculation button
        document.getElementById('newCalculationBtn').addEventListener('click', () => this.resetCalculator());
        
        // Breakdown accordion toggle
        document.getElementById('breakdownToggle').addEventListener('click', () => this.toggleBreakdown());
        
        // Hour and AM/PM changes
        document.getElementById('pickupHour').addEventListener('change', () => this.updateHeuristicInfo());
        document.getElementById('ampm').addEventListener('change', () => this.updateHeuristicInfo());
    }
    
    setTimeMode(mode) {
        this.currentTimeMode = mode;
        
        const nowBtn = document.getElementById('leaveNowBtn');
        const laterBtn = document.getElementById('scheduleLaterBtn');
        const nowSection = document.getElementById('nowSection');
        const laterSection = document.getElementById('laterSection');
        
        if (mode === 'now') {
            nowBtn.classList.add('bg-primary', 'text-white');
            nowBtn.classList.remove('border-gray-300', 'text-gray-700');
            laterBtn.classList.add('border-gray-300', 'text-gray-700');
            laterBtn.classList.remove('bg-primary', 'text-white');
            nowSection.classList.remove('hidden');
            laterSection.classList.add('hidden');
        } else {
            laterBtn.classList.add('bg-primary', 'text-white');
            laterBtn.classList.remove('border-gray-300', 'text-gray-700');
            nowBtn.classList.add('border-gray-300', 'text-gray-700');
            nowBtn.classList.remove('bg-primary', 'text-white');
            laterSection.classList.remove('hidden');
            nowSection.classList.add('hidden');
        }
        
        this.updateHeuristicInfo();
    }
    
    onFilterTypeChange(locationType, filterType) {
        const filterSelect = document.getElementById(`${locationType}Filter`);
        const zoneSelect = document.getElementById(`${locationType}Zone`);
        
        // Clear previous selections
        zoneSelect.innerHTML = '<option value="">Select zone...</option>';
        document.getElementById(`${locationType === 'pickup' ? 'PU' : 'DO'}LocationID`).value = '';
        
        // Update filter options
        const options = filterType === 'borough' ? this.boroughs : this.serviceZones;
        this.updateFilterDropdown(`${locationType}Filter`, filterType, options);
        
        // Update heuristic info if both locations are selected
        this.updateHeuristicInfo();
    }
    
    onFilterChange(locationType, filterValue) {
        const filterType = document.querySelector(`input[name="${locationType}FilterType"]:checked`).value;
        const zoneSelect = document.getElementById(`${locationType}Zone`);
        
        // Clear previous zone selection
        zoneSelect.innerHTML = '<option value="">Select zone...</option>';
        document.getElementById(`${locationType === 'pickup' ? 'PU' : 'DO'}LocationID`).value = '';
        
        if (!filterValue) return;
        
        // Filter zones based on selected filter
        const filteredZones = this.taxiZoneData.filter(zone => {
            return zone[filterType === 'borough' ? 'Borough' : 'service_zone'] === filterValue;
        });
        
        // Populate zone dropdown
        filteredZones.sort((a, b) => a.Zone.localeCompare(b.Zone)).forEach(zone => {
            const option = document.createElement('option');
            option.value = zone.Zone;
            option.textContent = zone.Zone;
            option.dataset.locationId = zone.LocationID;
            zoneSelect.appendChild(option);
        });
        
        // Update heuristic info
        this.updateHeuristicInfo();
    }
    
    onZoneChange(locationType, zoneValue) {
        const zoneSelect = document.getElementById(`${locationType}Zone`);
        const selectedOption = zoneSelect.querySelector(`option[value="${zoneValue}"]`);
        
        if (selectedOption && selectedOption.dataset.locationId) {
            const locationID = selectedOption.dataset.locationId;
            document.getElementById(`${locationType === 'pickup' ? 'PU' : 'DO'}LocationID`).value = locationID;
            
            if (locationType === 'pickup') {
                this.currentPickupLocationID = locationID;
            } else {
                this.currentDropoffLocationID = locationID;
            }
        }
        
        // Update heuristic info
        this.updateHeuristicInfo();
    }
    
    updateHeuristicInfo() {
        const puLocationID = this.currentPickupLocationID;
        const doLocationID = this.currentDropoffLocationID;
        
        if (!puLocationID || !doLocationID) {
            document.getElementById('heuristicInfo').classList.add('hidden');
            return;
        }
        
        // Find heuristic data for this route
        const heuristic = this.heuristicData.find(item => 
            item.start_node === puLocationID && item.end_node === doLocationID
        );
        
        const heuristicInfo = document.getElementById('heuristicInfo');
        
        if (heuristic) {
            document.getElementById('tripDistance').textContent = parseFloat(heuristic.avg_distance).toFixed(1);
            document.getElementById('tripDuration').textContent = parseInt(heuristic.avg_duration);
            heuristicInfo.classList.remove('hidden');
        } else {
            document.getElementById('tripDistance').textContent = 'N/A';
            document.getElementById('tripDuration').textContent = 'N/A';
            heuristicInfo.classList.remove('hidden');
        }
    }
    
    getTimeData() {
        if (this.currentTimeMode === 'now') {
            const now = new Date();
            return {
                pickup_hour: now.getHours(),
                pickup_day: now.getDay(),
                pickup_month: now.getMonth() + 1
            };
        } else {
            const hour = parseInt(document.getElementById('pickupHour').value) || 12;
            const ampm = document.getElementById('ampm').value;
            const day = parseInt(document.getElementById('pickupDay').value) || 0;
            const month = parseInt(document.getElementById('pickupMonth').value) || 1;
            
            // Convert 12-hour to 24-hour format
            let pickup_hour = hour;
            if (ampm === 'PM' && hour < 12) pickup_hour += 12;
            if (ampm === 'AM' && hour === 12) pickup_hour = 0;
            
            return {
                pickup_hour,
                pickup_day: day,
                pickup_month: month
            };
        }
    }
    
    getHeuristicData() {
        const puLocationID = this.currentPickupLocationID;
        const doLocationID = this.currentDropoffLocationID;
        
        if (!puLocationID || !doLocationID) {
            return null;
        }
        
        const heuristic = this.heuristicData.find(item => 
            item.start_node === puLocationID && item.end_node === doLocationID
        );
        
        if (heuristic) {
            return {
                trip_distance: parseFloat(heuristic.avg_distance),
                duration_min: parseFloat(heuristic.avg_duration)
            };
        }
        
        return null;
    }

    async calculateFare() {
        // Validate inputs
        if (!this.validateInputs()) return;
        
        // Get all data
        const timeData = this.getTimeData();
        const heuristicData = this.getHeuristicData();
        
        if (!heuristicData) {
            this.showError('Route Not Found', 'No historical data available for this route. Please try different locations.');
            return;
        }
        
        // Prepare payload matching Python's TripInput model
        const payload = {
            trip_distance: heuristicData.trip_distance,
            PULocationID: parseInt(this.currentPickupLocationID),
            DOLocationID: parseInt(this.currentDropoffLocationID),
            duration_min: heuristicData.duration_min,
            ...timeData // This contains pickup_hour, pickup_day, pickup_month
        };
        
        console.log('Sending payload to Backend:', payload);
        
        // Show loading state
        this.showLoading();
        
        try {
            // CALL THE REAL BACKEND
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Server error');
            }

            const data = await response.json();
            this.showResults(data);
            
        } catch (error) {
            console.error('Error calculating fare:', error);
            this.showError('Calculation Error', `Unable to calculate fare: ${error.message}`);
        }
    }
    
    validateInputs() {
        const errors = [];
        
        if (!this.currentPickupLocationID) {
            errors.push('Please select a pickup location');
        }
        
        if (!this.currentDropoffLocationID) {
            errors.push('Please select a drop-off location');
        }
        
        if (this.currentTimeMode === 'later') {
            if (!document.getElementById('pickupMonth').value) {
                errors.push('Please select a month');
            }
            if (!document.getElementById('pickupDay').value) {
                errors.push('Please select a day of week');
            }
            if (!document.getElementById('pickupHour').value) {
                errors.push('Please select an hour');
            }
        }
        
        if (errors.length > 0) {
            this.showError('Missing Information', errors.join('<br>'));
            return false;
        }
        
        return true;
    }
    
    showLoading() {
        document.getElementById('predictionSection').classList.add('hidden');
        document.getElementById('resultSection').classList.add('hidden');
        document.getElementById('errorSection').classList.add('hidden');
        document.getElementById('loadingSection').classList.remove('hidden');
        this.isLoading = true;
    }
    
    showResults(data) {
        this.isLoading = false;
        
        // Update total amount
        document.getElementById('totalAmount').textContent = data.total_amount.toFixed(2);
        
        // Update breakdown table
        const breakdownTable = document.getElementById('breakdownTable');
        breakdownTable.innerHTML = '';
        
        const descriptions = {
            fare: 'Base fare + distance + time',
            tip: 'Suggested 18% tip',
            tolls: 'Bridge and tunnel tolls',
            airport_fee: 'Airport access fee',
            airport_surcharge: 'Airport surcharge',
            rushhour_surcharge: 'Rush hour surcharge (4-8 PM)',
            congestion_surcharge: 'Manhattan congestion surcharge',
            improvement_surcharge: 'Improvement surcharge',
            mta_tax: 'MTA tax',
            total: 'Total estimated fare'
        };
        
        Object.entries(data.breakdown).forEach(([key, value]) => {
            const row = document.createElement('tr');
            const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            const amount = parseFloat(value).toFixed(2);
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${formattedKey}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-700">$${amount}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${descriptions[key] || ''}</td>
            `;
            
            if (key === 'total') {
                row.classList.add('bg-gray-50', 'font-bold');
            }
            
            breakdownTable.appendChild(row);
        });
        
        // Show result section
        document.getElementById('loadingSection').classList.add('hidden');
        document.getElementById('resultSection').classList.remove('hidden');
        
        // Scroll to results
        document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth' });
    }
    
    showError(title, message) {
        this.isLoading = false;
        
        document.getElementById('predictionSection').classList.add('hidden');
        document.getElementById('resultSection').classList.add('hidden');
        document.getElementById('loadingSection').classList.add('hidden');
        
        document.getElementById('errorTitle').textContent = title;
        document.getElementById('errorMessage').innerHTML = message;
        document.getElementById('errorSection').classList.remove('hidden');
    }
    
    resetCalculator() {
        // Reset all inputs
        document.getElementById('pickupFilter').value = '';
        document.getElementById('pickupZone').innerHTML = '<option value="">Select zone...</option>';
        document.getElementById('PULocationID').value = '';
        this.currentPickupLocationID = null;
        
        document.getElementById('dropoffFilter').value = '';
        document.getElementById('dropoffZone').innerHTML = '<option value="">Select zone...</option>';
        document.getElementById('DOLocationID').value = '';
        this.currentDropoffLocationID = null;
        
        // Reset time selection
        this.setTimeMode('now');
        document.getElementById('pickupMonth').value = '';
        document.getElementById('pickupDay').value = '';
        document.getElementById('pickupHour').value = '';
        document.getElementById('ampm').value = 'AM';
        
        // Hide heuristic info
        document.getElementById('heuristicInfo').classList.add('hidden');
        
        // Show prediction section
        document.getElementById('resultSection').classList.add('hidden');
        document.getElementById('errorSection').classList.add('hidden');
        document.getElementById('predictionSection').classList.remove('hidden');
    }
    
    toggleBreakdown() {
        const content = document.getElementById('breakdownContent');
        const icon = document.getElementById('breakdownToggle').querySelector('i');
        
        if (content.classList.contains('hidden')) {
            content.classList.remove('hidden');
            icon.style.transform = 'rotate(180deg)';
        } else {
            content.classList.add('hidden');
            icon.style.transform = 'rotate(0deg)';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.taxiFarePredictor = new TaxiFarePredictor();
    feather.replace();
});

// Global utility function to format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}