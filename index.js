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
		this.childCategories = [];
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
		this.getUsers();
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

	async clearDirs(selector){
		let dir = (selector === this.postsSelector)? this.dataPostsPath : this.dataPagesPath;
		dir = (selector === this.categoriesSelector)? this.dataCategoriesPath : dir;
		dir = (selector === this.mediaSelector)? this.dataMediaPath : dir;
		const postDirItems = await new Promise((resolve, reject) => {
			fs.readdir(dir, (err, items) => {
				if (err) {
					console.error(err);
				}
				items.map((item) => {
					const file = `${dir}/${item}`;
					fs.unlinkSync(file);
					resolve(file);
				});
			});
		});
	}
	
	dataFill(selector, data) {
		this.itemPages = [];
		const context = this;
		this.categoriesItems = [];
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
					this.categoriesItems.push({
						id: item.id,
						title: item.title.rendered,
						categories: item.categories
					});
					this.itemPages.sticky = item.sticky;
					this.itemPages.format = item.format;
					this.itemPages.tags = item.tags;
					this.itemPages.categories = item.categories;
					this.postsTitles = (this.postsTitles)? this.postsTitles : [];
					if (item.sticky && !this.firstId) {
						this.firstId = item.id;
						this.firstSlug = item.slug;
						fs.writeFileSync(`${this.dataPostsPath}/post_home.json`, JSON.stringify(this.itemPages));
					}
					else {
						fs.writeFileSync(`${this.dataPostsPath}/post_${item.id}.json`, JSON.stringify(this.itemPages));
						this.posts.push(item.id);
						this.postsTitles.push({
							id: item.id,
							categories: item.categories,
							title: item.title.rendered
						});
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
					let parentItem;
					if (item.parent) {
						parentItem = item.parent;
					}
					else {
						parentItem = null;
					}
					this.childCategories.push({
						category: item.id, 
						parent: parentItem,
						title: item.name
					});
					this.category = category;
					const fileCategoryPath = `${this.dataCategoriesPath}/category_${item.id}.json`;
					fs.lstat(fileCategoryPath, (error, stats) => {
						if (error) {	
							fs.writeFileSync(fileCategoryPath, JSON.stringify(category));
						}
					});
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
					indexes: this.indexArray,
					name: 'PAGES_LIST'
				}));	
				break;
			case this.postsSelector:
				this.posts = (this.posts)? this.sortFiles(this.posts) : this.posts;
				fs.writeFileSync(`${this.dataDir}posts.json`, JSON.stringify({
					host: this.host, 
					items: this.posts,
					titles: this.postsTitles,
					name: 'POSTS_LIST'
				}));
				break;
			default:
				break;
		}
		this.hierarhyCategories = {};
		this.categoriesItems.map(item => {
			this.s = this.hierarhyCategories;
			item.categories.map((item2, index) => {
				if (!this.s[item2]) {
					this.s[item2] = [];
				}
				this.s[item2].push({
					id: item.id,
					title: item.title,
					type: 'post',
					parent: item.categories,
					children: []
				});
			});
		});
		this.categories = (this.categories)? this.sortFiles(this.categories) : this.categories;
		if (this.s) {
			this.c = this.childCategories;
			this.parents = {};
			this.categoriesTitles = [];
			this.c.map((item, index) => {
				this.children = [];
				this.childCategories.map(item2 => {
					if (item.category === item2.parent) {
						this.children.push(item2.category);
					}
				});
				this.categoriesTitles.push({
					id: item.category,
					title: item.title,
					parent: item.parent,
					children: this.children
				});
			});
			this.categoriesList = [];
			if (this.categories) {
				this.categories.map(item => {
					this.parCat = null;
					this.categoriesTitles.map(item2 => {
						if (item === item2.id) {
							this.categoriesList.push({
							id: item2.id,
							title: item2.title,
							parent: item2.parent,
							children: item2.children,
							type: 'category'
						});
						}
					});
					if (this.s[item]) {
						this.s[item].map(item3 => {
							this.categoriesList.push(item3);
						});
					}
				});
			}
			this.catLevels = [];
			const dataCategoriesDir = fs.readdir(this.dataCategoriesPath, (error, items) => {
				if (error) {
					console.error(error)
				}
				items.map(item2 => {
					let id = parseInt(item2.match(/\d+/)[0]);
					this.dataCategory = fs.readFileSync(`${this.dataCategoriesPath}/${item2}`).toString();
					this.dataCategory = JSON.parse(this.dataCategory);
					this.dataCategory.posts = [];
					this.categoriesList.map(item3 => {
						if (item3.type === 'category' && this.dataCategory.id === item3.id) {
							this.dataCategory.children = item3.children;
							this.dataCategory.childTitles = [];
							this._saveParentTitle = false;
							this._saveParentTitle = true;
							const pT = this.categoriesList;
							pT.map(itemP => {
								if (this.dataCategory.parent === itemP.id) {
									this.dataCategory.parentTitle = itemP.title;
								}
							});
							item3.children.map(itemC => {
								const cL = this.categoriesList;
								cL.map(itemC1 => {
									if (itemC === itemC1.id) {
										this.dataCategory.childTitles.push({
											id: itemC,
											title: itemC1.title
										});
									}
								});
							});
							if (!this._saveParentTitle) {
								this.dataCategory.parentTitle = null;
							}
						}
						else if (item3.type === 'post' && item3.parent !== null) {
							item3.parent.map(item4 => {
								if (item4 === id) {
									const dC = this.dataCategory.posts;
									this._postFound = false;
									dC.map(item5 => {
										if (item5.id === item3.id) {
											this._postFound = true;
										}
									});
									if (!this._postFound) {
										this.dataCategory.posts.push(item3);
									}
								}
							});
						}
					});
					this.getLevels(this.dataCategory);
					this.catLevels.push(this.dataCategory);
					fs.writeFileSync(`${this.dataCategoriesPath}/${item2}`, JSON.stringify(this.dataCategory));
					fs.writeFileSync(`${this.dataDir}categories.json`, JSON.stringify({
						host: this.host,
						items: this.categories,
						titles: this.categoriesList,
						name: 'CATEGORIES_LIST'
					}));
				});
				const cL = this.categoriesList;
				cL.map((itemCList, indexCL) => {
					if (itemCList.type === 'category') {
						this.catLevels.map(itemCLevels => {
							if (itemCList.id === itemCLevels.id) {
								this.categoriesList[indexCL].level = itemCLevels.level;
							}
						});
					}
				});
				fs.writeFileSync(`${this.dataDir}categories.json`, JSON.stringify({
					host: this.host,
					items: this.categories,
					titles: this.categoriesList,
					name: 'CATEGORIES_LIST'
				}));
			});
		}
	}

	getLevels(data) {
		this.circles = 0;
		this.countCategories = 0;
		this.keyCategory = 0;
		this.categoriesList.map((item, index) => {
			if (item.type === 'category') {
				this.countCategories ++;
			}
		});
		if (data.parent === 0) {
			this.dataCategory.level = 1;
		}
		else {
			let iCat = 0;
			this.level = 1;
			this.needCategory = 0;
			while (data) {
				const item = this.categoriesList[iCat];
				iCat ++;
				const categoriesLength = this.categoriesList.length;
				iCat = (iCat === categoriesLength)? 0 : iCat;
				if (this.level > categoriesLength) {
					if (this.circles > categoriesLength) {
						break;
					}
					this.needCategory = 0;
					this.level = 0;
				}
				if (item.type === 'category') {
					if (this.needCategory !== 0) {
						if (this.needCategory === item.id) {
							this.level ++;
							if (item.parent === null) {
								this.dataCategory.level = this.level;
								break;
							}
							else {
								this.needCategory = item.parent;
							}
						}
					}
					else {
						if (item.parent === null && data.parent === item.id) {
							this.level ++;
							this.dataCategory.level = this.level;
							break;
						}
						else if (data.parent === item.id) {
							this.needCategory = item.parent;
							this.rounds = 0;
							this.circles ++;
							this.level ++;
						}
					}
				}
			}
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

	getUsers() {
    const context = this;
    this.wp.users().perPage(100).get(function(err, data) {
      if (err) {
        console.error(err);
      }
      context.pages = [];
      context.hierarchy = [];
      context.titles = [];
			// TODO users
    });
  }

	async getPosts() {
		const context = this;
		await this.wp.posts().perPage(100).get(function(err, data) {
			if (err){
				console.error(err);
			}
			context.posts = [];
			context.dataFill(context.postsSelector, data);
		});
	}

	getCategories() {
		const context = this;
		this.wp.categories().perPage(100).get(function(err, data) {
			if (err) {
				console.error(err);
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
