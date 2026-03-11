import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class SupabaseService {
    private supabase: SupabaseClient;

    private lockPromise: Promise<void> = Promise.resolve();

    constructor() {
        this.supabase = createClient(
            environment.supabase.url,
            environment.supabase.anonKey,
            {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true,
                    storageKey: 'sistema-colina-real-auth-v2',
                    flowType: 'pkce',
                    // Workaround for Angular zone.js interfering with navigator.locks
                    // which causes: "Acquiring an exclusive Navigator LockManager lock immediately failed"
                    lock: async (name, timeout, fn) => {
                        const currentLock = this.lockPromise;
                        let nextLockResolve: () => void = () => { };
                        this.lockPromise = new Promise<void>((resolve) => {
                            nextLockResolve = resolve;
                        });

                        await currentLock;
                        try {
                            return await fn();
                        } finally {
                            nextLockResolve();
                        }
                    }
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
