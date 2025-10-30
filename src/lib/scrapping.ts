import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Race, Team } from './types';

puppeteer.use(StealthPlugin());

export async function scrapeAll() {
	let races;
	let drivers;
	let teams;
	let odds;
	let scrapeAttempt = 1;
	let scrapeSuccess = false;

	while (!scrapeSuccess && scrapeAttempt <= 3) {
		try {
			races = await scrapeF1Races();
			drivers = await scrapeDrivers();
			teams = await scrapeTeams();
			odds = await scrapeOdds();
			scrapeSuccess = true;
		} catch (e) {
			if (scrapeAttempt === 3) {
				return { error: e };
			}
			scrapeAttempt++;
		}
	}

	return { races, drivers, teams, odds };
}

export async function scrapeDrivers(season = '2025') {
	const url = `https://www.formula1.com/en/results.html/${season}/drivers.html`;
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	});
	const page = await browser.newPage();

	try {
		console.log(`Scraping F1 Drivers: ${url}`);
		await page.goto(url);

		// Wait for the standings table to load
		await page.waitForSelector('#results-table');

		const standings = await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('#results-table > div > table tbody tr'));
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
		console.log(`Scraping F1 Teams: ${url}`);
		await page.goto(url);

		// Wait for the standings table to load
		await page.waitForSelector('#results-table');

		const standings = (await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('#results-table > div > table tbody tr'));
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
		console.log(`Scraping F1 Races: ${baseUrl}`);
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

				const raceResultBtn = [...document.querySelectorAll('button')].find(
					(btn) => btn.textContent?.trim() === 'Race Result'
				);

				//#maincontent > div > div:nth-child(2) > div > div > div:nth-child(4) > div.flex.flex-col.md\:flex-row.justify-between.gap-px-16 > span > span > button > span > span
				//#maincontent > div > div:nth-child(2) > div > div > div:nth-child(4) > div.flex.flex-col.md\:flex-row.justify-between.gap-px-16 > span > span > button > span > span
				if (!raceResultBtn) {
					return { raceName, sessions, raceResults: [] };
				}

				//get race results if exists. First table element on pageflex.flex-col.md\\:flex-row.justify-between.gap-px-16
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
	} catch (e) {
		await browser.close();
		console.error(e);
	}
}

export const scrapeOdds = async () => {
	const baseUrl = 'https://www.oddschecker.com';
	const url = `${baseUrl}/motorsport/formula-1`;
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
		defaultViewport: { width: 1920, height: 1080 }
	});
	const page = await browser.newPage();

	try {
		console.log(`Scraping F1 Race Odds: ${url}`);
		await page.goto(url);

		await page.waitForNetworkIdle({ idleTime: 1000 });

		//wait for accept cookies button

		await page.waitForSelector('body > div > div > div > div > button');

		//click accept cookies button

		await page.locator('body > div > div > div > div > button').click({ delay: 100 });

		//wait for menu button

		//await page.waitForSelector('#mid-nav > div.container > div > button');
		await page.waitForSelector('#oddsItem > button');

		//click menu button

		await page.locator('#oddsItem > button').click();
		//await page.locator('#mid-nav > div.container > div > button').click();

		//change to decimal odds

		await page.waitForSelector('#OddsDropdown-2');
		await page.locator('#OddsDropdown-2').click();

		//wait for podium finish
		await page.waitForSelector('a[href*="podium-finish"]');

		//get href from podium finish a
		const podiumFinishUrl = await page.evaluate(() => {
			const podiumFinishUrl = document
				.querySelector('a[href*="podium-finish"]')
				?.getAttribute('href');

			return podiumFinishUrl;
		});

		const podiumFinishPage = await browser.newPage();
		await podiumFinishPage.goto(baseUrl + podiumFinishUrl);
		await podiumFinishPage.waitForNetworkIdle({ idleTime: 1000 });

		//wait for event table
		await podiumFinishPage.waitForSelector('table.eventTable');

		//iterate over table rows and grab driver name and odds
		const driverOdds = await podiumFinishPage.evaluate(() => {
			const driverOdds: { driverName: string; odds: number }[] = [];
			const table = document.querySelector('table.eventTable');
			const rows = table?.querySelectorAll('tbody > tr');
			rows?.forEach((row) => {
				const driverName =
					row.querySelector<HTMLAnchorElement>(
						'td.sel.nm.basket-active > span.float-wrap.name-wrap > span > div > a'
					)?.innerText || '';
				const odds = row.querySelector<HTMLParagraphElement>('td > p')?.innerText || '';
				driverOdds.push({ driverName, odds: Number(odds) });
			});
			return driverOdds;
		});

		await browser.close();
		return driverOdds;
	} catch (e) {
		await browser.close();
		console.error(e);
		console.log(`Warning: Odds Not Available (${page.url()})`);
		return [];
	}
};
