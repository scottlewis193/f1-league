import puppeteer from 'puppeteer';
import type { Race, Team } from './types';

export async function scrapeAll() {
	let races;
	let drivers;
	let teams;
	let scrapeAttempt = 1;
	let scrapeSuccess = false;

	while (!scrapeSuccess && scrapeAttempt <= 3) {
		try {
			races = await scrapeF1Races();
			drivers = await scrapeDrivers();
			teams = await scrapeTeams();
			scrapeSuccess = true;
		} catch (e) {
			if (scrapeAttempt === 3) {
				return { error: e };
			}
			scrapeAttempt++;
		}
	}

	return { races, drivers, teams };
}

export async function scrapeDrivers(season = '2025') {
	const url = `https://www.formula1.com/en/results.html/${season}/drivers.html`;
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	const page = await browser.newPage();

	try {
		await page.goto(url);

		// Wait for the standings table to load
		await page.waitForSelector('.f1-table');

		const standings = await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('.f1-table tbody tr'));
			return rows.map((row) => {
				const cols = row.querySelectorAll('td');
				return {
					position: Number(cols[0]?.innerText.trim()),
					name: cols[1]?.innerText.trim().replace(/\n/g, ' '),
					nationality: cols[2]?.innerText.trim(),
					team: cols[3]?.innerText.trim(),
					points: Number(cols[4]?.innerText.trim())
				};
			});
		});

		return standings;
	} catch (e) {
		console.error(e);
	} finally {
		await browser.close();
	}
}

export async function scrapeTeams(season = 2025) {
	const url = `https://www.formula1.com/en/results.html/${season}/team.html`;
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	const page = await browser.newPage();

	try {
		await page.goto(url);

		// Wait for the standings table to load
		await page.waitForSelector('.f1-table');

		const standings = (await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('.f1-table tbody tr'));
			return rows.map((row) => {
				const cols = row.querySelectorAll('td');
				return {
					position: cols[0]?.innerText.trim(),
					name: cols[1]?.innerText.trim().replace(/\n/g, ' '),
					points: cols[2]?.innerText.trim()
				};
			});
		})) as unknown as Team[];

		return standings;
	} catch (e) {
		console.error(e);
	} finally {
		await browser.close();
	}
}

export async function scrapeF1Races(season = '2025') {
	const baseUrl = `https://www.formula1.com/en/racing/${season}`;
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	const page = await browser.newPage();

	try {
		console.log(`Loading season schedule: ${baseUrl}`);
		await page.goto(baseUrl);

		// Wait for race cards to load
		await page.waitForSelector('a[href*="/en/racing/"]', { timeout: 20000 });

		// Extract race links
		const raceLinks = await page.evaluate(() => {
			// Select anchor tags pointing to race pages
			const anchors: HTMLAnchorElement[] = Array.from(
				document.querySelectorAll('a[href*="/en/racing/"]')
			);
			return anchors
				.map((a) => (a as HTMLAnchorElement).href)
				.filter((href) => href.split('/').length > 6) // avoid generic /2025 root
				.filter((href, index, self) => self.indexOf(href) === index); // unique // remove duplicates
		});

		const allRaces: Race[] = [];

		for (const raceUrl of raceLinks) {
			// console.log(`Scraping: ${raceUrl}`);
			if (raceUrl.includes('pre-season-testing')) continue; //skip pre season testing

			const _location = raceUrl.split('/').pop() || '';
			const racePage = await browser.newPage();
			await racePage.goto(raceUrl);

			// Wait for the session table
			await racePage.waitForSelector(
				'#maincontent > div > div:nth-child(2) > div > div > div:nth-child(1) > div.flex.flex-col.px-px-8.md\\:px-px-16.lg\\:px-px-24.py-px-8.md\\:py-px-16.lg\\:py-px-24.bg-surface-neutral-1.rounded-m > ul'
			);

			const raceDetails = await racePage.evaluate(() => {
				const raceName = document.querySelector('h1')?.innerText.trim() || '';

				const sessionItems = Array.from(
					document.querySelectorAll(
						'#maincontent > div > div:nth-child(2) > div > div > div:nth-child(1) > div.flex.flex-col.px-px-8.md\\:px-px-16.lg\\:px-px-24.py-px-8.md\\:py-px-16.lg\\:py-px-24.bg-surface-neutral-1.rounded-m > ul > li'
					)
				);

				const sessions = sessionItems.map((li) => {
					const detail = li.querySelector('span:nth-child(3)');
					if (!detail) return { title: 'unknown', time: 'unknown', date: 'unknown' };
					const date =
						li.querySelector<HTMLSpanElement>('span > span')?.innerText.trim() +
							' ' +
							li.querySelector<HTMLSpanElement>('span > span:nth-child(2)')?.innerText.trim() || '';
					const title =
						detail.querySelector<HTMLSpanElement>('span > span')?.innerText.trim() || '';
					const time =
						detail
							.querySelector<HTMLTimeElement>('span > span:nth-child(2) > span > time')
							?.innerText.trim() ||
						li
							.querySelector<HTMLTimeElement>('span:nth-child(4) > span > time ')
							?.innerText.trim() ||
						'';
					return { date, time, title };
				});

				//get results if any. First table element on page
				const raceResultsTbl = document.querySelector<HTMLTableElement>('table');
				if (!raceResultsTbl) return { raceName, sessions, raceResults: [] };
				const raceResultItems = Array.from(
					raceResultsTbl.querySelectorAll<HTMLSpanElement>(
						'tbody > tr > td > span > span:nth-child(2) > span:nth-child(2)'
					)
				);
				const raceResults: string[] = raceResultItems.map((span: HTMLSpanElement) => {
					return span.innerText.trim();
				});

				console.log('sessions', sessions);

				return { raceName, sessions, raceResults };
			});

			//check if race exists, if so update race result
			const raceNameAry = raceDetails.raceName.split(' ');
			const year = Number(raceNameAry[raceNameAry.length - 1]);

			allRaces.push({ ...raceDetails, location: _location, year, id: '', raceNo: 0 });

			await racePage.close();
		}

		await browser.close();
		allRaces.sort((a, b) => Date.parse(a.sessions[0].date) - Date.parse(b.sessions[0].date));
		return allRaces;
	} catch (err) {
		await browser.close();
		throw err;
	}
}
