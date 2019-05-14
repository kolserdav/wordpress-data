const WPAPI = require('wpapi');
const path = require('path');
const fs = require('fs');
const process = require('process');
const request = require('request');

class Api {

	constructor(){
		this.rootDir = process.cwd();
		this.postsSelector = 'posts';
		this.pagesSelector = 'pages';
		this.categoriesSelector = 'categories';
		this.mediaSelector = 'media';
		this.emptyConst = 'empty';
		this.dataDirName = '/storage/';
		this.dataDir = `${this.rootDir}${this.dataDirName}`;
		this.dataPostsPath = `${this.dataDir}${this.postsSelector}`;
		this.dataPagesPath = `${this.dataDir}${this.pagesSelector}`;
		this.dataCategoriesPath = `${this.dataDir}${this.categoriesSelector}`;
		this.dataMediaPath = `${this.dataDir}${this.mediaSelector}`;
		this.getArguments();
		this.auth = (this.auth);
		this.wp = new WPAPI({
			endpoint: `${this.host}/wp-json`,
			username: this.user,
			password: this.password,
			auth: this.auth
		});
		this.createDirs();
		this.clearDirs(this.postsSelector);
		this.clearDirs(this.pagesSelector);
		this.clearDirs(this.categoriesSelector);
		this.getPages();
		this.getPosts();
		this.getCategories();
	}

	getArguments() {
		this.hostArg = '--host';
		const args = process.argv;
		args.map((item, index, array) => {
			const nextValue = array[index + 1];
			this.checkArg = (nextValue !== undefined);
			switch(item) {
				case this.hostArg: 
					this.host = nextValue;
					this.errorHandler(nextValue, item);
					break;
				default:
					break;
			}
		});
		this.errorHandler();
	}

	errorHandler(host = this.emptyConst, item = this.emptyConst){
		if (host === this.emptyConst && item === this.emptyConst){
			this.checkArg = true;
			let variable, argName;
			let err = this.emptyConst;
			for (let i = 0; i <= 0; i ++){
				switch(i) {
					case 0:
						variable = this.host;
						argName = this.hostArg;
						break;
				}
				if (!variable) {
					err = new Error(`argument ${argName} is required`);
					console.error(err);
					process.exit();
				}
			}
		}
		if (!this.checkArg || host.match(/\-\-/)){
			const err = new Error(`argument ${item} can't be empty`);
			console.error(err);
			process.exit();
		}
	}

	createDirs(){
		let statsPostsDir, statsPagesDir, statsCategoriesDir, statsDataDir, statsMediaDir  = false;
		try {	
			statsDataDir = fs.statSync(this.dataDir);
			statsPostsDir = fs.statSync(this.dataPostsPath);
			statsPagesDir = fs.statSync(this.dataPagesPath);
			statsCategoriesDir = fs.statSync(this.dataCategoriesPath);
			statsMediaDir = fs.statSync(this.dataMediaPath);
		}
		catch (e){}
		if (!statsDataDir) {
			fs.mkdirSync(this.dataDir);
		}
		if (!statsPagesDir) {
			fs.mkdirSync(this.dataPagesPath);	
		}
		if (!statsPostsDir) {	
			fs.mkdirSync(this.dataPostsPath);
		}
		if (!statsCategoriesDir) {
			fs.mkdirSync(this.dataCategoriesPath);
		}
		if (!statsMediaDir) {
			fs.mkdirSync(this.dataMediaPath);
		}
	}

	clearDirs(selector){
		let dir = (selector === this.postsSelector)? this.dataPostsPath : this.dataPagesPath;
		dir = (selector === this.categoriesSelector)? this.dataCategoriesPath : dir;
		dir = (selector === this.mediaSelector)? this.dataMediaPath : dir;
		const postDirItems = fs.readdir(dir, (err, items) => {
			if (err){
				console.log(err);
			}
			items.map(item => {
				const file = `${dir}/${item}`;
				fs.unlinkSync(file);
			});
		});
	}
	
