import { startConnectionDB } from "./connectiondb.js"
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { getLinkPreview } from "link-preview-js";
import * as fs from'fs';





// Init imports
const config = JSON.parse(fs.readFileSync('./config.json', 'utf-8'));
const app = express();
const dbCollection = await startConnectionDB().catch(console.error);
const httpServer = createServer(app);
const io = new Server(httpServer);

// Init Consts
const PORT = config.port;
const __dirname = process.cwd();




// Set public folder
app.use('/public', express.static('public'));





// Edit Page
app.get('/', function (req, res) {
	//if(req.headers.host.startsWith("localhost")){
		res.sendFile(__dirname + '/editionmode.htm');
	//}
});





// Redirect Page
app.get(/\/\w*$/, async function (req, res) {
	// Take and filter the adress
	let path = req.url;
	path = path.substring(1, path.lenght);
	const dbDocumentFound = { shortLink: path };

	// search in DB
	const search = await dbCollection.findOne(dbDocumentFound);

	// delete if expired
	const currentDate = new Date().getTime();
	let allowFindURL = true;
	if (search) {
		const expiredAfterDate = (search.expire.afterDate !== 0) && (currentDate > search.expire.afterDate);
		const expiredAfterNclicks = (search.expire.afterNclicks !== 0) && ((search.clicks + 1) > search.expire.afterNclicks);

		if (expiredAfterDate || expiredAfterNclicks) {
			await dbCollection.deleteOne(dbDocumentFound);
			allowFindURL = false;
		}
	}

	// Redirect URL ?
	if (search && allowFindURL) {
		// Yes, found in DB

		// Increase Clicks
		await dbCollection.updateOne(dbDocumentFound, { $inc: { clicks: 1 } })

		// Send HTML
		const html = `
		<!doctype html>
		<html>
			<head>
				<title>Redirecionando</title>
				<script>
					window.location.href = "${search.originalLink}";
				</script>
			</head>
			<body>
				//${search.originalLink}<br>
				//${search.clicks + 1 /*+1 to show equal to db*/}<br>
			</body>
		</html>`;
		res.write(html);
	} else {
		// No, not found in DB

		const html = `
		<!doctype html>
		<html dir="ltr" lang="pt">
			<head>
				<meta charset="utf-8">
				<title>Redirecionando</title>
				<style>
					body {
						background: #fff;
						margin: 0;
						font-family: 'VarelaRound';
						height: 100vh;
						display: flex;
						align-items: center;
						justify-content: center;
					}

					.warning {
						color: #b50505;
						text-align: center;
						margin-bottom: 150px;
					}

					.warning img {
						filter: hue-rotate(187deg);
					}

					.container {
						background: radial-gradient(circle, rgb(255 0 0 / 7%) 72%, rgb(255 0 0 / 39%) 100%);
						position: absolute;
						top: 0;
						bottom: 0;
						left: 0;
						right: 0;
					}
					
					@font-face {
						font-family: 'VarelaRound';
						font-style: normal;
						font-weight: 400;
						font-display: block;
						src: url("/public/webfonts/VarelaRound-Regular.ttf") format("truetype");
					}
				</style>
			</head>
			<body>
				<div class="warning">
					<img src="public/img/logo.png" /><br>
					Link não encontrado
				</div>
				<div class="container"></div>
			</body>
		</html>
		`;
		res.write(html);
	}
	res.end();

});





