"use client";
import React from 'react';
import { GlobalProvider } from '@/lib/context/GlobalContext';
import AppLayout from '@/components/AppLayout';
import DashboardContent from '../components/DashboardContent';

export default function Home() {
    return (
        <GlobalProvider>
            <AppLayout>
                <DashboardContent />
            </AppLayout>
        </GlobalProvider>
    );
}