var socket = io();

Vue.filter('date', function (date) {
	if (date === 0) {
		return "não usado"
	} else {
		return new Date(date).toLocaleString();
	}
})

Vue.filter('clicks', function (number) {
	if (number === 0) {
		return "não usado"
	} else {
		return number;
	}
})

Vue.component('link-item', {
	template: `
		<div class="link-item">
			<div class="basic-info">
				<img class="favicon" :src="favicon" width="32" height="32"/>
				<div class="texts">
					<p><b>{{title}}</b></p>
					<p>{{url}}{{shortlink}}</p>
				</div>
			</div>

			<div class="clicks">
				{{clicks}} Clicks
			</div>

			<div class="more-info">
				<a :href="url+shortlink" target="_blank"><i class="fas fa-external-link-alt"></i></a>
				<slot name="edit"></slot>
				<slot name="exclude"></slot>
			</div>

			
			
		</div>
	`,
	// <p>originalLink: {{originallink}}</p>
	// <p>favicon: <img class="favicon" :src="favicon" width="32" height="32"/></p>
	// <p>tags: {{tags}}</p>
	// <p>clicks: {{clicks}}</p>
	// <p>creation: {{creation | date}}</p>
	// <p>expire afterDate: {{afterdate | date}}</p>
	// <p>expire afterNclicks: {{afternclicks | clicks}}</p>
	props: [
		"url",
		"title",
		"shortlink",
		"originallink",
		"favicon",
		"tags",
		"clicks",
		"creation",
		"afterdate",
		"afternclicks"
	]
})

