"use client";
import React from 'react';
import { useGlobal } from '@/lib/context/GlobalContext';
import { getFirstName } from '@/lib/context/GlobalContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { CalendarDays, FolderOpen, BookOpen } from 'lucide-react';
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
            <div className="flex-1 px-4 pb-4">

            {/* Get Started */}
            <Card className="h-full">
                <CardContent className="p-6 h-full">
                    <div className="space-y-6 h-full">
                        <div>
                            <h2 className="text-xl font-semibold">Get Started</h2>
                            <p className="text-muted-foreground mb-6">So much to learn, so little time</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <Link
                                href="/app/storage"
                                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="p-2 bg-primary-50 rounded-full">
                                    <FolderOpen className="h-4 w-4 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Materials</h3>
                                    <p className="text-sm text-gray-500">Upload and manage your study materials</p>
                                </div>
                            </Link>

                            <Link
                                href="/app/learn"
                                className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <div className="p-2 bg-primary-50 rounded-full">
                                    <BookOpen className="h-4 w-4 text-primary-600" />
                                </div>
                                <div>
                                    <h3 className="font-medium">Learn</h3>
                                    <p className="text-sm text-gray-500">Start interactive lessons and courses</p>
                                </div>
                            </Link>
                        </div>
                    </div>
                </CardContent>
            </Card>
            </div>
        </div>
    );
}