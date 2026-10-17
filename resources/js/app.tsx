import { createRoot } from 'react-dom/client';
import { createInertiaApp } from '@inertiajs/react';
import type { ReactNode } from 'react';

type ResolvedComponent = {
    default: ((props: unknown) => ReactNode) & { layout?: (page: ReactNode) => ReactNode };
};
// Global route fallback helper
if (typeof window !== 'undefined' && !(window as unknown as { route?: unknown }).route) {
    (window as unknown as { route: (name?: string, params?: Record<string, unknown>) => string }).route = (
        name?: string,
        params?: Record<string, unknown>
    ) => {
        if (!name || name === 'home') {
            const query = new URLSearchParams();
            if (params) {
                for (const [key, val] of Object.entries(params)) {
                    if (val !== undefined && val !== null && val !== '') {
                        query.set(key, String(val));
                    }
                }
            }
            const qStr = query.toString();
            return qStr ? `/?${qStr}` : '/';
        }
        return `/${name}`;
    };
}

createInertiaApp({
    resolve: (name: string) => {
        const pages = import.meta.glob<ResolvedComponent>('./pages/**/*.tsx', { eager: true });
        const page = pages[`./pages/${name}.tsx`];
        if (!page) {
            throw new Error(`Page not found: ./pages/${name}.tsx`);
        }
        return page;
    },
    setup({ el, App, props }) {
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#6366f1',
    },
});
