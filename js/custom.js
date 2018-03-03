var gameViewModel = undefined;

// Here's my data model
var Games = function() {

	var self = this;

	this.initObservables = function(){

		self.currentGame = ko.observable();
		self.newGame = ko.observable(self.createNewEmptyGame());
		self.searchTerm = ko.observable(undefined);
		self.activeTab = ko.observable("");
		self.gameList = ko.observableArray();
		self.overviewDataStore = ko.observableArray();
		self.platformsDataStore = ko.observableArray();
		self.platformsById = ko.observable();
		self.sourcesDataStore = ko.observableArray();
		self.sourcesById = ko.observable();
		self.showLoading = ko.observable(1);
		self.allSelected = ko.observable(0);
		self.massUpdateData = ko.observable({
			platforms: Array(),
			sources: Array(),
			date_created: undefined,
			has_played: undefined,
			has_finished: undefined,
			play_rating: undefined,
			open_ended: undefined,
			notes: undefined,
		});
		self.pageSize = ko.observable(25);
		self.currentPageNo = ko.observable(1);
		self.currentGameListSorting = ko.observable({ column: "title", dir: "asc"});
		self.sortNullsLast = ko.observable(true);
		self.activeRequests = ko.observable(0);
		self.listMode = ko.observable("all");
		self.filteredList = ko.observableArray();

		self.activeMessageType = ko.observable("info");
		self.activeMessage = ko.observable("");

		self.currentGameCancelData = Array();
		self.currentModalContent = "";

		self.currentPage = ko.computed(function(){
			if(self.activeTab() == "all"){
				var appropriateDataStore = ko.unwrap(self.getAppropriateDataStore());
				var page_no = self.currentPageNo();
				//METHOD 1: This will always show 25 (or whatever number) per page, but the last and penultimate pages could potentially have some overlap
				/*
				end_no = self.pageSize() * page_no;
				end_no = (end_no < appropriateDataStore.length) ? end_no : appropriateDataStore.length;
				start_no = end_no - self.pageSize();
				start_no = (start_no < 1) ? 0 : start_no ;
				*/
				//METHOD 2: This will show up to 25 (or however many) per page
				start_no = ((self.currentPageNo() || 0) * self.pageSize()) - self.pageSize();
				start_no = (start_no < 0) ? 0 : start_no ;
				end_no = self.pageSize() * page_no;
				end_no = (end_no < appropriateDataStore.length) ? end_no : appropriateDataStore.length;

				return appropriateDataStore.slice(start_no, end_no);
			}else{
				return Array();
			}
        });

        self.selectedGames = ko.computed(function(){
			if(self.activeTab() == "all"){
				var appropriateDataStore = ko.unwrap(self.overviewDataStore());
				var selectedGames = ko.utils.arrayFilter(appropriateDataStore, function(game){
					return game.selected();
				});
				return selectedGames;
			}else{
				return Array();
			}
        });

        self.allSelectedOnPage = ko.computed(function(){
        	var allSelected = true;
        	if(self.currentPage().length > 0){
	        	$.each(self.currentPage(), function(idx, elem){
	        		if(elem.selected() == false){
	        			allSelected = false;
	        			return;
	        		}
	        	});
        	}else{
        		allSelected = false;
        	}

        	return allSelected;
        });

		self.recentlyAddedGames = ko.computed(function(){
			var gameListCopy = self.overviewDataStore().slice(0);

			gameListCopy.sort(function(left,right){
				var leftField = new Date(left.date_created());
				var rightField = new Date(right.date_created());
				return leftField == rightField ? 0 : (leftField > rightField ? -1 : 1) ;
			});

			return gameListCopy.slice(0,5);
		});

		self.topFiveGamesToPlay = ko.computed(function(){
			var gameListCopy = self.getFilteredDataStore("to_play_order IS NOT NULL");
			
			if(gameListCopy.length == 0){
				gameListCopy.push({title: "No results found", to_play_order: ''});
			}else{
				gameListCopy.sort(function(left,right){
					var leftField = left.to_play_order();
					var rightField = right.to_play_order()
					return leftField == rightField ? 0 : (leftField > rightField ? -1 : 1) ;
				});
			}

			return gameListCopy.slice(0,5);
		});

		self.unplayedGames = ko.computed(function(){
			var gameListCopy = self.getFilteredDataStore("has_played = 0");
			
			if(gameListCopy.length == 0){
				gameListCopy.push({title: "No results found", date_created: ''});
			}else{
				gameListCopy.sort(function(left,right){
					var leftField = new Date(left.date_created());
					var rightField = new Date(right.date_created());
					return leftField == rightField ? 0 : (leftField > rightField ? -1 : 1) ;
				});
			}

			return gameListCopy.slice(0,5);
		});

		self.incompleteDataGames = ko.computed(function(){
			var gameListOne = self.getFilteredDataStore("has_played = 2");
			var gameListTwo = self.getFilteredDataStore("has_played = 1 AND has_finished = 2");
			var gameListCopy = self._removeDuplicatesFromArray(gameListOne.concat(gameListTwo));
			
			if(gameListCopy.length == 0){
				gameListCopy.push({title: "No results found", date_created: ''});
			}else{
				gameListCopy.sort(function(left,right){
					var leftField = new Date(left.date_created());
					var rightField = new Date(right.date_created());
					return leftField == rightField ? 0 : (leftField > rightField ? -1 : 1) ;
				});
			}

			return gameListCopy.slice(0,5);
		});

		self.allSelected.subscribe(function(val){
			if(val && val != 0){
				self.selectedGames( ko.utils.arrayMap( self.gameList(), function(item){ return item.id; } ) );
			}else{
				self.selectedGames.removeAll();
			}
			
		}.bind(self));

		self.selectedGames.subscribe(function(selectedGameArray){

			var $slider = $(".mass-actions"),
				elemDuration = 200;

			if(selectedGameArray && selectedGameArray.length && selectedGameArray.length > 0){
				$slider.show('slide', {direction: 'down'}, elemDuration);
			}else{
				$slider.hide('slide', {direction: 'down'}, elemDuration);
			}
		}.bind(self));

		self.activeTab.subscribe(function(activeTab){
			if(activeTab=="home"){
				self.showHome();
			}else if (activeTab=="all"){
				self.showAll();
			}
		}.bind(self));

		self.currentGameListTotalPages = ko.computed(function(){
			var appropriateDataStore = ko.unwrap(self.getAppropriateDataStore()),
				pageNum = Math.ceil(appropriateDataStore.length / self.pageSize());
			return (pageNum > 0) ? pageNum : 1 ;
		});

		self.messageClass = ko.pureComputed(function(){
			return "bg-" + self.activeMessageType();
		}, self);
	}

	this.mostRecentFilterTerm = "";
	this.triggerPlatformsUpdate = false;
	this.triggerSourcesUpdate = false;
	this.columnsInOrder = Array();
	this.modalIsShown = false;
	this.filterNullTerm = "NULL";
	this.filterEmptyTerm = "EMPTY";
	this.validOperatorsRegEx = "!=|=|>|<|<=|>=|HAS|~=|IS NOT";
	this.orTermsRegEx = "OR|\\|\\|";
	this.andTermsRegEx = "AND|&&";
	this.operators = {
		//"!=|=|>|<|=<|>=";
		'=' : function(a, b){
			if(a && a.constructor === Array){
				return (a.indexOf(b) !== -1);
			}
			return (a == b);
		},
		'!=' : function(a, b){
			return (a != b);
		},
		'<' : function(a, b){
			return (a < b);
		},
		'>' : function(a, b){
			return (a > b);
		},
		'<=' : function(a, b){
			return (a <= b);
		},
		'>=' : function(a, b){
			return (a >= b);
		},
		'~=' : function(a, b){

			//HAS NULL doesn't really make sense...let's make the user ask for that with "="
			if(b == undefined){
				return false;
			}
			
			if( a == undefined ){
				a = "";
			}
			
			if(a.constructor === Array){
				for(i = 0; i < a.length; i++){
					
					if( a[i] == undefined ){
						a[i] = "";
					}else if(a[i].constructor !== String){
						a[i] = a[i].toString();
					}
		
					if( a[i].toLowerCase().indexOf(b.toLowerCase()) !== -1 ){
						return true;
					}
				}
				return false;
			}else{

				if(a.constructor !== String){
					a = a.toString();
				}
	
				if( a.match( new RegExp(b, "i")) !== null ){
					return true;
				}
				return false;
			}
		},
		'HAS' : function(a, b){
			return self.operators["~="](a, b);
		},
		'IS NOT' : function(a, b){
			return self.operators["!="](a, b);
		},
	}
	this.specialCompareLogicFields = {
		sources: function(ids){
			var nameArray = Array();
			for(i=0; i < ids.length; i++){
				nameArray.push( self.sourcesById()[ids[i]] );
			}
			return nameArray;
		},
		platforms: function(ids){
			var nameArray = Array();
			for(i=0; i < ids.length; i++){
				nameArray.push( self.platformsById()[ids[i]] );
			}
			return nameArray;
		}
	}
	this.conflateTerms = {
		source: "sources",
		platform: "platforms",
	}

	this.init = function(){
		self.initOverviewDataStore();
		self.initPlatforms();
		self.initSources();
	}

	this.initOverviewDataStore = function(){

		self.ajax({
			dataType: "json",
			url: 'api.php/games/',
			success: function(response){
				var debug = jQuery.extend(true, {}, response);
				console.log(debug);
				response = new Response(response);

				if(response.isSuccess()){

					$.each(response.getData().games, function(idx, elem){
						elem.selected = false;
						elem = ko.mapping.fromJS(elem);

						elem.platforms_for_render = ko.computed(function(){
							if(self.platformsById()){
								var platforms_for_render = $.map(elem.platforms(),function(platform_id){
									return self.platformsById()[platform_id];
								});
								return platforms_for_render.join(", ");
							}else{
								return "Loading...";
							}
						});

						elem.sources_for_render = ko.computed(function(){
							if(self.sourcesById()){
								var sources_for_render = $.map(elem.sources(),function(source_id){
									return self.sourcesById()[source_id];
								});
								return sources_for_render.join(", ");
							}else{
								return "Loading...";
							}
						});

						response.getData().games[idx] = elem;
					});
					self.overviewDataStore(response.getData().games);

					self.columnsInOrder = Object.keys(response.getData().games[0]);
					self.columnsInOrder = self.columnsInOrder.filter(function(val, idx){
						if(val == "selected" || val == "__ko_mapping__" || val == "platforms_for_render" || val == "sources_for_render"){
							return false;
						}
						return true;
					});

				}else{
					self.mostRecentAjaxFailure("Could not retrieve overviewDataStore: " + response.getErrorMsg());
				}
			},
			complete: function(jqXHR, textStatus){
				self.showLoading(0);
			}
		});

	}

	this.initPlatforms = function(){

		self.ajax({
			dataType: "json",
			url: 'api.php/platforms/',
			success: function(response){
				response = new Response(response);

				if(response.isSuccess()){
					self.platformsDataStore(response.getData().platforms);
					platformsIndexObj = {};

					for(i=0; i < response.getData().platforms.length; i++){
						platformsIndexObj[response.getData().platforms[i].id] = response.getData().platforms[i].name;
					}
					self.platformsById(platformsIndexObj);

				}else{
					self.mostRecentAjaxFailure("Could not retrieve list of platforms: " + response.getErrorMsg());
				}
				
			}
		});

	}

	this.initSources = function(){

		self.ajax({
			dataType: "json",
			url: 'api.php/sources/',
			success: function(response){
				response = new Response(response);

				if(response.isSuccess()){
					self.sourcesDataStore(response.getData().sources);
					sourcesIndexObj = {};

					for(i=0; i < response.getData().sources.length; i++){
						sourcesIndexObj[response.getData().sources[i].id] = response.getData().sources[i].name;
					}
					self.sourcesById(sourcesIndexObj);

				}else{
					self.mostRecentAjaxFailure("Could not retrieve list of sources: " + response.getErrorMsg());
				}
				
			}
		});

	}

	this.createGame = function(){
		self.ajax({
			type: 'POST',
			contentType: 'application/json',
			url: 'api.php/games',
			dataType: "json",
			data: JSON.stringify(self.newGame()),
			success: function(response, textStatus, jqXHR){
				response = new Response(response);

				if(response.isSuccess()){

					var elem = response.getData().games[0];
					elem.selected = false;
					var game = ko.mapping.fromJS(elem);

					if(self.triggerPlatformsUpdate){
						self.initPlatforms();
						self.triggerPlatformsUpdate = false;
					}

					if(self.triggerSourcesUpdate){
						self.initSources();
						self.triggerSourcesUpdate = false;
					}

					game.platforms_for_render = ko.computed(function(){
						if(self.platformsById()){
							var platforms_for_render = $.map(game.platforms(),function(platform_id){
								return self.platformsById()[platform_id];
							});
							return platforms_for_render.join(", ");
						}else{
							return "Loading...";
						}
					});

					game.sources_for_render = ko.computed(function(){
						if(self.sourcesById()){
							var sources_for_render = $.map(game.sources(),function(source_id){
								return self.sourcesById()[source_id];
							});
							return sources_for_render.join(", ");
						}else{
							return "Loading...";
						}
					});

					self.addGameToLocalObjects(game);
					self.applySortingToDataStore();
					self.hideModalIfShown();
					self.mostRecentAjaxSuccess("Game " + elem.id + " created successfully");
					self.newGame(self.createNewEmptyGame());

				}else{
					self.mostRecentAjaxFailure("Could not create game: " + response.getErrorMsg());
				}

			},
		});
	}

	this.deleteGame = function(game, onSuccess, onFailure){

		var gameIds;
		if($.isArray(game)){
			gameIds = JSON.stringify(game);
		}else if (typeof game === 'object'){
			gameIds = game.id();
		}else{
			console.log("Could not parse game obj/array");
			return;
		}

		var ajaxOpts = {
			type: 'DELETE',
			contentType: 'application/json',
			url: 'api.php/games/' + gameIds,
			dataType: "json",
			success: function(response, textStatus, jqXHR){
				response = new Response(response);
				if(typeof onSuccess === 'function'){
					onSuccess(response, textStatus, jqXHR);
				}else{
					
					if(response.isSuccess()){

						self.hideModalIfShown();
						self.removeGameFromLocalObjects(game);
						self.mostRecentAjaxSuccess("Game deleted successfully");

					}else{
						console.log(response);
						self.mostRecentAjaxFailure(response.getErrorMsg());
					}

				}
			},
		};

		if(typeof onFailure === 'function'){
			ajaxOpts.error = onFailure;
		}

		self.ajax(ajaxOpts);
	}
	
	this.massDelete = function(viewModel, event){
		
		var ids = $.map(self.selectedGames(),function(game){
			return game.id();
		});

		self.deleteGame(ids, function(response, textStatus, jqXHR){

			if(response.isSuccess()){

				self.removeGameFromLocalObjects(self.selectedGames());
				self.mostRecentAjaxSuccess("Games deleted successfully");

			}else{

				console.log(response);

				if(response.isError()){

					var gamesToDelete = Array();
					$.each(response.getData().games, function(idx, result){

						if(result == 1){
							var game = self.getGameById(idx);
							gamesToDelete.push(game);
						}

					});

					self.removeGameFromLocalObjects(gamesToDelete);
					self.mostRecentAjaxFailure("Some games could not be deleted: " + response.getErrorMsg());

				}else{
					self.mostRecentAjaxFailure(response.getErrorMsg());
				}
				
			}

		});
	}

	this.updateGame = function(game){

		var postData;
		if($.isArray(game)){
			postData = JSON.stringify(game);
		}else if (typeof game === 'object'){
			postData = JSON.stringify(Array(ko.mapping.toJS(game)));
		}else{
			console.log("Could not parse game obj/array");
			return;
		}

		self.ajax({
			type: 'PUT',
			contentType: 'application/json',
			url: 'api.php/games/',
			dataType: "json",
			data: postData,
			success: function(response, textStatus, jqXHR){
				console.log(response);
				response = new Response(response);

				if(response.getData() && response.getData().games){

					if(self.triggerPlatformsUpdate){
						self.initPlatforms();
						self.triggerPlatformsUpdate = false;
					}

					if(self.triggerSourcesUpdate){
						self.initSources();
						self.triggerSourcesUpdate = false;
					}
					
					$.each(response.getData().games, function(idx, val){

						if(val !== false){
							var gameToUpdate = self.getGameById(val.id);

							if(gameToUpdate){

								$.each(val, function(prop, value){
									gameToUpdate[prop](value);
								});

							}else{
								console.log("Couldn't locate game " + val.id + " to update");
							}
						}

					});
				}
				
				if(response.isSuccess()){

					self.hideModalIfShown();
					self.mostRecentAjaxSuccess("All games updated successfully");
					self.applyFiltering({}, {}, self.mostRecentFilterTerm);
					self.applySortingToDataStore();

				}else{
					console.log(response);
					self.mostRecentAjaxFailure(response.getErrorMsg());
				}

			},
		});
	}
	
	this.massUpdate = function(viewModel, event){

		var massUpdateData = Array();

		$.each(self.selectedGames(), function(idx, elem){
			var game = ko.mapping.toJS(elem);
			
			$.each(self.massUpdateData(), function(prop, value){
				game[prop] = value;
			});

			massUpdateData.push(game);
		});

		self.updateGame(massUpdateData);
	}

	this.massMerge = function(viewModel, event){

		var elem = event.target,
			$elem = $(elem),
			form = $elem.parents("form"),
			formData = form.serializeArray(),
			submitFields = Array(),
			otherFields = {},
			postData = {};

		submitFields = formData.filter(function(elem, idx){
			if(elem.name.match(/-other$/)){
				if( otherFields.hasOwnProperty(elem.name) ){

					if( otherFields[elem.name].constructor !== Array ){
						otherFields[elem.name] = Array(otherFields[elem.name]);
					}
					otherFields[elem.name].push(elem.value);

				}else{
					otherFields[elem.name] = elem.value;
				}
				return false;
			}
			return true;
		});

		for(i=0; i < submitFields.length; i++){
			if(submitFields[i].value.match(/-other$/)){
				submitFields[i].value = otherFields[submitFields[i].value];
			}else if( submitFields[i].value.match(/^ARRAY/) ){
				submitFields[i].value = submitFields[i].value.replace("ARRAY","");
				submitFields[i].value = submitFields[i].value.split(",");
			}
			submitFields[i].value = (submitFields[i].value == "NULL") ? undefined : submitFields[i].value ;

			postData[submitFields[i].name] = submitFields[i].value;
		}

		postData["ids_to_merge"] = self.selectedGames().map(function(elem, idx){
			return elem.id();
		});

		var postData = JSON.stringify(postData);

		self.ajax({
			type: 'PUT',
			contentType: 'application/json',
			url: 'api.php/games/merge',
			dataType: "json",
			data: postData,
			success: function(response, textStatus, jqXHR){
				response = new Response(response);

				if(response.getData() && response.getData().games){
					
					$.each(response.getData().games, function(id, val){
						var gameToUpdate = undefined;

						if(val != undefined){
							gameToUpdate = self.getGameById(val.id);

							if(gameToUpdate){

								$.each(val, function(prop, value){
									gameToUpdate[prop](value);
								});

							}else{
								val.selected = false;
								var game = ko.mapping.fromJS( $.extend(self.createNewEmptyGame(), val));

								game.platforms_for_render = ko.computed(function(){
									if(self.platformsById()){
										var platforms_for_render = $.map(game.platforms(),function(platform_id){
											return self.platformsById()[platform_id];
										});
										return platforms_for_render.join(", ");
									}else{
										return "Loading...";
									}
								});

								game.sources_for_render = ko.computed(function(){
									if(self.sourcesById()){
										var sources_for_render = $.map(game.sources(),function(source_id){
											return self.sourcesById()[source_id];
										});
										return sources_for_render.join(", ");
									}else{
										return "Loading...";
									}
								});

								self.addGameToLocalObjects(game);
							}
						}else if (val == undefined){
							gameToUpdate = self.getGameById(id);
							self.removeGameFromLocalObjects(gameToUpdate);
						}

					});

					self.applySortingToDataStore();
				}
				
				if(response.isSuccess()){

					self.hideModalIfShown();
					self.mostRecentAjaxSuccess("All games merged successfully");

				}else{
					console.log(response);
					self.mostRecentAjaxFailure(response.getErrorMsg());
				}

			},
		});
	}
	
	this.clearSearch = function(viewModel, event){
		self.searchTerm(undefined);
		$('.search').val(undefined);
	}

	this.showHome = function(){
		self.showLoading(1);
		//self.gameList(undefined);
		self.showLoading(0);
	}

	this.showAll = function(){

		self.showLoading(1);

		self.currentPageNo(1);

		self.showLoading(0);
	}

	this.setActiveTab = function(viewModel, event){
		event.preventDefault();
		var elem = event.target,
			tabTarget = elem.getAttribute("href").replace(/^#/, '');
		window.location.hash = tabTarget;
		self.activeTab(tabTarget);
	}

	this.massMergeFields = function(){
		var dataByField = {},
			mergeFields = Array();

		$.each(self.selectedGames(), function(idx, game){

			var jsGameObj = ko.mapping.toJS(game);

			//self.columnsInOrder

			for(i=0; i < self.columnsInOrder.length; i++){
				var prop = self.columnsInOrder[i];

				if(dataByField[prop] == undefined){
					dataByField[prop] = {};
				}

				dataByField[prop][jsGameObj.id] = jsGameObj[prop];
			}
		});

		$.each(dataByField, function(fieldName, fieldValues){
			var mergeField = {};

			mergeField.name = fieldName;
			//For now these are just going to be the same thing
			mergeField.label = fieldName;
			mergeField.options = Array();

			$.each(fieldValues, function(gameId, valueOption){
				//These will also be the same thing for now
				if(valueOption && valueOption != ''){
					if(fieldName == "sources"){

						var sources_for_render = $.map(valueOption,function(source_id){
							return self.sourcesById()[source_id];
						});

						mergeField.options.push( {
							value: "ARRAY" + valueOption,
							label: sources_for_render.join(", "),
							id : fieldName + "-" + gameId,
						} );
					}else if(fieldName == "platforms"){

						var platforms_for_render = $.map(valueOption,function(platform_id){
							return self.platformsById()[platform_id];
						});

						mergeField.options.push( {
							value: "ARRAY" + valueOption,
							label: platforms_for_render.join(", "),
							id : fieldName + "-" + gameId,
						} );
					}else {
						mergeField.options.push( {
							value: valueOption,
							label: (fieldName == "id") ? valueOption + " (" + dataByField["title"][gameId] + ")" : valueOption,
							id : fieldName + "-" + gameId,
						} );
					}
				}
			});
			if(fieldName != "id"){
				mergeField.options.push( { value: 'EMPTY', label: 'NULL', id: fieldName + '-empty' } );
				mergeField.options.push( { value: 'NULL', label: 'Ignored', id: fieldName + '-null' } );
				mergeField.showFillIn = true;
			}else{
				mergeField.options.push( { value: 'NEW', label: '<New game>', id: fieldName + '-new' } );
				mergeField.showFillIn = false;
			}

			mergeFields.push(mergeField);
		});

		return mergeFields;
	}
	
	this.editGameFromList = function(game, event){

		self.currentGameCancelData = ko.mapping.toJS(game);

		self.ajax({
			type: 'GET',
			dataType: 'json',
			url: 'api.php/games/' + game.id(),
			success: function(response, textStatus, jqXHR){
				response = new Response(response);
				if( response.getData().games && response.getData().games[0] ){

					ko.mapping.fromJS(response.getData().games[0], game);

					self.currentGame(game);

					$(".modal-content.editgame .form-group select.source").select2({
						tags: true,
						tokenSeparators: [','],
					}).on("change", function(e){
					    var isNew = $(this).find('[data-select2-tag="true"]');
					    if(isNew.length){
					    	self.triggerSourcesUpdate = true;
					    }
					});

					$(".modal-content.editgame .form-group select.platform").select2({
						tags: true,
						tokenSeparators: [','],
					}).on("change", function(e){
					    var isNew = $(this).find('[data-select2-tag="true"]');
					    if(isNew.length){
					    	self.triggerPlatformsUpdate = true;
					    }
					});
					self.showModal("editgame");

				}
			},
		});

	}
	
	this.updateGameOnEnter = function(game, event){
		
		var $elem = $(event.target);

		if( event.keyCode == 13 ){ //enter
			self.updateGame(game);
		}
	}
	
	this.massUpdateOnEnter = function(game, event){
		var $elem = $(event.target);

		if( event.keyCode == 13 ){ //enter
			self.massUpdate(game);
		}		
	}
	
	this.createGameOnEnter = function(game, event){
		var $elem = $(event.target);

		if( event.keyCode == 13 ){ //enter
			self.createGame(game);
		}		
	}

	this.triggerModal = function(viewModel, event){
		var $elem = $(event.target);
		var whichContent = $elem.data("target");

		if(whichContent == "newgame"){
			self.newGame(self.createNewEmptyGame());

			$(".modal-content.newgame .form-group select.source").select2({
				tags: true,
				tokenSeparators: [','],
			}).on("change", function(e){
			    var isNew = $(this).find('[data-select2-tag="true"]');
			    if(isNew.length){
			    	self.triggerSourcesUpdate = true;
			    }
			});

			$(".modal-content.newgame .form-group select.platform").select2({
				tags: true,
				tokenSeparators: [','],
			}).on("change", function(e){
			    var isNew = $(this).find('[data-select2-tag="true"]');
			    if(isNew.length){
			    	self.triggerPlatformsUpdate = true;
			    }
			});

			self.applyAutocompleteToElement($('.modal-content.newgame .form-group .search'));
		}else if(whichContent == "massupdate"){

			$(".modal-content.massupdate .form-group select.source").select2({
				tags: true,
				tokenSeparators: [','],
			}).on("change", function(e){
			    var isNew = $(this).find('[data-select2-tag="true"]');
			    if(isNew.length){
			    	self.triggerSourcesUpdate = true;
			    }
			});

			$(".modal-content.massupdate .form-group select.platform").select2({
				tags: true,
				tokenSeparators: [','],
			}).on("change", function(e){
			    var isNew = $(this).find('[data-select2-tag="true"]');
			    if(isNew.length){
			    	self.triggerPlatformsUpdate = true;
			    }
			});

		}else if(whichContent == "mass-merge"){

			$(".modal-content.mass-merge select.source").select2({
				tags: true,
				tokenSeparators: [','],
			}).on("change", function(e){
			    var isNew = $(this).find('[data-select2-tag="true"]');
			    if(isNew.length){
			    	self.triggerSourcesUpdate = true;
			    }
			}).on("select2:open", function(e){
			    self.selectPrecedingRadioButton({}, e);
			});

			$(".modal-content.mass-merge select.platform").select2({
				tags: true,
				tokenSeparators: [','],
			}).on("change", function(e){
			    var isNew = $(this).find('[data-select2-tag="true"]');
			    if(isNew.length){
			    	self.triggerPlatformsUpdate = true;
			    }
			}).on("select2:open", function(e){
			    self.selectPrecedingRadioButton({}, e);
			});

		}

		self.showModal(whichContent);
	}

	this.showModal = function(whichContent){
		self.currentModalContent = whichContent;
		$('#myModal .modal-content.' + whichContent).show();
		$('#myModal').modal('show');
		/*$(".datepicker").datepicker({
			format: 'yyyy-mm-dd 00:00:00', //I guess we don't care about times right now, do we?
		});*/
	}

	//This just calls the default modal "hide", if it's currently open
	this.hideModalIfShown = function(viewModel, event){
		if(self.modalIsShown == true){
			$('#myModal').modal('hide');
		}
	}

	this.clearSelection = function(viewModel, event){
		ko.utils.arrayForEach(ko.unwrap(self.overviewDataStore()), function(game) {
			game.selected(false);
		});
	}

	this.toggleSelectAll = function(gameViewModel, event){
		var $elem = $(event.target);
		if($elem.is(":checked")){
			self.toggleSelectOnCurrentPage(true);
		}else{
			self.toggleSelectOnCurrentPage(false);
		}
		return true;
	}

	self.toggleSelectOnCurrentPage = function(doSelect){
		if(doSelect == true){
			ko.utils.arrayForEach(self.currentPage(), function(game) {
				game.selected(true);
			});
		}else{
			ko.utils.arrayForEach(self.currentPage(), function(game) {
				game.selected(false);
			});
		}
		//self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));
	}

	this.updateSelected = function(game, event){

    	//Is there a slicker/better way of doing this?
    	self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));
    	//This is essential for the default checked behavior to continue
    	return true;
    }

    this.firstGameListPage = function(viewModel, event){
    	self.currentPageNo(1);
    }

	this.prevGameListPage = function(viewModel, event){
		self.currentPageNo( ( self.currentPageNo() > 1 ? self.currentPageNo() - 1 : 1) )  ;
	}

	this.nextGameListPage = function(viewModel, event){
		var maxPage = self.currentGameListTotalPages();
		self.currentPageNo( ( (self.currentPageNo() < maxPage) ? self.currentPageNo() + 1 : self.currentPageNo()) );
	}

	this.lastGameListPage = function(viewModel, event){
		self.currentPageNo(self.currentGameListTotalPages());
	}

	this.parseTermString = function(termString){

		if(termString === undefined){
			console.log("No term string received");
			return false;
		}
		matchingData = Array();

		//Split on "AND"
		var results = termString.split(new RegExp(self.andTermsRegEx));

		//For each expression following each "AND"
		for(i=0; i < results.length; i++){
			var subTerms = Array(),
				arrayValue;
			subTerms = results[i].split(new RegExp(self.orTermsRegEx));

			if(subTerms.length == 1){
				//No "OR" subcomponents, just one matching thing
				arrayValue = self._getMatchingObjectFromTermString(subTerms[0]);

			}else{
				arrayValue = Array();
				//For each expression separated by "OR"
				for(j=0; j < subTerms.length; j++){
					var term = subTerms[j].trim();

					arrayValue.push(self._getMatchingObjectFromTermString(term));
				}
			}
			matchingData[i] = arrayValue;
		}

		return matchingData;

	}

	this.getFilteredDataStore = function(filterString){
		if(filterString !== undefined){	
			var termObjects = self.parseTermString(filterString);
			return self._getFilteredDataStore(termObjects);
		}
	}
	
	this.applyFiltering = function(viewModel, event, forceWithTerm){

		var val;

		if(forceWithTerm){
			val = forceWithTerm;
		}else if( event.keyCode == 13 ){
			var $elem = $(event.target)
			if( $elem.length ){
				val = $elem.val();
				this.mostRecentFilterTerm = val;
			}
		}

		if(event.keyCode == 13 || forceWithTerm){
			if(val && val != ""){
				self.filteredList(self.getFilteredDataStore(self.mostRecentFilterTerm));
				self.listMode("filter");
				self.currentPageNo(1);
			}else{
				self.filteredList(Array());
				self.listMode("all");
			}			
		}

	}
	
	this.clearFilter = function(viewModel, event){
		var $elem = $(event.target);
	
		$elem.parents("a").siblings("input").val(undefined);
		self.filteredList(Array());
		self.listMode("all");
		this.applySortingToDataStore();
	}

	this.showFilterInfoPopup = function(viewModel, event){
		self.showModal("filter-instructions");
	}

	this.preventFocus = function(viewModel, event){
		event.preventDefault();
		var $elem = $(event.target);
		$elem.blur();
	}

	this.updateSortingField = function(viewModel, event){
		var $elem = $(event.target);

		if($elem.is("span")){
			$elem = $elem.parent();
		}

		var $icon = $elem.children(".sorting-icon"),
			sortField = $elem.data("target"),
			asc_icon = "glyphicon-triangle-top",
			desc_icon = "glyphicon-triangle-bottom";

		if( sortField != self.currentGameListSorting().column ){
			$(".all-games .thead .sorting-icon").removeClass(asc_icon).removeClass(desc_icon);
		}

		if( $icon.hasClass(desc_icon) ){
			$icon.removeClass(desc_icon);
			$icon.addClass(asc_icon);
			self.currentGameListSorting({ column: sortField, dir: "asc" });
		}else if( $icon.hasClass(asc_icon) ){
			$icon.removeClass(asc_icon);
			$icon.addClass(desc_icon);
			self.currentGameListSorting({ column: sortField, dir: "desc" });
		}else{
			$icon.addClass(asc_icon);
			self.currentGameListSorting({ column: sortField, dir: "asc" });
		}

		this.applySortingToDataStore();
	}

	this.applySortingToDataStore = function(optionalDataStore){

		var sortField = self.currentGameListSorting().column;
		var sortDir = self.currentGameListSorting().dir;
		var appropriateDataStore = ( optionalDataStore !== undefined ) ? optionalDataStore : self.getAppropriateDataStore() ;
		
		appropriateDataStore.sort(function(left, right){
			var leftField = left[sortField]();
			var rightField = right[sortField]();

			if(sortField == "id"){
				leftField = parseInt(leftField);
				rightField = parseInt(rightField);
			}else{

				leftField = leftField.toLowerCase() || "";
				rightField = rightField.toLowerCase() || "";

				if(self.sortNullsLast() == true){
					leftField = (leftField == "") ? "zzzzzzzzzzz" : leftField ;
					rightField = (rightField == "") ? "zzzzzzzzzzz" : rightField ;
				}
			}

			if(sortDir == "asc"){
				return leftField == rightField ? 0 : (leftField < rightField ? -1 : 1) ;
			}else{
				return leftField == rightField ? 0 : (leftField > rightField ? -1 : 1) ;
			}
		});
	}

	this.getAppropriateDataStore = function(){
		if (self.listMode() == "all"){
			return self.overviewDataStore;
		}else if (self.listMode() == "filter"){
			return self.filteredList;
		}
		if (self.overviewDataStore().length > 0){
			return self.overviewDataStore;
		}else{
			return Array();
		}
		
	}

	this.removeGameFromLocalObjects = function(games){
		if( games instanceof Array ){
			self.overviewDataStore.removeAll(games);
			if (self.listMode() == "filter"){
				self.filteredList.removeAll(games);
			}
		}else{
			self.overviewDataStore.remove(games);
			if (self.listMode() == "filter"){
				self.filteredList.remove(games);
			}
		}
	}

	this.addGameToLocalObjects = function(game){
		self.overviewDataStore.push(game);
	}

	this.selectPrecedingRadioButton = function(viewModel, event){
		var elem = event.target,
			$elem = $(elem)
			$radio = $elem.prev("input[type='radio']");
		if($radio.length){
			$radio.prop("checked", true);
		}
	}

	this.ajax = function(ajaxOpts){
		
		var completeCallback = ajaxOpts.complete;
		ajaxOpts.complete = function(jqXHR, textStatus){
			self.activeRequests( self.activeRequests() - 1 );

			if(typeof completeCallback === 'function'){
				completeCallback(jqXHR, textStatus);
			}
		}

		var errorCallback = ajaxOpts.error;
		ajaxOpts.error = function(jqXHR, textStatus, errorThrown){
			self.activeRequests( self.activeRequests() - 1 );

			var http_code = jqXHR.status,
				http_code_text = jqXHR.statusText,
				error_msg = jqXHR.responseText;
			self.mostRecentAjaxFailure(http_code + ' ' + http_code_text + '. See console for details');
			console.log(error_msg);

			if(typeof errorCallback === 'function'){
				errorCallback(jqXHR, textStatus, errorThrown);
			}
		}

		self.activeRequests( self.activeRequests() + 1 );
		$.ajax(ajaxOpts);
	}

	this._removeDuplicatesFromArray = function(arrayWithDuplicates, uniqueFieldToEvaluate){
		uniqueFieldToEvaluate = uniqueFieldToEvaluate || "id";
		var uniqueTracker = {};
		var arrayWithoutDuplicates = [];

		$.each(arrayWithDuplicates, function(idx, elem){
			var uniqueValue = elem[uniqueFieldToEvaluate]();
			if(uniqueTracker[uniqueValue] == undefined){
				uniqueTracker[uniqueValue] = 1;
				arrayWithoutDuplicates.push(elem);
			}
		});

		return arrayWithoutDuplicates;
	}

	//Expects a termString like "bar", "foo=bar", "foo > bar", etc.
	this._getMatchingObjectFromTermString = function(termString){

		var matchingObject = {};
		var termParts = termString.split(new RegExp("(" + self.validOperatorsRegEx + ")"));

		if(termParts.length == 3){
			matchingObject.matchField = termParts[0].trim();
			matchingObject.matchOp = termParts[1].trim();
			matchingObject.matchValue = termParts[2].trim();
		}else if (termParts.length == 1){
			matchingObject.matchField = "ANY";
			matchingObject.matchOp = "HAS";
			matchingObject.matchValue = termParts[0].trim();
		}else{
			return false;
		}

		return matchingObject;
	}

	this._getFilteredDataStore = function(matchingData){
		var matches = Array();
		ko.utils.arrayForEach(self.overviewDataStore(), function(game) {
			//For each game, see if it matches

			var doesGameMatch = self._doesGameMatch(game, matchingData);

			if(doesGameMatch){
				matches.push(game);
			}

		});
		return matches;
	}

	this._doesGameMatch = function(game, matchingData){

		var doesGameMatch = true;

		//For each expression in the array of match data
		$.each(matchingData, function(idx, topLevelMatchData){

			var topLevelMatch = true;

			//If this is a list of "OR" matchers
			if(topLevelMatchData.constructor === Array){

				var subLevelMatch = false;

				//For each matcher
				$.each(topLevelMatchData, function(objIdx, subLevelMatchData){

					subLevelMatch = self._evaluateGameFieldsUsingMatchingParameters(game, subLevelMatchData);

					//If one of our "sub level" expressions evaluates to true, the "top level" match for this iteration is good to go
					if( subLevelMatch == true ){
						topLevelMatch = true;
						//The $.each equivalent of "break"
						return false;
					}

				});

				//If none of our "sub level" expressions evaluated to true, the "top level" match for this iteration is false overall
				if (subLevelMatch == false){
					topLevelMatch = false;
				}
				
			}else{
				//This is a simple match object
				topLevelMatch = self._evaluateGameFieldsUsingMatchingParameters(game, topLevelMatchData);
			}

			//If one of our "top level" expressions evaluates to false, short circuit and return false to save time
			if( topLevelMatch == false ){
				doesGameMatch = false;
				//The $.each equivalent of "break"
				return false;
			}
			
		});

		return doesGameMatch;

	}

	this._evaluateGameFieldsUsingMatchingParameters = function(game, matchData){

		var checkFields = Array();
		var gameArray = ko.mapping.toJS(game);

		if(matchData.matchField == 'ANY'){
			checkFields = Object.keys(gameArray).filter(function(elem, idx){
				if(elem != "id" && elem != "selected" && !self.conflateTerms.hasOwnProperty(elem)){
					return true;
				}
			});
		}else{
			checkFields.push(matchData.matchField);
		}

		if( matchData.matchValue == self.filterNullTerm ){
			matchData.matchValue = undefined;
		}else if( matchData.matchValue == self.filterEmptyTerm){
			matchData.matchValue = "";
		}

		//Okay...apparently if I don't explicitly declare "i" here, it loops infinitely when "ANY" field is specified
		var i;
		for(i = 0; i < checkFields.length; i++){
			var fieldName = checkFields[i];
			if(self.conflateTerms.hasOwnProperty(fieldName)){
				fieldName = self.conflateTerms[fieldName];
			}
			if( self.specialCompareLogicFields.hasOwnProperty(fieldName) ){
				if( self.operators[matchData.matchOp](self.specialCompareLogicFields[fieldName](gameArray[fieldName]), matchData.matchValue) ){
					return true;
				}
			}else{
				if( self.operators[matchData.matchOp](gameArray[checkFields[i]], matchData.matchValue) ){
					return true;
				}
			}
		}
		return false;
	}

	this._getDisplayFieldsOfGameInOrder = function(game){
		//Hmmmm....
	}

	this.loadAndEditGameById = function(id){
		var game = self.getGameById(id);
		self.editGameFromList(game);
	}

	this.doEditGame = function(game, event){
		self.loadAndEditGameById(game.id());
	}

	this.createNewEmptyGame = function(){
		return {
				title: "",
				sources: Array(),
				platforms: Array(),
				has_played: 2,
				source_id: "",
				to_play_order: 0,
		};
	}

	this.getGameById = function(id){
		var results = $.grep(self.overviewDataStore(),function(elem, idx){
			return (elem.id() === id);
		});
		//Should only be one anyway, but just to be sure...
		return results[0];
	}

	this.applyAutocompleteToElement = function($search_elem){

		$search_elem.autocomplete({
			source: function( request, response ){
				/*$.getJSON(
					'api.php/games/search/' + request.term,
					function(data){
						if (data.results) {
							response(
								$.map(data.results, function( item ){
									return {
										label: item.title + " (" + item.source + ")",
										value: item.id
									}
								})
							);
						}else{
							response([{ label: "No Results Found", value: "#" }]);
						}
					}
				);*/

				response($.map(self.getFilteredDataStore("title HAS " + request.term + " OR source HAS " + request.term), function( game ){
					return {
						label: game.title() + " (" + game.sources_for_render() + ")",
						value: game.id()
					}
				}));
			},
			select: function(event, ui){
				event.preventDefault();
				if(ui.item.value != "#"){
					$search_elem.val(ui.item.label);
					self.loadAndEditGameById(ui.item.value);
				}
			},
			focus: function(event, ui){
				event.preventDefault();
				//$('.search').val(ui.item.label);
			},
			search: function(event, ui){
				self.searchTerm($search_elem.val());
			},
			position: { my: "left top", at: "left bottom", collision: "none" },
			//appendTo: ".search-results-container"
		});

		$search_elem.keydown(function(event){
			var $this=$(this);
			if(event.keyCode == 40){ //Down arrow
				event.preventDefault();
				if( self.searchTerm() ){
					$search_elem.siblings(".search-results-container").children(".ui-autocomplete:hidden").show();
				}else{
					//$this.autocomplete("search");
				}
			}
		});
		
		$search_elem.click(function(event){
			var $this=$(this);
			event.preventDefault();
			if( self.searchTerm() ){
				console.log("display the shit");
				$search_elem.siblings(".search-results-container").children(".ui-autocomplete:hidden").show();
			}else{
				//$this.autocomplete("search");
			}
		});

	}

	this.debugLogDataStore = function(idx_start, idx_end){
		if(idx_start === undefined && idx_end === undefined){
			idx_start = 0;
			idx_end = self.overviewDataStore().length - 1;
		}
		idx_end = idx_end || idx_start;

		var sliced = self.overviewDataStore.slice(idx_start, idx_end),
			outputReadyList = Array();
		$.each(sliced, function(idx, elem){
			outputReadyList.push(ko.mapping.toJS(elem));
		});
		console.log(outputReadyList);
	}

	this.mostRecentAjaxFailure = function(messageString){
		self.displayMessage(messageString, "error", "Oh no!", 8000);
	}

	this.mostRecentAjaxSuccess = function(messageString){
		self.displayMessage(messageString, "notice", "Success");
	}

	this.displayMessage = function(messageString, type, growlHeader, duration){
		type = type || "warning";

		$.growl[type]({ message: messageString, title: growlHeader, duration: duration });

		//self.activeMessageType(type);
		//self.activeMessage(messageString);
	}

	ko.bindingHandlers.showMessage = {
	    init: function(element, valueAccessor) {
	        //$(element).hide();
	    },
	    update: function(element, valueAccessor) {
	        // On update, fade in/out
	        var message = valueAccessor();
	        if(message && message != ""){
				$(element).text(message).slideDown(500).delay(3000).slideUp(500, function(){
					self.activeMessage("");
				});	
	        }
	    }
	};

	this.messageTest = function(){
		self.mostRecentAjaxSuccess("A Test Message");
	}
};

