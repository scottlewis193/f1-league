import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser, Page } from 'puppeteer';
import type { Driver, Race, Team } from '../types';

puppeteer.use(StealthPlugin());

const SEASON = new Date().getFullYear();
const DEFAULT_BROWSER_ARGS = [
	'--no-sandbox',
	'--disable-setuid-sandbox',
	'--disable-dev-shm-usage'
];

const MIN_EXPECTED_RACES = 5;
const MIN_EXPECTED_DRIVERS = 20;
const MIN_EXPECTED_TEAMS = 10;
const MIN_EXPECTED_ODDS = 20;

function hasText(value: unknown): value is string {
	return typeof value === 'string' && value.trim().length > 0;
}

function hasFiniteNumber(value: unknown): value is number {
	return typeof value === 'number' && Number.isFinite(value);
}

export function normalizeDriverName(name: string) {
	const withoutCode = name
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/([a-z])([A-Z]{3})$/, '$1');
	return withoutCode.split(' ').at(-1) || '';
}

export function parseRaceSessionText(text: string) {
	const normalized = text
		.trim()
		.replace(/\s+/g, ' ')
		.replace(/^(?:Chequered Flag|Next Race)\s+/i, '');
	const match = normalized.match(
		/^(\d{1,2}\s+[A-Za-z]+)\s+(.+?)(?:\s+(\d{1,2}:\d{2})(?:\s*-\s*\d{1,2}:\d{2})?)?(?:\s+(?:Expand|Report|Results|Highlights|Lap-by-lap))*$/
	);

	if (!match) return { date: '', time: '', title: '' };

	return { date: match[1], time: match[3] || '', title: match[2].trim() };
}

export function parseRaceSessionTexts(texts: string[]) {
	return texts
		.map(parseRaceSessionText)
		.filter((session) => session.date && session.time && session.title);
}

async function closePage(page: Page) {
	if (page.isClosed()) return;

	try {
		await page.close();
	} catch (error) {
		if (!(error instanceof Error) || !error.message.includes('No target with given id')) {
			throw error;
		}
	}
}

export function validateScrapedDrivers(drivers: Driver[]) {
	if (
		drivers.length < MIN_EXPECTED_DRIVERS ||
		drivers.some(
			(driver) =>
				!hasText(driver.name) ||
				!hasText(driver.nationality) ||
				!hasText(driver.team) ||
				!hasFiniteNumber(driver.position) ||
				!hasFiniteNumber(driver.points)
		)
	) {
		throw new Error(`Driver standings are incomplete (${drivers.length} rows)`);
	}

	return drivers;
}

export function validateScrapedTeams(teams: Team[]) {
	if (
		teams.length < MIN_EXPECTED_TEAMS ||
		teams.some(
			(team) =>
				!hasText(team.name) || !hasFiniteNumber(team.position) || !hasFiniteNumber(team.points)
		)
	) {
		throw new Error(`Team standings are incomplete (${teams.length} rows)`);
	}

	return teams;
}

export function validateScrapedRaces(races: Race[]) {
	if (
		races.length < MIN_EXPECTED_RACES ||
		races.some(
			(race) =>
				!hasText(race.raceName) ||
				!hasText(race.location) ||
				!hasFiniteNumber(race.raceNo) ||
				race.sessions.length === 0 ||
				race.sessions.some(
					(session) => !hasText(session.date) || !hasText(session.time) || !hasText(session.title)
				)
		)
	) {
		throw new Error(`Race schedule is incomplete (${races.length} rows)`);
	}

	return races;
}

export function validateScrapedOdds(odds: { driverName: string; odds: number }[]) {
	if (
		odds.length < MIN_EXPECTED_ODDS ||
		odds.some(
			({ driverName, odds: value }) => !hasText(driverName) || !hasFiniteNumber(value) || value <= 0
		)
	) {
		throw new Error(`Podium odds market is incomplete (${odds.length} rows)`);
	}

	return odds;
}

function launchBrowser(defaultViewport?: { width: number; height: number }) {
	return puppeteer.launch({
		headless: true,
		args: DEFAULT_BROWSER_ARGS,
		...(defaultViewport ? { defaultViewport } : {})
	});
}

export async function scrapeAll() {
	const browser = await launchBrowser();
	try {
		// Each scrape is independent so one failure doesn't abort the others
		const [races, drivers, teams, odds] = await Promise.all([
			scrapeF1Races(browser).catch((e) => {
				console.error('Races scrape failed:', e);
				return undefined;
			}),
			scrapeDrivers(browser).catch((e) => {
				console.error('Drivers scrape failed:', e);
				return undefined;
			}),
			scrapeTeams(browser).catch((e) => {
				console.error('Teams scrape failed:', e);
				return undefined;
			}),
			scrapeOdds(browser).catch((e) => {
				console.error('Odds scrape failed:', e);
				return undefined;
			})
		]);

		return { races, drivers, teams, odds };
	} finally {
		await browser.close();
	}
}