let app = new Vue({
	el: '#app',
	data: {
		message1: 'Modo de edição',
		url:'',
		edit: {
			type: '',
			title: '',
			oldShortLink: '',
			shortLink: '',
			originalLink: '',
			favicon: '',
			tags: '',
			afterDate: '',
			afterNclicks: 0,
			enableAfterDate: false,
			enableAfterNclicks: false,
			saveLocked: true,
			createOrEdit: false,
			showAfterOriginalLink: false
		},
		search: {
			pagenumber: 1,
			nperpage: 10,
			orderby: 'general',
			ordersense: 'reverse',
			minNum: 0,
			maxNum: 10,
			minDate: 1577858400000,
			maxDate: new Date().getTime(),
			minDateTxt: '',
			maxDateTxt: '',
			q: ''
		},
		results: {
			links: [],
			nresults: 0
		}
	},
	watch: {
		"search.maxDateTxt": function (val) {
			return this.search.maxDate = new Date(val).getTime();
		},
		"search.minDateTxt": function (val) {
			return this.search.minDate = new Date(val).getTime();
		}
	},
	computed: {
		maxpage() {
			return Math.ceil(this.results.nresults / this.search.nperpage);
		},
		searchType() {
			let type = "";
			switch (this.search.orderby) {
				case 'clicks':
				case 'expireafternclicks':
					type = "number"; break;
				case 'creation':
				case 'expireafterdate':
					type = "date"; break;
				case 'general':
				case 'tags':
				case 'title':
				case 'shortlink':
				default:
					type = "text";
			}
			return type;
		},
	},
	created() {
		this.adjustPageSearch();
		socket.emit('shortlinkdomain');
	},
	methods: {
		updateData() {
			const search = document.location.search;
			const searchParams = new URLSearchParams(search);
			const s = this.search;
			s.pagenumber = Number(searchParams.get("pagenumber"));
			s.nperpage = Number(searchParams.get("nperpage"));
			s.orderby = searchParams.get("orderby");
			s.ordersense = searchParams.get("ordersense");
			s.q = searchParams.get("search");
			s.minNum = Number(searchParams.get("minNum"));
			s.maxNum = Number(searchParams.get("maxNum"));
			s.minDate = Number(searchParams.get("minDate"));
			s.maxDate = Number(searchParams.get("maxDate"));
			s.minDateTxt = new Date(s.minDate).toISOString().slice(0, -5);
			s.maxDateTxt = new Date(s.maxDate).toISOString().slice(0, -5);
		},
		updateSearch({ newSearch = false } = {}) {
			const searchURL = document.location.search;
			const sParams = new URLSearchParams(searchURL);
			const s = this.search;
			sParams.set("pagenumber", newSearch ? 1 : s.pagenumber);
			sParams.set("nperpage", s.nperpage);
			sParams.set("minNum", s.minNum);
			sParams.set("maxNum", s.maxNum);
			sParams.set("minDate", s.minDate);
			sParams.set("maxDate", s.maxDate);
			sParams.set("orderby", s.orderby);
			sParams.set("ordersense", s.ordersense);
			sParams.set("search", s.q);
			document.location.search = "?" + sParams.toString()
		},
		adjustPageSearch() {
			// Adjust search values
			const search = document.location.search;
			if (search) {
				// If the page already contains search values
				// Put these values in the data
				this.updateData();
			} else {
				// If the page does not contain search values
				// Writes the default search values and restarts the page
				this.updateSearch();
			}

			// Emit search results
			socket.emit('search', this.search);
		},
		editlink(link) {
			const e = this.edit;
			e.type = "update";
			e.saveLocked = false;
			e.title = link.title;
			e.oldShortLink = link.shortLink;
			e.shortLink = link.shortLink;
			e.originalLink = link.originalLink;
			e.favicon = link.favicon;
			e.tags = link.tags.toString();
			e.afterDate = link.expire.afterDate === 0 ? "" : new Date(link.expire.afterDate).toISOString().slice(0, -5);
			e.afterNclicks = Number(link.expire.afterNclicks);
			e.createOrEdit = true;
		},
		excludelink(link) {
			socket.emit('excludelink', {shortLink: link.shortLink});
			this.updateSearch({newSearch: true});
		},
		newlink() {
			const e = this.edit;
			e.type = 'new';
			e.title = '';
			e.oldShortLink = '';
			e.shortLink = '';
			e.originalLink = '';
			e.favicon = '';
			e.tags = '';
			e.afterDate = '';
			e.afterNclicks = 0;
			socket.emit('generateshort');
			e.createOrEdit = true;
		},
		saveLink() {
			const e = this.edit;
			const afterDateTXT = e.afterDate;
			const afterDate = afterDateTXT === "" ? 0 : new Date(afterDateTXT).getTime();
			const afterNclicks = Number(e.afterNclicks);

			let link = {
				title: e.title,
				shortLink: e.shortLink,
				originalLink: e.originalLink,
				favicon: e.favicon,
				tags: (e.tags).split(","),
				expire: {
					afterDate,
					afterNclicks
				}
			}

			if (e.type === "update") {
				socket.emit('updatelink', [{ shortLink: e.oldShortLink }, link]);
			}
			else if (e.type === "new") {
				link.clicks = 0;
				link.creation = new Date().getTime();
				socket.emit('newlink', link);
			}
		},
		linkinfo(link) {
			socket.emit('linkinfo', link);
		},
		verifyshort(){
			if(this.edit.oldShortLink === this.edit.shortLink){
				this.edit.saveLocked = false;
			} else {
				this.edit.saveLocked = true;
				socket.emit('verifyshort', this.edit.shortLink);
			}
		}
	}
})

socket.on('searchResults', function (resultsServer) {
	// Put search results on app
	app.results = resultsServer;
});

socket.on('verifyshort', function (short) {
	// lock/unlock according the result of search
	app.edit.saveLocked = !short;
});

socket.on('linkinfo', function (linkinfo) {
	// Get info of the link
	app.edit.title = linkinfo.title || linkinfo.siteName || linkinfo.mediaType;
	app.edit.favicon = linkinfo.favicons[0];
	if(app.edit.oldShortLink===''){
		app.edit.tags = linkinfo.siteName || '';
	}
});

socket.on('generateshort', function (short) {
	// generate shortlink
	app.edit.shortLink = short;
	// unlock save
	app.edit.saveLocked = false;
});

socket.on('shortlinkdomain', function (url) {
	// get URL of the shortlink
	app.url = url;
});