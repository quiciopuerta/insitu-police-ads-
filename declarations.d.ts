// React and related modules are handled by official @types/react and @types/react-dom
// These manual declarations were causing issues by overriding the official ones.

declare module "framer-motion";

// @google/genai is now handled by official types from node_modules

declare module "@emailjs/browser" {
  export const send: any;
  export const sendForm: any;
  export const init: any;
}

interface Window {
  aistudio?: {
    openSelectKey?: (callback?: (key: string) => void) => Promise<void> | void;
  };
}
