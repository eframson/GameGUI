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
		self.showLoading = ko.observable(1);
		self.allSelected = ko.observable(0);
		self.massUpdateData = ko.observable({
			platform: undefined,
			source: undefined,
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

		self.currentGameCancelData = Array();
		self.activeMessageType = ko.observable("info");
		self.activeMessage = ko.observable("");

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

	this.columnsInOrder = Array();
	this.modalIsShown = false;
	this.filterNullTerm = "NULL";
	this.filterEmptyTerm = "EMPTY";
	this.validOperatorsRegEx = "!=|=|>|<|<=|>=|HAS|~=";
	this.orTermsRegEx = "OR|\\|\\|";
	this.andTermsRegEx = "AND|&&";
	this.operators = {
		//"!=|=|>|<|=<|>=";
		'=' : function(a, b){
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
			}else if(a.constructor !== String){
				a = a.toString();
			}

			if( a.match( new RegExp(b, "i")) !== null ){
				return true;
			}
			return false;
		},
		'HAS' : function(a, b){
			return self.operators["~="](a, b);
		},
	}

	this.initOverviewDataStore = function(){

		self.ajax({
			dataType: "json",
			url: 'api.php/games/',
			success: function(response){
				response = new Response(response);

				if(response.isSuccess()){

					$.each(response.getData().games, function(idx, elem){
						elem.selected = false;
						elem = ko.mapping.fromJS(elem);
						response.getData().games[idx] = elem;
					});
					self.overviewDataStore(response.getData().games);

					self.columnsInOrder = Object.keys(response.getData().games[0]);
					self.columnsInOrder = self.columnsInOrder.filter(function(val, idx){
						if(val == "selected" || val == "__ko_mapping__"){
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

					self.addGameToLocalObjects(game);
					self.applySortingToDataStore();
					self.hideModal();
					self.mostRecentAjaxSuccess("Game " + elem.id + " created successfully");
					self.newGame(self.createNewEmptyGame());

				}else{
					self.mostRecentAjaxFailure("Could not create game: " + response.getErrorMsg());
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
				response = new Response(response);
				if(typeof onSuccess === 'function'){
					onSuccess(response, textStatus, jqXHR);
				}else{
					
					if(response.isSuccess()){

						if (self.modalIsShown == true){
							self.hideModal();
						}
						self.removeGameFromLocalObjects(game);
						self.mostRecentAjaxSuccess("Game deleted successfully");

					}else{
						console.log(response);
						self.mostRecentAjaxFailure(response.getErrorMsg());
					}

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
				response = new Response(response);

				if(response.getData() && response.getData().games){
					
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

					self.hideModal();
					self.mostRecentAjaxSuccess("All games updated successfully");
					self.applySortingToDataStore();

				}else{
					console.log(response);
					self.mostRecentAjaxFailure(response.getErrorMsg());
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

	this.massMerge = function(viewModel, event){

		var elem = event.target,
			$elem = $(elem)
			form = $elem.parents("form"),
			formData = form.serializeArray(),
			submitFields = Array(),
			otherFields = {},
			postData = {};

		submitFields = formData.filter(function(elem, idx){
			if(elem.name.match(/-other$/)){
				otherFields[elem.name] = elem.value;
				return false;
			}
			return true;
		});

		for(i=0; i < submitFields.length; i++){
			if(submitFields[i].value.match(/-other$/)){
				submitFields[i].value = otherFields[submitFields[i].value];
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

					self.hideModal();
					self.mostRecentAjaxSuccess("All games merged successfully");

				}else{
					console.log(response);
					self.mostRecentAjaxFailure(response.getErrorMsg());
				}

			},
			error: self.standardOnFailureHandler
		});
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

			response($.map(self.getFilteredDataStore("title" + self.filterFieldSplitTerm + request.term + self.filterOrTerm + "source" + self.filterFieldSplitTerm + request.term), function( game ){
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
	
	$('.search').click(function(event){
		console.log("clicked");
		var $this=$(this);
		event.preventDefault();
		if( self.searchTerm() ){
			console.log("display the shit");
			$this.parents(".navbar-nav").siblings("#container").children(".ui-autocomplete:hidden").show();
		}else{
			//$this.autocomplete("search");
		}
	});
	
	this.clearSearch = function(viewModel, event){
		self.searchTerm(undefined);
		$('.search').val(undefined);
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
					mergeField.options.push( {
						value: valueOption,
						label: valueOption,
						id : fieldName + "-" + gameId,
					} );
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
		}

		self.showModal(whichContent);
	}

	this.showModal = function(whichContent){
		self.modalIsShown = true;
		$('#myModal .modal-content.' + whichContent).show();
		$('#myModal').modal('show');
		/*$(".datepicker").datepicker({
			format: 'yyyy-mm-dd 00:00:00', //I guess we don't care about times right now, do we?
		});*/
	}

	this.hideModal = function(viewModel, event){
		self.modalIsShown = false;
		$('#myModal').modal('hide');
		$('#myModal .modal-content').hide();
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
	
	this.applyFiltering = function(viewModel, event){
		var $elem = $(event.target);

		if( event.keyCode == 13 ){
			var val = $elem.val();
			if(val && val != ""){
				self.filteredList(self.getFilteredDataStore(val));
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
				if(elem != "id" && elem != "selected"){
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

		for(i=0; i < checkFields.length; i++){
			if( self.operators[matchData.matchOp](gameArray[checkFields[i]], matchData.matchValue) ){
				return true;
			}
		}
		return false;
	}

	this._getDisplayFieldsOfGameInOrder = function(game){
		//Hmmmm....
	}

	this.createNewEmptyGame = function(){
		return {
				title: "",
				source: "",
				platform: "",
				has_played: 2,
				source_id: "",
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

	this.mostRecentAjaxFailure = function(messageString){
		self.displayMessage(messageString, "danger");
	}

	this.mostRecentAjaxSuccess = function(messageString){
		self.displayMessage(messageString, "success");
	}

	this.displayMessage = function(messageString, type){
		type = type || "info";

		self.activeMessageType(type);
		self.activeMessage(messageString);
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
	gameViewModel.initOverviewDataStore();

	//Initialize correct tab based on hash
	window.location.hash = window.location.hash || "home";
	var hash = window.location.hash;
	gameViewModel.activeTab(hash.replace(/^#/, ''));
	
});

$(window).on('hashchange', function(){
	var hash = window.location.hash;
	gameViewModel.activeTab(hash.replace(/^#/, ''));
});