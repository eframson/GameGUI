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
			self.listMode = ko.observable("all");
			self.filteredList = ko.observable();

			self.currentGameCancelData = Array();

			self.currentPage = ko.computed(function(){
				if(self.activeTab() == "all"){
					var appropriateDataStore = ko.unwrap(self.getAppropriateDataStore());
					var page_no = self.currentPageNo();
					end_no = self.pageSize() * page_no;
					end_no = (end_no < appropriateDataStore.length) ? end_no : appropriateDataStore.length - 1;
					start_no = end_no - self.pageSize();
					start_no = (start_no < 1) ? 0 : start_no ;
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

						if(self.responseSuccess(response)){

							$.each(response.data.games, function(idx, elem){
								elem.selected = false;
								elem = ko.mapping.fromJS(elem);
								response.data.games[idx] = elem;
							});
							self.overviewDataStore(response.data.games);

						}else{
							self.mostRecentAjaxFailure("Could not retrieve overviewDataStore: " + self.getResponseErrorMsg(response));
						}
					},
					complete: function(jqXHR, textStatus){
						self.activeRequests( self.activeRequests() - 1 );
						self.showLoading(0);
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

					if(self.responseSuccess(response)){

						var elem = response.data.games[0];
						elem.selected = false;
						var game = ko.mapping.fromJS(elem);

						self.addGameToLocalObjects(game);
						self.applySortingToDataStore();
						self.hideModal();
						self.mostRecentAjaxSuccess("Game " + elem.id + " created successfully");
						self.newGame(self.createNewEmptyGame());

					}else{
						self.mostRecentAjaxFailure("Could not create game: " + self.getResponseErrorMsg(response));
					}

				},
				error: self.standardOnFailureHandler
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

			self.ajax({
				type: 'DELETE',
				contentType: 'application/json',
				url: 'api.php/games/' + gameIds,
				dataType: "json",
				success: function(response, textStatus, jqXHR){
					if(typeof onSuccess === 'function'){
						onSuccess(response, textStatus, jqXHR);
					}else{
						console.log(response);
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
			
			var ids = $.map(self.selectedGames(),function(game){
				return game.id();
			});

			self.deleteGame(ids, function(response, textStatus, jqXHR){

				if(self.responseSuccess(response)){

					self.removeGameFromLocalObjects(self.selectedGames());
					self.mostRecentAjaxSuccess("Games deleted successfully");

				}else{

					console.log(response);

					if(self.responseError(response)){

						var gamesToDelete = Array();
						$.each(response.data.games, function(idx, result){

							if(result == 1){
								var game = self.getGameById(idx);
								gamesToDelete.push(game);
							}

						});

						self.removeGameFromLocalObjects(gamesToDelete);
						self.mostRecentAjaxFailure("Some games could not be deleted: " + self.getResponseErrorMsg(response));

					}else{
						self.mostRecentAjaxFailure(self.getResponseErrorMsg(response));
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

					if(response.data && response.data.games){
						
						$.each(response.data.games, function(idx, val){

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
					
					if(self.responseSuccess(response)){

						self.hideModal();
						self.mostRecentAjaxSuccess("All games updated successfully");
						self.applySortingToDataStore();

					}else{
						console.log(response);
						self.mostRecentAjaxFailure(self.getResponseErrorMsg(response));
					}

				},
				error: self.standardOnFailureHandler
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

				response($.map(self.getFilteredDataStore("title|" + request.term + " || source|" + request.term), function( game ){
					return {
						label: game.title() + " (" + game.source() + ")",
						value: game.id()
					}
				}));
			},
			select: function(event, ui){
				event.preventDefault();
				if(ui.item.value != "#"){
					$('.search').val(ui.item.label);
					var game = self.getGameById(ui.item.value);
					self.searchTerm(false);
					self.editGameFromList(game);
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
				event.preventDefault();
				if( self.searchTerm() ){
					$this.parents(".navbar-nav").siblings("#container").children(".ui-autocomplete:hidden").show();
				}else{
					//$this.autocomplete("search");
				}
			}
		});

		this.deleteGameFromModal = function(game){

			self.deleteGame(game, function(response, textStatus, jqXHR){

				if(self.responseSuccess(response)){

					self.hideModal();
					self.removeGameFromLocalObjects(game);
					self.mostRecentAjaxSuccess("Game deleted successfully");

				}else{
					console.log(response);
					self.mostRecentAjaxFailure(self.getResponseErrorMsg(response));
				}

			});
		}

		this.deleteGameFromList = function(game, event){
			self.deleteGame(game, function(response, textStatus, jqXHR){

				if(self.responseSuccess(response)){

					self.removeGameFromLocalObjects(game);
					self.mostRecentAjaxSuccess("Game deleted successfully");

				}else{
					console.log(response);
					self.mostRecentAjaxFailure(self.getResponseErrorMsg(response));
				}

			});
		}

		this.cancelCreateGame = function(game, event){
			self.newGame(self.createNewEmptyGame());
			self.hideModal();
		}

		this.cancelMassUpdate = function(game, event){
			self.hideModal();
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
			console.log(game);
			self.currentGameCancelData = ko.mapping.toJS(game);

			self.ajax({
				type: 'GET',
				dataType: 'json',
				url: 'api.php/games/' + game.id(),
				success: function(response, textStatus, jqXHR){
					if( response.data.games && response.data.games[0] ){


						
						//var currentGame = self.currentGame();
						/*$.each(response.results[0], function(idx, elem){
							currentGame[idx] = elem;
						});*/

						ko.mapping.fromJS(response.data.games[0], game);

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
			//self.getAppropriateDataStore().notifySubscribers(ko.unwrap(self.getAppropriateDataStore()));
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
				var val = $elem.val();
				if(val && val != ""){
					self.filteredList(self.getFilteredDataStore(val));
					self.listMode("filter");
				}else{
					self.filteredList(undefined);
					self.listMode("all");
				}
			}
		}

		this.getFilteredDataStore = function(filterString){
			if(filterString !== undefined){
				
				var termObjects = self.parseTermString(filterString);

				var matches = Array();
				ko.utils.arrayForEach(self.overviewDataStore(), function(game) {
					var gameArray = ko.mapping.toJS(game);

					if(termObjects.and.length > 0){
						var doesMatch = true;

						for(i = 0; i < termObjects.and.length; i++){
							var matchTerm = termObjects.and[i].termString;
							var matchField = termObjects.and[i].field;

							if( matchField == 'ALL' ){
								var loopMatch = true;

								for(prop in gameArray){
						        	if(prop == "id" || prop == "selected"){
						        		continue;
						        	}

						        	if( (gameArray[prop] || "").match( new RegExp(matchTerm, "i")) === null ){
										loopMatch = false;
										break;
									}
						        }

						        if( loopMatch == false){
						        	doesMatch = false;
						        	break;
						        }

							}else{
								if( (gameArray[matchField] || "").match( new RegExp(matchTerm, "i")) === null ){
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

								for(prop in gameArray){
						        	if(prop == "id" || prop == "selected"){
						        		continue;
						        	}

						        	if( (gameArray[prop] || "").match( new RegExp(matchTerm, "i")) ){
										loopMatch = true;
										break;
									}
						        }

						        if( loopMatch == true){
						        	doesMatch = true;
						        	break;
						        }

							}else{
								if( (gameArray[matchField] || "").match( new RegExp(matchTerm, "i")) ){
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

			    return matches;

			}else{
				return Array();
			}
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
				//appropriateDataStore = self.getAppropriateDataStore();
				appropriateDataStore = self.overviewDataStore;
			
			appropriateDataStore.sort(function(left, right){
				var leftField = left[sortField]();
				var rightField = right[sortField]();

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

		this.removeGameFromLocalObjects = function(games){
			if( games instanceof Array ){
				self.overviewDataStore.removeAll(games);
			}else{
				self.overviewDataStore.remove(games);
			}
		}

		this.addGameToLocalObjects = function(game){
			self.overviewDataStore.push(game);
		}

		this.ajax = function(ajaxOpts){
			ajaxOpts.complete = ajaxOpts.complete || function(jqXHR, textStatus){
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

		this.getGameById = function(id){
			var results = $.grep(self.overviewDataStore(),function(elem, idx){
				return (elem.id() === id);
			});
			//Should only be one anyway, but just to be sure...
			return results[0];
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

		this.responseSuccess = function(response){
			return self.getResponseStatus(response) == "success";
		}

		this.responseFail = function(response){
			return self.getResponseStatus(response) == "fail";
		}

		this.responseError = function(response){
			return self.getResponseStatus(response) == "error";
		}

		this.getResponseStatus = function(response){
			return response.status;
		}

		this.getResponseErrorMsg = function(response){
			return response.message;
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