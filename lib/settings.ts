// Settings management utility with database persistence and localStorage fallback

export interface SettingsManager {
  get<T = any>(key: string, defaultValue?: T): Promise<T>;
  set(key: string, value: any): Promise<void>;
  setMultiple(settings: Record<string, any>): Promise<void>;
  remove(key: string): Promise<void>;
  getAll(): Promise<Record<string, any>>;
}

class UserSettingsManager implements SettingsManager {
  private cache: Record<string, any> = {};
  private isOnline: boolean = true;

  constructor() {
    // Check if we're online and can reach the API
    this.checkConnectivity();
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/user-settings?key=connectivity_test', {
        method: 'GET',
        headers
      });
      this.isOnline = response.status !== 401; // 401 means not authenticated, but API is reachable
    } catch (error) {
      this.isOnline = false;
    }
  }

  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      // Try to get from cache first
      if (this.cache[key] !== undefined) {
        return this.cache[key];
      }

      if (this.isOnline) {
        // Try to get from database
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/user-settings?key=${encodeURIComponent(key)}`, {
          method: 'GET',
          headers
        });

        if (response.ok) {
          const data = await response.json();
          this.cache[key] = data.value;
          return data.value;
        }
      }

      // Fallback to localStorage
      const localValue = localStorage.getItem(`user_setting_${key}`);
      if (localValue !== null) {
        try {
          const parsed = JSON.parse(localValue);
          this.cache[key] = parsed;
          return parsed;
        } catch (error) {
          // If parsing fails, return the raw string
          this.cache[key] = localValue;
          return localValue as T;
        }
      }

      return defaultValue as T;
    } catch (error) {
      console.warn('Error getting setting:', error);
      
      // Fallback to localStorage
      const localValue = localStorage.getItem(`user_setting_${key}`);
      if (localValue !== null) {
        try {
          return JSON.parse(localValue);
        } catch (error) {
          return localValue as T;
        }
      }
      
      return defaultValue as T;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      // Update cache immediately
      this.cache[key] = value;

      // Save to localStorage as backup
      localStorage.setItem(`user_setting_${key}`, JSON.stringify(value));

      if (this.isOnline) {
        // Try to save to database
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/user-settings', {
          method: 'POST',
          headers,
          body: JSON.stringify({ key, value })
        });

        if (!response.ok) {
          console.warn('Failed to save setting to database, using localStorage fallback');
        }
      }
    } catch (error) {
      console.warn('Error saving setting:', error);
      // At least save to localStorage
      localStorage.setItem(`user_setting_${key}`, JSON.stringify(value));
    }
  }

  async setMultiple(settings: Record<string, any>): Promise<void> {
    try {
      // Update cache immediately
      Object.assign(this.cache, settings);

      // Save to localStorage as backup
      Object.entries(settings).forEach(([key, value]) => {
        localStorage.setItem(`user_setting_${key}`, JSON.stringify(value));
      });

      if (this.isOnline) {
        // Try to save to database
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/user-settings', {
          method: 'PUT',
          headers,
          body: JSON.stringify({ settings })
        });

        if (!response.ok) {
          console.warn('Failed to save settings to database, using localStorage fallback');
        }
      }
    } catch (error) {
      console.warn('Error saving settings:', error);
      // At least save to localStorage
      Object.entries(settings).forEach(([key, value]) => {
        localStorage.setItem(`user_setting_${key}`, JSON.stringify(value));
      });
    }
  }

  async remove(key: string): Promise<void> {
    try {
      // Remove from cache
      delete this.cache[key];

      // Remove from localStorage
      localStorage.removeItem(`user_setting_${key}`);

      if (this.isOnline) {
        // Try to remove from database
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`/api/user-settings?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
          headers
        });

        if (!response.ok) {
          console.warn('Failed to remove setting from database');
        }
      }
    } catch (error) {
      console.warn('Error removing setting:', error);
    }
  }

  async getAll(): Promise<Record<string, any>> {
    try {
      if (this.isOnline) {
        // Try to get all from database
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch('/api/user-settings', {
          method: 'GET',
          headers
        });

        if (response.ok) {
          const data = await response.json();
          this.cache = { ...this.cache, ...data.settings };
          return data.settings;
        }
      }

      // Fallback to localStorage
      const localSettings: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('user_setting_')) {
          const settingKey = key.replace('user_setting_', '');
          const value = localStorage.getItem(key);
          if (value !== null) {
            try {
              localSettings[settingKey] = JSON.parse(value);
            } catch (error) {
              localSettings[settingKey] = value;
            }
          }
        }
      }

      this.cache = { ...this.cache, ...localSettings };
      return localSettings;
    } catch (error) {
      console.warn('Error getting all settings:', error);
      return {};
    }
  }
}

