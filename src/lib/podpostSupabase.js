import { createClient } from '@supabase/supabase-js';

const podpostUrl = import.meta.env.VITE_PODPOST_SUPABASE_URL
  || 'https://nvffckuvtbmjfmtogsqj.supabase.co';
const podpostPublishableKey = import.meta.env.VITE_PODPOST_SUPABASE_PUBLISHABLE_KEY
  || 'sb_publishable_uvJalhIzqCBui6th6Dprhw_tz_jN80L';

export const podpostSupabase = createClient(podpostUrl, podpostPublishableKey, {
  auth: {
    storageKey: 'podtoolbox-podpost-auth',
    persistSession: true,
  },
});
