$(document).ready(function(){
	
	// Here's my data model
	var Games = function() {
		var self = this;
		this.currentGameId = ko.observable();
		this.currentGame = ko.observable();
		this.searchTerm = ko.observable();
		this.activeTab = ko.observable("home");
		this.gameList = ko.observableArray();
		this.showLoading = ko.observable(0);
		this.mostRecentAjaxSuccess = ko.observable("");
		this.mostRecentAjaxFailure = ko.observable("");
		
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
							self.currentGame(data.results[0]);
						}
					}
				);
			}else{
				self.currentGame(false);
			}
			
		}.bind(this));
		
		this.updateGame = function(){
			$.ajax({
				type: 'PUT',
				contentType: 'application/json',
				url: 'api.php/games/' + self.currentGameId(),
				dataType: "json",
				data: JSON.stringify(self.currentGame()),
				success: function(response, textStatus, jqXHR){
					console.log(response);
					self.mostRecentAjaxSuccess(response);
				},
				error: function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			});
		}
		
		this.newGame = function(){
			$.ajax({
				type: 'POST',
				contentType: 'application/json',
				url: 'api.php/games/' + self.currentGameId(),
				dataType: "json",
				data: JSON.stringify(self.currentGame()),
				success: function(response, textStatus, jqXHR){
					console.log(response);
					self.mostRecentAjaxSuccess(response);
				},
				error: function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			});
		}
		
		this.deleteGame = function(){
			$.ajax({
				type: 'DELETE',
				contentType: 'application/json',
				url: 'api.php/games/' + self.currentGameId(),
				dataType: "json",
				success: function(response, textStatus, jqXHR){
					console.log(response);
					self.mostRecentAjaxSuccess(response);
					self.currentGameId(undefined);
				},
				error: function(jqXHR, textStatus, errorThrown){
					console.log(jqXHR);
					console.log(textStatus);
					console.log(errorThrown);
				}
			});
		}

		this.showAll = function(){

				self.currentGameId(false);
				self.showLoading(1);

				$.ajax({
					dataType: "json",
					url: 'api.php/games/',
					//data: data,
					success: function(response){
						console.log(response);
						self.gameList(response.results)

						self.showLoading(0);
					}
				});

		}

		this.setActiveTab = function(viewModel, event){
			event.preventDefault();
			var elem = event.target,
				tabTarget = elem.getAttribute("href").replace(/^#/, '');
			this.activeTab(tabTarget);
		}
		
		this.deleteGameFromList = function(game, event){
			self.gameList.remove(game);
		}
		
		this.editGameFromList = function(game, event){
			//console.log(arguments);
			var $elem = $(event.target),
				$row = $elem.parents(".single-game"),
				$next = $row.next(),
				$slider = $next.find(".slider-container"),
				elemDuration = 200;

			if( $slider.is(":visible") ){
				$slider.slideUp(elemDuration, function(){
					$next.hide()
				});
			}else{
				$next.show(0, function(){
					$slider.slideDown(elemDuration);
				});
			}
		}

		this.activeTab.subscribe(function(activeTab){
			
			//Clear out currently set stuff
			//@TODO put this in function or something...
			self.gameList(undefined);
			self.currentGameId(undefined);

			if(activeTab=="home"){
				console.log("do home stuff");
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
					$(element).text(message.msg).slideDown(500).delay(3000).slideUp(500);	
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
					$(element).text(message.msg).slideDown(500).delay(3000).slideUp(500);	
		        }
		    } 
		};
		
		ko.bindingHandlers.showEditPanel = {
		    init: function(element, valueAccessor) {
		        $(element).hide();
		    },
		    update: function(element, valueAccessor) {
		        // On update, fade in/out
		        var show = valueAccessor();
		        if(show){
					$(element).slideDown(500);	
		        }else{
		        	$(element).slideUp(500);
		        }
		    } 
		};
	};
	
	ko.applyBindings(new Games());
	
});