io.on('connection', function(socket){
	console.log("user connected");

	socket.on('search', async function(searchvalues){
		// SEARCH
		console.log(searchvalues)
		// Declarations
		let {pagenumber, nperpage, maxNum, minNum, maxDate, minDate, orderby, ordersense, q} = searchvalues;
		const isReverse = ordersense.includes("reverse") ? -1 : 1;

		// Adjust search parameters
		let findValues = {};
		switch (orderby) {
			case 'general':
				if (q.length > 0) {
					orderby = '_id';
					findValues = { $text: { $search: q, $caseSensitive: false } }; break;
				} else {
					orderby = '_id';
					findValues = {}; break;
				}
			case 'tags':
				findValues = { tags: { $all: [...(q.split(","))] } }; break;
			case 'title':
				findValues = { title: q }; break;
			case 'shortlink':
				findValues = { shortLink: q }; break;
			case 'clicks':
				findValues = { clicks: { $gt: minNum, $lt: maxNum } }; break;
			case 'expireafternclicks':
				findValues = { "expire.afterNclicks": { $gt: minNum, $lt: maxNum } }; break;
			case 'creation':
				findValues = { creation: { $gt: minDate, $lt: maxDate } }; break;
			case 'expireafterdate':
				findValues = { "expire.afterDate": { $gt: minDate, $lt: maxDate } }; break;
			default:
				findValues = {};
		}

		// GET RESULTS
		let links = []
		const find = await dbCollection.find(findValues)
		const nresults = await find.count();
		await find.sort( { [orderby]: isReverse } )
				.skip( pagenumber > 0 ? ( ( pagenumber - 1 ) * nperpage ) : 0 )
				.limit( nperpage )
				.forEach( link => {
					links = [...links, link]
				});
		// SEND
		//console.log(links)
		socket.emit('searchResults', {links,nresults});
	});

	socket.on('updatelink', async function(link){ // link: [{filter}, {link update}]
		await dbCollection.updateOne(link[0],{$set: link[1]});
		socket.emit('done');
	});

	socket.on('newlink', async function(link){ // link: [{link new}]
		await dbCollection.insertOne(link);
		socket.emit('done');
	});

	socket.on('excludelink', async function(link){ // link: [{link new}]
		await dbCollection.deleteOne(link);
		socket.emit('done');
	});

	socket.on('generateshort', async function(){
		let nresults = 1;
		let newShort;
		while(nresults!==0){
			// Generate hash based on all milisseconds since 1970 (Unix-time), convert it to base-36 (0-9 and continues a-z)
			newShort = (new Date().getTime()).toString(36);
			// Verify existence on actual DB
			const find = await dbCollection.find({shortLink: newShort})
			nresults = await find.count();
		}
		socket.emit('generateshort',newShort);
	});

	socket.on('verifyshort', async function(short){
		const find = await dbCollection.find({shortLink: short})
		const nresults = await find.count();
		if(nresults===0){
			socket.emit('verifyshort',true);
		}else{
			socket.emit('verifyshort',false);
		}
	});

	socket.on('linkinfo', async function(link){
		const info = await getLinkPreview(link);
		socket.emit('linkinfo',info);
	});

	socket.on('shortlinkdomain', function(){
		socket.emit('shortlinkdomain',config.shortlinkdomain);
	});

	socket.on('disconnect', () => {
		console.log('user disconnected');
	});
});





httpServer.listen(PORT, () => console.log("Server started at " + PORT));



// MISSING
// escrever como montar também
// subir no github

/*
// TEST DB




dbCollection.insertMany([
{
	title: "Google",
	shortLink: "g",
	originalLink: "https://www.google.com/",
	favicon: "https://www.google.com/images/branding/googleg/1x/googleg_standard_color_128dp.png",
	tags: ["google", "search"],
	clicks: 0,
	creation: 1627246501761,
	expire:{
		afterDate: Infinity,
		afterNclicks: 10
	}
},

{
	title: "Youtube",
	shortLink: "yt",
	originalLink: "https://www.youtube.com/",
	favicon: "https://www.youtube.com/s/desktop/1802aa0e/img/favicon_32x32.png",
	tags: ["youtube", "videos"],
	clicks: 0,
	creation: 1627246501761,
	expire:{
		afterDate: Infinity,
		afterNclicks: 10
	}
},

{
	title: "Google Maps",
	shortLink: "gm",
	originalLink: "https://www.google.com/maps/",
	favicon: "https://www.google.com/images/branding/product/ico/maps15_bnuw3a_32dp.ico",
	tags: ["maps", "earth"],
	clicks: 0,
	creation: 1627246501761,
	expire:{
		afterDate: Infinity,
		afterNclicks: 10
	}
}

]);
/**/


/*
// Show DB
const cursor = await dbCollection.find({clicks: {$gt:-1}});

if ((await cursor.count()) === 0) {
	console.log("No documents found!");
}else{
	cursor.forEach(console.dir);
}
*/