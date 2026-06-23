import React from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { authService } from '../services/authService';
import { PlanTier } from '../types';

interface PayPalSubscriptionProps {
    tier: PlanTier;
    onSuccess: (details: any) => void;
    onError: (err: any) => void;
    onCancel: () => void;
}

const PayPalSubscription: React.FC<PayPalSubscriptionProps> = ({ tier, onSuccess, onError, onCancel }) => {
    const settings = authService.getSettings();

    // Fallback to env vars if settings are outdated
    const planId = settings.paypal?.plans?.[tier] ||
        (tier === 'Starter' ? import.meta.env.VITE_PAYPAL_PLAN_STARTER :
            tier === 'Growth' ? import.meta.env.VITE_PAYPAL_PLAN_GROWTH :
                import.meta.env.VITE_PAYPAL_PLAN_AGENCY);

    const clientId = settings.paypal?.clientId || import.meta.env.VITE_PAYPAL_CLIENT_ID_SANDBOX;

    const initialOptions = {
        clientId: clientId,
        vault: true,
        intent: "subscription"
    };

    if (!planId) {
        return (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-xs font-bold text-rose-500">
                    Configuration Error: No Plan ID found for {tier}.
                    Please checking your .env settings.
                </p>
            </div>
        );
    }

    return (
        <PayPalScriptProvider options={initialOptions}>
            <div className="w-full space-y-3 relative z-0 mt-4">
                {/* Primary: Card Payment */}
                <PayPalButtons
                    style={{
                        shape: 'rect',
                        color: 'black',
                        layout: 'vertical',
                        label: 'subscribe'
                    }}
                    fundingSource="card"
                    createSubscription={(data, actions) => {
                        return actions.subscription.create({
                            plan_id: planId
                        });
                    }}
                    onApprove={async (data, actions) => {
                        onSuccess(data);
                    }}
                    onError={(err) => {
                        console.error("PayPal Card Error:", err);
                        onError(err);
                    }}
                    onCancel={() => {
                        onCancel();
                    }}
                />

                {/* Secondary: PayPal Profile */}
                <PayPalButtons
                    style={{
                        shape: 'rect',
                        color: 'blue',
                        layout: 'vertical',
                        label: 'subscribe'
                    }}
                    fundingSource="paypal"
                    createSubscription={(data, actions) => {
                        return actions.subscription.create({
                            plan_id: planId
                        });
                    }}
                    onApprove={async (data, actions) => {
                        onSuccess(data);
                    }}
                    onError={(err) => {
                        console.error("PayPal Account Error:", err);
                        onError(err);
                    }}
                    onCancel={() => {
                        onCancel();
                    }}
                />
            </div>
        </PayPalScriptProvider>
    );
};

export default PayPalSubscription;