export async function scrapeDrivers(browserInstance?: Browser) {
	const url = `https://www.formula1.com/en/results.html/${SEASON}/drivers.html`;
	const browser = browserInstance ?? (await launchBrowser());
	const shouldCloseBrowser = !browserInstance;
	const page = await browser.newPage();

	try {
		console.log(`Scraping F1 Drivers: ${url}`);
		await page.goto(url);

		// Wait for the standings table to load
		await page.waitForSelector('#results-table');

		const rawStandings = (await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('#results-table table tbody tr'));
			return rows.map((row) => {
				const cols = row.querySelectorAll('td');
				if (cols.length < 5) return undefined;
				return {
					position: Number(cols[0]?.innerText.trim()),
					name: cols[1]?.innerText.trim().replace(/\n/g, ' ') || '',
					nationality: cols[2]?.innerText.trim(),
					team: cols[3]?.innerText.trim(),
					points: Number(cols[4]?.innerText.trim()),
					year: 1900
				};
			});
		})) as (Driver | undefined)[];
		const standings = rawStandings
			.filter((driver): driver is Driver => Boolean(driver))
			.map((driver) => ({ ...driver, name: normalizeDriverName(driver.name) }));

		standings.forEach((driver) => {
			driver.year = SEASON;
		});

		return validateScrapedDrivers(standings);
	} catch (e) {
		console.error(e);
	} finally {
		await closePage(page);
		if (shouldCloseBrowser) await browser.close();
	}
}

export async function scrapeTeams(browserInstance?: Browser) {
	const url = `https://www.formula1.com/en/results.html/${SEASON}/team.html`;
	const browser = browserInstance ?? (await launchBrowser());
	const shouldCloseBrowser = !browserInstance;
	const page = await browser.newPage();

	try {
		console.log(`Scraping F1 Teams: ${url}`);
		await page.goto(url);

		// Wait for the standings table to load
		await page.waitForSelector('#results-table');

		const standings = (await page.evaluate(() => {
			const rows = Array.from(document.querySelectorAll('#results-table table tbody tr'));
			return rows.map((row) => {
				const cols = row.querySelectorAll('td');
				if (cols.length < 3) return null;
				return {
					position: Number(cols[0]?.innerText.trim()),
					name: cols[1]?.innerText.trim().replace(/\n/g, ' '),
					points: Number(cols[2]?.innerText.trim())
				};
			});
		})) as unknown as Team[];

		standings.forEach((team) => {
			team.year = SEASON;
		});

		return validateScrapedTeams(standings);
	} catch (e) {
		console.error(e);
	} finally {
		await closePage(page);
		if (shouldCloseBrowser) await browser.close();
	}
}

export async function scrapeRaceLocations(browserInstance?: Browser) {
	const browser = browserInstance ?? (await launchBrowser());
	const shouldCloseBrowser = !browserInstance;
	const page = await browser.newPage();

	// Step 1: Go to races page
	await page.goto('https://pitwall.app/races', { waitUntil: 'networkidle2' });

	// Step 2: Get all race links
	const raceLinks = await page.$$eval(
		"a[href*='/races/']",
		(links) => links.map((a) => a.href).filter((href) => href.match(/\/races\/\d{4}-/)) // ensures proper race links
	);

	const results = [];

	// Step 3: Loop over each race page
	for (const link of raceLinks) {
		await page.goto(link);

		await page.waitForSelector('h1');

		// Step 4: Extract Round + Location
		const data = await page.evaluate(() => {
			const roundEl = [...document.querySelectorAll('p, div, li, span')].find((el) =>
				/Round/i.test(el.textContent)
			);
			const locationEl = [...document.querySelectorAll('p, div, li, span')].find((el) =>
				/Location/i.test(el.textContent)
			);

			const roundMatch = roundEl?.textContent.match(/Round\s*([\d/]+)/i);
			const round = roundMatch ? roundMatch[1] : null;

			// Extract something like "Melbourne, Australia"
			const locMatch = locationEl?.textContent.match(/Location\.?\s*(.+)/i);
			const location = locMatch ? locMatch[1].trim() : null;

			const raceName = document.querySelector('h1')?.textContent?.trim();

			return { raceName, round, location };
		});

		results.push({ url: link, ...data });
	}

	await closePage(page);
	if (shouldCloseBrowser) await browser.close();

	return results;
}

