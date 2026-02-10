import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.anonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storageKey: 'sistema-colina-real-auth'
                }
            }
        );
    }

    get client(): SupabaseClient {
        return this.supabase;
    }

    // Auth helpers
    get auth() {
        return this.supabase.auth;
    }

    // Database helpers
    from(table: string) {
        return this.supabase.from(table);
    }

    // RPC function calls
    rpc(fn: string, params?: any) {
        return this.supabase.rpc(fn, params);
    }

    // Real-time subscriptions
    channel(name: string) {
        return this.supabase.channel(name);
    }
}
