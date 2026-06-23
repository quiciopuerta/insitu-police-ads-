import { buildAbsoluteUrl } from "../utils/apiConfig";
import React, { useState } from 'react';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { X, CreditCard, Coins, ChevronRight, CheckCircle2 } from 'lucide-react';
import { AuthUser } from '../types';

interface TokenPurchaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: AuthUser;
    onSuccess: (tokens: number) => void;
}

const TokenPurchaseModal: React.FC<TokenPurchaseModalProps> = ({ isOpen, onClose, user, onSuccess }) => {
    const [quantity, setQuantity] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [step, setStep] = useState<'selection' | 'payment' | 'success'>('selection');

    if (!isOpen) return null;

    const pricePerBlock = user.subscription?.plan === 'Agency' ? 3.54 : 3.00;
    const total = (pricePerBlock * quantity).toFixed(2);
    const tokenAmount = quantity * 1000;

    const initialOptions = {
        clientId: "test", // Replace with real ID in production env
        currency: "USD",
        intent: "capture",
        "enable-funding": "card",
        "disable-funding": "",
    };

    const handleCreateOrder = async () => {
        try {
            const response = await fetch(buildAbsoluteUrl('/.netlify/functions/paypal-orders'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': user.id
                },
                body: JSON.stringify({
                    action: 'create',
                    userId: user.id,
                    quantity: quantity
                })
            });
            const order = await response.json();
            return order.id;
        } catch (err) {
            console.error("Error creating order:", err);
            throw err;
        }
    };

    const handleApprove = async (orderID: string) => {
        setIsProcessing(true);
        try {
            const response = await fetch(buildAbsoluteUrl('/.netlify/functions/paypal-orders'), {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-User-Id': user.id
                },
                body: JSON.stringify({
                    action: 'capture',
                    orderID: orderID,
                    userId: user.id,
                    quantity: quantity
                })
            });
            const result = await response.json();
            if (result.success) {
                setStep('success');
                onSuccess(tokenAmount);
            }
        } catch (err) {
            console.error("Error capturing order:", err);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-[#0f172a] border border-white/10 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in-up">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-500/10 rounded-xl">
                            <Coins className="w-5 h-5 text-pink-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Comprar Tokens</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                </div>

                <div className="p-6">
                    {step === 'selection' && (
                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                <label className="block text-sm font-medium text-white/60 mb-3">
                                    Cantidad de paquetes (1,000 tokens c/u)
                                </label>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-xl text-white hover:bg-white/20 transition-all font-bold"
                                    >
                                        -
                                    </button>
                                    <div className="flex-1 text-center">
                                        <div className="text-3xl font-black text-white">{quantity}</div>
                                        <div className="text-xs text-white/40 uppercase tracking-widest mt-1">Paquetes</div>
                                    </div>
                                    <button 
                                        onClick={() => setQuantity(quantity + 1)}
                                        className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center text-xl text-pink-500 hover:bg-pink-500/30 transition-all font-bold"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60">Total Tokens</span>
                                    <span className="text-white font-bold">{tokenAmount.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/60">Precio por bloque ({user.subscription?.plan || 'Starter'})</span>
                                    <span className="text-white font-bold">${pricePerBlock.toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-white/5 my-2" />
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-white">Total a pagar</span>
                                    <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-rose-500">
                                        ${total}
                                    </span>
                                </div>
                            </div>

                            <button 
                                onClick={() => setStep('payment')}
                                className="w-full py-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-all shadow-lg active:scale-95"
                            >
                                Continuar al Pago
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {step === 'payment' && (
                        <div className="space-y-6">
                            <div className="bg-white/5 rounded-2xl p-4 border border-white/5 flex items-center justify-between mb-4">
                                <div>
                                    <div className="text-xs text-white/40 uppercase tracking-widest">Resumen</div>
                                    <div className="text-lg font-bold text-white">{tokenAmount.toLocaleString()} Tokens</div>
                                </div>
                                <div className="text-2xl font-black text-pink-500">${total}</div>
                            </div>

                            <PayPalScriptProvider options={initialOptions}>
                                <div className="space-y-3 min-h-[150px]">
                                    <PayPalButtons
                                        style={{ layout: "vertical", color: "black", shape: "rect", label: "pay" }}
                                        fundingSource="card"
                                        createOrder={handleCreateOrder}
                                        onApprove={async (data) => handleApprove(data.orderID)}
                                        disabled={isProcessing}
                                    />
                                    <PayPalButtons
                                        style={{ layout: "vertical", color: "blue", shape: "rect", label: "paypal" }}
                                        fundingSource="paypal"
                                        createOrder={handleCreateOrder}
                                        onApprove={async (data) => handleApprove(data.orderID)}
                                        disabled={isProcessing}
                                    />
                                </div>
                            </PayPalScriptProvider>

                            <button 
                                onClick={() => setStep('selection')}
                                className="w-full py-2 text-white/40 hover:text-white/60 transition-colors text-sm font-medium"
                                disabled={isProcessing}
                            >
                                ← Volver a la selección
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8 space-y-6">
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-white mb-2">¡Compra Exitosa!</h3>
                                <p className="text-white/60">
                                    Se han añadido <strong>{tokenAmount.toLocaleString()} tokens</strong> a tu cuenta.
                                </p>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-full py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-bold transition-all"
                            >
                                Finalizar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TokenPurchaseModal;
