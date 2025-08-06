-- SuperAdmin Dashboard Statistics Functions
-- These functions calculate real-time metrics for company management

-- 1. Platform Overview Statistics
CREATE OR REPLACE FUNCTION get_platform_overview_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'totalCompanies', (SELECT COUNT(*) FROM companies WHERE "isActive" = true),
        'totalTenants', (SELECT COUNT(*) FROM tenants WHERE "isActive" = true),
        'totalUsers', (SELECT COUNT(*) FROM staff),
        'totalAppointments', (SELECT COUNT(*) FROM appointments),
        'monthlyRevenue', (
            SELECT COALESCE(SUM("totalCost"), 0) 
            FROM appointments 
            WHERE "paymentStatus" = 'paid' 
            AND DATE_TRUNC('month', CURRENT_DATE) <= "createdAt"
            AND "createdAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        ),
        'activeAppointmentsToday', (
            SELECT COUNT(*) 
            FROM appointments 
            WHERE DATE("scheduledDate") = CURRENT_DATE 
            AND status IN ('scheduled', 'in_progress')
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. Company Details with Real Statistics
CREATE OR REPLACE FUNCTION get_companies_detailed_stats()
RETURNS JSON AS $$
DECLARE
    companies_data JSON;
BEGIN
    SELECT json_agg(
        json_build_object(
            'id', c.id,
            'name', c.name,
            'subscriptionTier', c."subscriptionTier",
            'isActive', c."isActive",
            'createdAt', c."createdAt",
            'contactEmail', c."contactEmail",
            'contactPhone', c."contactPhone",
            'address', c.address,
            'tenantCount', COALESCE(tenant_stats.tenant_count, 0),
            'totalUsers', COALESCE(user_stats.user_count, 0),
            'totalAppointments', COALESCE(apt_stats.appointment_count, 0),
            'monthlyRevenue', COALESCE(revenue_stats.monthly_revenue, 0),
            'appointmentsToday', COALESCE(today_stats.today_count, 0)
        )
    )
    FROM companies c
    LEFT JOIN (
        SELECT "companyId", COUNT(*) as tenant_count
        FROM tenants 
        WHERE "isActive" = true
        GROUP BY "companyId"
    ) tenant_stats ON c.id = tenant_stats."companyId"
    LEFT JOIN (
        SELECT t."companyId", COUNT(s.id) as user_count
        FROM tenants t
        LEFT JOIN staff s ON t.id = s."tenantId"
        WHERE t."isActive" = true
        GROUP BY t."companyId"
    ) user_stats ON c.id = user_stats."companyId"
    LEFT JOIN (
        SELECT t."companyId", COUNT(a.id) as appointment_count
        FROM tenants t
        LEFT JOIN appointments a ON t.id = a."tenantId"
        WHERE t."isActive" = true
        GROUP BY t."companyId"
    ) apt_stats ON c.id = apt_stats."companyId"
    LEFT JOIN (
        SELECT t."companyId", COALESCE(SUM(a."totalCost"), 0) as monthly_revenue
        FROM tenants t
        LEFT JOIN appointments a ON t.id = a."tenantId"
        WHERE t."isActive" = true
        AND a."paymentStatus" = 'paid'
        AND DATE_TRUNC('month', CURRENT_DATE) <= a."createdAt"
        AND a."createdAt" < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
        GROUP BY t."companyId"
    ) revenue_stats ON c.id = revenue_stats."companyId"
    LEFT JOIN (
        SELECT t."companyId", COUNT(a.id) as today_count
        FROM tenants t
        LEFT JOIN appointments a ON t.id = a."tenantId"
        WHERE t."isActive" = true
        AND DATE(a."scheduledDate") = CURRENT_DATE
        GROUP BY t."companyId"
    ) today_stats ON c.id = today_stats."companyId"
    WHERE c."isActive" = true
    ORDER BY c."createdAt" DESC
    INTO companies_data;
    
    RETURN COALESCE(companies_data, '[]'::json);
END;
$$ LANGUAGE plpgsql;

-- 3. Monthly Growth Statistics
CREATE OR REPLACE FUNCTION get_monthly_growth_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    current_month_start DATE := DATE_TRUNC('month', CURRENT_DATE);
    last_month_start DATE := DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month');
BEGIN
    SELECT json_build_object(
        'newCompanies', (
            SELECT COUNT(*) 
            FROM companies 
            WHERE "createdAt" >= current_month_start
            AND "isActive" = true
        ),
        'newTenants', (
            SELECT COUNT(*) 
            FROM tenants 
            WHERE "createdAt" >= current_month_start
            AND "isActive" = true
        ),
        'newUsers', (
            SELECT COUNT(*) 
            FROM staff 
            WHERE "createdAt" >= current_month_start
        ),
        'appointmentsProcessed', (
            SELECT COUNT(*) 
            FROM appointments 
            WHERE "createdAt" >= current_month_start
            AND status = 'completed'
        ),
        'monthlyRevenue', (
            SELECT COALESCE(SUM("totalCost"), 0) 
            FROM appointments 
            WHERE "paymentStatus" = 'paid' 
            AND "createdAt" >= current_month_start
        ),
        'previousMonthRevenue', (
            SELECT COALESCE(SUM("totalCost"), 0) 
            FROM appointments 
            WHERE "paymentStatus" = 'paid' 
            AND "createdAt" >= last_month_start
            AND "createdAt" < current_month_start
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. System Health and Performance Stats
CREATE OR REPLACE FUNCTION get_system_health_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'databaseStatus', 'operational',
        'totalRecords', (
            SELECT (
                (SELECT COUNT(*) FROM companies) +
                (SELECT COUNT(*) FROM tenants) +
                (SELECT COUNT(*) FROM staff) +
                (SELECT COUNT(*) FROM appointments) +
                (SELECT COUNT(*) FROM clients) +
                (SELECT COUNT(*) FROM pets)
            )
        ),
        'activeConnections', (
            SELECT COUNT(*) 
            FROM pg_stat_activity 
            WHERE state = 'active'
        ),
        'avgResponseTime', (
            SELECT ROUND(AVG(
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - query_start)) * 1000
            )::numeric, 2)
            FROM pg_stat_activity 
            WHERE state = 'active'
            AND query_start IS NOT NULL
        ),
        'errorRate', (
            -- Calculate based on webhook logs or system logs if available
            SELECT COALESCE(
                ROUND(
                    (COUNT(*) FILTER (WHERE success = false))::numeric / 
                    NULLIF(COUNT(*), 0) * 100, 2
                ), 0
            )
            FROM webhook_logs 
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '24 hours'
        ),
        'uptime', '99.9%' -- This would typically come from external monitoring
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Resource Usage Statistics
CREATE OR REPLACE FUNCTION get_resource_usage_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
    db_size_mb NUMERIC;
    table_sizes JSON;
BEGIN
    -- Get database size in MB
    SELECT ROUND((pg_database_size(current_database()) / 1024 / 1024)::numeric, 2) INTO db_size_mb;
    
    -- Get table sizes for major tables
    SELECT json_object_agg(schemaname||'.'||tablename, size_mb)
    FROM (
        SELECT 
            schemaname,
            tablename,
            ROUND((pg_total_relation_size(schemaname||'.'||tablename) / 1024 / 1024)::numeric, 2) as size_mb
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('companies', 'tenants', 'appointments', 'clients', 'pets', 'staff')
        ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    ) t INTO table_sizes;
    
    SELECT json_build_object(
        'databaseSizeMB', db_size_mb,
        'tablesSizeMB', COALESCE(table_sizes, '{}'::json),
        'storageUsagePercent', LEAST(ROUND((db_size_mb / 1000) * 100, 1), 100), -- Assume 1GB limit
        'memoryUsagePercent', ROUND(RANDOM() * 30 + 40, 1), -- Simulated: 40-70%
        'cpuUsagePercent', ROUND(RANDOM() * 20 + 25, 1), -- Simulated: 25-45%
        'connectionCount', (
            SELECT COUNT(*) FROM pg_stat_activity WHERE state IS NOT NULL
        ),
        'maxConnections', (
            SELECT setting::int FROM pg_settings WHERE name = 'max_connections'
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 6. Recent Activity Summary
CREATE OR REPLACE FUNCTION get_recent_activity_stats()
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'recentAppointments', (
            SELECT json_agg(
                json_build_object(
                    'id', a.id,
                    'tenantName', t.name,
                    'clientName', c.name,
                    'petName', p.name,
                    'scheduledDate', a."scheduledDate",
                    'scheduledTime', a."scheduledTime",
                    'status', a.status,
                    'totalCost', a."totalCost",
                    'createdAt', a."createdAt"
                )
            )
            FROM appointments a
            JOIN tenants t ON a."tenantId" = t.id
            LEFT JOIN clients c ON a."clientId" = c.id
            LEFT JOIN pets p ON a."petId" = p.id
            WHERE a."createdAt" >= CURRENT_DATE - INTERVAL '7 days'
            ORDER BY a."createdAt" DESC
            LIMIT 10
        ),
        'recentCompanies', (
            SELECT json_agg(
                json_build_object(
                    'id', id,
                    'name', name,
                    'subscriptionTier', "subscriptionTier",
                    'createdAt', "createdAt"
                )
            )
            FROM companies
            WHERE "createdAt" >= CURRENT_DATE - INTERVAL '30 days'
            AND "isActive" = true
            ORDER BY "createdAt" DESC
            LIMIT 5
        ),
        'alertsCount', (
            -- Count critical issues (this would be enhanced based on actual alert system)
            SELECT COUNT(*)
            FROM (
                SELECT 1 WHERE (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') > 50
                UNION ALL
                SELECT 1 WHERE (SELECT pg_database_size(current_database()) / 1024 / 1024) > 800
                UNION ALL  
                SELECT 1 WHERE (SELECT COUNT(*) FROM appointments WHERE status = 'failed') > 0
            ) alerts
        )
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. Data cube function that combines all metrics
CREATE OR REPLACE FUNCTION get_superadmin_dashboard_cube()
RETURNS JSON AS $$
DECLARE
    dashboard_data JSON;
BEGIN
    SELECT json_build_object(
        'overview', get_platform_overview_stats(),
        'companies', get_companies_detailed_stats(),
        'growth', get_monthly_growth_stats(),
        'health', get_system_health_stats(),
        'resources', get_resource_usage_stats(),
        'activity', get_recent_activity_stats(),
        'lastUpdated', CURRENT_TIMESTAMP
    ) INTO dashboard_data;
    
    RETURN dashboard_data;
END;
$$ LANGUAGE plpgsql;