	dataFill(selector, data) {
		this.itemPages = [];
		const context = this;
		data.map(item => {
			if (selector === this.postsSelector || selector === this.pagesSelector) {
				this.itemPages = {
					id: item.id,
					date: item.date,
					dateGmt: item.date_gmt,
					guid: item.guid,
					modified: item.modified,
					modifiedGmt: item.modified_gmt,
					slug: item.slug,
					status: item.status,
					type: item.type,
					link: item.link,
					title: item.title.rendered,
					excerpt: item.excerpt.rendered,
					excerptProtected: item.excerpt.protected,
					content: item.content.rendered,
					contentProtected: item.content.protected,
					author: item.author,
					featured_media: item.featured_media,
					comment_status: item.comment_status,
					ping_status: item.ping_status,
					template: item.template,
					meta: item.meta,
					_links: item._links,
					error: 0
				};
			}
			const media = item._links['wp:featuredmedia'];
			saveMedia();
			function saveMedia() {
				if (media) {
					let prefixImage = item.type;
					const id = item.id;
					media.map(item => {
						let indexMedia = item.href.match(/\d+$/);
						indexMedia = (indexMedia)? indexMedia[0] : '0000';
						prefixImage += `_${id}_image_${indexMedia}`;
						request(item.href, function(error, response, body) {
							const imageHref = JSON.parse(body).guid.rendered;
							let imageType = imageHref.match(/\.\w{3}$/);
							imageType = (imageType)? imageType[0] : '.jpg';
							request(imageHref, {encoding: 'binary'}, function(err, resp, b) {
								const file = `${context.dataMediaPath}${prefixImage}${imageType}`;
								fs.writeFileSync(file, b, 'binary');
							});
						});
					});
				}	
			}
			switch(selector){
				case this.pagesSelector: 
					this.itemPages.parent = item.parent;
					this.itemPages.menu_order = item.menu_order;
					fs.writeFileSync(`${this.dataPagesPath}/page_${item.id}.json`, JSON.stringify(this.itemPages));
					this.pages.push(item.id);
					this.pages = this.sortFiles(this.pages);
					break;
				case this.postsSelector:
					this.itemPages.sticky = item.sticky;
					this.itemPages.format = item.format;
					this.itemPages.tags = item.tags;
					this.itemPages.categories = item.categories;
					fs.writeFileSync(`${this.dataPostsPath}/post_${item.id}.json`, JSON.stringify(this.itemPages));
					this.posts.push(item.id);
					this.posts = this.sortFiles(this.posts);
					break;
				case this.categoriesSelector:
					const category = {
						id: item.id,
						count: item.count,
						description: item.description,
						link: item.link,
						name: item.name,
						slug: item.slug,
						taxonomy: item.taxonomy,
						parent: item.parent,
						meta: item.meta,
						_links: item._links,
						error: 0
					};
					fs.writeFileSync(`${this.dataCategoriesPath}/category_${item.id}.json`, JSON.stringify(category));
					this.categories.push(item.id);
					this.categories = this.sortFiles(this.categories);
					break;
				default:
					break;
			}
		});
		fs.writeFileSync(`${this.dataDir}posts.json`, JSON.stringify({
			host: this.host, 
			items: this.posts,
			name: 'POSTS_LIST'
		}));
		fs.writeFileSync(`${this.dataDir}pages.json`, JSON.stringify({
			host: this.host,
			items: this.pages,
			name: 'PAGES_LIST'
		}));	
		fs.writeFileSync(`${this.dataDir}categories.json`, JSON.stringify({
			host: this.host,
			items: this.categories,
			name: 'CATEGORIES_LIST'
		}))
	}

	getPages() {
		const context = this;
		this.wp.pages().get(function(err, data) {
			if (err) {
				console.error(err);
			}
			context.pages = [];
			context.dataFill(context.pagesSelector, data);
		});
	}

	getPosts() {
		const context = this;
		this.wp.posts().get(function(err, data) {
			if (err){
				console.log(err);
			}
			context.posts = [];
			context.dataFill(context.postsSelector, data);
		});
	}

	getCategories() {
		const context = this;
		this.wp.categories().get(function(err, data) {
			if (err) {
				console.log(err);
			}
			context.categories = [];
			context.dataFill(context.categoriesSelector, data);
		});
	}
	
	sortFiles(array) {
		array.sort((a, b) => {
			return a - b;
		});
    return array;
  }


 }

const A = new Api();
