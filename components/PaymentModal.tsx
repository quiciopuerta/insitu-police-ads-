
import React from 'react';
import { PlanTier, SystemSettings } from '../types';
import PayPalSubscription from './PayPalSubscription';
import { authService } from '../services/authService';
import { martechService } from '../services/martechService';

interface PaymentModalProps {
    tier: PlanTier;
    onClose: () => void;
    onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ tier, onClose, onSuccess }) => {
    const settings = authService.getSettings();
    const [message, setMessage] = React.useState('');

    const plans = [
        { tier: 'Starter', price: 19.99 },
        { tier: 'Growth', price: 39.99 },
        { tier: 'Agency', price: 65.97 },
    ];

    const price = plans.find(p => p.tier === tier)?.price || 0;

    return (
        <div className="fixed inset-0 z-[200] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-sm rounded-[3rem] p-12 text-center shadow-2xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <div className="flex justify-center mb-10">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/b/b5/PayPal.svg" alt="PayPal" className="h-10" />
                </div>

                <h4 className="text-2xl font-black text-slate-900 mb-2">Completar Pago</h4>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">
                    Plan: {tier} • Total: ${price}/mes
                </p>

                {message && (
                    <div className={`mb-6 p-3 rounded-xl text-[11px] font-black uppercase tracking-widest ${message.includes('Error') ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>
                        {message}
                    </div>
                )}

                <div className="bg-slate-50 p-4 rounded-2xl mb-6 flex items-center justify-center space-x-3">
                    <span className={`w-2 h-2 rounded-full ${settings.paypal.mode === 'live' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">Canal: PayPal {settings.paypal.mode}</span>
                </div>

                <PayPalSubscription
                    tier={tier}
                    onSuccess={(details) => {
                        console.log("Subscription Success:", details);
                        const currentUser = authService.getCurrentUser();
                        if (currentUser) {
                            const updated = authService.setPlan(currentUser.id, tier);
                            if (updated) {
                                martechService.trackPurchase(
                                    details.subscriptionID,
                                    price,
                                    "USD",
                                    tier
                                );
                                setMessage(`¡Suscripción Activada! ID: ${details.subscriptionID}`);
                                setTimeout(() => {
                                    onSuccess();
                                }, 2000);
                            }
                        }
                    }}
                    onError={(err) => {
                        setMessage("Error en el proceso de pago. Intente nuevamente.");
                    }}
                    onCancel={() => {
                        setMessage("Proceso cancelado.");
                    }}
                />

                <div className="mt-6">
                    <p className="text-[11px] text-slate-400 font-medium">
                        Al suscribirte aceptas nuestros términos y condiciones de facturación recurrente.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PaymentModal;
