"use client";
import React from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getFirstName } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { CalendarDays, Settings, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function DashboardContent() {
    const { loading, user } = useGlobal();

    const getDaysSinceRegistration = () => {
        if (!user?.registered_at) return 0;
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - user.registered_at.getTime());
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    const daysSinceRegistration = getDaysSinceRegistration();

    return (
        <div className="h-full flex flex-col">
            <div className="flex-none p-4">
                <div className="mb-4">
                    <PageHeader
                        title={`Welcome, ${getFirstName(user)}!`}
                        description={
                            <div className="flex items-center gap-2">
                                <CalendarDays className="h-4 w-4" />
                                Member for {daysSinceRegistration} days
                            </div>
                        }
                    />
                </div>
            </div>
            <div className="flex-1 px-4 pb-4 space-y-6">

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>Frequently used features</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-2">
                        <Link
                            href="/app/user-settings"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-primary-50 rounded-full">
                                <Settings className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">User Settings</h3>
                                <p className="text-sm text-gray-500">Manage your account preferences</p>
                            </div>
                        </Link>

                        <Link
                            href="/app/table"
                            className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            <div className="p-2 bg-primary-50 rounded-full">
                                <ExternalLink className="h-4 w-4 text-primary-600" />
                            </div>
                            <div>
                                <h3 className="font-medium">Example Page</h3>
                                <p className="text-sm text-gray-500">Check out example features</p>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}