class AdminSettingsManager implements SettingsManager {
  private cache: Record<string, any> = {};
  private isOnline: boolean = true;

  constructor() {
    this.checkConnectivity();
  }

  private async checkConnectivity(): Promise<void> {
    try {
      const response = await fetch('/api/admin-settings?key=connectivity_test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      this.isOnline = response.status !== 401;
    } catch (error) {
      this.isOnline = false;
    }
  }

  async get<T = any>(key: string, defaultValue?: T): Promise<T> {
    try {
      if (this.cache[key] !== undefined) {
        return this.cache[key];
      }

      if (this.isOnline) {
        const response = await fetch(`/api/admin-settings?key=${encodeURIComponent(key)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          this.cache[key] = data.value;
          return data.value;
        }
      }

      // Fallback to localStorage
      const localValue = localStorage.getItem(`admin_setting_${key}`);
      if (localValue !== null) {
        try {
          const parsed = JSON.parse(localValue);
          this.cache[key] = parsed;
          return parsed;
        } catch (error) {
          this.cache[key] = localValue;
          return localValue as T;
        }
      }

      return defaultValue as T;
    } catch (error) {
      console.warn('Error getting admin setting:', error);
      
      const localValue = localStorage.getItem(`admin_setting_${key}`);
      if (localValue !== null) {
        try {
          return JSON.parse(localValue);
        } catch (error) {
          return localValue as T;
        }
      }
      
      return defaultValue as T;
    }
  }

  async set(key: string, value: any): Promise<void> {
    try {
      this.cache[key] = value;
      localStorage.setItem(`admin_setting_${key}`, JSON.stringify(value));

      if (this.isOnline) {
        const response = await fetch('/api/admin-settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value })
        });

        if (!response.ok) {
          console.warn('Failed to save admin setting to database, using localStorage fallback');
        }
      }
    } catch (error) {
      console.warn('Error saving admin setting:', error);
      localStorage.setItem(`admin_setting_${key}`, JSON.stringify(value));
    }
  }

  async setMultiple(settings: Record<string, any>): Promise<void> {
    try {
      Object.assign(this.cache, settings);

      Object.entries(settings).forEach(([key, value]) => {
        localStorage.setItem(`admin_setting_${key}`, JSON.stringify(value));
      });

      if (this.isOnline) {
        const response = await fetch('/api/admin-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings })
        });

        if (!response.ok) {
          console.warn('Failed to save admin settings to database, using localStorage fallback');
        }
      }
    } catch (error) {
      console.warn('Error saving admin settings:', error);
      Object.entries(settings).forEach(([key, value]) => {
        localStorage.setItem(`admin_setting_${key}`, JSON.stringify(value));
      });
    }
  }

  async remove(key: string): Promise<void> {
    try {
      delete this.cache[key];
      localStorage.removeItem(`admin_setting_${key}`);

      if (this.isOnline) {
        const response = await fetch(`/api/admin-settings?key=${encodeURIComponent(key)}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
          console.warn('Failed to remove admin setting from database');
        }
      }
    } catch (error) {
      console.warn('Error removing admin setting:', error);
    }
  }

  async getAll(): Promise<Record<string, any>> {
    try {
      if (this.isOnline) {
        const response = await fetch('/api/admin-settings', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          this.cache = { ...this.cache, ...data.settings };
          return data.settings;
        }
      }

      const localSettings: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('admin_setting_')) {
          const settingKey = key.replace('admin_setting_', '');
          const value = localStorage.getItem(key);
          if (value !== null) {
            try {
              localSettings[settingKey] = JSON.parse(value);
            } catch (error) {
              localSettings[settingKey] = value;
            }
          }
        }
      }

      this.cache = { ...this.cache, ...localSettings };
      return localSettings;
    } catch (error) {
      console.warn('Error getting all admin settings:', error);
      return {};
    }
  }
}

