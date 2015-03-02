var gameViewModel = undefined;

	// Here's my data model
	var Games = function() {

		var self = this;

		this.initObservables = function(){

			self.currentGameId = ko.observable();
			self.currentGame = ko.observable();
			self.newGame = ko.observable(self.createNewEmptyGame());
			self.searchTerm = ko.observable();
			self.activeTab = ko.observable("");
			self.gameList = ko.observableArray();
			self.overviewDataStore = ko.observableArray();
			self.activeDataStore = ko.observableArray(undefined);
			self.showLoading = ko.observable(1);
			self.mostRecentAjaxSuccess = ko.observable("");
			self.mostRecentAjaxFailure = ko.observable("");
			self.allSelected = ko.observable(0);
			self.massUpdateData = ko.observable({
				platform: undefined,
				source: undefined
			});
			self.pageSize = ko.observable(25);
			self.currentPageNo = ko.observable(1);
			self.currentGameListSorting = ko.observable({ column: "title", dir: "asc"});
			self.sortNullsLast = ko.observable(true);
			self.activeRequests = ko.observable(0);
			self.forceShowActiveDataStore = ko.observable(false);
			self.listMode = ko.observable("all");

			self.currentGameCancelData = Array();

			self.currentPage = ko.computed(function(){
				if(self.activeTab() == "all"){
					var appropriateDataStore = ko.unwrap(self.getAppropriateDataStore());
					var page_no = self.currentPageNo();
					end_no = self.pageSize() * page_no;
					end_no = (end_no < appropriateDataStore.length) ? end_no : appropriateDataStore.length ;
					start_no = end_no - self.pageSize();
					start_no = (start_no < 1) ? 0 : start_no ;
					return appropriateDataStore.slice(start_no, end_no);
				}else{
					return Array();
				}
	        });

	        self.selectedGames = ko.computed(function(){
				if(self.activeTab() == "all"){
					var appropriateDataStore = ko.unwrap(self.getAppropriateDataStore());
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
	        	$.each(self.currentPage(), function(idx, elem){
	        		if(elem.selected() == false){
	        			allSelected = false;
	        			return;
	        		}
	        	});
	        	return allSelected;
	        });

			self.allSelected.subscribe(function(val){
				console.log("changed!");
				if(val && val != 0){
					console.log("select all");
					self.selectedGames( ko.utils.arrayMap( self.gameList(), function(item){ return item.id; } ) );
					//self.selectedGames.push("11");
				}else{
					console.log("remove all");
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
				self.resetVisibleUI();

				if(activeTab=="home"){
					self.showHome();
				}else if (activeTab=="all"){
					self.showAll();
				}
				
			}.bind(self));

			self.currentGameListTotalPages = ko.computed(function(){
				var appropriateDataStore = ko.unwrap(self.getAppropriateDataStore()),
					pageNum = Math.floor(appropriateDataStore.length / self.pageSize());
				return (pageNum > 0) ? pageNum : 1 ;
			});

		}


		this.initOverviewDataStore = function(){

				self.ajax({
					dataType: "json",
					url: 'api.php/games/',
					success: function(response){
						console.log(response);

						//Attach some extra properties
						self.overviewDataStore(response.results);
						$.each(response.results, function(idx, elem){
							elem.selected = false;
							elem = ko.mapping.fromJS(elem);
							response.results[idx] = elem;
							//elem.selected = false;
						});
						self.overviewDataStore(response.results);

						/*self.overviewDataStore($.map(response.results, function(game){
							return ko.observable(game);
						}));*/

						self.overviewDataStore(response.results);
						console.log(self.overviewDataStore());
						self.showLoading(0);
					}
				});

		}

		this.updateGame = function(game){
			//var index = self.overviewDataStore.indexOf(game);

			self.ajax({
				type: 'PUT',
				contentType: 'application/json',
				url: 'api.php/games/' + game.id(),
				dataType: "json",
				data: JSON.stringify(ko.mapping.toJS(game)),
				success: function(response, textStatus, jqXHR){
					if(response.success){
						$.each(response.successObject, function(idx, elem){

							var newGameDataObj = elem;
							console.log(newGameDataObj);
							$.each(newGameDataObj, function(idx, elem){
								game[idx](elem);
							});

							//self.removeGameFromLocalObjects(game);
							//self.addGameToLocalObjects(game);
						});

						self.hideModal();
						console.log(response);
						self.mostRecentAjaxSuccess(response.msg);

					}else{
						console.log("IMPLEMENT ERROR HANDLING FOR THIS");
					}
					
					//self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));
					//console.log(self.overviewDataStore()[index]);

					//self.applySortingToDataStore();

					//self.overviewDataStore.notifySubscribers(ko.unwrap(self.overviewDataStore));
					//self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));


				},
				error: self.standardOnFailureHandler
			});
		}
		
		this.massUpdate = function(viewModel, event){
			var ids = $.map(self.selectedGames(),function(game){
				return game.id;
			});
			self.ajax({
				type: 'PUT',
				contentType: 'application/json',
				url: 'api.php/games/' + JSON.stringify(ids),
				dataType: "json",
				data: JSON.stringify(self.massUpdateData()),
				success: function(response, textStatus, jqXHR){
					$.each(response.successObject, function(idx, elem){
						self.removeGameFromLocalObjects(elem);
						self.addGameToLocalObjects(elem);
					});

					self.applySortingToDataStore();
					self.hideModal();
					console.log(response);
					self.mostRecentAjaxSuccess(response.msg);
				},
				error: self.standardOnFailureHandler
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
					self.addGameToLocalObjects(response.successObject);
					self.applySortingToDataStore();
					self.hideModal();
					console.log(response);
					self.mostRecentAjaxSuccess(response.msg);
					self.newGame(self.createNewEmptyGame())
				},
				error: self.standardOnFailureHandler
			});
		}

		this.deleteGame = function(game, onSuccess, onFailure){
			self.ajax({
				type: 'DELETE',
				contentType: 'application/json',
				url: 'api.php/games/' + game.id,
				dataType: "json",
				success: function(response, textStatus, jqXHR){
					if(typeof onSuccess === 'function'){
						onSuccess(response, textStatus, jqXHR);
					}
				},
				error: function(jqXHR, textStatus, errorThrown){
					if(typeof onFailure === 'function'){
						onFailure(jqXHR, textStatus, errorThrown);
					}else{
						self.standardOnFailureHandler(jqXHR, textStatus, errorThrown);
					}
				}
			});
		}
		
		this.massDelete = function(viewModel, event){
			self.ajax({
				type: 'DELETE',
				contentType: 'application/json',
				url: 'api.php/games/' + JSON.stringify(self.selectedGames()),
				dataType: "json",
				success: function(response, textStatus, jqXHR){
					var idsToDelete = [];
					$.each(self.selectedGames(), function(idx, elem){
						idsToDelete.push( {id: elem} );
					});
					self.removeGameFromLocalObjects(idsToDelete);
					self.applySortingToDataStore();
					console.log(response);
					self.mostRecentAjaxSuccess(response.msg);
				},
				error: self.standardOnFailureHandler
			});
		}

		/* //Comment out for testing
		this.filterString = ko.observable(undefined);
		this.filteredList = ko.computed(function(){
			if(this.listMode() == "filter" && self.filterString() !== undefined){
				var termObjects = self.parseTermString(self.filterString());

				var matches = Array();
				ko.utils.arrayForEach(self.overviewDataStore(), function(game) {

					if(termObjects.and.length > 0){
						var doesMatch = true;

						for(i = 0; i < termObjects.and.length; i++){
							var matchTerm = termObjects.and[i].termString;
							var matchField = termObjects.and[i].field;

							if( matchField == 'ALL' ){
								var loopMatch = true;

								for(prop in game){
						        	if(prop == "id"){
						        		continue;
						        	}

						        	if( (game[prop] || "").match( new RegExp(matchTerm, "i")) === null ){
										loopMatch = false;
										break;
									}
						        }

						        if( loopMatch == false){
						        	doesMatch = false;
						        	break;
						        }

							}else{
								if( (game[matchField] || "").match( new RegExp(matchTerm, "i")) === null ){
									doesMatch = false;
									break;
								}
							}
						}

						if( doesMatch == false ){
							return true;
						}
					}

					if(doesMatch == true){
						matches.push(game);
						return true;
					}

					if(termObjects.or.length > 0){
						var doesMatch = false;

						for(i = 0; i < termObjects.or.length; i++){
							var matchTerm = termObjects.or[i].termString;
							var matchField = termObjects.or[i].field;

							if( matchField == 'ALL' ){
								var loopMatch = false;

								for(prop in game){
						        	if(prop == "id"){
						        		continue;
						        	}

						        	if( (game[prop] || "").match( new RegExp(matchTerm, "i")) ){
										loopMatch = true;
										break;
									}
						        }

						        if( loopMatch == true){
						        	doesMatch = true;
						        	break;
						        }

							}else{
								if( (game[matchField] || "").match( new RegExp(matchTerm, "i")) ){
									doesMatch = true;
									break;
								}
							}

						}
					}

			        if(doesMatch == true){
						matches.push(game);
					}
			    });

				console.log(matches);
			    return matches;

			}else{
				return Array();
			}
		});
		*/
		
		$('.search').autocomplete({
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

				response($.map(self.filterDataStore("title|" + request.term + " || source|" + request.term), function( game ){
					return {
						label: game.title + " (" + game.source + ")",
						value: game.id
					}
				}));

			},
			select: function(event, ui){
				event.preventDefault();
				if(ui.item.value != "#"){
					$('.search').val(ui.item.label);
					self.currentGameId(ui.item.value);
					self.searchTerm(false);
				}
			},
			focus: function(event, ui){
				event.preventDefault();
				//$('.search').val(ui.item.label);
			},
			search: function(event, ui){
				self.searchTerm($('.search').val());
			},
			position: { my: "left top", at: "left bottom", collision: "none" },
			appendTo: "#container"
		});

		$('.search').keydown(function(event){
			var $this=$(this);
			if(event.keyCode == 40){ //Down arrow
				if( self.searchTerm() ){
					$this.siblings("#container").children(".ui-autocomplete:hidden").show();
				}else{
					//$this.autocomplete("search");
				}
			}
		});

		this.deleteGameFromModal = function(game){
			self.deleteGame(game, function(response, textStatus, jqXHR){
				self.mostRecentAjaxSuccess(response.msg);
				self.removeGameFromLocalObjects(game);
				self.applySortingToDataStore();
				self.hideModal();
			});
		}

		this.deleteGameFromList = function(game, event){
			self.deleteGame(game, function(response, textStatus, jqXHR){
				self.mostRecentAjaxSuccess(response.msg);
				self.removeGameFromLocalObjects(game);
				self.applySortingToDataStore();
			});
		}

		this.removeGameFromLocalObjects = function(game){
			if( game instanceof Array ){
				self.overviewDataStore.smartRemoveAll(game);
				self.activeDataStore.smartRemoveAll(game);
				//self.gameList.smartRemoveAll(game);
				var mapped = $.map(game,function(elem, idx){ return elem.id });
				self.selectedGames.removeAll( mapped );
			}else{
				self.overviewDataStore.remove(game);
				//self.activeDataStore.remove(game);
				//self.gameList.smartRemove(game);
				//self.selectedGames.remove(game.id);			
			}

			//self.currentGameId(undefined);
		}

		this.addGameToLocalObjects = function(game){
			self.overviewDataStore.push(game);
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
		
		this.editGameFromList = function(game, event){
			//self.currentGame(game);
			self.currentGameCancelData = ko.mapping.toJS(game);

			self.ajax({
				type: 'GET',
				dataType: 'json',
				url: 'api.php/games/' + game.id(),
				success: function(response, textStatus, jqXHR){
					if( response.results && response.results[0] ){


						
						//var currentGame = self.currentGame();
						/*$.each(response.results[0], function(idx, elem){
							currentGame[idx] = elem;
						});*/

						ko.mapping.fromJS(response.results[0], game);

						self.currentGame(game);
						self.showModal("editgame");

					}
				},
				error: self.standardOnFailureHandler
			});

		}

		this.cancelUpdateGame = function(game, event){
			ko.mapping.fromJS(self.currentGameCancelData, game);
			self.hideModal();
		}

		this.triggerModal = function(viewModel, event){
			var $elem = $(event.target);
			var whichContent = $elem.data("target");

			if(whichContent == "newgame"){
				self.newGame(self.createNewEmptyGame());
			}

			self.showModal(whichContent);
		}

		this.showModal = function(whichContent){
			$('#myModal .modal-content.' + whichContent).show();
			$('#myModal').modal('show');
		}

		this.hideModal = function(viewModel, event){
			self.currentGameId(undefined);
			$('#myModal').modal('hide');
			$('#myModal .modal-content').hide();
		}

		this.clearSelection = function(viewModel, event){
			
			ko.utils.arrayForEach(ko.unwrap(self.getAppropriateDataStore()), function(game) {
				game.selected(false);
			});

			self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));
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
			self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));
		}

		this.updateSelected = function(game, event){

			console.log(game);
        	//Is there a slicker/better way of doing this?
        	self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));
        	//This is essential for the default checked behavior to continue
        	return true;
        }

		this.prevGameListPage = function(viewModel, event){
			self.currentPageNo( ( self.currentPageNo() > 1 ? self.currentPageNo() - 1 : 1) )  ;
		}

		this.nextGameListPage = function(viewModel, event){
			var maxPage = self.currentGameListTotalPages();
			self.currentPageNo( ( (self.currentPageNo() < maxPage) ? self.currentPageNo() + 1 : self.currentPageNo()) );
		}

		this.parseTermString = function(termString){
			console.log(termString);
			var termObjects = { and: Array(), or: Array() };
			if(termString === undefined){
				return false;
			}

			var andTerms = Array();
			var orTerms = Array();

			if(termString.match(/ && /) || termString.match(/ \|\| /)){

				var andArray = termString.split(" && ");

				for(i = 0; i < andArray.length; i++){
					
					var orArray = andArray[i].split(" || ");

					if( andArray.length > 1 && orArray.length > 1){

						for(j = 0; j < orArray.length; j++){
							if(j == 0 && i == 0){
								orTerms.push(orArray[j]);
							}else if( j == 0 ){
								andTerms.push(orArray[j]);
							}else{
								orTerms.push(orArray[j]);
							}
						}

					}else if( orArray.length > 1 ){
						
						for(j = 0; j < orArray.length; j++){
							orTerms.push(orArray[j]);
						}

					}else{
						andTerms.push(andArray[i]);
					}
				}
			}else{
				//This is arbitrary, if there's just one term it really could be in either array
				orTerms.push(termString);
			}

			for( i = 0; i < andTerms.length; i++ ){
				var filterParts = andTerms[i].split("|");
				var termObj = {};

				if(filterParts.length == 2){
					termObj.field = filterParts[0];
					termObj.termString = filterParts[1];
				}else if(filterParts.length == 1){
					termObj.field = 'ALL';
					termObj.termString = filterParts[0];
				}

				termObjects.and.push(termObj);
			}
			
			for( i = 0; i < orTerms.length; i++ ){
				var filterParts = orTerms[i].split("|");
				var termObj = {};

				if(filterParts.length == 2){
					termObj.field = filterParts[0];
					termObj.termString = filterParts[1];
				}else if(filterParts.length == 1){
					termObj.field = 'ALL';
					termObj.termString = filterParts[0];
				}

				termObjects.or.push(termObj);
			}
			console.log(termObjects);
			return termObjects;

		}

		this.applyFiltering = function(viewModel, event){
			var $elem = $(event.target);

			if( event.keyCode == 13 ){
				var filteredResults = self.filterDataStore($elem.val());
				if(filteredResults.length == 0){
					self.forceShowActiveDataStore(true);
				}
				self.activeDataStore(filteredResults);
				this.applySortingToDataStore();
			}
		}

		this.filterDataStore = function(filterString){
			if (filterString === undefined){
				return this.overviewDataStore();
			}

			var termObjects = self.parseTermString(filterString);
			
			var matches = Array();
			ko.utils.arrayForEach(self.overviewDataStore(), function(game) {

				if(termObjects.and.length > 0){
					var doesMatch = true;

					for(i = 0; i < termObjects.and.length; i++){
						var matchTerm = termObjects.and[i].termString;
						var matchField = termObjects.and[i].field;

						if( matchField == 'ALL' ){
							var loopMatch = true;

							for(prop in game){
					        	if(prop == "id"){
					        		continue;
					        	}

					        	if( (game[prop] || "").match( new RegExp(matchTerm, "i")) === null ){
									loopMatch = false;
									break;
								}
					        }

					        if( loopMatch == false){
					        	doesMatch = false;
					        	break;
					        }

						}else{
							if( (game[matchField] || "").match( new RegExp(matchTerm, "i")) === null ){
								doesMatch = false;
								break;
							}
						}
					}

					if( doesMatch == false ){
						return true;
					}
				}

				if(doesMatch == true){
					matches.push(game);
					return true;
				}

				if(termObjects.or.length > 0){
					var doesMatch = false;

					for(i = 0; i < termObjects.or.length; i++){
						var matchTerm = termObjects.or[i].termString;
						var matchField = termObjects.or[i].field;

						if( matchField == 'ALL' ){
							var loopMatch = false;

							for(prop in game){
					        	if(prop == "id"){
					        		continue;
					        	}

					        	if( (game[prop] || "").match( new RegExp(matchTerm, "i")) ){
									loopMatch = true;
									break;
								}
					        }

					        if( loopMatch == true){
					        	doesMatch = true;
					        	break;
					        }

						}else{
							if( (game[matchField] || "").match( new RegExp(matchTerm, "i")) ){
								doesMatch = true;
								break;
							}
						}

					}
				}

		        if(doesMatch == true){
					matches.push(game);
				}
		    });

			console.log(matches);
		    return matches;
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

		this.applySortingToDataStore = function(){

			var sortField = self.currentGameListSorting().column,
				sortDir = self.currentGameListSorting().dir,
				appropriateDataStore = self.getAppropriateDataStore();
			
			appropriateDataStore.sort(function(left, right){
				var leftField = left[sortField];
				var rightField = right[sortField];

				if(sortField == "id"){
					leftField = parseInt(leftField);
					rightField = parseInt(rightField);
				}else{

					leftField = leftField || "";
					rightField = rightField || "";

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

		this.resetVisibleUI = function(){
			self.currentGameId(false);
			//self.gameList(undefined);
			self.currentGame(undefined);
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

		this.ajax = function(ajaxOpts){
			ajaxOpts.complete = function(jqXHR, textStatus){
				self.activeRequests( self.activeRequests() - 1 );
			}
			self.activeRequests( self.activeRequests() + 1 );
			$.ajax(ajaxOpts);
		}

		this.standardOnFailureHandler = function(jqXHR, textStatus, errorThrown){

			var http_code = jqXHR.status,
				http_code_text = jqXHR.statusText,
				error_msg = jqXHR.responseText;
			self.mostRecentAjaxFailure(http_code + ' ' + http_code_text + '. See console for details');
			console.log(error_msg);

		}

		this.createNewEmptyGame = function(){
			return {
					title: "",
					source: "",
					platform: "",
			};
		}

		ko.bindingHandlers.showSuccess = {
		    init: function(element, valueAccessor) {
		        $(element).hide();
		    },
		    update: function(element, valueAccessor) {
		        // On update, fade in/out
		        var message = valueAccessor();
		        if(message && message != ""){
					$(element).text(message).slideDown(500).delay(3000).slideUp(500);	
		        }
		        self.mostRecentAjaxSuccess("");
		    } 
		};
		
		ko.bindingHandlers.showError = {
		    init: function(element, valueAccessor) {
		        $(element).hide();
		    },
		    update: function(element, valueAccessor) {
		        // On update, fade in/out
		        var message = valueAccessor();
		        if(message && message != ""){
					$(element).text(message).slideDown(500).delay(6000).slideUp(500);	
		        }
		        self.mostRecentAjaxFailure("");
		    } 
		};
	};

$(document).ready(function(){

	gameViewModel = new Games();
	gameViewModel.initObservables();
	ko.applyBindings(gameViewModel);
	gameViewModel.initOverviewDataStore();

	//Initialize correct tab based on hash
	window.location.hash = "home";
	var hash = window.location.hash;
	gameViewModel.activeTab(hash.replace(/^#/, ''));
	
});