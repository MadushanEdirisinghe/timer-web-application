document.addEventListener('DOMContentLoaded', function() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }

    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');

            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            tabContents.forEach(content => content.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    window.reminderApp = {
        reminders: [],
        editingId: null,
        activeCountdown: null,
        countdownInterval: null,

        elements: {
            newReminderBtn: document.getElementById('new-reminder-btn'),
            cancelFormBtn: document.getElementById('cancel-form-btn'),
            reminderForm: document.getElementById('reminder-form'),
            formCard: document.getElementById('reminder-form-card'),
            formTitle: document.getElementById('form-title'),
            submitBtnText: document.getElementById('submit-btn-text'),
            countdownDisplay: document.getElementById('countdown-time'),
            activeCountdownInfo: document.getElementById('active-countdown-info'),
            activeReminderText: document.getElementById('active-reminder-text'),
            stopCountdownBtn: document.getElementById('stop-countdown-btn'),
            remindersList: document.getElementById('reminders-list'),
            remindersTableContainer: document.getElementById('reminders-table-container'),
            emptyReminders: document.getElementById('empty-reminders'),
            emptyAddBtn: document.getElementById('empty-add-btn'),
            setDateCheckbox: document.getElementById('setDate'),
            datePickerContainer: document.getElementById('date-picker-container'),
            dayInput: document.getElementById('day'),
            hoursInput: document.getElementById('hours'),
            minutesInput: document.getElementById('minutes'),
            secondsInput: document.getElementById('seconds'),
            repeatSelect: document.getElementById('repeat')
        },

        init() {
            this.loadReminders();
            this.elements.dayInput.value = new Date().toISOString().split('T')[0];
            this.elements.newReminderBtn.addEventListener('click', () => this.toggleForm());
            this.elements.cancelFormBtn.addEventListener('click', () => this.toggleForm(false));
            this.elements.reminderForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit();
            });
            this.elements.stopCountdownBtn.addEventListener('click', () => this.stopCountdown());
            this.elements.emptyAddBtn.addEventListener('click', () => this.toggleForm());
            this.elements.setDateCheckbox.addEventListener('change', () => {
                this.elements.datePickerContainer.style.display = 
                    this.elements.setDateCheckbox.checked ? 'block' : 'none';
            });
            this.renderReminders();
        },

        loadReminders() {
            const savedReminders = JSON.parse(localStorage.getItem('reminders') || '[]');
            this.reminders = savedReminders;
        },

        saveReminders() {
            localStorage.setItem('reminders', JSON.stringify(this.reminders));
        },

        toggleForm(show = true) {
            this.elements.formCard.style.display = show ? 'block' : 'none';
            if (!show) this.resetForm();
        },

        resetForm() {
            this.elements.reminderForm.reset();
            this.elements.datePickerContainer.style.display = 'none';
            this.elements.formTitle.textContent = 'Create New Reminder';
            this.elements.submitBtnText.textContent = 'Add Reminder';
            this.editingId = null;
        },

        handleSubmit() {
            const hours = parseInt(this.elements.hoursInput.value) || 0;
            const minutes = parseInt(this.elements.minutesInput.value) || 0;
            const seconds = parseInt(this.elements.secondsInput.value) || 0;
            const setDate = this.elements.setDateCheckbox.checked;
            const day = setDate ? this.elements.dayInput.value : new Date().toISOString().split('T')[0];
            const repeat = this.elements.repeatSelect.value;
            const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

            if (this.editingId !== null) {
                this.reminders = this.reminders.map(rem => 
                    rem.id === this.editingId ? { ...rem, time: timeString, day, repeat } : rem
                );
            } else {
                const newReminder = {
                    id: Date.now(),
                    time: timeString,
                    day,
                    repeat
                };
                this.reminders.push(newReminder);
            }

            this.saveReminders();
            this.renderReminders();
            this.toggleForm(false);
        },

        editReminder(id) {
            const reminder = this.reminders.find(r => r.id === id);
            if (reminder) {
                const [hours, minutes, seconds] = reminder.time.split(':').map(Number);
                this.elements.hoursInput.value = hours;
                this.elements.minutesInput.value = minutes;
                this.elements.secondsInput.value = seconds;
                this.elements.setDateCheckbox.checked = true;
                this.elements.datePickerContainer.style.display = 'block';
                this.elements.dayInput.value = reminder.day;
                this.elements.repeatSelect.value = reminder.repeat || 'none';
                this.editingId = id;
                this.elements.formTitle.textContent = 'Edit Reminder';
                this.elements.submitBtnText.textContent = 'Update Reminder';
                this.toggleForm();
            }
        },

        deleteReminder(id) {
            if (confirm('Are you sure you want to delete this reminder?')) {
                this.reminders = this.reminders.filter(r => r.id !== id);
                this.saveReminders();
                this.renderReminders();
                if (this.activeCountdown === id) this.stopCountdown();
            }
        },

        startCountdown(id) {
            this.stopCountdown();
            const reminder = this.reminders.find(r => r.id === id);
            if (!reminder) return;

            const targetTime = this.adjustForRepeat(reminder);
            this.activeCountdown = id;

            this.elements.activeCountdownInfo.style.display = 'block';
            this.elements.activeReminderText.textContent = `Active reminder: ${reminder.time}`;

            this.countdownInterval = setInterval(() => {
                const now = new Date();
                const diff = targetTime - now;

                if (diff <= 0) {
                    this.stopCountdown();
                    this.elements.countdownDisplay.textContent = '00:00:00';
                    this.triggerAlarm(reminder);
                } else {
                    const totalSeconds = Math.floor(diff / 1000);
                    const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
                    const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
                    const seconds = (totalSeconds % 60).toString().padStart(2, '0');
                    this.elements.countdownDisplay.textContent = `${hours}:${minutes}:${seconds}`;
                }
            }, 1000);

            this.renderReminders();
        },

        stopCountdown() {
            if (this.countdownInterval) {
                clearInterval(this.countdownInterval);
                this.countdownInterval = null;
            }

            this.activeCountdown = null;
            this.elements.activeCountdownInfo.style.display = 'none';
            this.elements.countdownDisplay.textContent = '--:--:--';
            this.renderReminders();
        },

        adjustForRepeat(reminder) {
            let nextTime = new Date(`${reminder.day}T${reminder.time}`);
            const now = new Date();

            if (reminder.repeat === 'daily') {
                while (nextTime < now) nextTime.setDate(nextTime.getDate() + 1);
            } else if (reminder.repeat === 'weekly') {
                while (nextTime < now) nextTime.setDate(nextTime.getDate() + 7);
            }

            return nextTime;
        },

        triggerAlarm(reminder) {
            alert(`Time's up! Reminder: ${reminder.time}`);
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Reminder Time!', {
                    body: `${reminder.time} - ${reminder.repeat !== 'none' ? reminder.repeat : 'one-time'}`
                });
            }
        },

        renderReminders() {
            if (this.reminders.length === 0) {
                this.elements.remindersTableContainer.style.display = 'none';
                this.elements.emptyReminders.style.display = 'block';
                return;
            }

            this.elements.remindersTableContainer.style.display = 'block';
            this.elements.emptyReminders.style.display = 'none';
            this.elements.remindersList.innerHTML = '';

            this.reminders.forEach(reminder => {
                const row = document.createElement('tr');
                row.className = this.activeCountdown === reminder.id ? 'reminder-row active' : 'reminder-row';

                let repeatBadgeClass = 'badge-once';
                let repeatText = 'One-time';

                if (reminder.repeat === 'daily') {
                    repeatBadgeClass = 'badge-daily';
                    repeatText = 'Daily';
                } else if (reminder.repeat === 'weekly') {
                    repeatBadgeClass = 'badge-weekly';
                    repeatText = 'Weekly';
                }

                row.innerHTML = `
                    <td>
                        <div class="time-cell">
                            <i class="fa-regular fa-clock"></i>
                            <span>${reminder.time}</span>
                        </div>
                    </td>
                    <td>
                        <div class="date-cell">
                            <i class="fa-regular fa-calendar"></i>
                            <span>${new Date(reminder.day).toLocaleDateString()}</span>
                        </div>
                    </td>
                    <td>
                        <span class="repeat-badge ${repeatBadgeClass}">${repeatText}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            ${this.activeCountdown !== reminder.id ? `
                                <button class="play-btn" onclick="reminderApp.startCountdown(${reminder.id})">
                                    <i class="fa-solid fa-play"></i>
                                </button>` : ''}
                            <button class="edit-btn" onclick="reminderApp.editReminder(${reminder.id})">
                                <i class="fa-solid fa-pen-to-square"></i>
                            </button>
                            <button class="delete-btn" onclick="reminderApp.deleteReminder(${reminder.id})">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;

                this.elements.remindersList.appendChild(row);
            });
        }
    };

    const stopwatchApp = {
        time: 0,
        isRunning: false,
        interval: null,
        startTime: 0,

        elements: {
            display: document.getElementById('stopwatch-time'),
            startBtn: document.getElementById('start-btn'),
            pauseBtn: document.getElementById('pause-btn'),
            resetBtn: document.getElementById('reset-btn')
        },

        init() {
            this.elements.startBtn.addEventListener('click', () => this.start());
            this.elements.pauseBtn.addEventListener('click', () => this.pause());
            this.elements.resetBtn.addEventListener('click', () => this.reset());
        },

        formatTime(ms) {
            const totalSeconds = Math.floor(ms / 1000);
            const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
            const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
            const seconds = String(totalSeconds % 60).padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        },

        start() {
            if (!this.isRunning) {
                this.isRunning = true;
                this.startTime = Date.now() - this.time;
                this.interval = setInterval(() => {
                    this.time = Date.now() - this.startTime;
                    this.elements.display.textContent = this.formatTime(this.time);
                }, 1000);
                this.elements.startBtn.disabled = true;
                this.elements.pauseBtn.disabled = false;
            }
        },

        pause() {
            if (this.isRunning) {
                clearInterval(this.interval);
                this.isRunning = false;
                this.elements.startBtn.disabled = false;
                this.elements.pauseBtn.disabled = true;
            }
        },

        reset() {
            clearInterval(this.interval);
            this.isRunning = false;
            this.time = 0;
            this.elements.display.textContent = '00:00:00';
            this.elements.startBtn.disabled = false;
            this.elements.pauseBtn.disabled = true;
        }
    };

    reminderApp.init();
    stopwatchApp.init();
});
