import { getContext, setContext } from 'svelte';

class Toast {
	type: 'success' | 'error' | 'info' | 'warning' = 'info';
	message: string = '';
	constructor(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
		this.message = message;
		this.type = type;
	}
}

class ToastManager {
	toasts: Toast[] = $state([]);
	timeout: number = 5000;
	addToast(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') {
		const toast = new Toast(message, type);
		this.toasts.push(toast);
		setTimeout(() => this.removeToast(toast), this.timeout);
	}

	removeToast(toast: Toast) {
		const index = this.toasts.indexOf(toast);
		if (index !== -1) {
			this.toasts.splice(index, 1);
		}
	}
}

const toastManagerKey = Symbol('toastManager');

export function getToastManagerContext() {
	return getContext<ToastManager>(toastManagerKey);
}

export function setToastManagerContext() {
	const toastManager = new ToastManager();
	setContext(toastManagerKey, toastManager);
	return toastManager;
}
