import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { storage } from '../services/storage';

const supabaseUrl = 'https://iqsjferpagootvflkvnd.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlxc2pmZXJwYWdvb3R2Zmxrdm5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNzgzNzIsImV4cCI6MjA4OTg1NDM3Mn0.wOy0N0iRsjejEZBjNgQZa70VlY3lNnLLsJXjbsmIkfU';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      setItem: (key, value) => {
        storage.set(key, value);
      },
      getItem: (key) => {
        return storage.getString(key) ?? null;
      },
      removeItem: (key) => {
        storage.delete(key);
      },
    },
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
