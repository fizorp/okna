let axios = require('axios');
let cheerio = require('cheerio');
let tress = require('tress');
let resolve = require('url').resolve;
let fs = require('fs')
let json2csv = require('json2csv');
let sqlite3 = require("sqlite3").verbose();

let URL = 'http://www.biznesfinder.pl/';

let results = [];
let pages = links = 0;
let start, end;

let q = tress(crawl, 1);

q.retry = function () {
	let time = 60000;
	q.pause();
	console.log(`Paused on:, ${this}. Will resumed in: ${time} ms`);
	setTimeout(() => {
		console.log('Resumed');
		q.resume();
	}, time);
}

q.drain = function () {
	saveToDb();
	end = new Date();
	console.log(getTime(end) + ' END');
	console.log(((end - start) / 60000).toFixed(2) + 'min');
}

start = new Date();
console.log(getTime(start) + ' START')
q.push(resolve(URL, 's,Druk'));

function crawl(url, done) {
	axios.get(url)
		.then(({ data, status }) => {
			let $ = cheerio.load(data);

			$('ul#companies>li.company').each(function () {
				let obj = {
					1: $('h2>a', this).text(),
					2: $('ul.list-unstyled>li.company-address>span.company-address-city', this).text() + $('ul.list-unstyled>li.company-address>span.separator', this).text() + $('ul.list-unstyled>li.company-address>span.company-address-street', this).text() + ' ' + $('ul.list-unstyled>li.company-address>span.company-address-building', this).text(),
					3: $('ul.list-unstyled>li.company-phone>meta', this).attr('content'),
					4: $('ul.list-unstyled>li.company-www a', this).attr('href'),
					5: $('ul.list-unstyled>li.company-email a', this).attr('data-expanded')
				};
				results.push(obj);
				//++links
				//console.log(`Pages: ${pages}. Links: ${++links}.`);
			});


			$('nav.text-center>ul.pagination>li:last-child>a').each(function () {
				console.log($(this).attr('href'));
				q.push(resolve(URL, $(this).attr('href')));
				//console.log(`Pages: ${++pages}. Links: ${links}.`);
			});

			done();
		})
		.catch(err => {
			console.log(err);
			done(true);
		});
}

function saveToDb() {
	db = new sqlite3.Database("data.sqlite");
	db.serialize(function () {
		db.run("DROP TABLE IF EXISTS data");
		db.run("CREATE TABLE data (name TEXT, address TEXT, phone TEXT, site TEXT, email TEXT)");
		var statement = db.prepare("INSERT INTO data VALUES (?, ?, ?, ?, ?)");
		for (let row of results) {
			statement.run(row);
		}
		statement.finalize();
	});
	db.close();
}

function getTime(date = new Date()) {
	let hours = date.getHours();
	let minutes = date.getMinutes();
	let seconds = date.getSeconds();
	return `[${hours}:${minutes}:${seconds}]`;
}



