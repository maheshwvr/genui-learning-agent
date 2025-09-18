import {createBrowserClient} from '@supabase/ssr'
import {ClientType, SassClient} from "@/lib/supabase/unified";
import {Database} from "@/lib/types";

export function createSPAClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

export async function createSPASassClient() {
    const client = createSPAClient();
    return new SassClient(client, ClientType.SPA);
}

export async function createSPASassClientAuthenticated() {
    const client = createSPAClient();
    const user = await client.auth.getSession();
    if (!user.data || !user.data.session) {
        window.location.href = '/auth/login';
    }
    return new SassClient(client, ClientType.SPA);
}

/**
 * Get TUS-specific auth headers for Supabase Storage uploads
 */
export async function getTusAuthHeaders() {
    const client = createSPAClient();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error || !session) {
        throw new Error('Authentication required for file upload');
    }

    return {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'x-upsert': 'false'
    };
}

/**
 * Get current user session for TUS uploads
 */
export async function getCurrentSession() {
    const client = createSPAClient();
    const { data: { session }, error } = await client.auth.getSession();
    
    if (error) {
        throw new Error(`Auth error: ${error.message}`);
    }
    
    return session;
}

/**
 * Refresh auth token if needed for long uploads
 */
export async function refreshAuthToken() {
    const client = createSPAClient();
    const { data, error } = await client.auth.refreshSession();
    
    if (error) {
        throw new Error(`Token refresh failed: ${error.message}`);
    }
    
    return data.session;
}