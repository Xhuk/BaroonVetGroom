import React, { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';

// Import contexts (assuming they are correctly provided by App.jsx)
import { LanguageContext } from '../context/LanguageContext';
import { AuthContext } from '../context/AuthContext';

// Import Edge Function URL from config
import {
    developerMode,
    createAppointmentFullEdgeFunctionUrl, // This URL is now functionally redundant for the combined flow
    vetgroomConfigUrl,
    checkAvailabilityUrl, // This URL now points to the combined apt_validation function
    getColoniasUrl,
    getBreedsUrl,
    getclientUrl,
    openMapSearchUrl,
    openMapUserAgent
} from '../config';

// Helper function to get local ISO date string
const getLocalISOString = (date) => {
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// LEAFLET ICON IMPORTS FOR CUSTOM MARKER
import { customPawIcon } from '../lib/leafletIcons';

const CreateAppointmentPage = ({ navigateToDashboard, supabase, initialDate, initialTime }) => {
    const { t } = useContext(LanguageContext);
    const { session, tenantName } = useContext(AuthContext);

    // Calculate today's date once for min attribute and initialDate comparison
    const todayISO = useMemo(() => getLocalISOString(new Date()), []);

    // --- State Initialization ---
    const [isGroomingSelected, setIsGroomingSelected] = useState(true);
    const [isMedicalSelected, setIsMedicalSelected] = useState(false);
    const [collectionType, setCollectionType] = useState('dropoff');

    // Ensure appointmentDate is not in the past
    const [appointmentDate, setAppointmentDate] = useState(() => {
        if (initialDate) {
            const initialDateObj = new Date(initialDate + 'T00:00:00'); // Add T00:00:00 for date-only comparison
            const todayObj = new Date(todayISO + 'T00:00:00');

            if (initialDateObj < todayObj) {
                // If initialDate is in the past, use today's date
                return todayISO;
            }
            return initialDate; // Otherwise, use the provided initialDate
        }
        return ''; // Default if no initialDate
    });
    const [appointmentTime, setAppointmentTime] = useState(initialTime || '');
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('Scheduled'); // Default status when created
    const [category, setCategory] = useState(null); // Will be derived from service types
    const [tags, setTags] = useState(null);
    const [durationMinutes, setDurationMinutes] = useState(60); // Assuming a default, potentially fetched from config

    // Client states
    const [clientFullNameInput, setClientFullNameInput] = useState('');
    const [clientPhoneInput, setClientPhoneInput] = useState('');
    const [clientEmailInput, setClientEmailInput] = useState('');
    const [selectedClient, setSelectedClient] = useState(null);
    const [isNewClient, setIsNewClient] = useState(false);
    const [isClientDataFetched, setIsClientDataFetched] = useState(false);

    // Pet states
    const [petNameInput, setPetNameInput] = useState('');
    const [petBreedInput, setPetBreedInput] = useState('');
    const [selectedBreed, setSelectedBreed] = useState(null);
    const [breedsList, setBreedsList] = useState([]);
    const allBreedsRef = useRef([]);
    const [showBreedSuggestions, setShowBreedSuggestions] = useState(false);
    const breedSearchDebounceTimeout = useRef(null);
    const [sizeInput, setSizeInput] = useState('');
    const [highlightedBreedIndex, setHighlightedBreedIndex] = useState(-1);

    const [selectedPet, setSelectedPet] = useState(null);
    const [isNewPet, setIsNewPet] = useState(false);
    const [isPetDataFetched, setIsPetDataFetched] = useState(false);
    const [highlightPetName, setHighlightPetName] = useState(false); // Used for visual focus

    // Address & Colonia states
    const [addressInput, setAddressInput] = useState('');
    const [coloniaInput, setColoniaInput] = useState('');
    const [selectedColonia, setSelectedColonia] = useState(null);
    const [coloniasList, setColoniasList] = useState([]);
    const allColoniasRef = useRef([]);
    const [showColoniaSuggestions, setShowColoniaSuggestions] = useState(false);
    const coloniaSearchDebounceTimeout = useRef(null);
    const [highlightedColoniaIndex, setHighlightedColoniaIndex] = useState(-1);
    const [postalCodeInput, setPostalCodeInput] = useState(''); // NEW STATE FOR POSTAL CODE

    // Map states
    const initialDefaultMapCenter = [25.740091716307305, -100.40749660662587]; // Monterrey, Mexico
    const [tenantLocationCenter, setTenantLocationCenter] = useState(initialDefaultMapCenter);
    const [mapLatitude, setMapLatitude] = useState(null); // Set by manual map interaction
    const [mapLongitude, setMapLongitude] = useState(null); // Set by manual map interaction
    const [mapRadiusKm, setMapRadiusKm] = useState(8.5);
    const [geocodeMessage, setGeocodeMessage] = useState(''); // Message related to map coordinates
    const [showMapSection, setShowMapSection] = useState(false); // Controls map visibility

    const degreesPerKmFactor = 0.0088235;
    const deltaDegrees = mapRadiusKm * degreesPerKmFactor;
    const mapBounds = useMemo(() => [
        [tenantLocationCenter[0] - deltaDegrees, tenantLocationCenter[1] - deltaDegrees],
        [tenantLocationCenter[0] + deltaDegrees, tenantLocationCenter[1] + deltaDegrees]
    ], [tenantLocationCenter, deltaDegrees]);
    const mapRef = useRef(null);

    // Section enabling states
    const [isPetSectionEnabled, setIsPetSectionEnabled] = useState(false);
    const [isAddressSectionEnabled, setIsAddressSectionEnabled] = useState(false);
    const [isDateTimeSectionEnabled, setIsDateTimeSectionEnabled] = useState(false);

    const [isEmailRequired, setIsEmailRequired] = useState(false); // Assuming this might come from config or be a default

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState(null);
    const [fieldErrors, setFieldErrors] = useState({});
    const [showNameChangeConfirmation, setShowNameChangeConfirmation] = useState(false);
    const [proposedClientName, setProposedClientName] = useState('');
    const [originalClientName, setOriginalClientName] = useState('');
    const [clientToConfirm, setClientToConfirm] = useState(null);

    // Config settings (assuming these are fetched from your 'saved config' or backend)
    const [configSettings, setConfigSettings] = useState(null); // Used for `durationMinutes` etc.
    const [showConfigPage, setShowConfigPage] = useState(false);

    // Slot validation and suggestions
    const [isSlotAvailable, setIsSlotAvailable] = useState(null); // null: not checked, true: available, false: not available
    const [suggestedSlots, setSuggestedSlots] = useState([]);
    const [showSlotSuggestionsModal, setShowSlotSuggestionsModal] = useState(false);
    const [timeFilter, setTimeFilter] = useState(initialTime || '');
    const [showTimeOptions, setShowTimeOptions] = useState(false);
    const [isAvailabilityChecked, setIsAvailabilityChecked] = useState(false); // New state to explicitly track if availability has been checked

    // Refs for inputs
    const clientFullNameInputRef = useRef(null);
    const clientPhoneInputRef = useRef(null);
    const clientEmailInputRef = useRef(null);
    const petNameInputRef = useRef(null);
    const petBreedInputRef = useRef(null);
    const sizeInputRef = useRef(null);
    const addressInputRef = useRef(null);
    const coloniaInputRef = useRef(null);
    const postalCodeInputRef = useRef(null); // NEW REF FOR POSTAL CODE
    const appointmentDateRef = useRef(null);
    const timeFilterInputRef = useRef(null);
    const clientSearchDebounceTimeout = useRef(null);
    const petSearchDebounceTimeout = useRef(null);
    const slotValidationDebounceTimeout = useRef(null);

    // Ref to the breed suggestions list UL for scrolling
    const breedSuggestionsListRef = useRef(null);
    // Ref to the colonia suggestions list UL for scrolling
    const coloniaSuggestionsListRef = useRef(null);

    const validateAppointmentSlotRef = useRef(null);

    // Regex for email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // --- Helper & Utility Callbacks (Defined before their useEffects) ---

    const logDebug = useCallback((...args) => {
        if (developerMode) {
            console.log("CreateAppointmentPage DEBUG:", ...args);
        }
    }, [developerMode]);

    // New helper to log curl command and response details
    const logCurlDetails = useCallback(async (url, method, headers, body, response) => {
        if (!developerMode) return;

        let curlCommand = `curl -X ${method} \\\n  '${url}' \\\n`;
        for (const header in headers) {
            curlCommand += `  -H '${header}: ${headers[header]}' \\\n`;
        }
        if (body) {
            curlCommand += `  -d '${JSON.stringify(JSON.parse(body), null, 2)}'`;
        }

        logDebug(`[CURL COMMAND]:\n${curlCommand}`);

        try {
            // Attempt to clone the response to read its body without consuming the original
            // If the response body has already been read, cloning will fail.
            // In that case, we'll log what we can.
            let responseClone;
            try {
                responseClone = response.clone();
            } catch (e) {
                logDebug(`[API RESPONSE] Warning: Could not clone response for full logging (body likely already consumed): ${e.message}`);
                logDebug(`[API RESPONSE] Status: ${response.status} ${response.statusText}`);
                // Cannot log body if it's already consumed and clone failed, so return.
                return;
            }

            const responseText = await responseClone.text();
            let responseBody = responseText;
            try {
                responseBody = JSON.parse(responseText); // Attempt to parse as JSON
            } catch (e) {
                // Not JSON, keep as text
            }

            logDebug(`[API RESPONSE] Status: ${response.status} ${response.statusText}`);
            logDebug(`[API RESPONSE] Headers:`, Object.fromEntries(response.headers.entries()));
            logDebug(`[API RESPONSE] Body:`, responseBody);
        } catch (e) {
            logDebug(`[API RESPONSE] Error reading response body for curl log: ${e.message}`);
        }
    }, [developerMode, logDebug]);


    const logPerformance = useCallback(async (stepName, asyncFunction) => {
        if (!developerMode) return await asyncFunction();

        const start = performance.now();
        logDebug(`[PERF START] ${stepName}`);
        try {
            const result = await asyncFunction();
            const end = performance.now();
            logDebug(`[PERF END] ${stepName} completed in ${(end - start).toFixed(2)} ms`);
            return result;
        } catch (e) {
            const end = performance.now();
            logDebug(`[PERF ERROR] ${stepName} failed in ${(end - start).toFixed(2)} ms with error: ${e.message}`);
            throw e;
        }
    }, [developerMode, logDebug]);

    const camelCaseWord = (word) => word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : '';
    const formatFullName = useCallback((fullName) => fullName.split(' ').map(camelCaseWord).join(' '), []);

    // Generic title case formatter (for addresses, pet names, etc.)
    const toTitleCase = useCallback((str) => {
        if (!str) return '';
        return str.replace(/\b\w/g, (char) => char.toUpperCase());
    }, []);

    const applyValidationStyles = useCallback((isSuccess) => {
        const dateInput = appointmentDateRef.current;
        if (dateInput) {
            dateInput.classList.remove('border-red-500', 'border-green-500', 'border-purple-500');
            dateInput.classList.add(isSuccess ? 'border-green-500' : 'border-red-500', 'border-2');
        }
    }, []);

    // Data Fetching Callbacks (fetchBreeds, fetchColonias) - Moved before useEffects that call them
    const fetchColonias = useCallback(async (query = '') => {
        logDebug(`(fetchColonias): Fetching colonias list with query: "${query}".`);
        if (!session || !tenantName) {
            logDebug("(fetchColonias): Skipping fetch, session or tenantName missing.");
            return;
        }

        if (allColoniasRef.current.length > 0 && query.length > 0) {
            logDebug("(fetchColonias): Serving colonias from in-memory cache based on search query (client-side filtering).");
            const filteredColonias = allColoniasRef.current.filter(colonia =>
                colonia.name.toLowerCase().includes(query.toLowerCase()) ||
                (colonia.postal_code && colonia.postal_code.includes(query))
            );
            setColoniasList(filteredColonias);
            return;
        }

        try {
            await logPerformance(`Fetch Colonias (API Query: ${query || 'All'})`, async () => {
                if (!getColoniasUrl) throw new Error("VITE_SUPABASE_GET_COLONIAS_URL is not configured in config.js.");

                const url = new URL(getColoniasUrl);
                url.searchParams.append('tenantName', tenantName);
                if (query) {
                    url.searchParams.append('searchQuery', query);
                }
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-Tenant-Name': tenantName
                };

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: headers
                });

                await logCurlDetails(url.toString(), 'GET', headers, null, response); // Log curl details

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.description || `Failed to fetch colonias: ${response.statusText}`);
                }
                const data = await response.json();

                if (!query && data && data.length > 0) {
                    allColoniasRef.current = data;
                    logDebug(`(fetchColonias): Cached ${allColoniasRef.current.length} total colonias from API.`);
                }
                setColoniasList(data || []);
                logDebug(`(fetchColonias): Colonias fetched from API: ${data ? data.length : 0}`);
            });
        }
        catch (err) {
            console.error("Error searching/fetching colonias:", err);
            setError(`${t('errorSearchingColonias')}: ${err.message}`);
            setColoniasList([]);
        } finally {
            setLoading(false);
        }
    }, [session, tenantName, t, logDebug, logPerformance, getColoniasUrl, allColoniasRef, logCurlDetails]);

    const fetchBreeds = useCallback(async (query = '') => {
        logDebug(`(fetchBreeds): Fetching breeds list with query: "${query}".`);
        if (!session || !tenantName) {
            logDebug("(fetchBreeds): Skipping fetch, session or tenantName missing.");
            return;
        }

        if (allBreedsRef.current.length > 0 && query.length > 0) {
            logDebug("(fetchBreeds): Serving breeds from in-memory cache based on search query (client-side filtering).");
            const filteredBreeds = allBreedsRef.current.filter(breed =>
                breed.name.toLowerCase().includes(query.toLowerCase())
            );
            setBreedsList(filteredBreeds);
            return;
        }

        try {
            await logPerformance(`Fetch Breeds (API Query: ${query || 'All'})`, async () => {
                if (!getBreedsUrl) throw new Error("VITE_SUPABASE_GET_BREEDS_URL is not configured in config.js.");

                const url = new URL(getBreedsUrl);
                url.searchParams.append('tenantName', tenantName);
                if (query) {
                    url.searchParams.append('searchQuery', query);
                }
                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-Tenant-Name': tenantName
                };

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: headers
                });

                await logCurlDetails(url.toString(), 'GET', headers, null, response); // Log curl details

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.description || `Failed to fetch breeds: ${response.statusText}`);
                }
                const data = await response.json();

                if (!query && data && data.length > 0) {
                    allBreedsRef.current = data;
                    logDebug(`(fetchBreeds): Cached ${allBreedsRef.current.length} total breeds from API.`);
                }
                setBreedsList(data || []);
                logDebug(`(fetchBreeds): Breeds fetched from API: ${data ? data.length : 0}`);
            });
        }
        catch (err) {
            console.error("Error fetching breeds:", err);
            setError(`${t('errorSearchingBreeds')}: ${err.message}`);
            setBreedsList([]);
        } finally {
            setLoading(false);
        }
    }, [session, tenantName, t, logDebug, logPerformance, getBreedsUrl, allBreedsRef, logCurlDetails]);


    // Map Click Handler for updating marker position
    const MapClickHandler = () => {
        useMapEvents({
            click: (e) => {
                setMapLatitude(e.latlng.lat);
                setMapLongitude(e.latlng.lng);
                setGeocodeMessage(t('coordinatesSelectedManual'));
                logDebug(`Map clicked: Lat ${e.latlng.lat}, Lng ${e.latlng.lng}`);
            },
        });
        return null;
    };


    // --- Core Logic Callbacks (ordered by dependency) ---

    // Validation Logic
    const validateField = useCallback((fieldName, value) => {
        logDebug(`(validateField): Validating field: ${fieldName}, value: "${value}"`);
        let errorMsg = '';
        switch (fieldName) {
            case 'clientFullName': if (!value.trim()) errorMsg = t('clientNameRequired'); break;
            case 'clientPhone':
                if (value.trim().length > 0 && value.trim().length !== 10) {
                    errorMsg = t('phoneNumber10Digits');
                }
                break;
            case 'clientEmail':
                if (isEmailRequired && !value.trim()) {
                    errorMsg = t('emailRequired');
                } else if (value.trim() && !emailRegex.test(value)) {
                    errorMsg = t('invalidEmailFormat');
                }
                break;
            case 'petName': if (!value.trim()) errorMsg = t('pleaseEnterPetName'); break;
            case 'petBreedInput': if (isNewPet && !value.trim()) errorMsg = t('breedRequiredForNew'); break;
            case 'sizeInput': if (isNewPet && !value.trim()) errorMsg = t('sizeRequiredForNew'); break;
            case 'addressInput': if (!value.trim()) errorMsg = t('addressRequired'); break;
            case 'coloniaInput': if (!value.trim()) errorMsg = t('coloniaRequired'); break;
            case 'postalCodeInput': if (!value.trim() && collectionType === 'pickup') errorMsg = t('postalCodeRequired'); break; // NEW VALIDATION
            case 'appointmentTime': if (!value.trim()) errorMsg = t('pleaseSelectAppointmentTime'); break;
            default: break;
        }
        setFieldErrors(prev => ({ ...prev, [fieldName]: errorMsg }));
        logDebug(`(validateField): Field ${fieldName} validation result: "${errorMsg}" (empty string means valid)`);
        return errorMsg === '';
    }, [isNewPet, isEmailRequired, t, logDebug, emailRegex, collectionType]); // Added collectionType to dependency array


    // Removed geocodeAddress and reverseGeocode functions (and their related refs/timeouts)


    // Search Callbacks (performPetSearch, performClientSearch)
    const performPetSearch = useCallback(async (input, currentClientId) => {
        logDebug(`(performPetSearch): Initiating pet search for input: '${input}', client ID: '${currentClientId}'.`);
        logDebug("(performPetSearch): Setting loading to TRUE.");
        setLoading(true);
        setError(null);
        setMessage('');

        if (isNewClient && !selectedClient?.id) {
            setSelectedPet(null);
            setIsNewPet(true);
            setPetBreedInput('');
            setSelectedBreed(null);
            setSizeInput('');
            setMessage(t('petNotFoundCreateNew'));
            setIsPetDataFetched(true);
            logDebug("(performPetSearch): Setting loading to FALSE (new client with no ID).");
            setLoading(false);
            return;
        }

        if (!currentClientId) {
            setSelectedPet(null);
            setIsNewPet(true);
            setPetBreedInput('');
            setSelectedBreed(null);
            setSizeInput('');
            setMessage(t('petNotFoundCreateNew'));
            setIsPetDataFetched(true);
            logDebug("(performPetSearch): Setting loading to FALSE (no client ID).");
            setLoading(false);
            logDebug("(performPetSearch): No client ID provided, skipping existing pet search. Assuming new pet.");
            return;
        }

        if (!input.trim() || input.trim().length < 2) {
            setSelectedPet(null);
            setIsNewPet(false);
            setPetBreedInput('');
            setSelectedBreed(null);
            setSizeInput('');
            logDebug("(performPetSearch): Setting loading to FALSE (input too short).");
            setLoading(false);
            logDebug("(performPetSearch): Pet input too short or empty, aborted. Loading set to FALSE.");
            setIsPetDataFetched(false);
            return;
        }

        const isClientConfirmedForPetSearch = selectedClient?.id;
        logDebug(`(performPetSearch): isClientConfirmedForPetSearch: ${isClientConfirmedForPetSearch}`);


        if (!tenantName || !session) {
            setError(t('authenticationError'));
            logDebug("(performPetSearch): Setting loading to FALSE (auth missing).");
            setLoading(false);
            logDebug("(performPetSearch): Auth missing, aborted. Loading set to FALSE.");
            setIsPetDataFetched(false);
            return;
        }

        logDebug(`[PET SEARCH SUPABASE CALL] Table: public.pets`);
        logDebug(`[PET SEARCH SUPABASE CALL] Query: .select('id, name, species, breed_id, size, breeds!inner(id, name, default_size)').eq('client_id', '${currentClientId}').ilike('name', '%${input.trim()}%').eq('tenant_name', '${tenantName}').limit(1)`);
        logDebug(`[PET SEARCH SUPABASE CALL] Headers: {'Authorization': 'Bearer ${session.access_token.substring(0,10)}...'}`);

        try {
            await logPerformance("Perform Pet Search (API)", async () => {
                logDebug(`(performPetSearch): Making Supabase API call to 'public.pets' table.`);
                const { data, error: supabaseError } = await supabase
                    .from('public.pets') // Assuming 'public.pets' schema
                    .select('id, name, species, breed_id, size, breeds!inner(id, name, default_size)')
                    .eq('client_id', currentClientId)
                    .ilike('name', `%${input.trim()}%`)
                    .eq('tenant_name', tenantName)
                    .limit(1);

                const headers = {
                    'Authorization': `Bearer ${session.access_token}` // Simplified for curl log
                };
                await logCurlDetails(`Supabase.from('public.pets').select(...).eq('client_id', '${currentClientId}').ilike('name', '%${input.trim()}%').eq('tenant_name', '${tenantName}').limit(1)`, 'GET', headers, null, { ok: !supabaseError, status: supabaseError ? 500 : 200, statusText: supabaseError?.message || 'OK', text: () => Promise.resolve(JSON.stringify(data || supabaseError)) });


                if (supabaseError && supabaseError.code !== 'PGRST116') {
                    logDebug("(performPetSearch): Supabase pet search error:", supabaseError);
                    throw supabaseError;
                }
                logDebug("(performPetSearch): Supabase response for pets:", data);

                if (data && data.length > 0) {
                    const petData = data[0];
                    setSelectedPet(petData);
                    setPetNameInput(petData.name);
                    setPetBreedInput(petData.breeds ? petData.breeds.name : '');
                    setSelectedBreed(petData.breeds || null);
                    setSizeInput(petData.size || (petData.breeds ? petData.breeds.default_size : ''));
                    setIsNewPet(false);
                    setMessage('');
                    setIsPetDataFetched(true);
                    logDebug(`(performPetSearch): Existing pet found: ${petData.name}. Setting isPetDataFetched to TRUE.`);
                } else {
                    setSelectedPet(null);
                    setIsNewPet(true);
                    setPetBreedInput('');
                    setSelectedBreed(null);
                    setSizeInput('');
                    setMessage(t('petNotFoundCreateNew'));
                    setIsPetDataFetched(true);
                    logDebug("(performPetSearch): Pet not found. Marking as new. Setting isPetDataFetched to TRUE.");
                }
            });
        } catch (err) {
            logDebug("(performPetSearch): Error caught during pet search API call:", err);
            setError(`${t('errorSearchingPets')}: ${err.message || t('unknownError')}`);
            setSelectedPet(null);
            setPetNameInput('');
            setIsNewPet(false);
            setIsPetDataFetched(false);
        } finally {
            logDebug("(performPetSearch): Setting loading to FALSE (finally).");
            setLoading(false);
        }
    }, [tenantName, session, t, selectedClient, isNewClient, logDebug, supabase, logPerformance, logCurlDetails]);


    const performClientSearch = useCallback(async (searchName, searchPhone, searchEmail) => {
        logDebug(`(performClientSearch): Initiating client search for name: '${searchName}', phone: '${searchPhone}', email: '${searchEmail}'.`);
        logDebug("(performClientSearch): Setting loading to TRUE.");
        setLoading(true);
        setError(null);
        setMessage('');

        const currentClientFullName = clientFullNameInput.trim();
        const currentClientPhone = clientPhoneInput.trim();
        const currentClientEmail = clientEmailInput.trim();

        const hasClientPrimaryContact = (currentClientPhone.length === 10 && !fieldErrors.clientPhone) || (currentClientEmail.trim() && emailRegex.test(currentClientEmail.trim()) && !fieldErrors.clientEmail);
        const hasEnoughClientNameInput = currentClientFullName.length >= 2;
        const hasEnoughInputToSearch = hasEnoughClientNameInput || hasClientPrimaryContact;

        logDebug(`(performClientSearch) Input check: Name: "${currentClientFullName}" (enough: ${hasEnoughClientNameInput}), Phone: "${currentClientPhone}" (valid: ${clientPhoneInput.length === 10}), Email: "${currentClientEmail}" (valid: ${emailRegex.test(currentClientEmail)}). Has enough to search: ${hasEnoughInputToSearch}`);


        if (!hasEnoughInputToSearch) {
            logDebug("(performClientSearch): Setting loading to FALSE (insufficient input).");
            setLoading(false);
            setSelectedClient(null);
            setIsNewClient(false);
            setIsClientDataFetched(false);
            setIsPetSectionEnabled(false);
            setIsAddressSectionEnabled(false);
            setIsDateTimeSectionEnabled(false);
            setPetNameInput(''); setSelectedPet(null); setIsNewPet(false); setPetBreedInput(''); setSelectedBreed(null); setSizeInput('');
            setAddressInput(''); setColoniaInput(''); setSelectedColonia(null); setPostalCodeInput(''); // CLEAR POSTAL CODE
            setAppointmentDate(''); setAppointmentTime(''); setTimeFilter(''); setIsSlotAvailable(null); setSuggestedSlots([]);
            setIsAvailabilityChecked(false); // Reset availability status
            logDebug("(performClientSearch): Insufficient input for search. Aborted. All dependent sections disabled.");
            return;
        }

        if (!tenantName || !session || !getclientUrl) {
            setError(t('authenticationError'));
            logDebug("(performClientSearch): Setting loading to FALSE (auth/URL missing).");
            setLoading(false);
            logDebug("(performClientSearch): Auth or Edge Function URL missing. Aborted.");
            setIsClientDataFetched(false);
            return;
        }

        let clientData = null;
        try {
            await logPerformance("Perform Client Search", async () => {
                const url = new URL(getclientUrl);
                url.searchParams.append('tenantName', tenantName);

                if (currentClientPhone.length === 10) {
                    url.searchParams.append('phone_number', currentClientPhone);
                    logDebug("(performClientSearch): Searching by phone number via Edge Function.");
                } else if (currentClientEmail && emailRegex.test(currentClientEmail)) {
                    url.searchParams.append('email', currentClientEmail);
                    logDebug("(performClientSearch): Searching by email via Edge Function.");
                } else if (currentClientFullName.length >= 2) {
                    url.searchParams.append('name', currentClientFullName);
                    logDebug("(performClientSearch): Searching by name via Edge Function.");
                } else {
                    logDebug("(performClientSearch): No valid search parameter to send to Edge Function.");
                    throw new Error("No valid search parameters provided for client lookup.");
                }

                const headers = {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                    'X-Tenant-Name': tenantName
                };

                const response = await fetch(url.toString(), {
                    method: 'GET',
                    headers: headers
                });

                await logCurlDetails(url.toString(), 'GET', headers, null, response); // Log curl details

                logDebug(`(performClientSearch): Edge Function response status: ${response.status}`);

                if (!response.ok) {
                    const errorData = await response.json();
                    if (response.status === 404 || response.status === 400) {
                        logDebug(`(performClientSearch): Edge Function returned ${response.status}, likely client not found or bad request for no result.`);
                        clientData = null;
                    } else {
                        const errorMessage = errorData.error || errorData.message || `Failed with status: ${response.statusText}`;
                        throw new Error(errorMessage);
                    }
                } else {
                    const data = await response.json();
                    logDebug("(performClientSearch): Edge Function response data:", data);
                    clientData = data.client || null;
                }
            });

            if (clientData) {
                logDebug("(performClientSearch): Client found. Checking for name conflict.");
                const currentNameFormatted = formatFullName(searchName);
                if (currentNameFormatted && clientData.name && currentNameFormatted.toLowerCase() !== clientData.name.toLowerCase()) {
                    logDebug("(performClientSearch): Name conflict detected. Showing confirmation dialog.");
                    setProposedClientName(searchName.trim());
                    setOriginalClientName(clientData.name);
                    setClientToConfirm(clientData);
                    setIsClientDataFetched(false); // Client data not yet fully confirmed due to conflict
                    setShowNameChangeConfirmation(true);
                } else {
                    logDebug("(performClientSearch): Existing client recognized. Populating fields and enabling dependent sections.");
                    setSelectedClient(clientData);
                    setClientFullNameInput(clientData.name);
                    setClientPhoneInput(clientData.phone || '');
                    setClientEmailInput(clientData.email || '');
                    if (clientData.addresses) {
                        setAddressInput(toTitleCase(clientData.addresses.street_address || '')); // Apply here too
                        setColoniaInput(toTitleCase(clientData.addresses.colonias?.name || '')); // Apply here too
                        setPostalCodeInput(clientData.addresses.postal_code || ''); // SET POSTAL CODE
                    } else {
                        setAddressInput(''); setColoniaInput(''); setPostalCodeInput(''); // CLEAR POSTAL CODE
                    }
                    setIsNewClient(false);
                    setMessage('');
                    setIsPetSectionEnabled(true);
                    setIsAddressSectionEnabled(true);
                    setIsClientDataFetched(true); // Client data fully fetched and good to go

                    // If client has existing address and it's a pickup type, show map for manual adjustment
                    if (clientData.addresses?.street_address && clientData.addresses?.colonias && collectionType === 'pickup') {
                        setShowMapSection(true);
                        setGeocodeMessage(t('coordinatesSelectedPreviously')); // Indicate map is ready for manual adjustment
                    } else {
                        setShowMapSection(false);
                        setGeocodeMessage('');
                    }
                    logDebug(`(performClientSearch): Client has existing address. DateTime section enabled: ${isDateTimeSectionEnabled}, Map shown: ${showMapSection}`);
                }
            } else {
                logDebug("(performClientSearch): Client not found. Marking as new client. Enabling pet and address sections.");
                setSelectedClient(null);
                setIsNewClient(true);
                setMessage(t('clientNotFoundCreateNew'));
                setIsPetSectionEnabled(true);
                setIsAddressSectionEnabled(true);
                setIsClientDataFetched(true); // Client data resolved as new
                setPetNameInput(''); setSelectedPet(null); setIsNewPet(false); setPetBreedInput(''); setSelectedBreed(null); setSizeInput('');
                setAddressInput(''); setColoniaInput(''); setSelectedColonia(null); setPostalCodeInput(''); // CLEAR POSTAL CODE
                setAppointmentDate(''); setAppointmentTime(''); setTimeFilter(''); setIsSlotAvailable(null); setSuggestedSlots([]);
                setIsAvailabilityChecked(false); // Reset availability status
                setIsDateTimeSectionEnabled(false);
                setShowMapSection(false);
                setGeocodeMessage('');
            }
        } catch (err) {
            logDebug("(performClientSearch): Error caught during client search API call:", err);
            setError(`${t('errorSearchingClients')}: ${err.message || t('unknownError')}`);
            setSelectedClient(null);
            setClientFullNameInput('');
            setIsNewClient(false);
            setIsPetSectionEnabled(false);
            setIsAddressSectionEnabled(false);
            setIsClientDataFetched(false);
            setPetNameInput(''); setSelectedPet(null); setIsNewPet(false); setPetBreedInput(''); setSelectedBreed(null); setSizeInput('');
            setAddressInput(''); setColoniaInput(''); setSelectedColonia(null); setPostalCodeInput(''); // CLEAR POSTAL CODE
            setAppointmentDate(''); setAppointmentTime(''); setTimeFilter(''); setIsSlotAvailable(null); setSuggestedSlots([]);
            setIsAvailabilityChecked(false); // Reset availability status
            setIsDateTimeSectionEnabled(false);
            setShowMapSection(false);
            setGeocodeMessage('');
        } finally {
            logDebug("(performClientSearch): Setting loading to FALSE (finally).");
            setLoading(false);
        }
    }, [tenantName, session, t, clientEmailInput, logDebug, emailRegex, fieldErrors, formatFullName, collectionType, getclientUrl, logPerformance, clientFullNameInput, clientPhoneInput, isNewClient, selectedClient, isPetSectionEnabled, showMapSection, logCurlDetails, isDateTimeSectionEnabled, toTitleCase]); // Added toTitleCase to dependencies


    // Data Transformation/Selection Handlers
    const handleSelectBreed = useCallback((breed) => {
        setPetBreedInput(breed.name);
        setSelectedBreed(breed);
        setBreedsList([]); // Clear the suggestions
        setShowBreedSuggestions(false); // Hide the suggestion box
        setSizeInput(breed.default_size || '');
        setHighlightedBreedIndex(-1);
        logDebug(`(handleSelectBreed): Selected breed: ${breed.name} (Default Size: ${breed.default_size}).`);
    }, [logDebug]);


    const handleColoniaChange = useCallback((value) => { // Unified from handleColoniaInputChange
        setColoniaInput(value);
        setSelectedColonia(null);
        setFieldErrors(prev => ({ ...prev, coloniaInput: '' }));
        setGeocodeMessage('');
        setHighlightedColoniaIndex(-1);
        setIsAvailabilityChecked(false);
        setIsSlotAvailable(null);
        setSuggestedSlots([]);
        setMapLatitude(null);
        setMapLongitude(null);
        logDebug(`(handleColoniaChange): Colonia input changed to "${value}".`);

        if (coloniaSearchDebounceTimeout.current) clearTimeout(coloniaSearchDebounceTimeout.current);

        if (value.trim().length >= 2) {
            coloniaSearchDebounceTimeout.current = setTimeout(() => {
                if (allColoniasRef.current.length > 0) {
                    logDebug("(handleColoniaChange): Filtering colonias from in-memory cache.");
                    const filteredColonias = allColoniasRef.current.filter(colonia =>
                        colonia.name.toLowerCase().includes(value.toLowerCase()) ||
                        (colonia.postal_code && colonia.postal_code.includes(value))
                    );
                    setColoniasList(filteredColonias);
                    setShowColoniaSuggestions(filteredColonias.length > 0);
                    logDebug(`(handleColoniaChange): Found ${filteredColonias.length} colonias from cache.`);
                } else {
                    logDebug("(handleColoniaChange): Cache empty, attempting to fetch all colonias to populate cache.");
                    fetchColonias('');
                    logDebug("(handleColoniaChange): Setting loading to TRUE (fetching colonias for cache).");
                    setLoading(true);
                }
            }, 300);
        } else {
            setColoniasList([]);
            setShowColoniaSuggestions(false);
            logDebug("(handleColoniaChange): Colonia input too short, clearing suggestions.");
        }
    }, [allColoniasRef, fetchColonias, logDebug, setHighlightedColoniaIndex]);


    const handleSelectColonia = useCallback((colonia) => {
        setColoniaInput(colonia.name); // This name should already be correctly cased from API
        setSelectedColonia(colonia); // Set the selected colonia object
        setPostalCodeInput(colonia.postal_code || ''); // SET POSTAL CODE ON SELECTION
        setColoniasList([]); // Clear the suggestions
        setShowColoniaSuggestions(false); // Hide the suggestion box
        setGeocodeMessage(''); // Clear geocode message as user selected from list
        setHighlightedColoniaIndex(-1);
        logDebug(`(handleSelectColonia): Selected colonia: ${colonia.name} (${colonia.postal_code}).`);

        // isDateTimeSectionEnabled is now managed by a dedicated useEffect.
        if (addressInputRef.current) addressInputRef.current.focus();
    }, [logDebug, setHighlightedColoniaIndex]);


    const handleSelectSuggestedSlot = useCallback((slot) => {
        setAppointmentDate(slot.date);
        setAppointmentTime(slot.time);
        setTimeFilter(slot.time);
        setShowSlotSuggestionsModal(false);
        setShowTimeOptions(false);
        setMessage(t('slotSelectedSuccessfully'));
        setIsSlotAvailable(true);
        applyValidationStyles(true);
        setIsAvailabilityChecked(true); // Mark as checked and available
        logDebug(`(handleSelectSuggestedSlot): Selected slot: ${slot.date} ${slot.time}. Setting isSlotAvailable to TRUE.`);

        // When a suggested slot is selected, immediately validate it with all current form data
        // This is important to ensure the "Submit" button becomes enabled if this was the last missing piece.
        // We'll call the actual API function here instead of relying on the ref, to make it explicit.
        // It's technically re-validating but ensures the UI state (isSlotAvailable) is correctly set.
        // No need to pass all parameters, as the function itself fetches them from state, but for clarity on what it relies on
        // we'll keep the parameters, even though the ref version doesn't strictly need them passed as args.
        // For the purpose of this refactor, let's make `handleValidateAvailabilityButtonClick` self-contained regarding form data.
        if (validateAppointmentSlotRef.current) {
            validateAppointmentSlotRef.current(); // Call without args, let it pull from state
        }
    }, [t, logDebug, applyValidationStyles]);


    // Input Change & KeyPress Handlers
    const handleAddressChange = useCallback((e) => {
        const value = e.target.value;
        setAddressInput(value); // Keep raw value for typing, format on blur
        validateField('addressInput', value);
        logDebug(`(handleAddressChange): Address input changed to "${value}".`);
        setIsAvailabilityChecked(false); // Clear check availability status
        setIsSlotAvailable(null); // Clear availability status
        setSuggestedSlots([]); // Clear suggested slots
        setGeocodeMessage(''); // Clear geocode message as text input changed
        setMapLatitude(null); // Clear map coordinates if address text changes
        setMapLongitude(null);
        // isDateTimeSectionEnabled is now managed by a dedicated useEffect
    }, [validateField, logDebug]);


    // Combined handler for Colonia and Postal Code (so we can validate them together on blur/change)
    const handleAddressFieldChange = useCallback((e) => {
        const { id, value } = e.target;
        if (id === 'coloniaInput') {
            handleColoniaChange(value); // Use the existing specialized colonia handler
        } else if (id === 'postalCodeInput') {
            setPostalCodeInput(value);
            setFieldErrors(prev => ({ ...prev, postalCodeInput: '' }));
            logDebug(`(handlePostalCodeInputChange): Postal Code input changed to "${value}".`);
            setIsAvailabilityChecked(false);
            setIsSlotAvailable(null);
            setSuggestedSlots([]);
        } else {
            // Re-use existing for other address fields if any, or create dedicated handlers
            // For example: setAddressInput for street_address
            setAddressInput(e.target.value);
        }
        setError(null);
        setMessage('');
    }, [handleColoniaChange, logDebug]);


    const handleColoniaInputKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (showColoniaSuggestions && coloniasList.length > 0) {
                setHighlightedColoniaIndex(prev => (prev === coloniasList.length - 1 ? 0 : prev + 1));
                setTimeout(() => {
                    const activeItem = coloniaSuggestionsListRef.current?.querySelector(`[data-index="${(highlightedColoniaIndex + 1) % coloniasList.length}"]`);
                    activeItem?.scrollIntoView({ block: 'nearest' });
                }, 0);
            } else if (coloniaInput.trim().length >= 2 && !showColoniaSuggestions && allColoniasRef.current.length > 0) {
                const filtered = allColoniasRef.current.filter(colonia =>
                    colonia.name.toLowerCase().includes(coloniaInput.toLowerCase()) ||
                    (colonia.postal_code && colonia.postal_code.includes(coloniaInput))
                );
                setColoniasList(filtered);
                setShowColoniaSuggestions(filtered.length > 0);
                if (filtered.length > 0) setHighlightedColoniaIndex(0);
            } else if (allColoniasRef.current.length === 0) {
                fetchColonias('');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (showColoniaSuggestions && coloniasList.length > 0) {
                setHighlightedColoniaIndex(prev => (prev === 0 ? coloniasList.length - 1 : prev - 1));
                setTimeout(() => {
                    const activeItem = coloniaSuggestionsListRef.current?.querySelector(`[data-index="${(highlightedColoniaIndex - 1 + coloniasList.length) % coloniasList.length}"]`);
                    activeItem?.scrollIntoView({ block: 'nearest' });
                }, 0);
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedColoniaIndex !== -1 && coloniasList[highlightedColoniaIndex]) {
                handleSelectColonia(coloniasList[highlightedColoniaIndex]);
            } else if (coloniaInput.trim()) {
                setShowColoniaSuggestions(false);
                setHighlightedColoniaIndex(-1);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowColoniaSuggestions(false);
            setHighlightedColoniaIndex(-1);
        }
    }, [showColoniaSuggestions, coloniasList, coloniaInput, handleSelectColonia, highlightedColoniaIndex, allColoniasRef, fetchColonias]);


    const handleBreedInputChange = useCallback(async (e) => {
        const value = e.target.value;
        setPetBreedInput(value);
        setSelectedBreed(null);
        setFieldErrors(prev => ({ ...prev, petBreedInput: '' }));
        setSizeInput('');
        logDebug(`(handleBreedInputChange): Breed input changed to "${value}".`);
        setHighlightedBreedIndex(-1);

        if (breedSearchDebounceTimeout.current) clearTimeout(breedSearchDebounceTimeout.current);

        if (value.trim().length >= 2) {
            breedSearchDebounceTimeout.current = setTimeout(() => {
                if (allBreedsRef.current.length > 0) {
                    logDebug("(handleBreedInputChange): Filtering breeds from in-memory cache.");
                    const filteredBreeds = allBreedsRef.current.filter(breed =>
                        breed.name.toLowerCase().includes(value.toLowerCase())
                    );
                    setBreedsList(filteredBreeds);
                    setShowBreedSuggestions(filteredBreeds.length > 0);
                    logDebug(`(handleBreedInputChange): Found ${filteredBreeds.length} breeds from cache.`);
                } else {
                    logDebug("(handleBreedInputChange): Cache empty, attempting to fetch all breeds to populate cache.");
                    fetchBreeds(''); // Fetch all to populate cache
                    logDebug("(handleBreedInputChange): Setting loading to TRUE (fetching breeds for cache).");
                    setLoading(true);
                }
            }, 300);
        } else {
            setBreedsList([]);
            setShowBreedSuggestions(false);
            logDebug("(handleBreedInputChange): Breed input too short, clearing suggestions.");
        }
    }, [allBreedsRef, fetchBreeds, logDebug]);


    const handleBreedInputKeyDown = useCallback((e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (showBreedSuggestions && breedsList.length > 0) {
                setHighlightedBreedIndex(prev => (prev === breedsList.length - 1 ? 0 : prev + 1));
                const activeItem = breedSuggestionsListRef.current?.querySelector(`[data-index="${(highlightedBreedIndex + 1) % breedsList.length}"]`);
                activeItem?.scrollIntoView({ block: 'nearest' });
            } else if (petBreedInput.trim().length >= 2 && !showBreedSuggestions && allBreedsRef.current.length > 0) {
                const filtered = allBreedsRef.current.filter(breed =>
                    breed.name.toLowerCase().includes(petBreedInput.toLowerCase())
                );
                setBreedsList(filtered);
                setShowBreedSuggestions(filtered.length > 0);
                if (filtered.length > 0) setHighlightedBreedIndex(0);
            } else if (allBreedsRef.current.length === 0) {
                fetchBreeds('');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (showBreedSuggestions && breedsList.length > 0) {
                setHighlightedBreedIndex(prev => (prev === 0 ? breedsList.length - 1 : prev - 1));
                const activeItem = breedSuggestionsListRef.current?.querySelector(`[data-index="${(highlightedBreedIndex - 1 + breedsList.length) % breedsList.length}"]`);
                activeItem?.scrollIntoView({ block: 'nearest' });
            }
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightedBreedIndex !== -1 && breedsList[highlightedBreedIndex]) {
                handleSelectBreed(breedsList[highlightedBreedIndex]);
            } else if (petBreedInput.trim()) {
                setShowBreedSuggestions(false);
                setHighlightedBreedIndex(-1);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setShowBreedSuggestions(false);
            setHighlightedBreedIndex(-1);
        }
    }, [showBreedSuggestions, breedsList, highlightedBreedIndex, petBreedInput, handleSelectBreed, allBreedsRef, fetchBreeds]);


    const handlePetNameInputTrigger = useCallback((e) => {
        logDebug("(handlePetNameInputTrigger): Disparado.");
        const value = e.target.value;
        const formattedValue = toTitleCase(value); // Apply title case here
        setPetNameInput(formattedValue);
        logDebug(`(handlePetNameInputTrigger): Name formatted: ${formattedValue}`);

        if (selectedPet && formattedValue !== selectedPet.name || (!selectedPet && formattedValue.length === 0 && isPetDataFetched)) {
            setIsPetDataFetched(false);
            logDebug("(handlePetNameInputTrigger): Pet name input changed or cleared, resetting isPetDataFetched.");
            setSelectedPet(null);
            setIsNewPet(false);
            setPetBreedInput('');
            setSelectedBreed(null);
            setSizeInput('');
            setIsAvailabilityChecked(false); // Reset availability status
            setIsSlotAvailable(null); // Clear availability status
            setSuggestedSlots([]); // Clear suggested slots
        }

        if (petSearchDebounceTimeout.current) clearTimeout(petSearchDebounceTimeout.current);

        const hasEnoughPetInput = formattedValue.trim().length >= 2;
        const isClientConfirmedForPetSection = selectedClient || (isNewClient && clientFullNameInput.trim() && (clientPhoneInput.trim().length === 10 || (clientEmailInput.trim() && emailRegex.test(clientEmailInput.trim()))));

        if (formattedValue.trim() && isClientConfirmedForPetSection && hasEnoughPetInput && !isPetDataFetched) {
            logDebug(`(handlePetNameInputTrigger): Conditions met for debounced pet search: clientReady=${isClientConfirmedForPetSection}, enoughInput=${hasEnoughPetInput}, notFetchedYet=${!isPetDataFetched}.`);
            petSearchDebounceTimeout.current = setTimeout(() => {
                logDebug("(handlePetNameInputTrigger): Debounce: Invoking performPetSearch.");
                performPetSearch(formattedValue, selectedClient?.id);
            }, 750);
        } else if (isPetDataFetched) {
            logDebug(`(handlePetNameInputTrigger): Pet search skipped: Data already fetched for current input combination.`);
            logDebug("(handlePetNameInputTrigger): Setting loading to FALSE (pet search skipped - data fetched).");
            setLoading(false);
        } else {
            logDebug("(handlePetNameInputTrigger): Pet search skipped: Insufficient input or client not ready.");
            logDebug("(handlePetNameInputTrigger): Setting loading to FALSE (pet search skipped - insufficient input).");
            setLoading(false);
        }

    }, [performPetSearch, selectedClient, isNewClient, clientFullNameInput, clientPhoneInput, clientEmailInput, isNewPet, toTitleCase, selectedPet, logDebug, isPetDataFetched, emailRegex]);


    const handlePetNameInputKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const isValid = validateField('petName', petNameInput);
            logDebug(`(handlePetNameInputKeyPress): Pet Name validation: ${isValid}.`);
            if (isValid) {
                e.target.blur();
                if (isPetSectionEnabled && petBreedInputRef.current) {
                    petBreedInputRef.current.focus();
                    logDebug("(handlePetNameInputKeyPress): Focusing on pet breed input.");
                } else if (isPetSectionEnabled && sizeInputRef.current) { // Fallback if breed not needed
                    sizeInputRef.current.focus();
                    logDebug("(handlePetNameInputKeyPress): Focusing on pet size input.");
                } else if (isAddressSectionEnabled && addressInputRef.current) {
                    addressInputRef.current.focus();
                    logDebug("(handlePetNameInputKeyPress): Pet section complete. Focusing on address input.");
                }
            }
        }
    }, [petNameInput, validateField, isPetSectionEnabled, isAddressSectionEnabled, logDebug]);

    const handlePetBreedInputBlur = useCallback((e) => {
        validateField('petBreedInput', petBreedInput);
        setPetBreedInput(toTitleCase(e.target.value)); // Apply title case here
        logDebug(`(handlePetBreedInputBlur): Pet Breed input blurred. Value: "${e.target.value}".`);
    }, [petBreedInput, validateField, toTitleCase, logDebug]);

    const handlePetBreedInputKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const isValid = validateField('petBreedInput', petBreedInput);
            logDebug(`(handlePetBreedInputKeyPress): Pet Breed validation: ${isValid}.`);
            if (isValid && petBreedInput.trim()) {
                e.target.blur();
                if (isPetSectionEnabled && sizeInputRef.current) {
                    sizeInputRef.current.focus();
                    logDebug("(handlePetBreedInputKeyPress): Focusing on pet size input.");
                } else if (isAddressSectionEnabled && addressInputRef.current) {
                    addressInputRef.current.focus();
                    logDebug("(handlePetNameInputKeyPress): Pet section complete. Focusing on address input.");
                }
            }
        }
    }, [petBreedInput, validateField, isPetSectionEnabled, isAddressSectionEnabled, logDebug]);

    const handleSizeInputKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const isValid = validateField('sizeInput', sizeInput);
            logDebug(`(handleSizeInputKeyPress): Size input validation: ${isValid}.`);
            if (isValid) {
                e.target.blur();
                if (isAddressSectionEnabled && addressInputRef.current) {
                    addressInputRef.current.focus();
                    logDebug("(handleSizeInputKeyPress): Pet section complete. Focusing on address input.");
                }
            }
        }
    }, [sizeInput, validateField, isAddressSectionEnabled, logDebug]);


    const handleClientFieldChange = useCallback((e) => {
        const { id, value } = e.target;
        let formattedValue = value;

        if (id === 'clientFullName') {
            formattedValue = value; // Apply on blur
            setClientFullNameInput(formattedValue);
        } else if (id === 'clientPhone') {
            formattedValue = value.replace(/[^0-9]/g, '');
            setClientPhoneInput(formattedValue);
        } else if (id === 'clientEmail') {
            setClientEmailInput(value);
        } else if (id === 'addressInput') {
            formattedValue = value; // Apply on blur
            setAddressInput(formattedValue);
        } else if (id === 'coloniaInput') {
            // No direct set, defer to handleAddressFieldChange or handleColoniaChange
        } else if (id === 'postalCodeInput') {
            // No direct set, defer to handleAddressFieldChange
        }

        // Validate generic client fields immediately
        if (id === 'clientFullName' || id === 'clientPhone' || id === 'clientEmail') {
            validateField(id, formattedValue);
        }
        // Address specific fields are validated within handleAddressFieldChange or on blur

        setError(null);
        setMessage('');
        setIsAvailabilityChecked(false); // Clear check availability status
        setIsSlotAvailable(null); // Clear availability status
        setSuggestedSlots([]); // Clear suggested slots


        // If client was selected (existing), and a primary field changes, we need to invalidate fetched data
        const isClientDataStale = selectedClient && (
            (id === 'clientFullName' && formatFullName(value) !== selectedClient.name) ||
            (id === 'clientPhone' && value.replace(/[^0-9]/g, '') !== selectedClient.phone) ||
            (id === 'clientEmail' && value !== selectedClient.email)
        );
        // If it was a new client that was "resolved" and now inputs are cleared
        const isNewClientDataCleared = isNewClient && isClientDataFetched && (
            (id === 'clientFullName' && value.length === 0) ||
            (id === 'clientPhone' && value.length === 0) ||
            (id === 'clientEmail' && value.length === 0)
        );


        if (isClientDataStale || isNewClientDataCleared) {
            logDebug(`(handleClientFieldChange ${id}): Detected change in client info making it stale. Resetting client data and disabling dependent sections.`);
            setSelectedClient(null);
            setIsNewClient(false);
            setIsPetSectionEnabled(false);
            setIsAddressSectionEnabled(false);
            setIsDateTimeSectionEnabled(false);
            setPetNameInput(''); setSelectedPet(null); setIsNewPet(false); setPetBreedInput(''); setSelectedBreed(null); setSizeInput('');
            setAddressInput(''); setColoniaInput(''); setSelectedColonia(null); setPostalCodeInput(''); // CLEAR POSTAL CODE HERE TOO
            setAppointmentDate(''); setAppointmentTime(''); setTimeFilter(''); setIsSlotAvailable(null); setSuggestedSlots([]);
            setIsClientDataFetched(false); // This is crucial: marks data as not fetched, allowing re-search on blur
            setShowMapSection(false);
            setGeocodeMessage('');
            setMapLatitude(null); // Clear map coords on client info reset
            setMapLongitude(null);
        }

        if (clientSearchDebounceTimeout.current) clearTimeout(clientSearchDebounceTimeout.current);
    }, [selectedClient, isClientDataFetched, logDebug, formatFullName, validateField, setShowMapSection, isNewClient, clientPhoneInput, clientEmailInput]); // Removed `handleColoniaChange` and `handleAddressFieldChange` as they are called separately where appropriate


    const handleClientFieldBlur = useCallback((e) => {
        const { id, value } = e.target;
        logDebug(`(handleClientFieldBlur): Blur event detected for ${id}. Current value: "${value}".`);

        let formattedValue = value;
        if (id === 'clientFullName') {
            formattedValue = formatFullName(value); // Use formatFullName for consistency with names
            setClientFullNameInput(formattedValue);
        } else if (id === 'addressInput') {
            formattedValue = toTitleCase(value);
            setAddressInput(formattedValue);
        } else if (id === 'coloniaInput' && !selectedColonia) { // Only apply toTitleCase if it's a manually typed colonia, not a selected one
            formattedValue = toTitleCase(value);
            setColoniaInput(formattedValue);
        } else if (id === 'postalCodeInput') { // Apply validation on blur for postal code
            validateField('postalCodeInput', value);
        }
        
        // General validation call for all fields on blur if it's not handled by handleClientFieldChange directly
        validateField(id, formattedValue);

        if (clientSearchDebounceTimeout.current) clearTimeout(clientSearchDebounceTimeout.current);

        const currentClientFullName = clientFullNameInput.trim();
        const currentClientPhone = clientPhoneInput.trim();
        const currentClientEmail = clientEmailInput.trim();

        const hasClientPrimaryContact = (currentClientPhone.length === 10 && !fieldErrors.clientPhone) || (currentClientEmail.trim() && emailRegex.test(currentClientEmail.trim()) && !fieldErrors.clientEmail);
        const hasEnoughClientNameInput = currentClientFullName.length >= 2;
        const hasEnoughInputToSearch = hasEnoughClientNameInput || hasClientPrimaryContact;

        logDebug(`(handleClientFieldBlur) Blur check: Has enough input to search: ${hasEnoughInputToSearch}, Client Data Fetched: ${isClientDataFetched}`);

        if (hasEnoughInputToSearch && !isClientDataFetched) {
            logDebug(`(handleClientFieldBlur): Conditions met for debounced client search. Calling performClientSearch.`);
            clientSearchDebounceTimeout.current = setTimeout(() => {
                logDebug("(handleClientFieldBlur): Debounce timer fired. Invoking performClientSearch.");
                performClientSearch(currentClientFullName, currentClientPhone, currentClientEmail);
            }, 750);
        } else if (isClientDataFetched && !hasEnoughInputToSearch) {
            // If inputs are now insufficient but data was previously fetched, reset everything
            logDebug("(handleClientFieldBlur): Insufficient input after data fetched. Resetting all client/pet/address/datetime states.");
            setSelectedClient(null);
            setIsNewClient(false);
            setIsPetSectionEnabled(false);
            setIsAddressSectionEnabled(false);
            setIsDateTimeSectionEnabled(false);
            setPetNameInput(''); setSelectedPet(null); setIsNewPet(false); setPetBreedInput(''); setSelectedBreed(null); setSizeInput('');
            setAddressInput(''); setColoniaInput(''); setSelectedColonia(null); setPostalCodeInput(''); // CLEAR POSTAL CODE HERE TOO
            setAppointmentDate(''); setAppointmentTime(''); setTimeFilter(''); setIsSlotAvailable(null); setSuggestedSlots([]);
            setIsAvailabilityChecked(false);
            setIsClientDataFetched(false); // Crucial to allow new search later
            setShowMapSection(false);
            setGeocodeMessage('');
            setMapLatitude(null); // Clear map coords on full reset
            setMapLongitude(null);
            setFieldErrors(prev => ({
                ...prev,
                clientFullName: '',
                clientPhone: '',
                clientEmail: '',
                addressInput: '',
                coloniaInput: '',
                postalCodeInput: '', // CLEAR POSTAL CODE ERROR
            }));
        } else if (isClientDataFetched) {
            logDebug(`(handleClientFieldBlur): Client search skipped: Data already fetched and inputs still sufficient.`);
        } else {
            logDebug("(handleClientFieldBlur): Client search skipped: Insufficient input to trigger search, and no prior data fetched.");
        }
        logDebug("(handleClientFieldBlur): Setting loading to FALSE (end of blur handler).");
        setLoading(false);

        // isDateTimeSectionEnabled is now managed by a dedicated useEffect
    }, [clientFullNameInput, clientPhoneInput, clientEmailInput, addressInput, coloniaInput, selectedColonia, performClientSearch, logDebug, validateField, emailRegex, isClientDataFetched, fieldErrors, isNewClient, isAddressSectionEnabled, toTitleCase, formatFullName]);


    const handleClientInfoKeyPress = useCallback((e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const { id, value } = e.target;

            const isValid = validateField(id, value);

            if (isValid) {
                e.target.blur(); // Blur the current field

                if (id === 'clientFullName' && clientPhoneInputRef.current) {
                    clientPhoneInputRef.current.focus();
                    logDebug("(handleClientInfoKeyPress): Focusing on client phone.");
                } else if (id === 'clientPhone') {
                    if (value.trim().length === 10 || value.trim().length === 0) {
                        clientEmailInputRef.current.focus();
                        logDebug("(handleClientInfoKeyPress): Focusing on client email.");
                    } else {
                        setFieldErrors(prev => ({ ...prev, clientPhone: t('phoneNumber10Digits') }));
                        clientPhoneInputRef.current.focus();
                        logDebug(`(handleClientInfoKeyPress): Phone invalid. Keeping focus on phone.`);
                    }
                } else if (id === 'clientEmail') {
                    // Do nothing here explicitly to set focus.
                    // The useEffect below will handle focusing petNameInputRef
                    // once `isClientDataFetched` and `isPetSectionEnabled` are true.
                    logDebug("(handleClientInfoKeyPress): Client Email Enter pressed. Focus will be handled by useEffect after client data resolves.");
                } else if (id === 'addressInput') {
                    if (coloniaInputRef.current) {
                        coloniaInputRef.current.focus();
                        logDebug("(handleClientInfoKeyPress): Focusing on colonia input.");
                    }
                } else if (id === 'coloniaInput') {
                    if (postalCodeInputRef.current) { // Focus postal code after colonia
                        postalCodeInputRef.current.focus();
                        logDebug("(handleClientInfoKeyPress): Focusing on postal code input.");
                    }
                } else if (id === 'postalCodeInput') {
                    // After postal code, allow blur and the useEffect for isDateTimeSectionEnabled to run
                    logDebug("(handleClientInfoKeyPress): Postal Code Enter pressed. Blurring field.");
                }
            } else {
                e.target.focus();
                logDebug(`(handleClientInfoKeyPress): Validation failed for ${id}. Keeping focus on current field.`);
            }
        }
    }, [validateField, clientFullNameInput, clientPhoneInput, t, logDebug, fieldErrors]);


    const handleDateChange = useCallback((e) => {
        const newDate = e.target.value;
        setAppointmentDate(newDate);
        setAppointmentTime(''); // Always clear time when date changes
        setTimeFilter('');       // Reset time filter to show all options
        setIsSlotAvailable(null); // Reset availability status
        setSuggestedSlots([]);
        setError(null);
        setMessage('');
        applyValidationStyles(null); // Clear border styles
        setIsAvailabilityChecked(false); // Clear check availability status for the button
        logDebug(`(handleDateChange): Date changed to ${newDate}. Resetting slot validation status.`);
    }, [logDebug, applyValidationStyles]);


    const handleTimeFilterChange = useCallback((e) => {
        const value = e.target.value;
        setTimeFilter(value);
        setAppointmentTime(''); // Clear selected time until a valid one is chosen or re-validated
        setIsSlotAvailable(null); // Reset availability status
        setError(null);
        setMessage('');
        setShowTimeOptions(true);
        setFieldErrors(prev => ({ ...prev, appointmentTime: '' }));
        setIsAvailabilityChecked(false); // Clear check availability status for the button
        logDebug(`(handleTimeFilterChange): Time filter changed to "${value}". Resetting slot validation status.`);
    }, [logDebug]);

    const handleTimeFilterBlur = useCallback(() => {
        logDebug("(handleTimeFilterBlur): Time filter blurred. Hiding suggestions with delay.");
        setTimeout(() => {
            setShowTimeOptions(false);
            if (!appointmentTime) { // If no time was officially selected from list/validated
                logDebug("(handleTimeFilterBlur): No specific time selected, triggering validation for empty appointmentTime.");
                validateField('appointmentTime', ''); // Re-validate to mark as error if needed
            }
        }, 150);
    }, [appointmentTime, validateField, logDebug]);


    const handleTimeFilterFocus = useCallback(() => {
        logDebug("(handleTimeFilterFocus): Time filter focused. Showing suggestions if available.");
        setShowTimeOptions(true);
    }, [logDebug]);


    // Confirmation & Toggle Handlers
    const handleConfirmNameChange = useCallback((confirm) => {
        logDebug("(handleConfirmNameChange): Setting loading to TRUE.");
        setLoading(true);
        logDebug(`(handleConfirmNameChange): Name change confirmation: ${confirm}`);
        if (confirm && clientToConfirm) {
            setSelectedClient({ ...clientToConfirm, full_name: proposedClientName });
            setClientFullNameInput(proposedClientName);
            setClientPhoneInput(clientToConfirm.phone || '');
            setClientEmailInput(clientToConfirm.email || '');
            if (clientToConfirm.addresses) {
                setAddressInput(toTitleCase(clientToConfirm.addresses.street_address || '')); // Apply here too
                setColoniaInput(toTitleCase(clientToConfirm.addresses.colonias?.name || '')); // Apply here too
                setPostalCodeInput(clientToConfirm.addresses.postal_code || ''); // SET POSTAL CODE
                setSelectedColonia(clientToConfirm.addresses.colonias || null);
            } else {
                setAddressInput(''); setColoniaInput(''); setPostalCodeInput(''); // CLEAR POSTAL CODE
                setSelectedColonia(null);
            }
            setIsNewClient(false);
            setMessage(t('clientNameUpdatedConfirmed'));
            setIsPetSectionEnabled(true);
            setIsAddressSectionEnabled(true);
            setIsClientDataFetched(true);
            logDebug("(handleConfirmNameChange): Client name confirmed and updated. Pet/Address sections enabled.");
            // Removed direct focus here, will be handled by useEffect that watches isClientDataFetched
        } else if (clientToConfirm) {
            logDebug("(handleConfirmNameChange): Name change cancelled. Reverting to original client data.");
            setClientFullNameInput(originalClientName);
            setSelectedClient(clientToConfirm);
            setClientPhoneInput(clientToConfirm.phone || '');
            setClientEmailInput(clientToConfirm.email || '');
            if (clientToConfirm.addresses) {
                setAddressInput(toTitleCase(clientToConfirm.addresses.street_address || '')); // Apply here too
                setColoniaInput(toTitleCase(clientToConfirm.addresses.colonias?.name || '')); // Apply here too
                setPostalCodeInput(clientToConfirm.addresses.postal_code || ''); // SET POSTAL CODE
                setSelectedColonia(clientToConfirm.addresses.colonias || null);
            } else {
                setAddressInput(''); setColoniaInput(''); setPostalCodeInput(''); // CLEAR POSTAL CODE
                setSelectedColonia(null);
            }
            setIsNewClient(false);
            setMessage(t('clientNameChangeCancelled'));
            setIsPetSectionEnabled(true);
            setIsAddressSectionEnabled(true);
            setIsClientDataFetched(true);
            logDebug("(handleConfirmNameChange): Client data reverted. Pet/Address sections enabled.");
            // Removed direct focus here, will be handled by useEffect that watches isClientDataFetched
        }
        setShowNameChangeConfirmation(false);
        setProposedClientName('');
        setOriginalClientName('');
        setClientToConfirm(null);
        setError(null);
        logDebug("(handleConfirmNameChange): Setting loading to FALSE after confirmation.");
        setLoading(false);
    }, [proposedClientName, originalClientName, clientToConfirm, t, logDebug, collectionType, toTitleCase]);


    const handleToggleServiceType = useCallback((type) => {
        logDebug(`(handleToggleServiceType): Toggling service type: ${type}`);
        setError(null);
        setMessage('');
        setIsAvailabilityChecked(false); // Clear check availability status
        setIsSlotAvailable(null); // Clear availability status
        setSuggestedSlots([]); // Clear suggested slots

        if (type === 'Grooming') {
            if (isGroomingSelected && !isMedicalSelected) {
                setError(t('atLeastOneService'));
                logDebug("(handleToggleServiceType): Error: Must select at least one service.");
            }
            else setIsGroomingSelected(prev => !prev);
        } else if (type === 'Medical') {
            if (isMedicalSelected && !isGroomingSelected) {
                setError(t('atLeastOneService'));
                logDebug("(handleToggleServiceType): Error: Must select at least one service.");
            }
            else setIsMedicalSelected(prev => !prev);
        }
    }, [isGroomingSelected, isMedicalSelected, t, logDebug]);


    const handleValidateAvailabilityButtonClick = useCallback(async () => { // Removed arguments, will pull from state
        logDebug("Check Availability button clicked!");
        logDebug(`--- Check Availability Conditions Debug (from button click) ---`);

        // Capture current state values for validation and payload
        const currentAppointmentDate = appointmentDate;
        const currentAppointmentTime = appointmentTime;
        const currentDurationMinutes = durationMinutes;
        const currentClientFullName = clientFullNameInput;
        const currentClientPhone = clientPhoneInput;
        const currentClientEmail = clientEmailInput;
        const currentPetName = petNameInput;
        const currentPetBreed = petBreedInput;
        const currentPetSize = sizeInput;
        const currentCollectionType = collectionType;
        const currentMapLatitude = mapLatitude;
        const currentMapLongitude = mapLongitude;
        const currentIsGroomingSelected = isGroomingSelected;
        const currentIsMedicalSelected = isMedicalSelected;
        const currentSelectedClient = selectedClient;
        const currentSelectedPet = selectedPet;
        const currentSelectedBreed = selectedBreed;
        const currentSelectedColonia = selectedColonia;
        const currentAddressInput = addressInput;
        const currentColoniaInput = coloniaInput;
        const currentPostalCodeInput = postalCodeInput; // CAPTURE POSTAL CODE
        const currentNotes = notes;
        const currentStatus = status;

        logDebug(`loading: ${loading}`);
        logDebug(`appointmentDate: "${currentAppointmentDate}" (truthy: ${!!currentAppointmentDate})`);
        logDebug(`appointmentTime: "${currentAppointmentTime}" (truthy: ${!!currentAppointmentTime})`);
        logDebug(`durationMinutes: ${currentDurationMinutes}`);
        logDebug(`isDateTimeSectionEnabled: ${isDateTimeSectionEnabled}`);
        logDebug(`clientFullNameInput: "${currentClientFullName}"`);
        logDebug(`clientPhoneInput: "${currentClientPhone}"`);
        logDebug(`clientEmailInput: "${currentClientEmail}"`);
        logDebug(`petNameInput: "${currentPetName}"`);
        logDebug(`petBreedInput: "${currentPetBreed}"`);
        logDebug(`sizeInput: "${currentPetSize}"`);
        logDebug(`collectionType: "${currentCollectionType}"`);
        logDebug(`mapLatitude: ${currentMapLatitude}, mapLongitude: ${currentMapLongitude}`);
        logDebug(`isGroomingSelected: ${currentIsGroomingSelected}, isMedicalSelected: ${currentIsMedicalSelected}`);
        logDebug(`------------------------------------------`);

        // Detailed logging for areClientAndPetDetailsValid sub-conditions, using current state
        logDebug(`--- areClientAndPetDetailsValid Sub-Conditions (from button click) ---`);
        const _clientFullNameValid = !!currentClientFullName.trim() && !fieldErrors.clientFullName;
        const _clientPhoneValid = currentClientPhone.trim().length === 10 && !fieldErrors.clientPhone;
        const _clientEmailValid = !!currentClientEmail.trim() && emailRegex.test(currentClientEmail.trim()) && !fieldErrors.clientEmail;
        const _hasPrimaryContact = _clientPhoneValid || (isEmailRequired && _clientEmailValid);
        const _petNameValid = !!currentPetName.trim() && !fieldErrors.petName;
        const _petBreedValid = !!currentPetBreed.trim() && !fieldErrors.petBreedInput;
        const _sizeValid = !!currentPetSize.trim() && !fieldErrors.sizeInput;

        logDebug(`  clientFullNameInput: "${currentClientFullName.trim()}" (valid: ${_clientFullNameValid})`);
        logDebug(`  clientPhoneInput: "${currentClientPhone.trim()}" (valid: ${_clientPhoneValid})`);
        logDebug(`  clientEmailInput: "${currentClientEmail.trim()}" (valid: ${_clientEmailValid})`);
        logDebug(`  isEmailRequired: ${isEmailRequired}`);
        logDebug(`  hasPrimaryContact (phone OR email): ${_hasPrimaryContact}`);
        logDebug(`  petNameInput: "${currentPetName.trim()}" (valid: ${_petNameValid})`);
        logDebug(`  petBreedInput: "${currentPetBreed.trim()}" (valid: ${_petBreedValid})`);
        logDebug(`  sizeInput: "${currentPetSize.trim()}" (valid: ${_sizeValid})`);
        logDebug(`  Current fieldErrors (from state):`, fieldErrors);

        // This is the core condition that was aborting early
        const areClientAndPetDetailsValid =
            _clientFullNameValid &&
            _hasPrimaryContact &&
            _petNameValid &&
            _petBreedValid &&
            _sizeValid;

        logDebug(`  Overall areClientAndPetDetailsValid (from button click): ${areClientAndPetDetailsValid}`);
        logDebug(`-------------------------------------------------`);

        setFieldErrors(prev => ({ ...prev, appointmentTime: '', appointmentDate: '' }));
        setIsAvailabilityChecked(false); // Reset the button state, will be set to true at the end
        setIsSlotAvailable(null); // Clear previous availability state

        // Frontend validation before calling API - (These are the same as before, ensuring local checks still pass)
        if (!areClientAndPetDetailsValid) {
            setError(t('completeClientPetDetailsFirst'));
            setSuggestedSlots([]);
            applyValidationStyles(null);
            logDebug("(validateAppointmentSlot): Client/Pet details not valid, aborting slot validation.");
            setLoading(false); // Ensure loading is off if validation fails early
            return;
        }

        if (!currentAppointmentDate || !currentDurationMinutes || !tenantName || !session || currentDurationMinutes === 0) {
            setError(t('appointmentTimeDateDurationRequired'));
            setSuggestedSlots([]);
            applyValidationStyles(null);
            logDebug("(validateAppointmentSlot): Missing date/duration/auth. Aborting slot validation.");
            setLoading(false); // Ensure loading is off if validation fails early
            return;
        }

        // Validate map coordinates for pickup appointments and postal code
        if (currentIsGroomingSelected && currentCollectionType === 'pickup') {
            if (!currentMapLatitude || !currentMapLongitude) {
                setError(t('addressMustBeMappedForPickup'));
                setSuggestedSlots([]);
                applyValidationStyles(false);
                logDebug("(validateAppointmentSlot): Pickup selected, but map coordinates are missing. Aborting slot validation.");
                setLoading(false);
                return;
            }
            if (!currentPostalCodeInput.trim() || fieldErrors.postalCodeInput) { // Check postal code explicitly
                setError(t('postalCodeRequired'));
                setSuggestedSlots([]);
                applyValidationStyles(false);
                logDebug("(validateAppointmentSlot): Pickup selected, but postal code is missing/invalid. Aborting slot validation.");
                setLoading(false);
                return;
            }
        }

        // Validate at least one service type is selected
        if (!currentIsGroomingSelected && !currentIsMedicalSelected) {
            setError(t('atLeastOneService'));
            setSuggestedSlots([]);
            applyValidationStyles(false);
            logDebug("(validateAppointmentSlot): No service type selected. Aborting slot validation.");
            setLoading(false); // Ensure loading is off if validation fails early
            return;
        }

        logDebug("(handleValidateAvailabilityButtonClick): Setting loading to TRUE (pre-API call).");
        setLoading(true);
        setError(null);
        setMessage('');
        setShowSlotSuggestionsModal(false);

        // --- Construct the FULL Payload for the Edge Function ---
        const selectedTypesArray = [];
        if (currentIsGroomingSelected) selectedTypesArray.push('Grooming');
        if (currentIsMedicalSelected) selectedTypesArray.push('Medical');

        const addressDataToSend = (isAddressSectionEnabled && (currentAddressInput.trim() || currentColoniaInput.trim() || currentPostalCodeInput.trim() || (currentMapLatitude && currentMapLongitude))) ? { // ADDED POSTAL CODE TO ADDRESS CHECK
            id: currentSelectedClient?.addresses?.id || null,
            street_address: currentAddressInput.trim() || null,
            colonia_id: currentSelectedColonia?.id || null,
            colonia_name_if_new: currentSelectedColonia ? null : (currentColoniaInput.trim() || null),
            postal_code: currentPostalCodeInput.trim() || null, // SEND POSTAL CODE
        } : null;

        const clientDataToSend = {
            id: currentSelectedClient?.id || null,
            full_name: currentClientFullName.trim(),
            phone_number: currentClientPhone.trim() || null,
            email: currentClientEmail.trim() || null,
        };

        let petBreedId = currentSelectedBreed?.id || null;
        let petSpecies = (currentSelectedBreed ? currentSelectedBreed.name : 'Unknown');
        let petSize = currentPetSize.trim() || (currentSelectedBreed ? currentSelectedBreed.default_size : null) || 'small';

        // Handle case where new pet is typed but no breed chosen, default to 'Snauzer'
        if (isNewPet && !petBreedId && allBreedsRef.current.length > 0) {
            const defaultBreed = allBreedsRef.current.find(b => b.name.toLowerCase() === 'snauzer');
            if (defaultBreed) {
                petBreedId = defaultBreed.id;
                petSpecies = defaultBreed.name;
                petSize = defaultBreed.default_size || 'small';
                logDebug("(handleValidateAvailabilityButtonClick): Defaulted new pet breed to Snauzer as none selected.");
            }
        }

        const petDataToSend = (isPetSectionEnabled && (currentPetName.trim() || currentPetBreed.trim() || currentPetSize.trim())) ? {
            id: currentSelectedPet?.id || null,
            name: currentPetName.trim(),
            species: petSpecies,
            breed_id: petBreedId,
            size: petSize,
        } : null;

        const finalCategory = (currentIsGroomingSelected && currentIsMedicalSelected) ? 'Hybrid' : (currentIsGroomingSelected ? 'Grooming' : (currentIsMedicalSelected ? 'Medical' : null));

        const payload = {
            appointment_date: currentAppointmentDate,
            appointment_time: currentAppointmentTime,
            duration_minutes: currentDurationMinutes,
            tenantName: tenantName,
            client: clientDataToSend,
            address: addressDataToSend,
            pet: petDataToSend,
            collection_type: currentIsGroomingSelected ? currentCollectionType : null,
            appointment_types: selectedTypesArray,
            notes: currentNotes,
            status: currentStatus,
            category: finalCategory,
            tags: tags,
            pickup_coordinates: currentCollectionType === 'pickup' && currentMapLatitude && currentMapLongitude
                                ? { latitude: currentMapLatitude, longitude: currentMapLongitude }
                                : null
        };

        // Clean up empty objects/props from payload before sending
        if (payload.client) {
            Object.keys(payload.client).forEach(key => payload.client[key] === null || payload.client[key] === '' ? delete payload.client[key] : {});
            if (Object.keys(payload.client).length === 0) delete payload.client;
        }
        if (payload.address) {
            Object.keys(payload.address).forEach(key => payload.address[key] === null || payload.address[key] === '' ? delete payload.address[key] : {});
            if (Object.keys(payload.address).length === 0) delete payload.address;
        }
        if (payload.pet) {
            Object.keys(payload.pet).forEach(key => payload.pet[key] === null || payload.pet[key] === '' ? delete payload.pet[key] : {});
            if (Object.keys(payload.pet).length === 0) delete payload.pet;
        }

        // --- NEW DEBUG LOG: Display the payload being sent ---
        logDebug("Sending payload to apt_validation Edge Function:", JSON.stringify(payload, null, 2));
        // --- END NEW DEBUG LOG ---

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
            'X-Tenant-Name': tenantName,
        };

        try {
            await logPerformance("Validate & Create Appointment (API)", async () => {
                if (!checkAvailabilityUrl) {
                    throw new Error("VITE_SUPABASE_CHECK_AVAILABILITY_URL is not configured.");
                }

                const response = await fetch(checkAvailabilityUrl, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload),
                });

                // Clone response before reading body to log full details
                const responseForLogging = response.clone();
                await logCurlDetails(checkAvailabilityUrl, 'POST', headers, JSON.stringify(payload), responseForLogging);

                const responseData = await response.json(); // Read response body once
                logDebug("(handleValidateAvailabilityButtonClick): Edge Function parsed response data:", responseData);

                // --- Handle different HTTP status codes from the Edge Function ---
                if (response.status === 200) {
                    // Success: Appointment created
                    setIsSlotAvailable(true);
                    setMessage(responseData.userFriendlyMessage || t('appointmentCreatedSuccess'));
                    setSuggestedSlots([]);
                    applyValidationStyles(true);
                    setShowTimeOptions(false);
                    setIsAvailabilityChecked(true); // Mark as checked and available
                    logDebug("(handleValidateAvailabilityButtonClick): Slot is AVAILABLE and CREATED. Navigating to dashboard.");
                    setTimeout(() => navigateToDashboard(), 1500); // Navigate to dashboard on success
                } else if (response.status === 202) {
                    // Slot not available, but suggestions provided
                    setIsSlotAvailable(false);
                    setSuggestedSlots(responseData.appOptions || []); // Use 'appOptions' as defined in Edge Function
                    setMessage(responseData.userFriendlyMessage || t('noSlotsAvailableForDate'));
                    setError(t('slotNotAvailable')); // Emphasize the requested slot isn't available
                    applyValidationStyles(false);
                    setShowSlotSuggestionsModal(true); // Show modal with suggestions
                    setShowTimeOptions(false); // Hide regular time options dropdown
                    setIsAvailabilityChecked(true); // Mark as checked (but unavailable)
                    logDebug("(handleValidateAvailabilityButtonClick): Requested slot NOT available, showing suggestions.");
                } else if (response.status === 400) {
                    // Validation errors from the Edge Function
                    setIsSlotAvailable(false);
                    setSuggestedSlots([]);
                    applyValidationStyles(false);
                    setError(responseData.error?.message || t('validationError')); // Use top-level error message from Edge Function
                    setFieldErrors(responseData.error?.fieldErrors || {}); // Populate field-specific errors
                    setShowTimeOptions(false);
                    setIsAvailabilityChecked(false); // Reset check status on validation failure
                    logDebug("(handleValidateAvailabilityButtonClick): Validation error (400) from Edge Function.");
                } else if (response.status === 500) {
                    // Internal Server Error from the Edge Function
                    setIsSlotAvailable(false);
                    setSuggestedSlots([]);
                    applyValidationStyles(false);
                    setError(responseData.error?.userFriendlyMessage || responseData.error?.message || t('unexpectedServerError'));
                    setFieldErrors({}); // Clear field errors on a general server error
                    setShowTimeOptions(false);
                    setIsAvailabilityChecked(false); // Reset check status
                    logDebug("(handleValidateAvailabilityButtonClick): Server error (500) from Edge Function.");
                } else {
                    // Catch-all for any other unexpected HTTP status codes
                    const errorMessage = responseData.userFriendlyMessage || responseData.error?.message || `Failed to check/create slot: ${response.statusText} (Status: ${response.status})`;
                    console.error("Unexpected API response structure or status:", response.status, responseData);
                    throw new Error(errorMessage); // Re-throw to be caught by the outer catch block
                }

                // Clear appointmentDate/appointmentTime specific errors after a check
                // (These would be set if availability check itself failed for these fields)
                setFieldErrors(prev => ({ ...prev, appointmentDate: '', appointmentTime: '' }));
            });
        } catch (err) {
            console.error("Error validating/creating slot in UI handler:", err);
            setError(`${t('errorValidatingSlot')}: ${err.message || t('unknownError')}`);
            setIsSlotAvailable(false);
            setSuggestedSlots([]);
            applyValidationStyles(false);
            setFieldErrors(prev => ({ ...prev, appointmentDate: t('slotCheckFailed'), appointmentTime: t('slotCheckFailed') }));
            setShowTimeOptions(false);
            setIsAvailabilityChecked(false); // On critical error, reset check status
            logDebug("(handleValidateAvailabilityButtonClick): Error caught during slot validation/creation catch block.");
        } finally {
            logDebug("(handleValidateAvailabilityButtonClick): Setting loading to FALSE (finally).");
            setLoading(false);
        }
    }, [
        tenantName, session, t, logDebug, applyValidationStyles, logPerformance, checkAvailabilityUrl, navigateToDashboard,
        appointmentDate, appointmentTime, durationMinutes, clientFullNameInput, clientPhoneInput,
        clientEmailInput, petNameInput, petBreedInput, sizeInput, collectionType, mapLatitude,
        mapLongitude, isGroomingSelected, isMedicalSelected, isDateTimeSectionEnabled, fieldErrors,
        emailRegex, isEmailRequired, selectedClient, selectedPet, selectedBreed, addressInput, coloniaInput,
        postalCodeInput, // ADDED POSTAL CODE TO DEPENDENCY ARRAY
        isNewClient, allBreedsRef, notes, status, isPetSectionEnabled, isAddressSectionEnabled, tags
    ]);


    validateAppointmentSlotRef.current = handleValidateAvailabilityButtonClick; // Use the new function as the ref


    // Function to generate all 30-minute time slots (00:00 to 23:30)
    const generateAllTimeSlots = useCallback(() => {
        const slots = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 30) {
                const hour = String(h).padStart(2, '0');
                const minute = String(m).padStart(2, '0');
                slots.push(`${hour}:${minute}`);
            }
        }
        return slots;
    }, []);

    // Memoized list of all possible time options
    const allTimeOptions = useMemo(() => generateAllTimeSlots(), [generateAllTimeSlots]);


    // useEffect: Initial data fetches on component mount/session ready
    useEffect(() => {
        if (session && tenantName) {
            if (allColoniasRef.current.length === 0) {
                logDebug("CreateAppointmentPage (useEffect): Initiating initial fetch of all colonias for in-memory cache.");
                fetchColonias(''); // Call with empty query to get ALL
            }
            if (allBreedsRef.current.length === 0) {
                logDebug("CreateAppointmentPage (useEffect): Initiating initial fetch of all breeds for in-memory cache.");
                fetchBreeds(''); // Call with empty query to get ALL
            }
        }
    }, [session, tenantName, fetchColonias, fetchBreeds, logDebug]);

    // **NEW/REFINED useEffect for isDateTimeSectionEnabled**
    // This useEffect is the single source of truth for isDateTimeSectionEnabled
    useEffect(() => {
        const _clientFullNameValid = !!clientFullNameInput.trim() && !fieldErrors.clientFullName;
        const _clientPhoneValid = clientPhoneInput.trim().length === 10 && !fieldErrors.clientPhone;
        const _clientEmailValid = !!clientEmailInput.trim() && emailRegex.test(clientEmailInput.trim()) && !fieldErrors.clientEmail;
        const _hasPrimaryContact = _clientPhoneValid || (isEmailRequired && _clientEmailValid);
        const _petNameValid = !!petNameInput.trim() && !fieldErrors.petName;
        const _petBreedValid = !!petBreedInput.trim() && !fieldErrors.petBreedInput;
        const _sizeValid = !!sizeInput.trim() && !fieldErrors.sizeInput;

        const areClientAndPetDetailsValid =
            _clientFullNameValid &&
            _hasPrimaryContact &&
            _petNameValid &&
            _petBreedValid &&
            _sizeValid;

        const isAddressColoniaFilledAndValid =
            isAddressSectionEnabled &&
            addressInput.trim() &&
            (selectedColonia || coloniaInput.trim()) &&
            postalCodeInput.trim() && // ADDED POSTAL CODE CHECK
            !fieldErrors.addressInput &&
            !fieldErrors.coloniaInput &&
            !fieldErrors.postalCodeInput && // ADDED POSTAL CODE ERROR CHECK
            (collectionType === 'dropoff' || (collectionType === 'pickup' && mapLatitude && mapLongitude)); // Map coords if pickup

        const shouldEnableDateTimeSection = areClientAndPetDetailsValid && isAddressColoniaFilledAndValid;


        logDebug(`(useEffect - isDateTimeSectionEnabled):`);
        logDebug(`  areClientAndPetDetailsValid: ${areClientAndPetDetailsValid}`);
        logDebug(`  isAddressSectionEnabled: ${isAddressSectionEnabled}`);
        logDebug(`  addressInput: "${addressInput.trim()}" (valid: ${!fieldErrors.addressInput})`);
        logDebug(`  coloniaInput: "${coloniaInput.trim()}" (valid: ${!fieldErrors.coloniaInput}), selectedColonia: ${selectedColonia ? selectedColonia.name : 'null'}`);
        logDebug(`  postalCodeInput: "${postalCodeInput.trim()}" (valid: ${!fieldErrors.postalCodeInput})`); // LOG POSTAL CODE
        logDebug(`  collectionType: ${collectionType}`);
        logDebug(`  mapLatitude: ${mapLatitude}, mapLongitude: ${mapLongitude}`);
        logDebug(`  isAddressColoniaFilledAndValid: ${isAddressColoniaFilledAndValid}`);
        logDebug(`  Resulting isDateTimeSectionEnabled: ${shouldEnableDateTimeSection}`);

        setIsDateTimeSectionEnabled(shouldEnableDateTimeSection);

    }, [
        addressInput, coloniaInput, selectedColonia, isAddressSectionEnabled, fieldErrors, logDebug, setIsDateTimeSectionEnabled,
        clientFullNameInput, clientPhoneInput, clientEmailInput, petNameInput, petBreedInput, sizeInput, emailRegex, isEmailRequired,
        collectionType, mapLatitude, mapLongitude, postalCodeInput // ADDED POSTAL CODE TO DEPENDENCY ARRAY
    ]);

    // NEW useEffect to manage focus after client data is confirmed
    useEffect(() => {
        // Only attempt to focus if client data is successfully fetched/resolved
        // and if the pet section is now enabled (meaning we should move to pet details)
        if (isClientDataFetched && isPetSectionEnabled && petNameInputRef.current && !loading) {
            // Add a small delay to ensure rendering is complete after state updates
            const timeoutId = setTimeout(() => {
                if (petNameInputRef.current) {
                    petNameInputRef.current.focus();
                    setHighlightPetName(true);
                    setTimeout(() => setHighlightPetName(false), 1000); // Remove highlight after 1s
                    logDebug("(useEffect - Focus Management): Client data resolved, focusing on pet name input.");
                }
            }, 50); // Small debounce to ensure UI updates
            return () => clearTimeout(timeoutId); // Cleanup timeout if component unmounts or deps change
        }
    }, [isClientDataFetched, isPetSectionEnabled, loading, logDebug]);


    // useEffect: Manages map visibility
    useEffect(() => {
        const isAddressColoniaFilled = addressInput.trim() && (selectedColonia || coloniaInput.trim()) && postalCodeInput.trim(); // ADDED POSTAL CODE CHECK
        const isReadyForMapDisplay = isAddressSectionEnabled && collectionType === 'pickup' && isAddressColoniaFilled;

        logDebug(`(useEffect - Map Control): isAddressSectionEnabled: ${isAddressSectionEnabled}, collectionType: ${collectionType}, addressInput: "${addressInput.trim()}", coloniaInput: "${coloniaInput.trim()}", postalCodeInput: "${postalCodeInput.trim()}"`); // LOG POSTAL CODE
        logDebug(`(useEffect - Map Control): isAddressColoniaFilled: ${isAddressColoniaFilled}`);
        logDebug(`(useEffect - Map Control): isReadyForMapDisplay: ${isReadyForMapDisplay}`);

        if (isReadyForMapDisplay) {
            setShowMapSection(true);
            if (mapLatitude === null || mapLongitude === null) {
                setGeocodeMessage(t('dragPawIconInstruction'));
            } else {
                setGeocodeMessage(t('coordinatesSelectedPreviously'));
            }
            logDebug("(useEffect - Map Control): Map displayed. Prompting for manual pin placement.");
        } else {
            setShowMapSection(false);
            setGeocodeMessage('');
            setMapLatitude(null); // Clear map coords if map is not displayed
            setMapLongitude(null); // Clear map coords if map is not displayed
            logDebug("(useEffect - Map Control): Conditions not met for map display. Hiding map.");
        }
    }, [isAddressSectionEnabled, collectionType, addressInput, coloniaInput, selectedColonia, mapLatitude, mapLongitude, logDebug, t, postalCodeInput]); // ADDED POSTAL CODE TO DEPENDENCY ARRAY


    // useEffect: To invalidate map size when its container becomes visible
    useEffect(() => {
        if (showMapSection && mapRef.current) {
            logDebug("(useEffect - Map Invalidation): Map section became visible. Invalidating map size.");
            setTimeout(() => {
                if (mapRef.current) {
                    mapRef.current.invalidateSize();
                    logDebug("(useEffect - Map Invalidation): map.invalidateSize() called.");
                }
            }, 100); // Small delay
        }
    }, [showMapSection, logDebug]);


    // --- FINAL SUBMISSION HANDLER ---
    // This function is now simplified, as the main logic for checking availability AND saving
    // happens when `handleValidateAvailabilityButtonClick` is called.
    const handleSubmit = async (e) => {
        e.preventDefault();
        logDebug("(handleSubmit): Form submit button clicked (final action).");

        // The logic is that if the submit button is enabled, it means
        // the availability check already passed and the appointment was saved.
        // So, this button's primary function is now just to navigate.
        if (isSlotAvailable === true) {
            setMessage(t('redirectingToDashboard'));
            setError(null);
            setLoading(true); // Show loading briefly during navigation
            setTimeout(() => navigateToDashboard(), 500);
        } else {
            // This case should ideally not be reached if the button is properly disabled.
            // If it is reached, it means an attempt to submit without a successful availability check.
            setError(t('pleaseValidateSlotBeforeSubmit'));
            logDebug("(handleSubmit): Submit attempted but slot not validated as available.");
        }
        setLoading(false);
    };

    // Helper to render field validation errors
    const renderFieldError = (fieldName) => {
        const errorMessage = fieldErrors[fieldName];
        return (
            <span className={`inline-block text-red-500 text-xs italic w-full ${errorMessage ? 'animate-pulse' : 'invisible'}`} style={{ minHeight: '1rem' }}>
                {errorMessage || '\u00A0'}
            </span>
        );
    };

    // Helper function to render a status tag
    const renderStatusTag = (text, type) => {
        const baseClasses = "ml-2 px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap";
        let typeClasses = "";
        switch (type) {
            case 'new':
                typeClasses = "bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
                break;
            case 'existing':
                typeClasses = "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200";
                break;
            case 'info':
                typeClasses = "bg-purple-200 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
                break;
            case 'success':
                typeClasses = "bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-200";
                break;
            case 'error':
                typeClasses = "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200";
                break;
            default:
                typeClasses = "bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
        }
        return (
            <span className={`${baseClasses} ${typeClasses}`}>
                {text}
            </span>
        );
    };

    // Filtered time options for the dropdown (uses allTimeOptions)
    const filteredTimeOptions = useMemo(() => {
        if (!timeFilter) {
            return allTimeOptions;
        }
        return allTimeOptions.filter(slot => slot.includes(timeFilter));
    }, [timeFilter, allTimeOptions]);


    // Helper function to render the time options list
    const renderTimeOptionsList = useCallback(() => {
        if (!showTimeOptions || (!filteredTimeOptions.length && !timeFilter)) {
            return null;
        }

        return (
            <div className="relative">
                <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1">
                    {filteredTimeOptions.length > 0 ? (
                        filteredTimeOptions.map((timeOption) => (
                            <li
                                key={timeOption}
                                className="px-3 py-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-800 text-gray-800 dark:text-gray-200"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => {
                                    setAppointmentTime(timeOption);
                                    setTimeFilter(timeOption);
                                    setShowTimeOptions(false);
                                    setIsSlotAvailable(null); // Reset here to force re-check on button click
                                    setError(null);
                                    setMessage('');
                                    applyValidationStyles(null);
                                    setIsAvailabilityChecked(false);
                                    logDebug(`(handleSelectTimeOption): Selected time: ${timeOption}.`);
                                }}
                            >
                                {timeOption}
                            </li>
                        ))
                    ) : (
                        <li className="px-3 py-2 text-gray-500 dark:text-gray-400">
                            {t('noMatchingSlots')}
                        </li>
                    )}
                </ul>
            </div>
        );
    }, [showTimeOptions, filteredTimeOptions, timeFilter, t, logDebug, applyValidationStyles]);

    // Memoize the classes for the "Check Availability" button to avoid complex inline JSX
    const availabilityButtonClasses = useMemo(() => {
        let classes = 'w-full sm:w-auto px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 ease-in-out shadow-md flex items-center justify-center gap-2';

        if (loading && !isAvailabilityChecked) { // Added condition to show "checking" style when loading
             classes += ' bg-yellow-600 text-white animate-pulse'; // Pulsing yellow for in-progress check
        } else if (isAvailabilityChecked) {
            if (isSlotAvailable === true) {
                classes += ' bg-green-600 text-white hover:bg-green-700';
            } else if (isSlotAvailable === false) {
                classes += ' bg-red-600 text-white hover:bg-red-700';
            } else { // Should ideally not happen if isAvailabilityChecked is true but isSlotAvailable is null
                classes += ' bg-transparent text-gray-700 border border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700';
            }
        } else {
            classes += ' bg-transparent text-gray-700 border border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700';
        }
        return classes;
    }, [isAvailabilityChecked, isSlotAvailable, loading]);

    // Memoize the text for the "Check Availability" button to avoid complex inline JSX
    const availabilityButtonText = useMemo(() => {
        if (loading && !isAvailabilityChecked) { // Only show loading text if a new check is being performed
            return t('checkingAvailability');
        } else if (isAvailabilityChecked && isSlotAvailable === true) {
            return t('slotAvailable');
        } else if (isAvailabilityChecked && isSlotAvailable === false) {
            return t('slotNotAvailable');
        }
        return t('checkAvailability');
    }, [loading, isAvailabilityChecked, isSlotAvailable, t]);


    /*
    if (showConfigPage) {
        return (
            <ConfigAppointPage
                tenantName={tenantName}
                t={t}
                onClose={() => {
                    setShowConfigPage(false);
                    // fetchConfigSettings(); // If you need to re-fetch settings after closing config
                }}
                initialConfig={configSettings}
            />
        );
    }
    */

    return (
        <div className="p-4 sm:p-6 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen font-sans">
            {/* Overlay for loading state */}
            {loading && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 rounded-lg">
                    <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-xl">
                        <svg className="animate-spin h-10 w-10 text-purple-600 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="text-gray-800 dark:text-gray-200 text-lg mt-3 font-semibold">{t('loadingData')}</p>
                    </div>
                </div>
            )}

            <h2 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-gray-200">
                {t('createNewAppointment')}
            </h2>

            {/* General Error/Success Messages */}
            {error && (
                <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg relative mb-4 shadow-md" role="alert">
                    <strong className="font-bold">{t('error')}!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}
            {message && (
                <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-200 px-4 py-3 rounded-lg relative mb-4 shadow-md" role="alert">
                    <strong className="font-bold">{t('success')}!</strong>
                    <span className="block sm:inline"> {message}</span>
                </div>
            )}

            {/* Diálogo de confirmación de cambio de nombre */}
            {showNameChangeConfirmation && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
                        <p className="text-lg font-semibold mb-4 dark:text-gray-200">
                            {t('confirmNameChangeQuestion', { proposedName: proposedClientName, originalName: originalClientName })}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            {t('confirmNameChangeDetails')}
                        </p>
                        <div className="flex justify-around gap-4">
                            <button
                                type="button"
                                onClick={() => handleConfirmNameChange(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-md transform hover:scale-105"
                            >
                                {t('confirm')}
                            </button>
                            <button
                                type="button"
                                onClick={() => handleConfirmNameChange(false)}
                                className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-md"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slot Suggestions Modal (used only if slot is unavailable from explicit check) */}
            {showSlotSuggestionsModal && suggestedSlots.length > 0 && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full text-center">
                        <h3 className="text-xl font-bold mb-4 dark:text-gray-200">{t('slotNotAvailableTitle')}</h3>
                        <p className="text-gray-700 dark:text-gray-300 mb-4">{t('slotNotAvailableMessage')}</p>
                        <ul className="list-disc list-inside mb-6 space-y-2 text-left max-h-48 overflow-y-auto">
                            {suggestedSlots.map((slot, index) => (
                                <li
                                    key={index}
                                    className="px-3 py-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-800 text-gray-800 dark:text-gray-200"
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleSelectSuggestedSlot(slot)}
                                >
                                    <span className="text-lg font-medium dark:text-gray-200">
                                        {slot.date} {slot.time}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <button
                            type="button"
                            onClick={() => setShowSlotSuggestionsModal(false)}
                            className="bg-gray-400 hover:bg-gray-500 text-white font-bold py-2 px-4 rounded-lg transition duration-300 shadow-md"
                        >
                            {t('close')}
                        </button>
                    </div>
                </div>
            )}


            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-xl">
                {/* APPOINTMENT TYPE SELECTION */}
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                        {t('type')}
                    </label>
                    <div className="flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => handleToggleServiceType('Grooming')}
                            className={`
                                px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 ease-in-out shadow-md
                                ${isGroomingSelected
                                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                                    : 'bg-transparent text-gray-700 border border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }
                            `}
                        >
                            {t('grooming')}
                        </button>

                        <button
                            type="button"
                            onClick={() => handleToggleServiceType('Medical')}
                            className={`
                                px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 ease-in-out shadow-md
                                ${isMedicalSelected
                                    ? 'bg-green-600 text-white hover:bg-green-700'
                                    : 'bg-transparent text-gray-700 border border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }
                            `}
                        >
                            {t('medicalCount')}
                        </button>
                    </div>
                    {isGroomingSelected && (
                        <div className="mt-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                {t('collectionType')}
                            </label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCollectionType('pickup');
                                        setMapLatitude(null);
                                        setMapLongitude(null);
                                        setGeocodeMessage('');
                                        setIsAvailabilityChecked(false); // Reset on collection type change
                                        setIsSlotAvailable(null); // Clear availability status
                                        setSuggestedSlots([]); // Clear suggested slots
                                    }}
                                    className={`
                                        px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 ease-in-out shadow-md
                                        ${collectionType === 'pickup'
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'bg-transparent text-gray-700 border border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    {t('pickup')}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCollectionType('dropoff');
                                        setShowMapSection(false);
                                        setMapLatitude(null);
                                        setMapLongitude(null);
                                        setGeocodeMessage('');
                                        setIsAvailabilityChecked(false); // Reset on collection type change
                                        setIsSlotAvailable(null); // Clear availability status
                                        setSuggestedSlots([]); // Clear suggested slots
                                    }}
                                    className={`
                                        px-5 py-2.5 rounded-full text-base font-semibold transition-all duration-200 ease-in-out shadow-md
                                        ${collectionType === 'dropoff'
                                            ? 'bg-purple-600 text-white hover:bg-purple-700'
                                            : 'bg-transparent text-gray-700 border border-gray-300 dark:text-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    {t('dropoff')}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div>
                        <div className="mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-end">
                                <div className="col-span-1">
                                    <label htmlFor="clientFullName" className="inline-flex items-center text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('clientName')}
                                        {selectedClient && !isNewClient && (
                                            renderStatusTag(t('existingClient'), 'existing')
                                        )}
                                        {isNewClient && (
                                            renderStatusTag(t('newClient'), 'new')
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        id="clientFullName"
                                        ref={clientFullNameInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${fieldErrors.clientFullName ? 'border-red-500' : ''}`}
                                        placeholder={t('enterClientName')}
                                        value={clientFullNameInput}
                                        onChange={handleClientFieldChange}
                                        onBlur={handleClientFieldBlur}
                                        onKeyPress={handleClientInfoKeyPress}
                                        required
                                        autoComplete="off"
                                    />
                                    {renderFieldError('clientFullName')}
                                </div>

                                <div className="col-span-1">
                                    <label htmlFor="clientPhone" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('phone')}
                                    </label>
                                    <input
                                        type="tel"
                                        id="clientPhone"
                                        ref={clientPhoneInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${fieldErrors.clientPhone ? 'border-red-500' : ''}`}
                                        placeholder={t('phone')}
                                        value={clientPhoneInput}
                                        onChange={handleClientFieldChange}
                                        onBlur={handleClientFieldBlur}
                                        onKeyDown={handleClientInfoKeyPress}
                                        required={false}
                                        autoComplete="off"
                                    />
                                    {renderFieldError('clientPhone')}
                                </div>

                                <div className="col-span-1">
                                    <label htmlFor="clientEmail" className="inline-flex items-center text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('email')}
                                        {isEmailRequired && (
                                            <span className="ml-2 text-red-500 text-xs">({t('required')})</span>
                                        )}
                                    </label>
                                    <input
                                        type="email"
                                        id="clientEmail"
                                        ref={clientEmailInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${fieldErrors.clientEmail ? 'border-red-500' : ''}`}
                                        placeholder={t('email')}
                                        value={clientEmailInput}
                                        onChange={handleClientFieldChange}
                                        onBlur={handleClientFieldBlur}
                                        onKeyPress={handleClientInfoKeyPress}
                                        required={isEmailRequired}
                                        autoComplete="off"
                                    />
                                    {renderFieldError('clientEmail')}
                                </div>
                            </div>
                            {isNewClient && (!clientPhoneInput.trim() || clientPhoneInput.trim().length !== 10) && (!clientEmailInput.trim() || !emailRegex.test(clientEmailInput.trim())) && !loading && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-3">
                                    {t('newClientContactRequiredFull')}
                                </p>
                            )}
                        </div>

                        <div className="mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                                <div className="col-span-1">
                                    <label htmlFor="petName" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('petName')}
                                    </label>
                                    <input
                                        type="text"
                                        id="petName"
                                        ref={petNameInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
                                            ${fieldErrors.petName ? 'border-red-500' : ''}
                                            ${!isPetSectionEnabled ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}
                                            ${highlightPetName ? 'animate-pulse-border border-purple-500 border-2' : ''}
                                        `}
                                        placeholder={isPetSectionEnabled ? t('enterPetName') : t('completeClientDetailsFirst')}
                                        value={petNameInput}
                                        onChange={(e) => {
                                            setPetNameInput(e.target.value); // Temporarily store raw value
                                            setFieldErrors(prev => ({ ...prev, petName: '' }));
                                            setError(null);
                                            setMessage('');
                                            if (petSearchDebounceTimeout.current) clearTimeout(petSearchDebounceTimeout.current);
                                            setIsAvailabilityChecked(false); // Reset on pet name change
                                            setIsSlotAvailable(null); // Clear availability status
                                            setSuggestedSlots([]); // Clear suggested slots
                                        }}
                                        onBlur={handlePetNameInputTrigger} // Apply formatting and trigger search on blur
                                        onKeyPress={handlePetNameInputKeyPress}
                                        disabled={!isPetSectionEnabled}
                                        required={isPetSectionEnabled}
                                        autoComplete="off"
                                    />
                                    {renderFieldError('petName')}
                                </div>

                                <div className="col-span-1 grid grid-cols-2 gap-4 items-end">
                                    <div className="col-span-1">
                                        <label htmlFor="petBreedInput" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                            {t('breed')}
                                        </label>
                                        <input
                                            type="text"
                                            id="petBreedInput"
                                            ref={petBreedInputRef}
                                            className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500
                                                ${fieldErrors.petBreedInput ? 'border-red-500' : ''}
                                                ${!isPetSectionEnabled || !petNameInput.trim()
                                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                                    : 'text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}
                                            `}
                                            placeholder={isPetSectionEnabled ? t('enterBreed') : t('completeClientDetailsFirst')}
                                            value={petBreedInput}
                                            onChange={handleBreedInputChange}
                                            onFocus={() => setShowBreedSuggestions(true)}
                                            onBlur={handlePetBreedInputBlur} // Apply formatting on blur
                                            onKeyDown={handleBreedInputKeyDown}
                                            required={isPetSectionEnabled && (isNewPet || (selectedPet && !selectedPet.breed_id))}
                                            autoComplete="off"
                                            disabled={!isPetSectionEnabled || !petNameInput.trim()}
                                        />
                                        <ul ref={breedSuggestionsListRef} className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1"
                                            style={{
                                                display: (showBreedSuggestions && breedsList.length > 0 && petBreedInput.length >= 2) ? 'block' : 'none',
                                                width: petBreedInputRef.current ? petBreedInputRef.current.offsetWidth : 'auto'
                                            }}>
                                            {breedsList.map((breed, index) => (
                                                <li
                                                    key={breed.id}
                                                    data-index={index}
                                                    className={`px-3 py-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-800 text-gray-800 dark:text-gray-200 ${index === highlightedBreedIndex ? 'bg-purple-200 dark:bg-purple-800' : ''}`}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleSelectBreed(breed)}
                                                    onMouseEnter={() => setHighlightedBreedIndex(index)}
                                                >
                                                    {breed.name} ({breed.default_size || t('noDefaultSize')})
                                                </li>
                                            ))}
                                        </ul>
                                        {renderFieldError('petBreedInput')}
                                    </div>

                                    <div className="col-span-1">
                                        <label htmlFor="sizeInput" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                            {t('size')}
                                        </label>
                                        <select
                                            id="sizeInput"
                                            ref={sizeInputRef}
                                            className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500
                                                ${fieldErrors.sizeInput ? 'border-red-500' : ''}
                                                ${!isPetSectionEnabled || !petNameInput.trim() || !petBreedInput.trim()
                                                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed appearance-none'
                                                    : 'text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'
                                                }
                                            `}
                                            value={sizeInput}
                                            onChange={(e) => { setSizeInput(e.target.value); setFieldErrors(prev => ({ ...prev, sizeInput: '' })); }}
                                            onKeyPress={handleSizeInputKeyPress}
                                            required={isPetSectionEnabled && (isNewPet || (selectedPet && !selectedPet.size))}
                                            disabled={!isPetSectionEnabled || !petNameInput.trim() || !petBreedInput.trim()}
                                        >
                                            <option value="">{t('selectSize')}</option>
                                            <option value="small">{t('small')}</option>
                                            <option value="medium">{t('medium')}</option>
                                            <option value="large">{t('large')}</option>
                                        </select>
                                        {renderFieldError('sizeInput')}
                                    </div>
                                </div>
                            </div>

                            {!isPetSectionEnabled && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('completeClientDetailsFirst')}
                                </p>
                            )}
                        </div>

                        <div className="mb-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end"> {/* Changed to grid-cols-3 for postal code */}
                                <div className="col-span-1">
                                    <label htmlFor="addressInput" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('address')}
                                    </label>
                                    <input
                                        type="text"
                                        id="addressInput"
                                        ref={addressInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
                                            ${fieldErrors.addressInput ? 'border-red-500' : ''}
                                            ${!isAddressSectionEnabled ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}
                                        `}
                                        placeholder={isAddressSectionEnabled ? t('enterAddress') : t('completePetDetailsFirst')}
                                        value={addressInput}
                                        onChange={handleAddressChange} // Keep immediate update for responsiveness
                                        onBlur={handleClientFieldBlur} // Apply formatting on blur
                                        onKeyPress={handleClientInfoKeyPress}
                                        disabled={!isAddressSectionEnabled}
                                        required={isAddressSectionEnabled && collectionType === 'pickup'}
                                        autoComplete="off"
                                    />
                                    {renderFieldError('addressInput')}
                                </div>
                                <div className="col-span-1">
                                    <label htmlFor="coloniaInput" className="inline-flex items-center text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('colonia')}
                                        {selectedColonia && (
                                            renderStatusTag(`(${selectedColonia.postal_code})`, 'info')
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        id="coloniaInput"
                                        ref={coloniaInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
                                            ${fieldErrors.coloniaInput ? 'border-red-500' : ''}
                                            ${!isAddressSectionEnabled ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}
                                        `}
                                        placeholder={isAddressSectionEnabled ? t('selectColonia') : t('completePetDetailsFirst')}
                                        value={coloniaInput}
                                        onChange={(e) => handleAddressFieldChange(e)} // Use combined handler
                                        onFocus={() => setShowColoniaSuggestions(true)}
                                        onBlur={handleClientFieldBlur} // Apply formatting on blur
                                        onKeyDown={handleColoniaInputKeyDown}
                                        disabled={!isAddressSectionEnabled}
                                        required={isAddressSectionEnabled && collectionType === 'pickup'}
                                        autoComplete="off"
                                    />
                                    <ul ref={coloniaSuggestionsListRef} className="absolute z-10 w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto mt-1"
                                        style={{
                                            display: (showColoniaSuggestions && coloniasList.length > 0) ? 'block' : 'none',
                                            width: coloniaInputRef.current ? coloniaInputRef.current.offsetWidth : 'auto'
                                        }}>
                                        {coloniasList.map((colonia, index) => (
                                            <li
                                                key={colonia.id}
                                                data-index={index}
                                                className={`px-3 py-2 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-800 text-gray-800 dark:text-gray-200 ${index === highlightedColoniaIndex ? 'bg-purple-200 dark:bg-purple-800' : ''}`}
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => handleSelectColonia(colonia)}
                                                onMouseEnter={() => setHighlightedColoniaIndex(index)}
                                            >
                                                {colonia.name} ({colonia.postal_code})
                                            </li>
                                        ))}
                                    </ul>
                                    {renderFieldError('coloniaInput')}
                                </div>
                                <div className="col-span-1"> {/* NEW POSTAL CODE INPUT */}
                                    <label htmlFor="postalCodeInput" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('postalCode')}
                                    </label>
                                    <input
                                        type="text"
                                        id="postalCodeInput"
                                        ref={postalCodeInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
                                            ${fieldErrors.postalCodeInput ? 'border-red-500' : ''}
                                            ${!isAddressSectionEnabled ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200'}
                                        `}
                                        placeholder={isAddressSectionEnabled ? t('enterPostalCode') : t('completePetDetailsFirst')}
                                        value={postalCodeInput}
                                        onChange={handleAddressFieldChange} // Use combined handler
                                        onBlur={handleClientFieldBlur} // Validate on blur
                                        onKeyPress={handleClientInfoKeyPress}
                                        disabled={!isAddressSectionEnabled}
                                        required={isAddressSectionEnabled && collectionType === 'pickup'}
                                        autoComplete="off"
                                    />
                                    {renderFieldError('postalCodeInput')}
                                </div>
                            </div>
                            {!isAddressSectionEnabled && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                    {t('mapNotShownYet')}
                                </p>
                            )}
                        </div>

                        {/* New instructional message above the map */}
                        {isAddressSectionEnabled && collectionType === 'pickup' && (
                            <div className="mb-4 p-4 bg-yellow-100 dark:bg-yellow-900 border border-yellow-400 dark:border-yellow-600 text-yellow-700 dark:text-yellow-200 rounded-lg shadow-md flex items-center gap-2">
                                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm">
                                    {t('dragPawIconInstruction')} <img src={customPawIcon.options.iconUrl} alt="Paw Icon" className="inline-block w-4 h-4 mx-1" />
                                    {t('toSelectLocation')}
                                </p>
                            </div>
                        )}

                        <div className={`mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner slide-down-container ${showMapSection ? 'show' : ''}`} style={{ minHeight: showMapSection ? '250px' : '0' }}>
                            <div className="fade-in-content" style={{ display: showMapSection ? 'block' : 'none', height: '100%' }}>
                                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">
                                    {t('markAddressOnMap')}
                                </h3>
                                <MapContainer
                                    center={tenantLocationCenter}
                                    zoom={13}
                                    minZoom={12}
                                    maxZoom={16}
                                    scrollWheelZoom={true}
                                    className="w-full h-64 rounded-lg"
                                    whenCreated={mapInstance => { mapRef.current = mapInstance; }}
                                    maxBounds={mapBounds}
                                    maxBoundsViscosity={1.0}
                                >
                                    <TileLayer
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    />
                                    {/* Home Marker - always visible at tenantLocationCenter */}
                                    <Marker position={tenantLocationCenter}>
                                        <Popup>{t('homeLocation')}</Popup>
                                    </Marker>

                                    {/* User-selected/draggable marker */}
                                    {(mapLatitude && mapLongitude) ? (
                                        <Marker
                                            position={[mapLatitude, mapLongitude]}
                                            draggable={true}
                                            eventHandlers={{
                                                dragend: (e) => {
                                                    const marker = e.target;
                                                    const position = marker.getLatLng();
                                                    setMapLatitude(position.lat);
                                                    setMapLongitude(position.lng);
                                                    setGeocodeMessage(t('coordinatesSelectedManual'));
                                                    logDebug(`Marker dragged to: Lat ${position.lat}, Lng ${position.lng}`);
                                                    setIsAvailabilityChecked(false); // Reset on map change
                                                    setIsSlotAvailable(null); // Clear availability status
                                                    setSuggestedSlots([]); // Clear suggested slots
                                                },
                                            }}
                                            icon={customPawIcon}
                                        >
                                            <Popup>
                                                {t('selectedLocation')}:<br />
                                                Lat: {mapLatitude.toFixed(4)}<br />
                                                Lng: {mapLongitude.toFixed(4)}
                                            </Popup>
                                        </Marker>
                                    ) : (
                                        <Marker
                                            position={tenantLocationCenter}
                                            draggable={true}
                                            eventHandlers={{
                                                dragend: (e) => {
                                                    const marker = e.target;
                                                    const position = marker.getLatLng();
                                                    setMapLatitude(position.lat);
                                                    setMapLongitude(position.lng);
                                                    setGeocodeMessage(t('coordinatesSelectedManual'));
                                                    logDebug(`Initial marker dragged to: Lat ${position.lat}, Lng ${position.lng}`);
                                                    setIsAvailabilityChecked(false); // Reset on map change
                                                    setIsSlotAvailable(null); // Clear availability status
                                                    setSuggestedSlots([]); // Clear suggested slots
                                                },
                                            }}
                                            icon={customPawIcon}
                                        >
                                            <Popup>{t('dragToSelectLocation')}</Popup>
                                        </Marker>
                                    )}
                                    <MapClickHandler />
                                </MapContainer>
                                {geocodeMessage && (
                                    <p className={`text-sm mt-2 text-center ${mapLatitude && mapLongitude ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                        {geocodeMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                        {isAddressSectionEnabled && (collectionType === 'pickup') && !showMapSection && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {t('mapNotShownYet')}
                            </p>
                        )}
                        {isAddressSectionEnabled && (collectionType === 'dropoff') && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {t('mapNotNeededForDropoff')}
                            </p>
                        )}


                        <div className="mb-4">
                            {/* NEW CONTAINER for Fecha, Hora, Check Availability */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start"> {/* Align all items to the start (top) of their grid cell */}
                                {/* Date Input Column */}
                                <div className="col-span-1 flex flex-col">
                                    <label htmlFor="appointmentDate" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('date')}
                                    </label>
                                    <input
                                        type="date"
                                        id="appointmentDate"
                                        ref={appointmentDateRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
                                            ${isSlotAvailable === true ? 'border-green-500 border-2' : ''}
                                            ${isSlotAvailable === false ? 'border-red-500 border-2' : ''}
                                        `}
                                        value={appointmentDate}
                                        onChange={handleDateChange}
                                        required
                                        min={todayISO}
                                        disabled={!isDateTimeSectionEnabled} // Disable if previous sections are not complete
                                    />
                                    {renderFieldError('appointmentDate')}
                                </div>

                                {/* Time Input Column */}
                                <div className="col-span-1 flex flex-col relative"> {/* Added relative for absolute positioning of suggestions */}
                                    <label htmlFor="timeFilter" className="inline-flex items-center text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                        {t('time')}
                                        {appointmentTime && !fieldErrors.appointmentTime && (
                                            renderStatusTag(`${t('selectedTime')}: ${appointmentTime}`, 'info')
                                        )}
                                    </label>
                                    <input
                                        type="text"
                                        id="timeFilter"
                                        ref={timeFilterInputRef}
                                        className={`shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200
                                            ${fieldErrors.appointmentTime ? 'border-red-500' : ''} `}
                                        placeholder={t('selectTimeHint')}
                                        value={timeFilter}
                                        onChange={handleTimeFilterChange}
                                        onFocus={handleTimeFilterFocus}
                                        onBlur={handleTimeFilterBlur}
                                        autoComplete="off"
                                        required
                                        disabled={!isDateTimeSectionEnabled} // Disable if previous sections are not complete
                                    />
                                    {renderTimeOptionsList()}
                                    {renderFieldError('appointmentTime')}
                                </div>

                                {/* Check Availability Button Column - Aligned with inputs */}
                                <div className="col-span-1 flex flex-col">
                                    {/* Placeholder for label height to align button with inputs */}
                                    <div className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300 invisible" style={{height: '1.25rem'}}></div>
                                    
                                    <button
                                        type="button"
                                        onClick={handleValidateAvailabilityButtonClick} // This button triggers the combined check and save/suggest logic
                                        className={availabilityButtonClasses + " w-full"}
                                        style={{height: '2.5rem'}}
                                        disabled={loading || !isDateTimeSectionEnabled || !appointmentDate || !appointmentTime || durationMinutes === 0 || (isGroomingSelected && collectionType === 'pickup' && (!mapLatitude || !mapLongitude)) || (!isGroomingSelected && !isMedicalSelected) || fieldErrors.postalCodeInput}
                                    >
                                        {availabilityButtonText}
                                    </button>
                                    {/* Conditional messages for button disabled state, wrapped in a div for consistent height and alignment */}
                                    <div className="text-center min-h-[1rem] mt-1">
                                        {!isDateTimeSectionEnabled && (
                                            <p className="text-sm text-red-500 dark:text-red-400">
                                                {t('completeAddressDetailsFirst')}
                                            </p>
                                        )}
                                        {isDateTimeSectionEnabled && (!appointmentDate || !appointmentTime) && (
                                            <p className="text-sm text-red-500 dark:text-red-400">
                                                {t('selectDateAndTime')}
                                            </p>
                                        )}
                                        {isDateTimeSectionEnabled && appointmentDate && appointmentTime && durationMinutes === 0 && (
                                            <p className="text-sm text-red-500 dark:text-red-400">
                                                {t('durationRequired')}
                                            </p>
                                        )}
                                        {isDateTimeSectionEnabled && appointmentDate && appointmentTime && durationMinutes > 0 && !isAvailabilityChecked && !loading && (
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {t('clickCheckAvailability')}
                                            </p>
                                        )}
                                        {isDateTimeSectionEnabled && (isGroomingSelected && collectionType === 'pickup' && (!mapLatitude || !mapLongitude)) && (
                                            <p className="text-sm text-red-500 dark:text-red-400">
                                                {t('addressMustBeMappedForPickup')}
                                            </p>
                                        )}
                                        {isDateTimeSectionEnabled && (isGroomingSelected && collectionType === 'pickup' && (postalCodeInput.trim() === '' || fieldErrors.postalCodeInput)) && (
                                            <p className="text-sm text-red-500 dark:text-red-400">
                                                {t('postalCodeRequired')}
                                            </p>
                                        )}
                                        {isDateTimeSectionEnabled && (!isGroomingSelected && !isMedicalSelected) && (
                                                <p className="text-sm text-red-500 dark:text-red-400">
                                                    {t('atLeastOneService')}
                                                </p>
                                            )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {configSettings && (
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                    {t('estimatedDuration')}
                                </label>
                                <p className="py-2 px-3 text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                                    {durationMinutes} {t('minutes')}
                                </p>
                            </div>
                        )}

                        <div className="mb-6">
                            <label htmlFor="notes" className="block text-gray-700 text-sm font-bold mb-2 dark:text-gray-300">
                                {t('notes')}
                            </label>
                            <textarea
                                id="notes"
                                rows="3"
                                className="shadow-sm appearance-none border rounded-lg w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                                placeholder={t('notes')}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            ></textarea>
                        </div>
                    </div>

                </div>


                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                    <button
                        type="submit" // This is now primarily a "Done" or "Confirm" button after check/save
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg focus:outline-none focus:shadow-outline transition duration-300 shadow-md transform hover:scale-105"
                        // Only enable if the slot has been successfully validated AND created
                        disabled={loading || showNameChangeConfirmation || isSlotAvailable !== true}
                    >
                        {loading ? t('processing') : (isSlotAvailable === true ? t('goToDashboard') : t('createNewAppointment'))}
                    </button>
                    <button
                        type="button"
                        onClick={navigateToDashboard}
                        className="w-full sm:w-auto bg-gray-400 hover:bg-gray-500 text-white font-bold py-2.5 px-6 rounded-lg transition duration-300 shadow-md"
                        disabled={loading || showNameChangeConfirmation}
                    >
                        {t('back')}
                    </button>
                </div>
            </form>

            <div className="absolute top-4 right-4">
                <button
                    type="button"
                    onClick={() => setShowConfigPage(true)}
                    className="p-3 bg-gray-700 dark:bg-gray-600 rounded-full shadow-lg text-white hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors duration-200"
                    title={t('configuration')}
                >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-.2-.84-.3-1.32-.3s-.94.1-1.32.3L5.68 5.72a.75.75 0 00-.03 1.06l1.32 1.32c.15.15.35.22.56.22h3.1a.75.75 0 00.56-.22l1.32-1.32a.75.75 0 00-.03-1.06l-3.17-2.55zm-.21 6.83H8.72l-.84-.84a.75.75 0 00-1.06 0l-.84.84H4.5a.75.75 0 000 1.5h1.41l-.84.84a.75.75 0 000 1.06l.84.84h1.41a.75.75 0 00.56-.22l1.32-1.32a.75.75 0 00.03-1.06L11.49 3.17a.75.75 0 00-.03-1.06l-1.32-1.32a.75.75 0 00-.56-.22h-3.1a.75.75 0 00-.56.22l-1.32 1.32a.75.75 0 00.03 1.06l3.17 2.55zM10 18.25a.75.75 0 01-.75-.75V15h1.5v2.5a.75.75 0 01-.75.75z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CreateAppointmentPage;