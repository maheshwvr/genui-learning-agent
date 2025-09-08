// src/lib/context/GlobalContext.tsx
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { createSPASassClientAuthenticated as createSPASassClient } from '@/lib/supabase/client';


type User = {
    email: string;
    id: string;
    registered_at: Date;
    first_name?: string;
    last_name?: string;
    profile_complete: boolean;
};

interface GlobalContextType {
    loading: boolean;
    user: User | null;
}

// Utility functions for user display
export const getDisplayName = (user: User | null): string => {
    if (!user) return 'User';
    if (user.first_name && user.last_name) {
        return `${user.first_name} ${user.last_name}`;
    }
    return user.email?.split('@')[0] || 'User';
};

export const getInitials = (user: User | null): string => {
    if (!user) return '??';
    if (user.first_name && user.last_name) {
        return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    // Fallback to existing email-based logic
    const parts = user.email.split('@')[0].split(/[._-]/);
    return parts.length > 1
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
};

export const getFirstName = (user: User | null): string => {
    if (!user) return 'User';
    if (user.first_name) {
        return user.first_name;
    }
    return user.email?.split('@')[0] || 'User';
};

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: React.ReactNode }) {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);  // Add this

    useEffect(() => {
        async function loadData() {
            try {
                const supabase = await createSPASassClient();
                const client = supabase.getSupabaseClient();

                // Get user data
                const { data: { user } } = await client.auth.getUser();
                if (user) {
                    const firstName = user.user_metadata?.first_name;
                    const lastName = user.user_metadata?.last_name;
                    const profile_complete = Boolean(firstName && lastName);
                    
                    setUser({
                        email: user.email!,
                        id: user.id,
                        registered_at: new Date(user.created_at),
                        first_name: firstName,
                        last_name: lastName,
                        profile_complete
                    });
                } else {
                    throw new Error('User not found');
                }

            } catch (error) {
                console.error('Error loading data:', error);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    return (
        <GlobalContext.Provider value={{ loading, user }}>
            {children}
        </GlobalContext.Provider>
    );
}

export const useGlobal = () => {
    const context = useContext(GlobalContext);
    if (context === undefined) {
        throw new Error('useGlobal must be used within a GlobalProvider');
    }
    return context;
};