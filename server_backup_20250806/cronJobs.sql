-- Auto Status Update Cron Job for PostgreSQL
-- This function automatically updates appointment statuses from 'scheduled' to 'in_progress'
-- when the current time matches the appointment time

-- Create the function that handles auto status updates
CREATE OR REPLACE FUNCTION auto_update_appointment_status()
RETURNS void AS $$
DECLARE
    company_record RECORD;
    appointment_record RECORD;
    current_time_utc TIMESTAMP;
    today_date TEXT;
    updated_count INTEGER := 0;
BEGIN
    current_time_utc := NOW();
    today_date := current_time_utc::DATE::TEXT;
    
    -- Log function start
    RAISE NOTICE 'Auto Status Update: Starting at %', current_time_utc;
    
    -- Loop through companies with auto status update enabled
    FOR company_record IN 
        SELECT id, auto_status_update_interval, auto_status_update_last_run
        FROM companies 
        WHERE auto_status_update_enabled = TRUE
    LOOP
        -- Check if enough time has passed since last run
        IF company_record.auto_status_update_last_run IS NULL OR 
           (EXTRACT(EPOCH FROM (current_time_utc - company_record.auto_status_update_last_run)) / 60) >= company_record.auto_status_update_interval 
        THEN
            RAISE NOTICE 'Processing company: %', company_record.id;
            
            -- Find appointments that should be updated to in_progress
            FOR appointment_record IN
                SELECT a.id, a.scheduled_time, a.scheduled_date
                FROM appointments a
                INNER JOIN tenants t ON a.tenant_id = t.id
                WHERE t.company_id = company_record.id
                AND a.status = 'scheduled'
                AND a.scheduled_date = today_date
                AND a.scheduled_time IS NOT NULL
            LOOP
                -- Check if current time is within appointment window (with 2-minute buffer)
                DECLARE
                    appointment_start_time TIMESTAMP;
                    time_difference_minutes INTEGER;
                BEGIN
                    -- Create full timestamp for appointment
                    appointment_start_time := (today_date || ' ' || appointment_record.scheduled_time)::TIMESTAMP;
                    
                    -- Calculate difference in minutes
                    time_difference_minutes := EXTRACT(EPOCH FROM (current_time_utc - appointment_start_time)) / 60;
                    
                    -- Update if current time is within 2 minutes of appointment start (or past it)
                    IF time_difference_minutes >= -2 THEN
                        UPDATE appointments 
                        SET status = 'in_progress', updated_at = current_time_utc
                        WHERE id = appointment_record.id;
                        
                        updated_count := updated_count + 1;
                        RAISE NOTICE 'Updated appointment % to in_progress', appointment_record.id;
                    END IF;
                END;
            END LOOP;
            
            -- Update last run timestamp for this company
            UPDATE companies 
            SET auto_status_update_last_run = current_time_utc,
                updated_at = current_time_utc
            WHERE id = company_record.id;
        END IF;
    END LOOP;
    
    -- Log completion
    RAISE NOTICE 'Auto Status Update: Completed. Updated % appointments', updated_count;
END;
$$ LANGUAGE plpgsql;

-- Create the cron job that runs every minute
-- Note: This requires pg_cron extension to be installed
-- SELECT cron.schedule('auto-status-update', '* * * * *', 'SELECT auto_update_appointment_status();');

-- Alternative: Create a simpler trigger-based approach that doesn't require pg_cron
-- This trigger function can be called manually or via API
CREATE OR REPLACE FUNCTION trigger_auto_status_update()
RETURNS TABLE(company_id TEXT, updated_appointments INTEGER) AS $$
DECLARE
    result_record RECORD;
BEGIN
    -- Call the main function
    PERFORM auto_update_appointment_status();
    
    -- Return summary of what was updated
    FOR result_record IN
        SELECT c.id as company_id, 
               COUNT(a.id)::INTEGER as updated_appointments
        FROM companies c
        LEFT JOIN tenants t ON t.company_id = c.id
        LEFT JOIN appointments a ON a.tenant_id = t.id 
            AND a.status = 'in_progress' 
            AND a.updated_at > (NOW() - INTERVAL '5 minutes')
        WHERE c.auto_status_update_enabled = TRUE
        GROUP BY c.id
    LOOP
        company_id := result_record.company_id;
        updated_appointments := result_record.updated_appointments;
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;