import React, { useState, useEffect, useRef } from 'react';

// Accepted new props: displayedDateObj, handlePrevDay, handleNextDay, isToday, handleGoToToday
const DailyCalendarView = ({ appointments, navigateToDetails, t, language, displayedDateObj, handlePrevDay, handleNextDay, handleGoToToday, isToday }) => {
    // --- NEW DEBUGGING LOG ---
    console.log("DailyCalendarView: Appointments prop received:", appointments);
    console.log("DailyCalendarView: displayedDateObj received:", displayedDateObj);
    // --- END NEW DEBUGGING LOG ---

    // State to hold the current time, updated periodically for the "current time" line
    const [currentTime, setCurrentTime] = useState(new Date());
    // Ref for the scrollable container to programmatically scroll to current time
    const scrollRef = useRef(null);

    // Sort appointments by time for consistent display
    const sortedAppointments = [...appointments].sort((a, b) => { // Create a shallow copy to avoid modifying original array in place
        // Defensive checks for 'time' property
        const timeAStr = a?.time; // Use optional chaining to safely access time
        const timeBStr = b?.time; // Use optional chaining to safely access time

        // If either time is missing, place it at the end or handle as an error
        if (!timeAStr && !timeBStr) return 0; // Both missing, maintain original order
        if (!timeAStr) return 1; // 'a' is missing time, push 'a' after 'b'
        if (!timeBStr) return -1; // 'b' is missing time, push 'b' after 'a'

        // Proceed with parsing if both times exist
        const timeA = timeAStr.split(':').map(Number);
        const timeB = timeBStr.split(':').map(Number);

        return (timeA[0] * 60 + timeA[1]) - (timeB[0] * 60 + timeB[1]);
    });

    // Generates 30-minute time slots for the entire day
    const generateTimeSlots = () => {
        const slots = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                const hour = String(h).padStart(2, '0');
                const minute = String(m).padStart(2, '0');
                slots.push(`${hour}:${minute}`);
            }
        }
        return slots;
    };

    const timeSlots = generateTimeSlots();

    // useEffect for handling current time updates and initial scroll
    useEffect(() => {
        // Update currentTime every 15 seconds for smoother "now" line movement
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 15000); // Changed from 60000 to 15000 ms

        const scrollToCurrentTime = () => {
            if (isToday && scrollRef.current) {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const currentMinutesOfDay = (currentHour * 60 + currentMinute);
                const totalMinutesInDay = 24 * 60;
                const scrollPercentage = currentMinutesOfDay / totalMinutesInDay;
                // Scroll to current time, offset by half of the viewport height to center it
                scrollRef.current.scrollTop = scrollRef.current.scrollHeight * scrollPercentage - (scrollRef.current.clientHeight / 2);
            }
        };

        // Scroll to current time shortly after component mounts to ensure rendering is complete
        const timeoutId = setTimeout(scrollToCurrentTime, 100);

        // Cleanup function for the effect
        return () => {
            clearInterval(timer); // Clear the interval timer
            clearTimeout(timeoutId); // Clear the timeout
        };
    }, [isToday]); // Dependency: isToday - re-run effect if day changes to/from today

    // Determines if an appointment is currently ongoing
    const isOngoing = (appointment) => {
        // Only check for ongoing if it's today and appointment time is valid
        if (!isToday || !appointment || !appointment.time) return false;

        // Create Date objects for comparison
        // Use 'en-CA' forYYYY-MM-DD format to ensure correct date parsing across browsers
        const appStart = new Date(`${displayedDateObj.toLocaleDateString('en-CA')}T${appointment.time}`);
        // Assuming duration_minutes exists, otherwise default to 60 (1 hour)
        const duration = appointment.duration_minutes || 60;
        const appEnd = new Date(appStart.getTime() + duration * 60 * 1000); // Add duration in milliseconds
        const now = new Date(); // Current time

        // Check if current time is within the appointment start and end times
        return now >= appStart && now < appEnd;
    };

    // Format the displayed date based on the current language
    const displayedDateFormatted = displayedDateObj.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mb-8">
            {/* Header with Day Navigation Buttons and "Today" button */}
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={handlePrevDay}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-300 ease-in-out text-sm"
                >
                    &larr; {t('previousDay')} {/* Use t as a function */}
                </button>
                <h3 className="text-xl sm:text-2xl font-semibold text-gray-700 dark:text-gray-300 text-center flex-1 mx-2">
                    {t('todaySchedule')} {displayedDateFormatted} {/* Use t as a function */}
                </h3>
                <button
                    onClick={handleNextDay}
                    className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg shadow hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-300 ease-in-out text-sm"
                >
                    {t('nextDay')} &rarr; {/* Use t as a function */}
                </button>
            </div>
            {/* "Today" button below date navigation, centered */}
            <div className="text-center mb-4">
                {!isToday && (
                    <button
                        onClick={handleGoToToday}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition duration-300 ease-in-out text-sm"
                    >
                        {t('today')} {/* Use t as a function */}
                    </button>
                )}
            </div>

            <div className="relative max-h-96 overflow-y-auto pr-2" ref={scrollRef}>
                {timeSlots.map(slot => {
                    // Filter out appointments without a time to prevent errors
                    const slotAppointments = sortedAppointments.filter(app => {
                        // --- NEW DEBUGGING LOG ---
                        console.log(`DailyCalendarView: Filtering: app.time='${app.time}', slot='${slot}', substring='${app.time?.substring(0, 5)}', match=${app.time && app.time.substring(0, 5) === slot}`);
                        // --- END NEW DEBUGGING LOG ---
                        return app.time && app.time.substring(0, 5) === slot;
                    });

                    // --- NEW DEBUGGING LOG ---
                    if (slotAppointments.length > 0) {
                        console.log(`DailyCalendarView: Slot ${slot} has appointments:`, slotAppointments);
                    }
                    // --- END NEW DEBUGGING LOG ---


                    // Determine if the current time slot is the active one
                    const isCurrentSlot = isToday &&
                                            currentTime.getHours() === parseInt(slot.split(':')[0]) &&
                                            currentTime.getMinutes() >= parseInt(slot.split(':')[1]) &&
                                            currentTime.getMinutes() < parseInt(slot.split(':')[1]) + 30;

                    return (
                        <div key={slot} className={`relative flex items-start py-2 border-b border-gray-200 last:border-b-0 dark:border-gray-700 ${isCurrentSlot ? 'bg-blue-50 dark:bg-blue-900' : ''}`}>
                            <div className="w-16 text-right pr-4 text-sm text-gray-500 font-medium dark:text-gray-400">
                                {new Date(`2000-01-01T${slot}`).toLocaleTimeString(language === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </div>
                            <div className="flex-1 pl-4">
                                {slotAppointments.length > 0 ? (
                                    slotAppointments.map(appointment => (
                                        <div
                                            key={appointment.id}
                                            onClick={() => navigateToDetails(appointment)}
                                            className={`flex items-center justify-between p-3 mb-1 rounded-lg shadow-sm cursor-pointer transition duration-200 ease-in-out border-l-4
                                                ${appointment.category === 'Grooming' ? 'bg-purple-50 dark:bg-purple-700 border-purple-500 hover:bg-purple-100 dark:hover:bg-purple-600' : 'bg-green-50 dark:bg-green-700 border-green-500 hover:bg-green-100 dark:hover:bg-green-600'}
                                                ${isOngoing(appointment) ? 'ring-2 ring-red-500 ring-offset-2' : ''}
                                            `}
                                        >
                                            <div className="flex items-center">
                                                {/* Use appointment.category for icon logic */}
                                                {appointment.category === 'Grooming' ? (
                                                    <span className="text-purple-600 dark:text-purple-200 mr-3 text-xl sm:text-2xl">🐾</span>
                                                ) : (
                                                    <span className="text-green-600 dark:text-green-200 mr-3 text-xl sm:text-2xl">🩺</span>
                                                )}
                                                <div>
                                                    {/* Use clientName and appointment_types from the transformed data */}
                                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base">{appointment.clientName} - {appointment.appointment_types ? appointment.appointment_types.join(', ') : 'N/A'}</p>
                                                    <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{appointment.petName}</p>
                                                </div>
                                            </div>
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-medium
                                                    ${appointment.status === 'Confirmed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
                                                    ${appointment.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : ''}
                                                    ${appointment.status === 'Scheduled' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
                                                `}
                                            >
                                                {t(appointment.status.toLowerCase())} {/* Correct t usage here */}
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-gray-400 dark:text-gray-500 text-sm italic">{t('noUpcomingAppointments')}</p> /* Use t as a function */
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default DailyCalendarView;