var Response = function(responseData){

	var self = this;

	this.response = responseData;

	this.isSuccess = function(){
		return self.getStatus() == "success";
	}

	this.isFail = function(){
		return self.getStatus() == "fail";
	}

	this.isError = function(){
		return self.getStatus() == "error";
	}

	this.getStatus = function(){
		return self.response.status;
	}

	this.getErrorMsg = function(){
		return self.response.message;
	}

	this.getData = function(){
		return self.response.data;
	}

	this.getGameData = function(){
		return self.getData()["games"];
	}
}

$(document).ready(function(){

	gameViewModel = new Games();
	gameViewModel.initObservables();
	ko.applyBindings(gameViewModel);
	gameViewModel.init();

	//Initialize correct tab based on hash
	window.location.hash = window.location.hash || "home";
	var hash = window.location.hash;
	gameViewModel.activeTab(hash.replace(/^#/, ''));

	gameViewModel.applyAutocompleteToElement($('.search'));

	$("#myModal").on('hide.bs.modal', function(){
		gameViewModel.modalIsShown = false;
		//Hide extra stuff
		$('#myModal .modal-content').hide();

		//Clear out things that might be currently displayed
			//Is there a smarter way to do this? Probably...maybe check what content is currently being displayed or whatever
		if(gameViewModel.currentModalContent == "newgame"){
			gameViewModel.newGame(gameViewModel.createNewEmptyGame());
		}else if(gameViewModel.currentModalContent == "editgame"){
			ko.mapping.fromJS(gameViewModel.currentGameCancelData, gameViewModel.currentGame());
		}
	});

	$("#myModal").on('show.bs.modal', function(){
		gameViewModel.modalIsShown = true;
	});
	
});

$(window).on('hashchange', function(){
	var hash = window.location.hash;
	gameViewModel.activeTab(hash.replace(/^#/, ''));
});