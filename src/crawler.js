const Crawler = require('crawler');
const { MongoClient } = require('mongodb');
const { computePageRank } = require('./pageRank');

let db;
const client = new MongoClient('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.0.1');

const crawlSite = async (baseURL, seed, scraper) => {
	// initialize arrays
	let queue = [];
	let visited = [];
	let index = {};

	// add seed url to queue
	queue.push(seed);

	// initialize crawler
	const crawler = new Crawler();

	// crawl queue loop
	while (queue.length != 0) {
		// limit number of crawlled pages to 1000
		const indexLength = Object.keys(index).length;
		if (indexLength >= 1000) break;

		// get top of queue to scrape
		const currentPage = queue.pop();
		const pageURL = currentPage[0] == '/' ? `${baseURL}${currentPage}` : `${baseURL}/${currentPage}`;

		// scrape page
		await new Promise((resolve) =>
			crawler.queue({
				url: pageURL,
				callback: async (err, res, done) => {
					if (err) throw err;

					visited.push(currentPage);
					const { links, ...data } = scraper(res);
					console.log(`[${indexLength}] crawling`, pageURL, links.length);

					let outgoingLinks = [];
					// loop over links and add to queue if not visited and not already in queue
					links.forEach((link) => {
						let newLink = link;
						// removes leading ../../ from url string
						// let newLink = link.replace(/\.+\//g, '');
						if (!visited.includes(newLink) && !queue.includes(newLink)) queue.push(newLink);
						outgoingLinks.push(newLink);
					});

					index[currentPage] = { url: pageURL, ...data, outgoingLinks, incomingLinks: [] };
					done();
					resolve(null);
				},
			})
		);
	}

	// add incoming links
	Object.entries(index).forEach(([key, value]) => {
		value.outgoingLinks.forEach((link) => {
			if (index.hasOwnProperty(link)) {
				index[link].incomingLinks.push(key);
			}
		});
	});

	return index;
};

const scrapePersonalPage = (res) => {
	let $ = res.$;
	let title = $('title').text();
	let movieTitle = $('h1.css-ld8pin').text();
	let rating = $('span.MuiBox-root.css-0').text();
	let director = $('a.css-1n7gptx').text();
	let description = $('p.css-z6np3p').text();
	let tagline = $('p.css-1tqv6h6').text();
	let yearAndRuntime = $('div.css-1lm6qv2').find('span').text();
	let year = yearAndRuntime.split('.')[0];

	let links = $('a')
		.toArray()
		.filter((a) => {
			let link = $(a).attr('href');
			return link == '/' || link.match('^/movie/[0-9]+$');
		})
		.map((a) => $(a).attr('href'));

	rating = parseFloat(rating);
	movieTitle = movieTitle.trim();
	year = parseInt(year);

	return { title, movieTitle, rating, director, description, tagline, year, links };
};

const scrapeFruitPage = (res) => {
	let $ = res.$;
	let title = $('title').text();
	let content = $('p').text();
	let links = $('a')
		.toArray()
		.map((a) => $(a).attr('href').slice(2));
	return { title, content, links };
};

const storeToDB = async (collection, index) => {
	await db.collection(collection).drop(); // drop existing collection
	Object.entries(index).forEach(async ([key, value]) => {
		console.log('[DATABASE]', 'storing', key);

		const { incomingLinks, outgoingLinks, ...rest } = value;
		await db.collection(collection).insertOne({
			_id: key,
			incomingLinks: { length: value.incomingLinks.length, data: value.incomingLinks },
			outgoingLinks: { length: value.outgoingLinks.length, data: value.outgoingLinks },
			...rest,
		});
	});
	console.log('STORING COMPLETE');
};

const run = async () => {
	try {
		db = client.db('assignment1DB');
		fruit = db.collection('fruitgraph');
		personal = db.collection('personal');
		console.log('[DATABASE]: Connection opened successfully');

		// crawl fruitgraph site
		console.log('\nCRAWLING FRUIT SITE');
		const fruitData = await crawlSite('https://people.scs.carleton.ca/~davidmckenney/fruitgraph', 'N-0.html', scrapeFruitPage);
		console.log('\nSTORING FRUIT DATA');
		await storeToDB('fruitgraph', fruitData); // store crawled data in database

		// crawl personal site
		console.log('\nCRAWLING PERSONAL SITE');
		const personalData = await crawlSite('https://tmdb-explorer.vercel.app', '/', scrapePersonalPage);
		console.log('\nSTORING PERSONAL DATA');
		await storeToDB('personal', personalData); // store crawled data in database

		// get crawled data from the database to perform pageRank
		const crawledFruitData = await fruit.find().toArray();
		const crawledPersonalData = await personal.find().toArray();

		// compute pageRank on crawled data
		const fruitPageRanks = await computePageRank(crawledFruitData, 0.1);
		const personalPageRanks = computePageRank(crawledPersonalData, 0.1);

		// add pageRank scores to database
		console.log('[DATABASE]: updating fruits with pageRank');
		fruitPageRanks.forEach(async ({ _id, pageRank }) => await fruit.updateOne({ _id }, { $set: { pageRank } }));
		console.log('[DATABASE]: updating personal with pageRank');
		personalPageRanks.forEach(async ({ _id, pageRank }) => await personal.updateOne({ _id }, { $set: { pageRank } }));
	} catch (e) {
		console.log(e);
		console.log('[DATABASE]: Unable to connect to server');
	} finally {
	}
};

run();
