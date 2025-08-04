import React, { useState, useEffect, useContext, useCallback } from 'react';
import { AuthContext } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { vetgroomConfigUrl } from '../config'; // Import the new Edge Function URL

const daysOfWeek = [
    { id: 1, name: 'Monday' },
    { id: 2, name: 'Tuesday' },
    { id: 3, name: 'Wednesday' },
    { id: 4, name: 'Thursday' },
    { id: 5, name: 'Friday' },
    { id: 6, name: 'Saturday' },
    { id: 0, name: 'Sunday' }, // Sunday is typically 0 in JS Date.getDay()
];

const generateTimeOptions = (intervalMinutes = 30) => {
    const options = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += intervalMinutes) {
            const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
            options.push(time);
        }
    }
    return options;
};

const timeOptions = generateTimeOptions(); // Default 30-min intervals for UI dropdowns

const ConfigAppointPage = () => {
    const { session, tenantName, authLoading, profileLoading } = useContext(AuthContext);
    const { t } = useContext(LanguageContext);

    const [operatingHours, setOperatingHours] = useState([]);
    const [appointmentTypeConfigs, setAppointmentTypeConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const isReady = session && session.access_token && tenantName && !authLoading && !profileLoading;

    // Fetch initial configuration data
    useEffect(() => {
        const fetchConfig = async () => {
            if (!isReady) {
                console.log("ConfigAppointPage: Not ready to fetch config (session/tenant/loading state).");
                return;
            }

            setLoading(true);
            setError(null);
            setSuccessMessage(null);

            try {
                console.log(`ConfigAppointPage: Fetching configuration from Edge Function: ${vetgroomConfigUrl}`);
                const response = await fetch(vetgroomConfigUrl, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                        'X-Tenant-Name': tenantName, // Include X-Tenant-Name header
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log("ConfigAppointPage: Fetched config data:", data);

                // Initialize operating hours with defaults if not found
                const fetchedOperatingHours = daysOfWeek.map(day => {
                    const existing = data.operatingHours.find(oh => oh.day_of_week === day.id);
                    return existing || {
                        id: null, // Will be generated on first upsert
                        tenant_name: tenantName,
                        day_of_week: day.id,
                        open_time: '09:00', // Default open time
                        close_time: '17:00', // Default close time
                        is_closed: false,
                    };
                });
                setOperatingHours(fetchedOperatingHours);

                // Initialize appointment type configs with defaults if not found
                const defaultAppointmentTypes = [
                    { appointment_type: 'Grooming', default_duration_minutes: 60, slot_interval_minutes: 30 },
                    { appointment_type: 'Medical', default_duration_minutes: 30, slot_interval_minutes: 15 },
                    // Add other default types as needed
                ];
                const fetchedAppointmentTypeConfigs = defaultAppointmentTypes.map(defaultType => {
                    const existing = data.appointmentTypeConfigs.find(atc => atc.appointment_type === defaultType.appointment_type);
                    return existing || {
                        id: null, // Will be generated on first upsert
                        tenant_name: tenantName,
                        ...defaultType,
                    };
                });
                setAppointmentTypeConfigs(fetchedAppointmentTypeConfigs);

            } catch (err) {
                console.error("ConfigAppointPage: Error fetching configuration:", err);
                setError(t('errorLoadingConfig') + `: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchConfig();
    }, [isReady, session, tenantName, t]); // Re-fetch if ready state changes

    // Handle changes to operating hours
    const handleOperatingHourChange = useCallback((dayId, field, value) => {
        setOperatingHours(prevHours =>
            prevHours.map(day =>
                day.day_of_week === dayId ? { ...day, [field]: value } : day
            )
        );
    }, []);

    // Handle changes to appointment type configs
    const handleAppointmentTypeConfigChange = useCallback((type, field, value) => {
        setAppointmentTypeConfigs(prevConfigs =>
            prevConfigs.map(config =>
                config.appointment_type === type ? { ...config, [field]: value } : config
            )
        );
    }, []);

    // Save configuration
    const handleSave = async () => {
        if (!isReady) {
            setError(t('notLoggedInOrTenantMissing'));
            return;
        }

        setSaving(true);
        setError(null);
        setSuccessMessage(null);

        try {
            console.log("ConfigAppointPage: Saving configuration to Edge Function.");
            const response = await fetch(vetgroomConfigUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-Tenant-Name': tenantName, // Include X-Tenant-Name header
                },
                body: JSON.stringify({
                    operatingHours: operatingHours,
                    appointmentTypeConfigs: appointmentTypeConfigs,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || result.error || `HTTP error! status: ${response.status}`);
            }

            setSuccessMessage(t('configSavedSuccessfully'));
            console.log("ConfigAppointPage: Save successful:", result.message);

        } catch (err) {
            console.error("ConfigAppointPage: Error saving configuration:", err);
            setError(t('errorSavingConfig') + `: ${err.message}`);
        } finally {
            setSaving(false);
            // Re-fetch to ensure local state is perfectly synced with DB after save
            // This also picks up any IDs generated by Supabase on first upsert
            // You might want to debounce this or only trigger if initial IDs were null
            // fetchConfig(); // Re-trigger useEffect by changing a dependency if needed, or call directly
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <p className="text-gray-600 dark:text-gray-400">{t('loadingConfig')}</p>
            </div>
        );
    }

    if (error && !loading) {
        return (
            <div className="text-red-500 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-white dark:bg-gray-900 shadow-lg rounded-lg my-8">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6 text-center">{t('appointmentConfig')}</h2>

            {successMessage && (
                <div className="bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-100 p-3 rounded-lg mb-4 text-center">
                    {successMessage}
                </div>
            )}
            {error && (
                <div className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-100 p-3 rounded-lg mb-4 text-center">
                    {error}
                </div>
            )}

            {/* Operating Hours Section */}
            <section className="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('operatingHours')}</h3>
                {operatingHours.map(day => (
                    <div key={day.day_of_week} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                        <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-32 mb-2 sm:mb-0">
                            {t(daysOfWeek.find(d => d.id === day.day_of_week)?.name.toLowerCase())}
                        </label>
                        <div className="flex items-center space-x-4 w-full sm:w-auto">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id={`closed-${day.day_of_week}`}
                                    checked={day.is_closed}
                                    onChange={(e) => handleOperatingHourChange(day.day_of_week, 'is_closed', e.target.checked)}
                                    className="form-checkbox h-5 w-5 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500"
                                />
                                <label htmlFor={`closed-${day.day_of_week}`} className="ml-2 text-gray-700 dark:text-gray-300">{t('closed')}</label>
                            </div>

                            {!day.is_closed && (
                                <div className="flex items-center space-x-2">
                                    <select
                                        value={day.open_time || ''}
                                        onChange={(e) => handleOperatingHourChange(day.day_of_week, 'open_time', e.target.value)}
                                        className="form-select block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                                    >
                                        {timeOptions.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                    <span className="text-gray-600 dark:text-gray-400">-</span>
                                    <select
                                        value={day.close_time || ''}
                                        onChange={(e) => handleOperatingHourChange(day.day_of_week, 'close_time', e.target.value)}
                                        className="form-select block w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                                    >
                                        {timeOptions.map(time => (
                                            <option key={time} value={time}>{time}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </section>

            {/* Appointment Type Configuration Section */}
            <section className="mb-8 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <h3 className="text-2xl font-semibold text-gray-700 dark:text-gray-200 mb-4">{t('appointmentTypesConfig')}</h3>
                {appointmentTypeConfigs.map(typeConfig => (
                    <div key={typeConfig.appointment_type} className="flex flex-col sm:flex-row items-start sm:items-center justify-between py-3 border-b last:border-b-0 border-gray-100 dark:border-gray-700">
                        <label className="text-lg font-medium text-gray-700 dark:text-gray-300 w-48 mb-2 sm:mb-0">
                            {t(typeConfig.appointment_type.toLowerCase() + 'Type')} {/* e.g., 'groomingType' */}
                        </label>
                        <div className="flex items-center space-x-4 w-full sm:w-auto">
                            <div className="flex flex-col">
                                <label htmlFor={`${typeConfig.appointment_type}-duration`} className="text-xs text-gray-500 dark:text-gray-400">{t('defaultDuration')}</label>
                                <input
                                    type="number"
                                    id={`${typeConfig.appointment_type}-duration`}
                                    value={typeConfig.default_duration_minutes}
                                    onChange={(e) => handleAppointmentTypeConfigChange(typeConfig.appointment_type, 'default_duration_minutes', parseInt(e.target.value))}
                                    className="block w-24 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                                    min="1"
                                />
                            </div>
                            <div className="flex flex-col">
                                <label htmlFor={`${typeConfig.appointment_type}-interval`} className="text-xs text-gray-500 dark:text-gray-400">{t('slotInterval')}</label>
                                <select
                                    id={`${typeConfig.appointment_type}-interval`}
                                    value={typeConfig.slot_interval_minutes}
                                    onChange={(e) => handleAppointmentTypeConfigChange(typeConfig.appointment_type, 'slot_interval_minutes', parseInt(e.target.value))}
                                    className="block w-24 px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 dark:text-gray-100 text-sm"
                                >
                                    <option value={15}>15 {t('minutes')}</option>
                                    <option value={30}>30 {t('minutes')}</option>
                                    <option value={60}>60 {t('minutes')}</option>
                                </select>
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            <div className="text-center mt-6">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 transition duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? t('saving') : t('saveConfiguration')}
                </button>
            </div>
        </div>
    );
};

export default ConfigAppointPage;
