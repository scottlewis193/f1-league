import { query } from '$app/server';
import { parseStringPromise } from 'xml2js';

export const getNews = query(async () => {
	const RSS_URL = `http://feeds.feedburner.com/totalf1-recent`;

	try {
		const response = await fetch(RSS_URL);
		if (!response.ok) throw new Error(`Failed to fetch RSS: ${response.statusText}`);

		const xml = await response.text();
		const json = await parseStringPromise(xml, { explicitArray: false, trim: true });

		// Navigate to the RSS channel
		const channel = json?.rss?.channel;
		const title = channel?.title ?? 'Unknown Feed';
		const items = Array.isArray(channel?.item) ? channel.item : channel?.item ? [channel.item] : [];

		// Simplify item fields
		const simplified = items.map(
			(item: { title: string; link: string; pubDate: string; description: string }) => ({
				title: item.title,
				link: item.link,
				pubDate: item.pubDate,
				description: item.description
			})
		);

		const result = { title, items: simplified };

		return result;
	} catch (error) {
		console.error(error);
	}
});
