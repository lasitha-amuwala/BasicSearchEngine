import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';
import elasticlunr from 'elasticlunr';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;
const client = new MongoClient('mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000&appName=mongosh+2.0.1');

let db;
let fruitData;
let personalData;
// const serverBaseURL = 'http://134.117.133.246:3000';
const serverBaseURL = 'http://localhost:3000';

app.use(cors());

app.get('/fruits', async (req, res) => {
	try {
		if (!req.query.q) res.status(404).send('Endpoint Not Found');

		let limit = 10;
		let search = indexFruits.search(req.query.q, {});
		let boost = req.query.boost == 'true';

		if (req.query.limit && req.query.limit >= 1 && req.query.limit <= 50) {
			limit = req.query.limit;
		}

		// fill results to limit if search index return less then limit
		if (search.length < limit) {
			let remainder = limit - search.length;
			for (let i = 0; i < remainder; i++) {
				let randomIndex = Math.floor(random(0, fruitData.length));
				let randomDoc = fruitData[randomIndex];
				console.log(randomIndex, randomDoc);
				search.push({ ref: randomDoc._id, score: 0 });
			}
		}

		// get list of docs that are returned from search, add score to the result
		let rankedFruitData = search.map(({ ref, score }) => {
			const data = fruitData.find(({ _id }) => _id == ref);
			return { ...data, indexScore: score, score: score * data.pageRank };
		});

		let searchResults;
		if (boost) {
			searchResults = rankedFruitData.sort((a, b) => b.score - a.score);
		} else {
			searchResults = rankedFruitData.sort((a, b) => b.indexScore - a.indexScore);
		}

		searchResults = searchResults.slice(0, limit).map(({ url, score, title, pageRank, _id }) => ({
			name: 'Lasitha Amuwala',
			url,
			title,
			score,
			pr: pageRank,
			dataLink: `${serverBaseURL}/fruits/${encodeURI(_id)}`,
		}));

		res.format({
			html: () => {
				res.status(200).send(
					`<ul>${searchResults
						.map(({ url, title, score, pr, dataLink }) => {
							return `<li><a href=${url}>${url}</a><p>title: ${title}</p><p>score: ${score}</p><p>pr: ${pr}</p><p>${dataLink}</p></li>`;
						})
						.join('')}</ul>`
				);
			},
			json: () => res.send(JSON.stringify(searchResults)),
		});
	} catch (error) {
		console.log(error);
		res.format({
			html: () => res.status(500).send('<p>Internal Server Error</p>'),
			json: () => res.status(500).json(),
		});
	}
});

app.get('/fruits/:id', async (req, res) => {
	if (req.params.id) {
		let { url, title, pageRank, content, outgoingLinks, incomingLinks } = await fruitData.find(({ _id }) => _id == req.params.id);

		res.format({
			html: () =>
				res
					.status(200)
					.send(
						`<div><a href=${url}>${url}</a><p>title: ${title}</p><p>content: ${content}</p><p>pr: ${pageRank}</p>OutgoingLinks:<ul>${outgoingLinks.data.map(
							(link) => `<li>${link}</li>`
						)}</ul>IncomingLinks:<ul>${incomingLinks.data.map((link) => `<li>${link}</li>`)}</ul></div>`
					),
			json: () => res.send(JSON.stringify({ url, title, pageRank, content, outgoingLinks, incomingLinks })),
		});
	} else {
		res.status(404).send('Page not found');
	}
});

app.get('/personal', async (req, res) => {
	try {
		if (!req.query.q) res.status(404).send('Endpoint Not Found');

		let limit = 10;
		let search = indexPersonal.search(req.query.q, {});
		let boost = req.query.boost == 'true';

		if (req.query.limit && req.query.limit >= 1 && req.query.limit <= 50) {
			limit = req.query.limit;
		}

		// fill results to limit if search index return less then limit
		if (search.length < limit) {
			let remainder = limit - search.length;
			for (let i = 0; i < remainder; i++) {
				let randomIndex = Math.floor(random(0, personalData.length));
				let randomDoc = personalData[randomIndex];
				search.push({ ref: randomDoc._id, score: 0 });
			}
		}

		// get list of docs that are returned from search, add score to the result
		let rankedPersonalData = search.map(({ ref, score }) => {
			const data = personalData.find(({ _id }) => _id == ref);
			return { ...data, indexScore: score, score: score * data.pageRank };
		});

		let searchResults;
		if (boost) {
			searchResults = rankedPersonalData.sort((a, b) => b.score - a.score);
		} else {
			searchResults = rankedPersonalData.sort((a, b) => b.indexScore - a.indexScore);
		}

		searchResults = searchResults.slice(0, limit).map(({ url, score, title, pageRank, _id }) => ({
			name: 'Lasitha Amuwala',
			url,
			title,
			score,
			pr: pageRank,
			dataLink: `${serverBaseURL}/personal${encodeURI(_id)}`,
		}));

		res.format({
			html: () => {
				res.status(200).send(
					`<ul>${searchResults
						.map(({ url, title, score, pr }) => {
							return `<li><a href=${url}>${url}</a><p>title: ${title}</p><p>score: ${score}</p><p>pr: ${pr}</p></li>`;
						})
						.join('')}</ul>`
				);
			},
			json: () => res.send(JSON.stringify(searchResults)),
		});
	} catch (error) {
		console.log(error);
		res.format({
			html: () => res.status(500).send('<p>Internal Server Error</p>'),
			json: () => res.status(500).json(),
		});
	}
});

let random = (min, max) => Math.random() * (max - min) + min;

let indexFruits = elasticlunr(function () {
	this.addField('title');
	this.addField('content');
	this.setRef('id');
});

let indexPersonal = elasticlunr(function () {
	this.addField('title', { boost: 1 });
	this.addField('movieTitle', { boost: 2 });
	this.addField('description', { boost: 1 });
	this.setRef('id');
});

const run = async () => {
	let fruits;
	let personal;
	try {
		db = client.db('assignment1DB');
		fruits = db.collection('fruitgraph');
		personal = db.collection('personal');

		console.log('Connected to server');
	} catch (e) {
		console.log('ERROR: Unable to connect to server');
		console.log(e);
	}

	console.log('Indexed fruit data');
	fruitData = await fruits.find({}).toArray();
	fruitData.forEach(({ _id, title, content }) => indexFruits.addDoc({ id: _id, title, content }));

	console.log('Indexed personal data');
	personalData = await personal.find({}).toArray();
	personalData.forEach(({ _id, title, description, movieTitle }) => indexPersonal.addDoc({ id: _id, title, movieTitle, description }));

	app.listen(port, () => console.log('Server listening on port', port));

	// await axios
	// 	.put('http://134.117.130.17:3000/searchengines', JSON.stringify({ request_url: serverBaseURL }), {
	// 		headers: { 'content-type': 'application/json' },
	// 	})
	// 	.then((res) => console.log(res.response))
	// 	.catch((err) => console.log('Error', err));

	// console.log('client closing');
	// Ensures that the client will close when you finish/error
	// await client.close();
};

run();
