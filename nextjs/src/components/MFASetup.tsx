import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { createSPASassClient } from '@/lib/supabase/client';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import {Factor} from "@supabase/auth-js";

// Define the type locally since it's not exported from the public API
interface MFAEnrollTOTPParams {
    factorType: 'totp';
    friendlyName: string;
}

interface MFASetupProps {
    onStatusChange?: () => void;
}

export function MFASetup({ onStatusChange }: MFASetupProps) {
    const [factors, setFactors] = useState<Factor[]>([]);
    const [step, setStep] = useState<'list' | 'name' | 'enroll'>('list');
    const [factorId, setFactorId] = useState('');
    const [qr, setQR] = useState('');
    const [verifyCode, setVerifyCode] = useState('');
    const [friendlyName, setFriendlyName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionInProgress, setActionInProgress] = useState(false);

    const fetchFactors = async () => {
        try {
            const supabase = await createSPASassClient();
            const { data, error } = await supabase.getSupabaseClient().auth.mfa.listFactors();

            if (error) throw error;

            setFactors(data.all || []);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching MFA factors:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch MFA status');
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFactors();
    }, []);

    const startEnrollment = async () => {
        if (!friendlyName.trim()) {
            setError('Please provide a name for this authentication method');
            return;
        }

        setError('');
        setActionInProgress(true);

        try {
            const supabase = await createSPASassClient();
            const enrollParams: MFAEnrollTOTPParams = {
                factorType: 'totp',
                friendlyName: friendlyName.trim()
            };

            const { data, error } = await supabase.getSupabaseClient().auth.mfa.enroll(enrollParams);

            if (error) throw error;

            setFactorId(data.id);
            setQR(data.totp.qr_code);
            setStep('enroll');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start MFA enrollment');
            setStep('name');
        } finally {
            setActionInProgress(false);
        }
    };

    const verifyFactor = async () => {
        setError('');
        setActionInProgress(true);

        try {
            const supabase = await createSPASassClient();
            const client = supabase.getSupabaseClient();

            const challenge = await client.auth.mfa.challenge({ factorId });
            if (challenge.error) throw challenge.error;

            const verify = await client.auth.mfa.verify({
                factorId,
                challengeId: challenge.data.id,
                code: verifyCode
            });
            if (verify.error) throw verify.error;

            await fetchFactors();
            resetEnrollment();
            onStatusChange?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to verify MFA code');
        } finally {
            setActionInProgress(false);
        }
    };

    const unenrollFactor = async (factorId: string) => {
        setError('');
        setActionInProgress(true);

        try {
            const supabase = await createSPASassClient();
            const { error } = await supabase.getSupabaseClient().auth.mfa.unenroll({ factorId });

            if (error) throw error;

            await fetchFactors();
            onStatusChange?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to unenroll MFA factor');
        } finally {
            setActionInProgress(false);
        }
    };

    const resetEnrollment = () => {
        setStep('list');
        setFactorId('');
        setQR('');
        setVerifyCode('');
        setFriendlyName('');
        setError('');
    };

    if (loading) {
        return (
            <Card>
                <CardContent className="flex justify-center items-center p-6">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">
                    Two-Factor Authentication (2FA)
                </CardTitle>
                <CardDescription>
                    Add an additional layer of security to your account
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {factors.length > 0 && step === 'list' && (
                    <div className="space-y-4">
                        {factors.map((factor) => (
                            <div key={factor.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    {factor.status === 'verified' ? (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                    )}
                                    <div>
                                        <p className="font-medium">
                                            {factor.friendly_name || 'Authenticator App'}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            Added on {new Date(factor.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => unenrollFactor(factor.id)}
                                    disabled={actionInProgress}
                                    className="px-3 py-1 text-sm text-white bg-black hover:bg-gray-800 rounded-md disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {step === 'name' && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="friendly-name" className="block text-sm font-medium text-gray-700">
                                Device Name
                            </label>
                            <input
                                id="friendly-name"
                                type="text"
                                value={friendlyName}
                                onChange={(e) => setFriendlyName(e.target.value)}
                                className="mt-1 block w-full py-3 px-4 rounded-md border border-purple-200 shadow-sm focus:border-purple-400 focus:ring-purple-400 focus:ring-1 sm:text-sm"
                                placeholder="e.g., Work Phone, Personal iPhone"
                                autoFocus
                            />
                            <p className="text-sm text-gray-500">
                                Give this authentication method a name to help you identify it later
                            </p>
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={resetEnrollment}
                                disabled={actionInProgress}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={startEnrollment}
                                disabled={actionInProgress || !friendlyName.trim()}
                                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                                {actionInProgress ? 'Processing...' : 'Continue'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'enroll' && (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            {qr && (
                                <Image
                                    src={qr}
                                    alt="QR Code"
                                    width={192}
                                    height={192}
                                    className="border rounded-lg p-2"
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="verify-code" className="block text-sm font-medium text-gray-700">
                                Verification Code
                            </label>
                            <input
                                id="verify-code"
                                type="text"
                                value={verifyCode}
                                onChange={(e) => setVerifyCode(e.target.value.trim())}
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 text-sm"
                                placeholder="Enter code from your authenticator app"
                            />
                        </div>

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={resetEnrollment}
                                disabled={actionInProgress}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={verifyFactor}
                                disabled={actionInProgress || verifyCode.length === 0}
                                className="flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                            >
                                {actionInProgress ? 'Verifying...' : 'Verify'}
                            </button>
                        </div>
                    </div>
                )}

                {step === 'list' && (
                    <div className="space-y-4">
                        <p className="text-sm text-gray-600">
                            {factors.length === 0
                                ? 'Protect your account with two-factor authentication. When enabled, you\'ll need to enter a code from your authenticator app in addition to your password when signing in.'
                                : 'You can add additional authentication methods or remove existing ones.'}
                        </p>
                        <button
                            onClick={() => setStep('name')}
                            disabled={actionInProgress}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                        >
                            {actionInProgress ? 'Processing...' : 'Add New Authentication Method'}
                        </button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}