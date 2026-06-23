
import emailjs from '@emailjs/browser';
import { SystemSettings } from '../../types';
import { logger } from '../../utils/logger';


const SETTINGS_KEY = 'insitu_system_settings';

export const mailService = {
    sendEmailNotification: (to: string, subject: string, body: string): boolean => {
        const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') as SystemSettings;

        if (settings.smtp?.enabled) {
            logger.info(`%c[SMTP SERVICE] Sending via ${settings.smtp.host}:${settings.smtp.port} (${settings.smtp.secure ? 'SSL' : 'TLS'})`, 'color: #3B82F6; font-weight: bold;');
            logger.info(`From: ${settings.smtp.fromName} <${settings.smtp.fromEmail}>`);
            logger.info(`To: ${to}`);
            logger.info(`Subject: ${subject}`);
            // In a real production environment, this would call a backend endpoint
            return true;
        }

        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (serviceId && templateId && publicKey) {
            emailjs.send(serviceId, templateId, {
                to_email: to,
                subject: subject,
                message: body,
                to_name: to.split('@')[0] // Fallback name
            }, publicKey)
                .then((response) => {
                    logger.info('%c[MAIL SERVICE] Email sent successfully!', 'color: #10B981', response.status, response.text);
                }, (err) => {
                    logger.error('%c[MAIL SERVICE] Failed to send email.', 'color: #EF4444', err);
                });
        } else {
            // Fallback for development or if keys are missing
            logger.info(`%c[MAIL SERVICE] (Simulated) Enviando a: ${to}`, 'color: #ff477b; font-weight: bold;');
            logger.info(`Sujeto: ${subject}`);
            logger.info(`Cuerpo: ${body}`);
        }
        return true;
    }
};
