// ===== Shift Data & Configuration =====
const TEAM = [
    { name: 'Serkan Yalçın', initials: 'SY' },
    { name: 'Metin Ovalı',   initials: 'MO' },
    { name: 'Uğur İpek',     initials: 'Uİ' }
];

const SHIFTS = [
    { label: 'Gündüz', time: '08:00 - 16:00', startHour: 8,  endHour: 16, type: 'morning' },
    { label: 'Akşam',  time: '16:00 - 00:00', startHour: 16, endHour: 0,  type: 'evening' },
    { label: 'Gece',   time: '00:00 - 08:00', startHour: 0,  endHour: 8,  type: 'night'   }
];

// Reference date: The Sunday that defines Week 0 assignment
// Week 0 (reference): Serkan=Gündüz, Uğur=Akşam, Metin=Gece
// We use a known Sunday close to now. Let's pick 2026-05-31 (Sunday)
const REFERENCE_SUNDAY = new Date(2026, 4, 31); // May 31, 2026 is a Sunday

const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
const DAY_NAMES_SHORT = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                     'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

// ===== State =====
let currentWeekOffset = 0; // 0 = current week

// ===== Utility Functions =====

function getToday() {
    return new Date();
}

function formatDate(date) {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

function formatDateFull(date) {
    return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}, ${DAY_NAMES[date.getDay()]}`;
}

function formatTime(date) {
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Get the Monday of the week containing the given date.
 * Week starts on Monday.
 */
function getMondayOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = day === 0 ? -6 : 1 - day;
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

/**
 * Get the Sunday of the week containing the given date.
 * (Sunday that starts the shift cycle for this week)
 */
function getSundayOfWeek(date) {
    const monday = getMondayOfWeek(date);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return sunday;
}

/**
 * Calculate which rotation week (0, 1, 2) a given date falls in.
 * The rotation is based on which Sunday starts the week's cycle.
 * 
 * Logic: Shifts change every Sunday.
 * A "shift week" runs from Sunday to Saturday.
 * We find the most recent Sunday <= date, and calculate weeks from reference.
 */
function getShiftWeekSunday(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const dayOfWeek = d.getDay(); // 0=Sun
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - dayOfWeek); // Go back to Sunday
    return sunday;
}

function getRotationIndex(date) {
    const sunday = getShiftWeekSunday(date);
    const ref = new Date(REFERENCE_SUNDAY);
    ref.setHours(0, 0, 0, 0);
    
    const diffMs = sunday.getTime() - ref.getTime();
    const diffWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
    
    // Modulo that handles negatives properly
    return ((diffWeeks % 3) + 3) % 3;
}

/**
 * Get shift assignments for a given date.
 * Returns array: [{ person, shift }, { person, shift }, { person, shift }]
 * 
 * Rotation (Serkan←Metin, Metin←Uğur, Uğur←Serkan):
 *  Week 0: Serkan=Gündüz, Uğur=Akşam, Metin=Gece
 *  Week 1: Uğur=Gündüz, Metin=Akşam, Serkan=Gece
 *  Week 2: Metin=Gündüz, Serkan=Akşam, Uğur=Gece
 */
function getAssignments(date) {
    const rotation = getRotationIndex(date);
    
    // rotation maps each shift to a person index
    // TEAM: 0=Serkan, 1=Metin, 2=Uğur
    const rotationMap = [
        [0, 2, 1], // Week 0: Gündüz→Serkan, Akşam→Uğur, Gece→Metin
        [2, 1, 0], // Week 1: Gündüz→Uğur, Akşam→Metin, Gece→Serkan
        [1, 0, 2], // Week 2: Gündüz→Metin, Akşam→Serkan, Gece→Uğur
    ];

    const personIndices = rotationMap[rotation];
    
    return SHIFTS.map((shift, i) => ({
        person: TEAM[personIndices[i]],
        shift: shift
    }));
}

/**
 * Get the currently active shift based on current time.
 */
function getCurrentActiveShift() {
    const now = getToday();
    const hour = now.getHours();
    const assignments = getAssignments(now);
    
    let activeIndex;
    if (hour >= 8 && hour < 16) {
        activeIndex = 0; // Gündüz
    } else if (hour >= 16 && hour < 24) {
        activeIndex = 1; // Akşam
    } else {
        activeIndex = 2; // Gece
    }
    
    return assignments[activeIndex];
}

/**
 * Get the week's days (Mon-Sun) for a given week offset from current week.
 */
function getWeekDays(weekOffset) {
    const today = getToday();
    const monday = getMondayOfWeek(today);
    monday.setDate(monday.getDate() + weekOffset * 7);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        days.push(d);
    }
    return days;
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

// ===== Rendering Functions =====

function renderCurrentTime() {
    const now = getToday();
    document.getElementById('currentTime').textContent = formatTime(now);
    document.getElementById('currentDate').textContent = formatDateFull(now);
}

function renderActiveShift() {
    const active = getCurrentActiveShift();
    const card = document.getElementById('activeShiftCard');
    
    card.className = `active-shift-card ${active.shift.type}`;
    document.getElementById('activePerson').textContent = active.person.name;
    document.getElementById('activeTime').textContent = active.shift.time;
    document.getElementById('activeShiftType').textContent = `${active.shift.label} Vardiyası`;
}

function renderWeekNavigation() {
    const days = getWeekDays(currentWeekOffset);
    const monday = days[0];
    const sunday = days[6];
    
    const rotation = getRotationIndex(days[6]); // Use Sunday's rotation for the week
    
    let weekLabel = `${rotation + 1}. Rotasyon Haftası`;
    if (currentWeekOffset === 0) {
        weekLabel = `Bu Hafta — ${rotation + 1}. Rotasyon`;
    } else if (currentWeekOffset === 1) {
        weekLabel = `Gelecek Hafta — ${rotation + 1}. Rotasyon`;
    } else if (currentWeekOffset === -1) {
        weekLabel = `Geçen Hafta — ${rotation + 1}. Rotasyon`;
    }
    
    document.getElementById('weekLabel').textContent = weekLabel;
    document.getElementById('weekDates').textContent = 
        `${formatDate(monday)} – ${formatDate(sunday)} ${sunday.getFullYear()}`;
}

function renderShifts() {
    const container = document.getElementById('shiftsSection');
    const days = getWeekDays(currentWeekOffset);
    const today = getToday();
    const now = new Date();
    const currentHour = now.getHours();
    
    let html = '';
    
    days.forEach((day, index) => {
        const isToday = isSameDay(day, today);
        const isSunday = day.getDay() === 0;
        const assignments = getAssignments(day);
        
        let cardClass = 'day-card';
        if (isToday) cardClass += ' is-today';
        if (isSunday) cardClass += ' is-sunday';
        
        html += `<div class="${cardClass}" style="animation-delay: ${index * 0.05}s">`;
        html += `<div class="day-header">`;
        html += `<div>`;
        html += `<span class="day-name">${DAY_NAMES[day.getDay()]}</span>`;
        if (isToday) html += `<span class="today-badge">BUGÜN</span>`;
        if (isSunday) html += `<span class="sunday-badge">VARDİYA DEĞİŞİM</span>`;
        html += `</div>`;
        html += `<span class="day-date">${day.getDate()} ${MONTH_NAMES[day.getMonth()]}</span>`;
        html += `</div>`;
        
        html += `<div class="day-shifts">`;
        
        assignments.forEach((a, shiftIndex) => {
            // Determine if this shift is currently active
            let isActive = false;
            if (isToday) {
                if (shiftIndex === 0 && currentHour >= 8 && currentHour < 16) isActive = true;
                if (shiftIndex === 1 && currentHour >= 16 && currentHour < 24) isActive = true;
                if (shiftIndex === 2 && currentHour >= 0 && currentHour < 8) isActive = true;
            }
            
            let rowClass = `shift-row ${a.shift.type}`;
            if (isActive) rowClass += ' is-active';
            
            html += `<div class="${rowClass}">`;
            html += `<div class="shift-color-dot"></div>`;
            html += `<span class="shift-time">${a.shift.time}</span>`;
            html += `<span class="shift-person">${a.person.name}</span>`;
            html += `<span class="shift-type-label">${a.shift.label}</span>`;
            html += `</div>`;
        });
        
        html += `</div></div>`;
    });
    
    container.innerHTML = html;
}

function renderTeam() {
    const container = document.getElementById('teamGrid');
    const today = getToday();
    const assignments = getAssignments(today);
    
    const avatarClasses = ['morning-avatar', 'evening-avatar', 'night-avatar'];
    const badgeClasses = ['morning-badge', 'evening-badge', 'night-badge'];
    
    let html = '';
    
    assignments.forEach((a, i) => {
        html += `<div class="team-card" style="animation-delay: ${i * 0.1}s">`;
        html += `<div class="team-avatar ${avatarClasses[i]}">${a.person.initials}</div>`;
        html += `<div class="team-info">`;
        html += `<div class="team-name">${a.person.name}</div>`;
        html += `<div class="team-current-shift">Bu hafta: ${a.shift.time}</div>`;
        html += `</div>`;
        html += `<span class="team-shift-badge ${badgeClasses[i]}">${a.shift.label}</span>`;
        html += `</div>`;
    });
    
    container.innerHTML = html;
}

function renderRotationTable() {
    const table = document.getElementById('rotationTable');
    const today = getToday();
    const currentRotation = getRotationIndex(today);
    
    let html = `
        <thead>
            <tr>
                <th>Hafta</th>
                <th>🌅 Gündüz (08-16)</th>
                <th>🌆 Akşam (16-00)</th>
                <th>🌙 Gece (00-08)</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    const rotationMap = [
        [0, 2, 1],
        [2, 1, 0],
        [1, 0, 2],
    ];
    
    const types = ['morning', 'evening', 'night'];
    
    for (let w = 0; w < 3; w++) {
        const isCurrent = w === currentRotation;
        const rowClass = isCurrent ? 'current-week-row' : '';
        const weekLabel = isCurrent ? `${w + 1}. Hafta ⬅️` : `${w + 1}. Hafta`;
        
        html += `<tr class="${rowClass}">`;
        html += `<td style="font-weight:700">${weekLabel}</td>`;
        
        for (let s = 0; s < 3; s++) {
            const personIndex = rotationMap[w][s];
            html += `<td>
                <div class="rotation-cell">
                    <span class="rotation-dot ${types[s]}"></span>
                    ${TEAM[personIndex].name}
                </div>
            </td>`;
        }
        
        html += `</tr>`;
    }
    
    html += `</tbody>`;
    table.innerHTML = html;
}

// ===== Event Handlers =====

document.getElementById('prevWeek').addEventListener('click', () => {
    currentWeekOffset--;
    renderWeekNavigation();
    renderShifts();
});

document.getElementById('nextWeek').addEventListener('click', () => {
    currentWeekOffset++;
    renderWeekNavigation();
    renderShifts();
});

document.getElementById('todayBtn').addEventListener('click', () => {
    currentWeekOffset = 0;
    renderWeekNavigation();
    renderShifts();
});

// ===== Initialization =====

function init() {
    renderCurrentTime();
    renderActiveShift();
    renderWeekNavigation();
    renderShifts();
    renderTeam();
    renderRotationTable();
    
    // Update time every second
    setInterval(() => {
        renderCurrentTime();
    }, 1000);
    
    // Update active shift every minute
    setInterval(() => {
        renderActiveShift();
        renderShifts();
    }, 60000);
}

// Start the app
document.addEventListener('DOMContentLoaded', init);
