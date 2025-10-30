let state = $state<{
	title: string;
	message: string;
	buttons?: MessageButtons;
	resolve: (v: boolean) => void;
} | null>(null);

export function getMessageDialogState() {
	return state;
}

export function showMessageDialog(options: {
	title: string;
	message: string;
	buttons?: MessageButtons;
}): Promise<boolean> {
	return new Promise((resolve) => {
		state = {
			title: options.title,
			message: options.message,
			buttons: options.buttons || MessageButtons.Ok,
			resolve
		};
	});
}

export function closeMessageDialog(result: boolean) {
	state?.resolve(result);
	state = null;
}

export enum MessageButtons {
	YesNoCancel,
	YesNo,
	Ok,
	OkCancel
}
