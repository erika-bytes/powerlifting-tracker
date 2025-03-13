document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing dropdowns...');
    populateDropdowns().catch(error => {
        console.error('Error in populateDropdowns:', error);
    });
});

// Fetch data from API endpoints
async function fetchAthleteData(athleteName) {
    try {
        const response = await fetch(`http://127.0.0.1:8000/entries/athlete/${athleteName}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching athlete data:', error);
        throw error;
    }
}

async function fetchColumnValues(columnName) {
    try {
        console.log(`Fetching values for ${columnName}...`);
        const url = `http://127.0.0.1:8000/entries/column/${columnName}`;
        console.log('Request URL:', url);

        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Failed to fetch ${columnName} values. Status: ${response.status}, Error: ${errorText}`);
            return null;
        }

        const data = await response.json();
        console.log(`Received data for ${columnName}:`, data);
        return data;
    } catch (error) {
        console.error(`Error fetching ${columnName} values:`, error);
        return null;
    }
}

async function populateDropdowns() {
    console.log('Starting to populate dropdowns...');
    
    const dropdowns = [
        { column: 'equipment', ids: ['rankingEquipment1', 'rankingEquipment2'] },
        { column: 'federation', ids: ['rankingFederation1', 'rankingFederation2'] },
        { column: 'division', ids: ['rankingDivision1', 'rankingDivision2'] },
        { column: 'weight_class', ids: ['rankingWeightClass1', 'rankingWeightClass2'] }
    ];

    for (const dropdown of dropdowns) {
        console.log(`Processing dropdown for ${dropdown.column}...`);
        
        try {
            const values = await fetchColumnValues(dropdown.column);
            console.log(`Values received for ${dropdown.column}:`, values);

            if (!values) {
                console.error(`No values returned for ${dropdown.column}`);
                continue;
            }

            for (const id of dropdown.ids) {
                const select = document.getElementById(id);
                if (!select) {
                    console.error(`Select element not found: ${id}`);
                    continue;
                }

                console.log(`Populating select ${id}...`);
                select.innerHTML = `<option value="">Select ${dropdown.column.replace('_', ' ')}</option>`;
                
                values.forEach(item => {
                    if (!item || !item.value) {
                        console.warn(`Invalid item in ${dropdown.column} values:`, item);
                        return;
                    }

                    const option = document.createElement('option');
                    option.value = item.value;
                    option.textContent = item.value;
                    select.appendChild(option);
                });

                console.log(`Finished populating ${id} with ${values.length} options`);
            }
        } catch (error) {
            console.error(`Error processing ${dropdown.column} dropdown:`, error);
        }
    }
}

async function fetchRankingData(athleteNum) {
    const athleteName = document.getElementById(`athleteName${athleteNum}`).value;
    const date = document.getElementById(`rankingDate${athleteNum}`).value;
    const equipment = document.getElementById(`rankingEquipment${athleteNum}`).value;
    const federation = document.getElementById(`rankingFederation${athleteNum}`).value;
    const division = document.getElementById(`rankingDivision${athleteNum}`).value;
    const weightClass = document.getElementById(`rankingWeightClass${athleteNum}`).value;

    if (!athleteName || !date || !equipment || !federation || !division || !weightClass) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const response = await fetch(`http://127.0.0.1:8000/entries/athlete_ranking/${athleteName}/${date}/${equipment}/${federation}/${division}/${weightClass}`);
        if (!response.ok) {
            alert('No ranking data found for the specified criteria');
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching ranking data:', error);
        alert('Error fetching ranking data');
        return null;
    }
}

function createStatsChart(entries, athleteNum) {
    if (!entries || entries.length === 0) return null;

    const bestSquat = [];
    const bestBench = [];
    const bestDeadlift = [];
    const dates = [];

    entries.forEach(entry => {
        if (entry.best_squat !== null) bestSquat.push(entry.best_squat);
        if (entry.best_bench !== null) bestBench.push(entry.best_bench);
        if (entry.best_deadlift !== null) bestDeadlift.push(entry.best_deadlift);
        if (entry.date) dates.push(dayjs(entry.date).format('YYYY-MM-DD'));
    });

    const ctx = document.getElementById(`statsChart${athleteNum}`).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Best Squat',
                    data: bestSquat,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                },
                {
                    label: 'Best Bench',
                    data: bestBench,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false,
                },
                {
                    label: 'Best Deadlift',
                    data: bestDeadlift,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Weight (kg)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Lift Progression'
                }
            }
        }
    });
}

function createBodyweightChart(entries, athleteNum) {
    if (!entries || entries.length === 0) return null;

    const bodyweight = [];
    const dates = [];

    entries.forEach(entry => {
        if (entry.bodyweight !== null) bodyweight.push(entry.bodyweight);
        if (entry.date) dates.push(dayjs(entry.date).format('YYYY-MM-DD'));
    });

    const ctx = document.getElementById(`bodyweightChart${athleteNum}`).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Bodyweight',
                    data: bodyweight,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Weight (kg)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Bodyweight Progression'
                }
            }
        }
    });
}