// Export singleton instances
export const userSettings = new UserSettingsManager();
export const adminSettings = new AdminSettingsManager();

// Convenience functions for common settings
export const settingsHelpers = {
  // User settings helpers
  async getUserTheme(): Promise<'light' | 'dark'> {
    const appearance = await userSettings.get('appearance', { theme: 'light' });
    return (appearance.theme as 'light' | 'dark') || 'light';
  },

  async setUserTheme(theme: 'light' | 'dark'): Promise<void> {
    const appearance = await userSettings.get('appearance', {});
    await userSettings.set('appearance', { ...appearance, theme });
  },

  async getUserNotifications(): Promise<{ pushNotifications: boolean; emailUpdates: boolean }> {
    return await userSettings.get('notifications', { pushNotifications: true, emailUpdates: false });
  },

  async setUserNotifications(notifications: { pushNotifications?: boolean; emailUpdates?: boolean }): Promise<void> {
    const current = await userSettings.get('notifications', { pushNotifications: true, emailUpdates: false });
    await userSettings.set('notifications', { ...current, ...notifications });
  },

  // Admin settings helpers for orders page
  async getAdminDisabledButtons(): Promise<Record<string, string[]> | null> {
    return await adminSettings.get('admin_disabled_buttons');
  },

  async setAdminDisabledButtons(disabledButtons: Record<string, string[]>): Promise<void> {
    await adminSettings.set('admin_disabled_buttons', disabledButtons);
  },

  async getAdminLastClickedStatus(): Promise<Record<string, string> | null> {
    return await adminSettings.get('admin_last_clicked_status');
  },

  async setAdminLastClickedStatus(lastClickedStatus: Record<string, string>): Promise<void> {
    await adminSettings.set('admin_last_clicked_status', lastClickedStatus);
  }
};

// Helper functions for common settings operations
export const getUserSettings = async (): Promise<Record<string, any>> => {
  return await userSettings.getAll();
};

export const saveUserSettings = async (settings: Record<string, any>): Promise<void> => {
  await userSettings.setMultiple(settings);
};

export const getAdminSettings = async (): Promise<Record<string, any>> => {
  return await adminSettings.getAll();
};

export const saveAdminSettings = async (settings: Record<string, any>): Promise<void> => {
  await adminSettings.setMultiple(settings);
};

// Helper functions for specific admin settings
export const getAdminDisabledButtons = async (): Promise<Record<string, string[]> | null> => {
  return await adminSettings.get('admin_disabled_buttons');
};

export const setAdminDisabledButtons = async (disabledButtons: Record<string, string[]>): Promise<void> => {
  await adminSettings.set('admin_disabled_buttons', disabledButtons);
};

export const getAdminLastClickedStatus = async (): Promise<Record<string, string> | null> => {
  return await adminSettings.get('admin_last_clicked_status');
};

export const setAdminLastClickedStatus = async (lastClickedStatus: Record<string, string>): Promise<void> => {
  await adminSettings.set('admin_last_clicked_status', lastClickedStatus);
};