export async function scrapeF1Races(browserInstance?: Browser) {
	const browser = browserInstance ?? (await launchBrowser());
	const shouldCloseBrowser = !browserInstance;

	//first we grab location data from pitwall.app
	let raceLocations: Awaited<ReturnType<typeof scrapeRaceLocations>> = [];
	try {
		raceLocations = await scrapeRaceLocations(browser);
	} catch (e) {
		console.error('Race location scrape failed, continuing without city data:', e);
	}

	const baseUrl = `https://www.formula1.com/en/racing/${SEASON}`;
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
			try {
				await racePage.waitForSelector('#maincontent ul', { timeout: 3000 });
			} catch {
				await closePage(racePage);
				continue;
			}

			const rawRaceDetails = await racePage.evaluate(() => {
				const raceName = document.querySelector('h1')?.innerText.trim() || '';

				const sessionItems = Array.from(
					document.querySelectorAll<HTMLLIElement>('#maincontent ul li')
				);
				const sessions = sessionItems.map((li) => li.innerText.trim());

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
			const raceDetails = {
				...rawRaceDetails,
				sessions: parseRaceSessionTexts(rawRaceDetails.sessions)
			};

			//check if race exists, if so update race result
			const raceNameAry = raceDetails.raceName.split(' ');
			const year = Number(raceNameAry[raceNameAry.length - 1]);

			allRaces.push({
				...raceDetails,
				location: _location,
				year,
				id: '',
				raceNo: 0,
				city: '',
				paidOut: false
			});

			await closePage(racePage);
		}

		await closePage(page);
		if (shouldCloseBrowser) await browser.close();

		validateScrapedRaces(allRaces);

		//sort by date
		allRaces.sort((a, b) => Date.parse(a.sessions[0].date) - Date.parse(b.sessions[0].date));

		//get city name from location data and set raceNo
		for (let i = 0; i < allRaces.length; i++) {
			allRaces[i].city =
				raceLocations
					.find((data) => Number(data.round?.split('/')[0]) == i + 1)
					?.location?.split(',')[0] || '';
			allRaces[i].raceNo = i + 1;
		}

		return allRaces;
	} catch (e) {
		await closePage(page);
		if (shouldCloseBrowser) await browser.close();
		console.error(e);
	}
}

export const scrapeOdds = async (browserInstance?: Browser) => {
	const baseUrl = 'https://www.oddschecker.com';
	const url = `${baseUrl}/motorsport/formula-1`;
	const browser = browserInstance ?? (await launchBrowser({ width: 1920, height: 1080 }));
	const shouldCloseBrowser = !browserInstance;
	const page = await browser.newPage();
	await page.setViewport({ width: 1920, height: 1080 });

	try {
		console.log(`Scraping F1 Race Odds: ${url}`);
		await page.goto(url, { waitUntil: 'domcontentloaded' });
		await page.waitForSelector('a[href*="podium-finish"]');

		const podiumFinishUrl = await page.evaluate(() => {
			const podiumFinishUrl = Array.from(document.querySelectorAll<HTMLAnchorElement>('a')).find(
				(link) => link.getAttribute('href')?.endsWith('/podium-finish')
			)?.href;

			return podiumFinishUrl;
		});
		if (!podiumFinishUrl) throw new Error('Podium finish market link was not found');

		const podiumFinishPage = await browser.newPage();
		await podiumFinishPage.goto(podiumFinishUrl, { waitUntil: 'domcontentloaded' });
		await podiumFinishPage.waitForSelector('table.eventTable');
		await podiumFinishPage.waitForSelector('#OddsDropdown-2');

		const decimalOddsSelected = await podiumFinishPage.evaluate(() => {
			Array.from(document.querySelectorAll<HTMLButtonElement>('button'))
				.find((button) => button.textContent?.trim() === 'Accept all')
				?.click();
			const decimalButton = document.querySelector<HTMLButtonElement>('#OddsDropdown-2');
			decimalButton?.click();
			return Boolean(decimalButton);
		});
		if (!decimalOddsSelected) throw new Error('Decimal odds selector was not found');
		await podiumFinishPage.waitForFunction(() => {
			const rows = Array.from(document.querySelectorAll('table.eventTable tbody tr'));
			return (
				rows.length >= 20 &&
				rows.every((row) =>
					/^\d+(\.\d+)?$/.test(
						row.querySelector<HTMLParagraphElement>('td > p')?.textContent?.trim() || ''
					)
				)
			);
		});

		//iterate over table rows and grab driver name and odds
		const driverOdds = await podiumFinishPage.evaluate(() => {
			const driverOdds: { driverName: string; odds: number }[] = [];
			const table = document.querySelector('table.eventTable');
			const rows = table?.querySelectorAll('tbody > tr');
			rows?.forEach((row) => {
				const driverName = row.querySelector<HTMLAnchorElement>('td.sel.nm a')?.innerText || '';
				const odds = row.querySelector<HTMLParagraphElement>('td > p')?.innerText || '';
				driverOdds.push({ driverName, odds: Number(odds) });
			});
			return driverOdds;
		});

		await closePage(podiumFinishPage);
		await closePage(page);
		if (shouldCloseBrowser) await browser.close();
		return validateScrapedOdds(driverOdds);
	} catch (e) {
		await closePage(page);
		if (shouldCloseBrowser) await browser.close();
		console.error(e);
		console.log(`Warning: Odds Not Available (${page.url()})`);
		return [];
	}
};