function createDotsChart(entries, athleteNum) {
    if (!entries || entries.length === 0) return null;

    const dots = [];
    const dates = [];

    entries.forEach(entry => {
        if (entry.dots !== null) dots.push(entry.dots);
        if (entry.date) dates.push(dayjs(entry.date).format('YYYY-MM-DD'));
    });

    const ctx = document.getElementById(`dotsChart${athleteNum}`).getContext('2d');
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'DOTS',
                    data: dots,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'DOTS Score'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'DOTS Progression'
                }
            }
        }
    });
}

function displayRankings(entries, athleteNum) {
    if (!entries || entries.length === 0) return;

    const rankedList = document.getElementById(`rankedList${athleteNum}`);
    rankedList.innerHTML = '';

    entries.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `Rank ${entry.ranking}: ${entry.name} (Total: ${entry.total}kg)`;
        rankedList.appendChild(listItem);
    });
}

let charts = {
    1: { stats: null, bodyweight: null, dots: null },
    2: { stats: null, bodyweight: null, dots: null }
};

document.getElementById('compareAthletes').addEventListener('click', async () => {
    // Clear existing charts
    Object.values(charts).forEach(athleteCharts => {
        Object.values(athleteCharts).forEach(chart => {
            if (chart) chart.destroy();
        });
    });

    // Reset charts object
    charts = {
        1: { stats: null, bodyweight: null, dots: null },
        2: { stats: null, bodyweight: null, dots: null }
    };

    // Fetch and display data for both athletes
    for (let athleteNum of [1, 2]) {
        const entries = await fetchAthleteData(athleteNum);
        if (entries) {
            charts[athleteNum].stats = createStatsChart(entries, athleteNum);
            charts[athleteNum].bodyweight = createBodyweightChart(entries, athleteNum);
            charts[athleteNum].dots = createDotsChart(entries, athleteNum);
        }

        const rankingData = await fetchRankingData(athleteNum);
        if (rankingData) {
            displayRankings(rankingData, athleteNum);
        }
    }
});

document.getElementById('fetchData').addEventListener('click', async () => {
    

    const athleteName = document.getElementById(`athleteName${athleteNum}`).value;
    const response = await fetch(`http://127.0.0.1:8000/entries/athlete/${athleteName}`);
    
    if (!response.ok) {
        alert('Athlete not found');
        return;
    }

    const entries = await response.json();
    const bestSquat = [];
    const bestBench = [];
    const bestDeadlift = [];
    const bodyweight = [];
    const total = [];
    const dates = [];
    const dots = [];

    entries.forEach(entry => {
        if (entry.best_squat !== null) bestSquat.push(entry.best_squat);
        if (entry.best_bench !== null) bestBench.push(entry.best_bench);
        if (entry.best_deadlift !== null) bestDeadlift.push(entry.best_deadlift);
        if (entry.date) dates.push(dayjs(entry.date).format('YYYY-MM-DD'));
        if (entry.bodyweight !== null) bodyweight.push(entry.bodyweight);
        if (entry.total !== null) total.push(entry.total);
        if (entry.dots !== null) dots.push(entry.dots);
    });

    const ctx = document.getElementById('statsChart').getContext('2d');
    const statsChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Best Squat',
                    data: bestSquat,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                },
                {
                    label: 'Best Bench',
                    data: bestBench,
                    borderColor: 'rgba(54, 162, 235, 1)',
                    fill: false,
                },
                {
                    label: 'Best Deadlift',
                    data: bestDeadlift,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Weight (kg)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Lift Progression'
                }
            }
        }
    });
    const ctx2 = document.getElementById('bodyweightChart').getContext('2d');
    const bodyweightChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'Bodyweight',
                    data: bodyweight,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Weight (kg)'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Bodyweight Progression'
                }
            }
        }
    });
    const ctx3 = document.getElementById('dotsChart').getContext('2d');
    const dotsChart = new Chart(ctx3, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [
                {
                    label: 'DOTS',
                    data: dots,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    fill: false,
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'month',
                        displayFormats: {
                            month: 'MMM YYYY'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Date'
                    }
                },
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'DOTS Score'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'DOTS Progression'
                }
            }
        }
    });
    
    // ranking, list by nearest +/- 3 athletes
    const date = document.getElementById('rankingDate').value;
    const equipment = document.getElementById('rankingEquipment').value;
    const federation = document.getElementById('rankingFederation').value;
    const division = document.getElementById('rankingDivision').value;
    const weightClass = document.getElementById('rankingWeightClass').value;
    const response2 = await fetch(`http://127.0.0.1:8000/entries/athlete_ranking/${athleteName}/${date}/${equipment}/${federation}/${division}/${weightClass}`);

    if (!response2.ok) {
        alert('No records found. Check your spelling');
        return;
    }

    const entries2 = await response2.json();
    const rankedList = document.getElementById('rankedList');
    rankedList.innerHTML = ''; // Clear previous results

    entries2.forEach(entry => {
        const listItem = document.createElement('li');
        listItem.textContent = `Rank ${entry.ranking}: ${entry.name} (Total: ${entry.total}kg)`;
        rankedList.appendChild(listItem);
    });
    
}); 