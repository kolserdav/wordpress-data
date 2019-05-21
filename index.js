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
								const file = `${context.dataMediaPath}/${prefixImage}${imageType}`;
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
					let parent = null;
					if (item.parent) {
						parent = item.parent;
					}
					this.titles.push({
						id: item.id,
						title: item.title.rendered,
						parent: parent
					});
					this.pages.push(item.id);
					break;
				case this.postsSelector:
					this.itemPages.sticky = item.sticky;
					this.itemPages.format = item.format;
					this.itemPages.tags = item.tags;
					this.itemPages.categories = item.categories;
					if (item.sticky && !this.firstId) {
						this.firstId = item.id;
						this.firstSlug = item.slug;
						fs.writeFileSync(`${this.dataPostsPath}/post_home.json`, JSON.stringify(this.itemPages));
					}
					else {
						fs.writeFileSync(`${this.dataPostsPath}/post_${item.id}.json`, JSON.stringify(this.itemPages));
						this.posts.push(item.id);
					}
					if (item.sticky && this.firstId) {
						if (item.id !== this.firstId) {
							console.warn(`[Warning] Saving post witn id: <${item.id}> and slug: <${item.slug}> as home page post is ignored! Because post with id: <${this.firstId}> and slug: <${this.firstSlug}> are saved. Promotion of only one post is currently supported, and this post is home page`);
						}
					}
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
					break;
				default:
					break;
			}
		});
		switch(selector) {
			case this.pagesSelector:
				this.indexArray = {};
				this.titles.map((item, index) => {
					this.indexArray[item.id] = index;
					this.hierarchy.push({
						id: item.id,
						title: item.title,
						parent: item.parent,
						children: []
					});
				});
				this.titles.map((item, index, array) => {
					if (item.parent !== null)	{
						const i = this.indexArray[item.parent];
						let children = [];
						if (this.hierarchy[i].children.length !== 0) {
							this.hierarchy[i].children.push(item.id);
							children = this.hierarchy[i].children;
						}
						else {
							children.push(item.id);
						}
						this.hierarchy[i] = {
							id: this.hierarchy[i].id,
							title: this.hierarchy[i].title,
							parent: this.hierarchy[i].parent,
							children: children
						};
					}
				});
				this.pages = (this.pages)? this.sortFiles(this.pages) : this.pages;
				fs.writeFileSync(`${this.dataDir}pages.json`, JSON.stringify({
					host: this.host,
					items: this.pages,
					titles: this.hierarchy,
					name: 'PAGES_LIST'
				}));	
				break;
			case this.postsSelector:
				this.posts = (this.posts)? this.sortFiles(this.posts) : this.posts;
				fs.writeFileSync(`${this.dataDir}posts.json`, JSON.stringify({
					host: this.host, 
					items: this.posts,
					name: 'POSTS_LIST'
				}));
				break;
			case this.categoriesSelector:
				this.categories = (this.categories)? this.sortFiles(this.categories) : this.categories;
				fs.writeFileSync(`${this.dataDir}categories.json`, JSON.stringify({
					host: this.host,
					items: this.categories,
					name: 'CATEGORIES_LIST'
				}));
				break;
			default:
				break;
		}
	}

	getPages() {
		const context = this;
		this.wp.pages().perPage(100).get(function(err, data) {
			if (err) {
				console.error(err);
			}
			context.pages = [];
			context.hierarchy = [];
			context.titles = [];
			context.dataFill(context.pagesSelector, data);
		});
	}

	getPosts() {
		const context = this;
		this.wp.posts().perPage(100).get(function(err, data) {
			if (err){
				console.log(err);
			}
			context.posts = [];
			context.dataFill(context.postsSelector, data);
		});
	}

	getCategories() {
		const context = this;
		this.wp.categories().perPage(100).get(function(err, data) {
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
