import { useTranslation } from 'react-i18next';

// Custom hook for type-safe translations with nested key support
export function useTranslations() {
  const { t, i18n } = useTranslation();

  // Helper function to get nested translation with fallback
  const translate = (key: string, options?: any): string => {
    const result = t(key, options) as string;
    
    // If translation not found, return the last part of the key as fallback
    if (result === key && key.includes('.')) {
      const fallback = key.split('.').pop() || key;
      return fallback.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    }
    
    return result;
  };

  // Common translation shortcuts
  const common = {
    loading: () => translate('common.loading'),
    save: () => translate('common.save'),
    cancel: () => translate('common.cancel'),
    delete: () => translate('common.delete'),
    edit: () => translate('common.edit'),
    create: () => translate('common.create'),
    update: () => translate('common.update'),
    search: () => translate('common.search'),
    filter: () => translate('common.filter'),
    back: () => translate('common.back'),
    next: () => translate('common.next'),
    submit: () => translate('common.submit'),
    confirm: () => translate('common.confirm'),
    close: () => translate('common.close'),
    yes: () => translate('common.yes'),
    no: () => translate('common.no'),
    today: () => translate('common.today'),
    status: () => translate('common.status'),
    actions: () => translate('common.actions'),
    details: () => translate('common.details'),
  };

  // Navigation translations
  const nav = {
    dashboard: () => translate('navigation.dashboard'),
    appointments: () => translate('navigation.appointments'),
    clients: () => translate('navigation.clients'),
    medical_records: () => translate('navigation.medical_records'),
    grooming: () => translate('navigation.grooming'),
    inventory: () => translate('navigation.inventory'),
    billing: () => translate('navigation.billing'),
    delivery: () => translate('navigation.delivery'),
    follow_up: () => translate('navigation.follow_up'),
    admin: () => translate('navigation.admin'),
    super_admin: () => translate('navigation.super_admin'),
    settings: () => translate('navigation.settings'),
    reports: () => translate('navigation.reports'),
    help: () => translate('navigation.help'),
  };

  // Authentication translations
  const auth = {
    login: () => translate('auth.login'),
    logout: () => translate('auth.logout'),
    email: () => translate('auth.email'),
    password: () => translate('auth.password'),
    remember_me: () => translate('auth.remember_me'),
    forgot_password: () => translate('auth.forgot_password'),
    login_success: () => translate('auth.login_success'),
    login_error: () => translate('auth.login_error'),
    unauthorized: () => translate('auth.unauthorized'),
    session_expired: () => translate('auth.session_expired'),
  };

  // Error and message translations
  const errors = {
    general_error: () => translate('errors.general_error'),
    network_error: () => translate('errors.network_error'),
    validation_error: () => translate('errors.validation_error'),
    unauthorized: () => translate('errors.unauthorized'),
    not_found: () => translate('errors.not_found'),
    server_error: () => translate('errors.server_error'),
    session_expired: () => translate('errors.session_expired'),
  };

  const messages = {
    save_success: () => translate('messages.save_success'),
    delete_success: () => translate('messages.delete_success'),
    create_success: () => translate('messages.create_success'),
    update_success: () => translate('messages.update_success'),
    operation_success: () => translate('messages.operation_success'),
    confirm_delete: () => translate('messages.confirm_delete'),
    unsaved_changes: () => translate('messages.unsaved_changes'),
  };

  // Subscription translations
  const subscription = {
    title: () => translate('subscription.title'),
    subtitle: () => translate('subscription.subtitle'),
    monthly: () => translate('subscription.monthly'),
    yearly: () => translate('subscription.yearly'),
    most_popular: () => translate('subscription.most_popular'),
    current_plan: () => translate('subscription.current_plan'),
    upgrade: () => translate('subscription.upgrade'),
    downgrade: () => translate('subscription.downgrade'),
    billing_cycle: () => translate('subscription.billing_cycle'),
    price_per_month: () => translate('subscription.price_per_month'),
    price_per_year: () => translate('subscription.price_per_year'),
    features: () => translate('subscription.features'),
    contact_sales: () => translate('subscription.contact_sales'),
    free_trial: () => translate('subscription.free_trial'),
    plans: {
      trial: {
        name: () => translate('subscription.plans.trial.name'),
        description: () => translate('subscription.plans.trial.description'),
        features: () => {
          const features = t('subscription.plans.trial.features', { returnObjects: true });
          return Array.isArray(features) ? features : [];
        },
      },
      basic: {
        name: () => translate('subscription.plans.basic.name'),
        description: () => translate('subscription.plans.basic.description'),
        features: () => {
          const features = t('subscription.plans.basic.features', { returnObjects: true });
          return Array.isArray(features) ? features : [];
        },
      },
      medium: {
        name: () => translate('subscription.plans.medium.name'),
        description: () => translate('subscription.plans.medium.description'),
        features: () => {
          const features = t('subscription.plans.medium.features', { returnObjects: true });
          return Array.isArray(features) ? features : [];
        },
      },
      large: {
        name: () => translate('subscription.plans.large.name'),
        description: () => translate('subscription.plans.large.description'),
        features: () => {
          const features = t('subscription.plans.large.features', { returnObjects: true });
          return Array.isArray(features) ? features : [];
        },
      },
    },
  };

  return {
    t: translate,
    i18n,
    common,
    nav,
    auth,
    errors,
    messages,
    subscription,
    // Direct translation function for any key
    translate,
  };
}