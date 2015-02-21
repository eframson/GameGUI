ko.observableArray.fn.smartRemove = function(obj){
	var allItems = this();
	for (var i = 0; i < allItems.length; i++) {
		var current = allItems[i];
		if (current.id == obj.id){
			this.remove(current);
			return;
		}
	}
}

ko.observableArray.fn.smartRemoveAll = function(obj_array){
	var allItems = this();
	var self = this;
	
	$.each(obj_array, function(idx, elem){
	
		for (var i = 0; i < allItems.length; i++) {
			var current = allItems[i];
			if (current.id == elem.id){
				self.remove(current);
				return;
			}
		}
	
	});
}

$(document).ready(function(){
	
	// Here's my data model
	var Games = function() {
		var self = this;
		this.currentGameId = ko.observable();
		this.currentGame = ko.observable();
		this.newGame = ko.observable(createNewEmptyGame());
		this.searchTerm = ko.observable();
		this.activeTab = ko.observable();
		this.gameList = ko.observableArray();
		this.overviewDataStore = ko.observableArray();
		this.showLoading = ko.observable(1);
		this.mostRecentAjaxSuccess = ko.observable("");
		this.mostRecentAjaxFailure = ko.observable("");
		this.selectedGames = ko.observableArray();
		this.allSelected = ko.observable(0);
		this.massUpdateData = ko.observable({
			platform: undefined,
			source: undefined
		});
		this.pageSize = ko.observable(25);
		this.currentGameListPage = ko.observable();
		this.currentGameListSorting = ko.observable({ column: "title", dir: "asc"});
		this.sortNullsLast = ko.observable(true);
		this.activeRequests = ko.observable(0);

		window.location.hash = "home";
		
		$('.search').autocomplete({
			source: function( request, response ){
				$.getJSON(
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
				);
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
		
		this.currentGameId.subscribe(function(newProductId){
			if(newProductId){
				$.getJSON(
					'api.php/games/' + newProductId,
					function(data){
						if( data.results && data.results[0] ){
							console.log(data.results[0]);
							self.currentGame(data.results[0]);
						}
					}
				);
			}else{
				self.currentGame(false);
			}
			
		}.bind(this));

		this.ajax = function(ajaxOpts){
			ajaxOpts.complete = function(jqXHR, textStatus){
				self.activeRequests( self.activeRequests() - 1 );
			}
			self.activeRequests( self.activeRequests() + 1 );
			$.ajax(ajaxOpts);
		}
		
		this.updateGame = function(game){
			self.ajax({
				type: 'PUT',
				contentType: 'application/json',
				url: 'api.php/games/' + game.id,
				dataType: "json",
				data: JSON.stringify(game),
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
		
		this.massUpdate = function(viewModel, event){
			self.ajax({
				type: 'PUT',
				contentType: 'application/json',
				url: 'api.php/games/' + JSON.stringify(self.selectedGames()),
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
					self.newGame(createNewEmptyGame())
				},
				error: self.standardOnFailureHandler
			});
		}

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
				self.gameList.smartRemoveAll(game);
				console.log(game);
				var mapped = $.map(game,function(elem, idx){ return elem.id });
				console.log(mapped);
				self.selectedGames.removeAll( mapped );
			}else{
				self.overviewDataStore.smartRemove(game);
				self.gameList.smartRemove(game);
				self.selectedGames.remove(game.id);			
			}

			self.currentGameId(undefined);
		}

		this.addGameToLocalObjects = function(game){
			self.overviewDataStore.push(game);
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
					console.log(idsToDelete);
					console.log(self.overviewDataStore().length);
					$.each(self.selectedGames(), function(idx, elem){
						idsToDelete.push( {id: elem} );
					});
					console.log(self.selectedGames().length);
					self.removeGameFromLocalObjects(idsToDelete);
					self.applySortingToDataStore();
					console.log(self.selectedGames().length);
					console.log(self.overviewDataStore().length);
					console.log(self.selectedGames());
					console.log(response);
					self.mostRecentAjaxSuccess(response.msg);
				},
				error: self.standardOnFailureHandler
			});
		}

		this.showHome = function(){

				self.showLoading(1);
				self.gameList(undefined);

				/*self.ajax({
					dataType: "json",
					url: 'api.php/games/',
					//data: data,
					success: function(response){
						console.log(response);
						self.gameList(response.results)

						self.showLoading(0);
					}
				});*/
				self.showLoading(0);

		}

		this.showAll = function(){

			self.showLoading(1);

			self.currentGameListPage(1);
			self.loadCurrentGameListPage();

			self.showLoading(0);
		}

		this.setActiveTab = function(viewModel, event){
			event.preventDefault();
			var elem = event.target,
				tabTarget = elem.getAttribute("href").replace(/^#/, '');
			window.location.hash = tabTarget;
			this.activeTab(tabTarget);
		}
		
		this.editGameFromList = function(game, event){
			self.currentGameId(game.id);
		}

		/*this.rowClicked = function(game, event){
			var $currentTarget = $(event.target),
				$target = $(event.target);
			if ( ($target.data() && $target.data("bind") && $target.data("bind").match(/click:/)) || $target.is("input") ){
				//We're clicking on something that has its own click handler
				return true;
			}else{
				$currentTarget.find("input:checkbox").click();
			}
			console.log(self.selectedGames());
		}*/

		this.toggleGameSelect = function(game, event){
			console.log(arguments);
			if(self.selectedGames.indexOf(game) == -1){
				self.selectedGames.push(game);
			}else{
				self.selectedGames.remove(game);
			}
			console.log(self.selectedGames());
		}

		this.showModal = function(viewModel, event){
			var $elem = $(event.target);

			if($elem.data("target") == "newgame"){
				self.newGame(createNewEmptyGame());
			}

			$('#myModal .modal-content.' + $elem.data("target")).show();
			$('#myModal').modal('show');
		}

		this.hideModal = function(viewModel, event){
			self.currentGameId(undefined);
			$('#myModal').modal('hide');
			$('#myModal .modal-content').hide();
		}

		this.clearSelection = function(viewModel, event){
			self.selectedGames.removeAll();
			self.allSelected(0);
		}

		this.initOverviewDataStore = function(){

				self.ajax({
					dataType: "json",
					url: 'api.php/games/',
					//data: data,
					success: function(response){
						console.log(response);
						self.overviewDataStore(response.results)

						self.showLoading(0);
					}
				});

		}

		this.getPageFromDataStore = function(page_no){
			page_no = page_no || 1;
			end_no = self.pageSize() * page_no;
			end_no = (end_no < self.overviewDataStore().length) ? end_no : self.overviewDataStore().length ;
			start_no = end_no - self.pageSize();
			start_no = (start_no < 1) ? 0 : start_no ;
			return self.overviewDataStore.slice(start_no, end_no);
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

			console.log($elem);

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
			var sortField = self.currentGameListSorting().column;
			var sortDir = self.currentGameListSorting().dir;
			
			self.overviewDataStore.sort(function(left, right){
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

			this.loadCurrentGameListPage();
		}

		this.prevGameListPage = function(viewModel, event){
			self.currentGameListPage( ( self.currentGameListPage() > 1 ? self.currentGameListPage() - 1 : 1) )  ;
			self.loadCurrentGameListPage();
		}

		this.nextGameListPage = function(viewModel, event){
			var maxPage = parseInt(self.overviewDataStore().length / self.pageSize());
			console.log(maxPage);
			self.currentGameListPage( ( (self.currentGameListPage() < maxPage) ? self.currentGameListPage() + 1 : self.currentGameListPage()) );
			self.loadCurrentGameListPage();
		}

		this.loadCurrentGameListPage = function(){
			self.gameList(self.getPageFromDataStore(self.currentGameListPage()));
		}

		this.standardOnFailureHandler = function(jqXHR, textStatus, errorThrown){

			var http_code = jqXHR.status,
				http_code_text = jqXHR.statusText,
				error_msg = jqXHR.responseText;
			self.mostRecentAjaxFailure(http_code + ' ' + http_code_text + '. See console for details');
			console.log(error_msg);

		}

		this.resetVisibleUI = function(){
			self.currentGameId(false);
			self.gameList(undefined);
			self.currentGame(undefined);
		}

		this.allSelected.subscribe(function(val){
			console.log("changed!");
			if(val && val != 0){
				console.log("select all");
				self.selectedGames( ko.utils.arrayMap( self.gameList(), function(item){ return item.id; } ) );
				//self.selectedGames.push("11");
			}else{
				console.log("remove all");
				self.selectedGames.removeAll();
			}
			
		}.bind(this));

		this.selectedGames.subscribe(function(selectedGameArray){

			var $slider = $(".mass-actions"),
				elemDuration = 200;

			if(selectedGameArray.length && selectedGameArray.length > 0){
				$slider.show('slide', {direction: 'down'}, elemDuration);
			}else{
				$slider.hide('slide', {direction: 'down'}, elemDuration);
			}
		}.bind(this));

		this.activeTab.subscribe(function(activeTab){
			this.resetVisibleUI();

			if(activeTab=="home"){
				this.showHome();
			}else if (activeTab=="all"){
				this.showAll();
			}
			
		}.bind(this));
		
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
		
		ko.bindingHandlers.showEditPanel = {
		    init: function(element, valueAccessor) {
		        //Do nothing on init
		    },
		    update: function(element, valueAccessor) {

		        // On update, fade in/out
		        var show = valueAccessor();
		        if(show()){
					$('#myModal .modal-content.editgame').show();
					$('#myModal').modal('show');
		        }else{
		        	/*
		        	$('#myModal').modal('hide');
					$('#myModal .modal-content').hide();
					*/
		        }
		    } 
		};
	};
	
	var gameViewModel = new Games();
	ko.applyBindings(gameViewModel);
	gameViewModel.initOverviewDataStore();

	//Initialize correct tab based on hash
	var hash = window.location.hash;
	gameViewModel.activeTab(hash.replace(/^#/, ''));
	
});

function createNewEmptyGame(){
	return {
			title: "",
			source: "",
			platform: "",
		};
}